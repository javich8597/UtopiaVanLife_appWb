import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { isAdminUser } from '@/lib/admin/auth'

/**
 * Descarga del contrato firmado. El bucket 'documents' guarda también DNIs y carnets,
 * así que no se sirve con URL pública: se comprueba que sea el titular o el equipo
 * y se redirige a una URL firmada de corta duración.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  try {
    const { bookingId } = await params
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const db = getSupabaseAdmin()
    const { data: booking } = await db
      .from('bookings')
      .select('id, user_id, contract_signed_at')
      .eq('id', bookingId)
      .maybeSingle()

    if (!booking) {
      return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 })
    }

    if (booking.user_id !== user.id) {
      const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle()
      if (!isAdminUser({ id: user.id, role: profile?.role, app_metadata: user.app_metadata })) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
      }
    }

    const { data, error } = await db.storage
      .from('documents')
      .createSignedUrl(`contracts/${booking.id}_contrato_firmado.pdf`, 300)

    if (error || !data?.signedUrl) {
      return NextResponse.json({ error: 'El contrato firmado no está disponible' }, { status: 404 })
    }

    return NextResponse.redirect(data.signedUrl)
  } catch (err: any) {
    console.error('Contract PDF download error:', err)
    return NextResponse.json({ error: 'No se pudo descargar el contrato' }, { status: 500 })
  }
}
