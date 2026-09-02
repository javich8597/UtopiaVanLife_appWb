import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { validateDriverLicense } from '@/lib/contracts/licenseValidator'

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const formData = await request.formData()

    const fullName = formData.get('fullName') as string || ''
    const dniNie = formData.get('dniNie') as string || ''
    const driverLicenseId = formData.get('driverLicenseId') as string || ''
    const driverLicenseIssueDate = formData.get('driverLicenseIssueDate') as string || ''
    const driverLicenseExpiryDate = formData.get('driverLicenseExpiryDate') as string || ''
    const address = formData.get('address') as string || ''
    const phone = formData.get('phone') as string || ''

    const dniFront = formData.get('dni_front') as File | null
    const dniBack = formData.get('dni_back') as File | null
    const licenseFront = formData.get('license_front') as File | null
    const licenseBack = formData.get('license_back') as File | null

    const hasSecondDriver = formData.get('hasSecondDriver') === 'true'
    const secondDriverFullName = formData.get('secondDriverFullName') as string || ''
    const secondDriverDni = formData.get('secondDriverDni') as string || ''
    const secondDriverLicense = formData.get('secondDriverLicense') as string || ''
    const secondDriverDniFront = formData.get('second_dni_front') as File | null
    const secondDriverDniBack = formData.get('second_dni_back') as File | null
    const secondDriverLicenseFront = formData.get('second_license_front') as File | null
    const secondDriverLicenseBack = formData.get('second_license_back') as File | null

    // Validate license dates
    const validation = validateDriverLicense(driverLicenseIssueDate, driverLicenseExpiryDate)
    if (!validation.isValid && validation.isExpired) {
      return NextResponse.json({ error: validation.warningMessage || 'El carnet de conducir está caducado.' }, { status: 400 })
    }

    // Usamos el Service Role para bypass RLS de Storage y actualización de perfil
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    try {
      await supabaseAdmin.storage.createBucket('documents', { public: false })
    } catch {
      // Ignorar si ya existe
    }

    const timestamp = Date.now()
    const uploadFile = async (file: File | null, prefix: string) => {
      if (!file || typeof file === 'string' || (file instanceof File && file.size === 0)) return null
      const ext = file.name ? (file.name.split('.').pop() || 'jpg') : 'jpg'
      const filePath = `${user.id}/${prefix}_${timestamp}.${ext}`
      const { error } = await supabaseAdmin.storage
        .from('documents')
        .upload(filePath, file, { upsert: true })
      if (error) {
        console.error(`Error subiendo ${prefix}:`, error)
      }
      return filePath
    }

    await Promise.all([
      uploadFile(dniFront, 'dni_front'),
      uploadFile(dniBack, 'dni_back'),
      uploadFile(licenseFront, 'front'), // 'front' is also compatible with existing verification view
      uploadFile(licenseBack, 'back'),
      uploadFile(secondDriverDniFront, 'second_dni_front'),
      uploadFile(secondDriverDniBack, 'second_dni_back'),
      uploadFile(secondDriverLicenseFront, 'second_license_front'),
      uploadFile(secondDriverLicenseBack, 'second_license_back')
    ])

    // Update user profile in database
    const updatePayload: Record<string, any> = {
      verification_status: 'pending_validation',
      updated_at: new Date().toISOString()
    }

    if (fullName) updatePayload.full_name = fullName
    if (dniNie) updatePayload.dni_nie = dniNie
    if (driverLicenseId) updatePayload.driver_license_id = driverLicenseId
    if (driverLicenseIssueDate) updatePayload.driver_license_issue_date = driverLicenseIssueDate
    if (driverLicenseExpiryDate) updatePayload.driver_license_expiry_date = driverLicenseExpiryDate
    if (address) updatePayload.address = address
    if (phone) updatePayload.phone = phone

    if (hasSecondDriver) {
      updatePayload.has_second_driver = true
      updatePayload.second_driver_name = secondDriverFullName
      updatePayload.second_driver_dni = secondDriverDni
      updatePayload.second_driver_license = secondDriverLicense
    }

    const { error: updateErr } = await supabaseAdmin
      .from('users')
      .update(updatePayload)
      .eq('id', user.id)

    if (updateErr) {
      console.warn('Could not update users table directly, attempting metadata update:', updateErr.message)
    }

    return NextResponse.json({
      success: true,
      validation,
      message: 'Documentación y datos de conductor guardados con éxito.'
    })
  } catch (error: any) {
    console.error('Upload Driver Docs Error:', error)
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 })
  }
}
