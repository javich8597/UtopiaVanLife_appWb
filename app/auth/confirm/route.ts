import { NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { safeRedirectPath } from '@/lib/auth/safeRedirect'

/**
 * Enlace de acceso directo (magic link) del email que se envía tras pagar.
 * Plantilla "Magic Link" de Supabase:
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/es/dashboard
 * Se verifica en el servidor, así funciona aunque el email se abra en otro navegador.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = (searchParams.get('type') || 'email') as EmailOtpType
  const next = safeRedirectPath(searchParams.get('next'), '/es/dashboard')

  if (tokenHash) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/es/auth/login?error=link_expired`)
}
