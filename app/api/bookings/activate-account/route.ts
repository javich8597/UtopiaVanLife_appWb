import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { CHECKOUT_ACCESS_COOKIE, resolveCheckoutUploadOwner } from '@/lib/checkoutAccess'
import { isValidServiceRoleKey } from '@/lib/admin/auth'
import {
    clientIp,
    documentUploadBucketKey,
    registerAccountActivationAttempt,
} from '@/lib/booking/checkoutRateLimit'

const MIN_PASSWORD_LENGTH = 8
const MAX_PASSWORD_LENGTH = 128

export async function POST(request: NextRequest) {
    try {
        if (!isValidServiceRoleKey(process.env.SUPABASE_SERVICE_ROLE_KEY)) {
            return NextResponse.json(
                { error: 'Servicio de activación temporalmente no disponible.' },
                { status: 503 }
            )
        }

        const body = await request.json().catch(() => ({}))
        const orderId =
            request.nextUrl.searchParams.get('order')?.trim() ||
            (typeof body.orderId === 'string' ? body.orderId.trim() : '') ||
            (typeof body.order === 'string' ? body.order.trim() : '')

        const password = typeof body.password === 'string' ? body.password : ''

        if (!orderId) {
            return NextResponse.json(
                { error: 'Falta la referencia del pedido para activar la cuenta.' },
                { status: 400 }
            )
        }

        if (password.length < MIN_PASSWORD_LENGTH) {
            return NextResponse.json(
                { error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.` },
                { status: 400 }
            )
        }

        if (password.length > MAX_PASSWORD_LENGTH) {
            return NextResponse.json(
                { error: 'La contraseña es demasiado larga.' },
                { status: 400 }
            )
        }

        const supabase = await createServerClient()
        const supabaseAdmin = getSupabaseAdmin()
        const accessCookie = request.cookies.get(CHECKOUT_ACCESS_COOKIE)?.value

        let targetUserId = await resolveCheckoutUploadOwner(supabaseAdmin, orderId, accessCookie)

        if (!targetUserId) {
            const { data: { user: sessionUser } } = await supabase.auth.getUser()
            if (sessionUser) {
                const { data: booking } = await supabaseAdmin
                    .from('bookings')
                    .select('user_id, payment_status')
                    .eq('payment_intent_id', orderId)
                    .maybeSingle()

                if (booking?.user_id === sessionUser.id && booking.payment_status === 'paid') {
                    targetUserId = sessionUser.id
                }
            }
        }

        if (!targetUserId) {
            return NextResponse.json(
                {
                    error: 'La sesión de activación ha caducado o no es válida. Usa "¿Olvidaste tu contraseña?" para acceder con tu email.',
                },
                { status: 401 }
            )
        }

        if (!registerAccountActivationAttempt(documentUploadBucketKey(clientIp(request.headers), targetUserId))) {
            return NextResponse.json(
                { error: 'Demasiados intentos seguidos. Espera unos minutos y vuelve a intentarlo.' },
                { status: 429 }
            )
        }

        const { data: updatedUser, error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
            targetUserId,
            {
                password,
                email_confirm: true,
            }
        )

        if (updateErr) {
            console.error('activate-account: error actualizando contraseña:', updateErr.message)
            return NextResponse.json(
                { error: 'No se pudo guardar la contraseña. Inténtalo de nuevo.' },
                { status: 500 }
            )
        }

        let email = updatedUser?.user?.email?.trim() || ''
        if (!email) {
            const { data: userRow } = await supabaseAdmin
                .from('users')
                .select('email')
                .eq('id', targetUserId)
                .maybeSingle()
            email = userRow?.email?.trim() || ''
        }

        if (!email) {
            return NextResponse.json(
                { error: 'No se pudo identificar el correo de la cuenta.' },
                { status: 500 }
            )
        }

        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
        if (signInErr) {
            console.error('activate-account: contraseña guardada, pero falló el inicio de sesión automático:', signInErr.message)
            return NextResponse.json(
                {
                    error: 'Tu contraseña se ha guardado, pero no pudimos iniciar sesión automáticamente. Entra desde Iniciar sesión con tu email y contraseña.',
                },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            email,
        })
    } catch (err) {
        console.error('activate-account exception:', err)
        return NextResponse.json(
            { error: 'Error interno al activar la cuenta.' },
            { status: 500 }
        )
    }
}
