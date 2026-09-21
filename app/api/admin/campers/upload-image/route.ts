import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { isAdminUser } from '@/lib/admin/auth'
import fs from 'fs/promises'
import path from 'path'

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
    })

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No se ha proporcionado ningún archivo' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const rawExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'avif']
    const ext = allowedExts.includes(rawExt) ? rawExt : 'jpg'

    const safeBaseName = file.name
      .replace(/\.[^/.]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-')
      .substring(0, 30)

    const fileName = `${Date.now()}-${safeBaseName || 'camper'}.${ext}`

    const uploadDir = path.join(process.cwd(), 'public', 'images', 'campers', 'uploads')
    await fs.mkdir(uploadDir, { recursive: true })

    const filePath = path.join(uploadDir, fileName)
    await fs.writeFile(filePath, buffer)

    const publicUrl = `/images/campers/uploads/${fileName}`

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName,
    })
  } catch (error: any) {
    console.error('Error uploading camper image:', error)
    return NextResponse.json(
      { error: error?.message || 'Error al subir la imagen' },
      { status: 500 }
    )
  }
}
