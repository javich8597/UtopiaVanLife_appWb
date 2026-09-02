export interface LicenseValidationResult {
  isValid: boolean
  isExpired: boolean
  isNovel: boolean
  yearsHeld: number
  warningMessage?: string
}

export function validateDriverLicense(
  issueDateStr?: string | null,
  expiryDateStr?: string | null
): LicenseValidationResult {
  if (!issueDateStr || !expiryDateStr) {
    return {
      isValid: false,
      isExpired: false,
      isNovel: false,
      yearsHeld: 0,
      warningMessage: 'Debes indicar las fechas de expedición y caducidad de tu carnet de conducir.'
    }
  }

  const today = new Date()
  const issueDate = new Date(issueDateStr)
  const expiryDate = new Date(expiryDateStr)

  // Check valid dates
  if (isNaN(issueDate.getTime()) || isNaN(expiryDate.getTime())) {
    return {
      isValid: false,
      isExpired: false,
      isNovel: false,
      yearsHeld: 0,
      warningMessage: 'Formato de fecha inválido.'
    }
  }

  // Check if expired
  if (expiryDate.getTime() < today.getTime()) {
    return {
      isValid: false,
      isExpired: true,
      isNovel: false,
      yearsHeld: 0,
      warningMessage: 'El carnet de conducir está caducado. Es necesario un carnet en vigor.'
    }
  }

  // Calculate years held
  const diffMs = today.getTime() - issueDate.getTime()
  const yearsHeld = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25)))

  const isNovel = yearsHeld < 2

  return {
    isValid: true,
    isExpired: false,
    isNovel,
    yearsHeld,
    warningMessage: isNovel
      ? 'Aviso: El carnet tiene menos de 2 años de antigüedad. El alquiler está sujeto a revisión por parte del administrador.'
      : undefined
  }
}
