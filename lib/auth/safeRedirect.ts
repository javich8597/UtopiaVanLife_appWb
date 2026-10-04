/**
 * Solo acepta rutas internas ("/dashboard", "/es/admin"...). Rechaza URLs absolutas,
 * "//dominio" y "/\dominio", que el navegador trata como otro sitio (open redirect).
 */
export function safeRedirectPath(value: string | null | undefined, fallback: string): string {
    if (!value) return fallback
    if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback
    return value
}
