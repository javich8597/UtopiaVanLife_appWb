# Configuración de Correo Corporativo (DonDominio + Supabase Auth)

Esta guía te explica cómo activar el envío de correos profesionales desde `@utopiavanlife.com` usando tu cuenta de correo de **DonDominio**, tanto para los emails de confirmación de reserva de la web como para los emails de recuperación de contraseña de **Supabase Auth**.

---

## 1. Datos SMTP de DonDominio

En tu panel de DonDominio puedes usar tu buzón actual o crear uno específico (recomendado: `reservas@utopiavanlife.com`).

- **Servidor SMTP (`SMTP_HOST`):** `smtp.dondominio.com`
- **Puerto (`SMTP_PORT`):** `465` (SSL/TLS) — *alternativa: `587` con STARTTLS*
- **Usuario (`SMTP_USER`):** tu dirección completa de DonDominio (ej. `reservas@utopiavanlife.com`)
- **Contraseña (`SMTP_PASS`):** la contraseña de ese buzón en DonDominio

---

## 2. Variables de entorno (`.env.local` y Vercel)

Rellena estas variables en tu `.env.local` (para pruebas en local) y en **Vercel → Settings → Environment Variables** (para producción):

```env
SMTP_HOST=smtp.dondominio.com
SMTP_PORT=465
SMTP_USER=reservas@utopiavanlife.com
SMTP_PASS=TU_CONTRASEÑA_DEL_BUZON
SMTP_FROM=Utopia Van Life <reservas@utopiavanlife.com>
SMTP_REPLY_TO=reservas@utopiavanlife.com
SMTP_ADMIN_EMAIL=reservas@utopiavanlife.com
```

> **Nota:** `SMTP_ADMIN_EMAIL` es el correo donde recibirás el aviso automático cada vez que entre un pago confirmado por Redsys. Puedes poner ahí tu buzón principal o un email que reenvíe a tu Gmail.

---

## 3. Conectar DonDominio como SMTP en Supabase Auth

Así conseguirás que los correos de **"¿Olvidaste tu contraseña?"** y verificación salgan desde `reservas@utopiavanlife.com` en lugar de `noreply@mail.app.supabase.io`:

1. Entra en tu proyecto de **Supabase**.
2. Ve a **Project Settings** (icono de engranaje) → **Authentication** → **SMTP Settings**.
3. Activa **Enable Custom SMTP**.
4. Introduce estos valores:
   - **Sender email:** `reservas@utopiavanlife.com`
   - **Sender name:** `Utopia Van Life`
   - **Host:** `smtp.dondominio.com`
   - **Port number:** `465`
   - **Minimum interval between emails:** `60` (segundos)
   - **Username:** `reservas@utopiavanlife.com`
   - **Password:** la contraseña de ese buzón en DonDominio
5. Pulsa **Save**.

---

## 4. Plantillas HTML corporativas para Supabase Auth

Ve a **Supabase → Authentication → Email Templates**, selecciona cada plantilla y pega su asunto y código HTML correspondiente.

### A) Plantilla **Reset Password** (*Recuperar / Crear Contraseña*)

- **Subject:** `Restablece tu contraseña - Utopia Van Life`
- **Body (HTML):**

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background-color:#0B0C0E;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#F8FAFC;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0B0C0E;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#131518;border:1px solid #262930;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:28px 32px 20px;text-align:center;border-bottom:1px solid #22252C;">
              <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#CCA053;font-weight:700;margin-bottom:6px;">MALLORCA · CAMPER EXPERIENCE</div>
              <div style="font-size:22px;letter-spacing:2px;font-weight:800;color:#FFFFFF;">UTOPIA <span style="color:#CCA053;">VAN LIFE</span></div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 12px;font-size:20px;color:#FFFFFF;">Restablece tu contraseña</h1>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#94A3B8;">
                Has solicitado crear o cambiar tu contraseña para acceder a tu área de cliente en Utopia Van Life. Pulsa el botón inferior para elegir tu nueva contraseña:
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:14px 28px;border-radius:999px;background-color:#CCA053;color:#0B0C0E;font-weight:800;font-size:15px;text-decoration:none;">
                      Elegir Nueva Contraseña
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:13px;line-height:1.5;color:#64748B;">
                Si no solicitaste este correo, puedes ignorarlo con total seguridad.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;background-color:#0E1013;border-top:1px solid #22252C;text-align:center;font-size:12px;color:#64748B;">
              Utopia Van Life · Palma de Mallorca
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

### B) Plantilla **Magic Link** (*Enlace de Acceso Directo*)

- **Subject:** `Tu enlace de acceso - Utopia Van Life`
- **Body (HTML):**

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background-color:#0B0C0E;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#F8FAFC;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0B0C0E;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#131518;border:1px solid #262930;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:28px 32px 20px;text-align:center;border-bottom:1px solid #22252C;">
              <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#CCA053;font-weight:700;margin-bottom:6px;">MALLORCA · CAMPER EXPERIENCE</div>
              <div style="font-size:22px;letter-spacing:2px;font-weight:800;color:#FFFFFF;">UTOPIA <span style="color:#CCA053;">VAN LIFE</span></div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 12px;font-size:20px;color:#FFFFFF;">Accede a tu reserva</h1>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#94A3B8;">
                Pulsa este botón para entrar directamente en tu panel de cliente de Utopia Van Life, revisar tu reserva, subir documentación o firmar tu contrato:
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/es/dashboard" style="display:inline-block;padding:14px 28px;border-radius:999px;background-color:#CCA053;color:#0B0C0E;font-weight:800;font-size:15px;text-decoration:none;">
                      Entrar a Mi Aventura
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:13px;line-height:1.5;color:#64748B;">
                Este enlace es personal y caduca pasado un tiempo limitado por tu seguridad.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;background-color:#0E1013;border-top:1px solid #22252C;text-align:center;font-size:12px;color:#64748B;">
              Utopia Van Life · Palma de Mallorca
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```
