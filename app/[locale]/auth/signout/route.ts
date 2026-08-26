import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

async function handleSignOut(request: Request, locale: string) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  const { origin } = new URL(request.url)
  return NextResponse.redirect(`${origin}/${locale}/auth/login`, { status: 303 })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ locale: string }> }
) {
  const { locale } = await params
  return handleSignOut(request, locale || 'es')
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ locale: string }> }
) {
  const { locale } = await params
  return handleSignOut(request, locale || 'es')
}
