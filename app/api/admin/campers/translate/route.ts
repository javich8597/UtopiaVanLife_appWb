import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { isAdminUser } from '@/lib/admin/auth'
import {
  translateCamperContent,
  TranslatableLocale,
  CamperTranslatablePayload,
} from '@/lib/campers/autoTranslate'

const VALID_LOCALES: TranslatableLocale[] = ['en', 'fr', 'de']

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const isAuthorized = isAdminUser({
      id: user.id,
      email: user.email,
      role: profile?.role,
      user_metadata: user.user_metadata,
      app_metadata: user.app_metadata,
    })

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const body = await request.json()
    const targetLocale = body?.targetLocale as TranslatableLocale
    const content = body?.content as CamperTranslatablePayload

    if (!VALID_LOCALES.includes(targetLocale) || !content || typeof content !== 'object') {
      return NextResponse.json({ error: 'Idioma o contenido inválido' }, { status: 400 })
    }

    const translated = await translateCamperContent(content, targetLocale)
    return NextResponse.json({ translated })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Error al traducir contenido' },
      { status: 500 }
    )
  }
}

