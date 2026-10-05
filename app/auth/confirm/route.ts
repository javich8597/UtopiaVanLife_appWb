import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/es/dashboard'

  // Si se pasa token_hash y type, verificar el OTP con Supabase
  if (token_hash && type) {
    const supabase = await createClient()

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })

    if (!error) {
      // Redirigir al destino (por defecto /es/dashboard)
      const targetUrl = next.startsWith('http') ? next : `${origin}${next.startsWith('/') ? next : `/${next}`}`
      return NextResponse.redirect(targetUrl)
    }
  }

  // Si falla la verificación, redirigir al login con mensaje de error
  return NextResponse.redirect(`${origin}/es/auth/login?error=invalid_or_expired_token`)
}
