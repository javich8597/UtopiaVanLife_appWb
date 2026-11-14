import { getSmtpConfig, sendSmtpMail } from './smtpClient'

export interface BookingEmailParams {
    bookingId: string
    orderId: string
    customerName?: string | null
    customerEmail: string
    customerPhone?: string | null
    camperName?: string | null
    startDate: string
    endDate: string
    totalPrice?: number | string | null
    dashboardUrl: string
    adminUrl?: string
    whatsappNumber?: string
}

function escapeHtml(value: string | null | undefined): string {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

function formatDateEs(dateStr: string): string {
    const match = String(dateStr || '').match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (!match) return escapeHtml(dateStr)
    return `${match[3]}/${match[2]}/${match[1]}`
}

function formatEur(value: number | string | null | undefined): string {
    const num = Number(value)
    if (!Number.isFinite(num)) return '-'
    return `${num.toFixed(2).replace('.', ',')} €`
}

export function buildClientBookingEmailHtml(params: BookingEmailParams): string {
    const customerName = escapeHtml(params.customerName?.trim() || 'Viajero')
    const camperName = escapeHtml(params.camperName?.trim() || 'Camper Utopia Van Life')
    const orderId = escapeHtml(params.orderId)
    const startDate = formatDateEs(params.startDate)
    const endDate = formatDateEs(params.endDate)
    const total = formatEur(params.totalPrice)
    const dashboardUrl = escapeHtml(params.dashboardUrl)
    const whatsappDigits = (params.whatsappNumber || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '34611560916').replace(/\D/g, '')
    const whatsappUrl = `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(
        `Hola Utopia Van Life, consulta sobre mi reserva #${params.orderId}`
    )}`

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Confirmación de Pago - Utopia Van Life</title>
</head>
<body style="margin:0;padding:0;background-color:#0B0C0E;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#F8FAFC;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0B0C0E;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#131518;border:1px solid #262930;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:28px 32px 20px;text-align:center;border-bottom:1px solid #22252C;">
              <div style="font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#CCA053;font-weight:700;margin-bottom:6px;">MALLORCA · CAMPER EXPERIENCE</div>
              <div style="font-size:24px;letter-spacing:2px;font-weight:800;color:#FFFFFF;">UTOPIA <span style="color:#CCA053;">VAN LIFE</span></div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <div style="display:inline-block;padding:6px 14px;border-radius:999px;background-color:#19281F;border:1px solid #22C55E;color:#4ADE80;font-size:12px;font-weight:700;margin-bottom:16px;">
                PAGO RECIBIDO CORRECTAMENTE
              </div>
              <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#FFFFFF;">¡Hola ${customerName}, tus fechas ya están bloqueadas!</h1>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#94A3B8;">
                Hemos recibido correctamente el pago de tu reserva a través de Redsys. Nuestro equipo revisará tu documentación para confirmar formalmente tu entrega en Mallorca.
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0B0C0E;border:1px solid #262930;border-radius:12px;margin-bottom:24px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;">
                      <tr>
                        <td style="padding:6px 0;color:#94A3B8;">Referencia de pago</td>
                        <td align="right" style="padding:6px 0;color:#FFFFFF;font-weight:700;">#${orderId}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#94A3B8;">Vehículo</td>
                        <td align="right" style="padding:6px 0;color:#CCA053;font-weight:700;">${camperName}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#94A3B8;">Recogida</td>
                        <td align="right" style="padding:6px 0;color:#FFFFFF;font-weight:600;">${startDate}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#94A3B8;">Devolución</td>
                        <td align="right" style="padding:6px 0;color:#FFFFFF;font-weight:600;">${endDate}</td>
                      </tr>
                      <tr>
                        <td style="padding:10px 0 2px;border-top:1px solid #22252C;color:#94A3B8;">Importe abonado</td>
                        <td align="right" style="padding:10px 0 2px;border-top:1px solid #22252C;color:#FFFFFF;font-size:16px;font-weight:800;">${total}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#CBD5E1;">
                Puedes entrar a tu área privada con tu email (<strong>${escapeHtml(params.customerEmail)}</strong>) y la contraseña que has configurado tras el pago, o pulsar este botón para acceder directamente:
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}" style="display:inline-block;padding:14px 28px;border-radius:999px;background-color:#CCA053;color:#0B0C0E;font-weight:800;font-size:15px;text-decoration:none;">
                      Acceder a Mi Reserva
                    </a>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <a href="${whatsappUrl}" style="display:inline-block;padding:10px 20px;border-radius:999px;border:1px solid #25D366;color:#25D366;font-weight:600;font-size:13px;text-decoration:none;">
                      ¿Dudas? Escríbenos por WhatsApp
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px;background-color:#0E1013;border-top:1px solid #22252C;text-align:center;font-size:12px;color:#64748B;">
              Utopia Van Life · Son Oms (Palma de Mallorca) · Responde a este correo si necesitas ayuda.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function buildAdminBookingNotificationHtml(params: BookingEmailParams): string {
    const customerName = escapeHtml(params.customerName?.trim() || 'Sin nombre')
    const customerEmail = escapeHtml(params.customerEmail)
    const customerPhone = escapeHtml(params.customerPhone?.trim() || 'No indicado')
    const camperName = escapeHtml(params.camperName?.trim() || params.bookingId)
    const orderId = escapeHtml(params.orderId)
    const startDate = formatDateEs(params.startDate)
    const endDate = formatDateEs(params.endDate)
    const total = formatEur(params.totalPrice)
    const adminUrl = escapeHtml(params.adminUrl || params.dashboardUrl)

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Nueva Reserva Pagada #${orderId} - Utopia Van Life</title>
</head>
<body style="margin:0;padding:24px;background-color:#0B0C0E;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#F8FAFC;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background-color:#131518;border:1px solid #262930;border-radius:14px;padding:24px;">
    <tr>
      <td>
        <div style="font-size:12px;letter-spacing:2px;color:#CCA053;font-weight:700;text-transform:uppercase;">AVISO INTERNO · NUEVA RESERVA</div>
        <h2 style="margin:8px 0 16px;color:#FFFFFF;font-size:20px;">Pago Redsys confirmado (#${orderId})</h2>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;line-height:1.8;color:#CBD5E1;">
          <tr><td><strong>Cliente:</strong></td><td align="right">${customerName}</td></tr>
          <tr><td><strong>Email:</strong></td><td align="right">${customerEmail}</td></tr>
          <tr><td><strong>Teléfono:</strong></td><td align="right">${customerPhone}</td></tr>
          <tr><td><strong>Camper:</strong></td><td align="right" style="color:#CCA053;font-weight:700;">${camperName}</td></tr>
          <tr><td><strong>Fechas:</strong></td><td align="right">${startDate} → ${endDate}</td></tr>
          <tr><td><strong>Importe pagado:</strong></td><td align="right" style="color:#4ADE80;font-weight:700;">${total}</td></tr>
        </table>
        <div style="margin-top:22px;text-align:center;">
          <a href="${adminUrl}" style="display:inline-block;padding:12px 24px;border-radius:999px;background-color:#CCA053;color:#0B0C0E;font-weight:700;text-decoration:none;font-size:14px;">
            Revisar en Panel Admin
          </a>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function sendBookingConfirmationEmails(
    params: BookingEmailParams,
    env: Record<string, string | undefined> = process.env
): Promise<boolean> {
    const config = getSmtpConfig(env)
    if (!config) return false

    const clientHtml = buildClientBookingEmailHtml(params)
    await sendSmtpMail(config, {
        to: params.customerEmail,
        subject: `Reserva recibida en Utopia Van Life (#${params.orderId})`,
        html: clientHtml,
    })

    const adminEmail = env.SMTP_ADMIN_EMAIL?.trim() || config.replyTo || config.user
    if (adminEmail) {
        try {
            const adminHtml = buildAdminBookingNotificationHtml(params)
            await sendSmtpMail(config, {
                to: adminEmail,
                subject: `Nueva reserva pagada #${params.orderId} (${params.customerName || params.customerEmail})`,
                html: adminHtml,
                replyTo: params.customerEmail,
            })
        } catch (err) {
            console.warn(`Redsys Webhook: correo al cliente enviado, pero falló el aviso interno al admin (${adminEmail}):`, err)
        }
    }

    return true
}
