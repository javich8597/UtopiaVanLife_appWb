# 🚐 Utopia Van Life — Web Platform

Plataforma web oficial y sistema de reservas para **Utopia Van Life** (Mallorca), servicio de alquiler de furgonetas camper premium 100% autónomas.

---

## 📌 Estado del Proyecto y Roadmap de Hitos

### ✅ Hito 1: Catálogo, Experiencia de Usuario y Contenidos (Completado)
- **Landing Page Principal**: Hero dinámico con fondo de vídeo, buscador inteligente por fechas y número de viajeros, propuesta de valor, sección de experiencias por Mallorca y FAQs interactivas.
- **Catálogo de Flota**: Listado interactivo de campers (`NEO` y `SPACE`) con disponibilidad dinámica y filtros.
- **Ficha Detallada de Camper (`/campers/[slug]`)**:
  - Visor interactivo **Tour Virtual 360º** (Pannellum).
  - Selector de **Ambiente Interior** (Día ☀️, Noche 🌙, Relax 🌅).
  - Ficha técnica completa de motorización, medidas y equipamiento.
  - Tarjeta de sistema eléctrico autónomo (Victron Energy Pro: 800W solar, litio 540Ah).
  - Calculadora de precios en tiempo real según temporadas.
- **Páginas Institucionales**:
  - `Nosotros` (`/conocenos`): Filosofía y propuesta de viaje.
  - `Contacto` (`/contacto`): Formulario de consultas y suscripción a newsletter.
- **Páginas Legales y RGPD**:
  - Política de Privacidad (`/legal/privacidad`)
  - Términos y Condiciones de Alquiler (`/legal/terminos`)
  - Política de Cookies (`/legal/cookies`)
- **Internacionalización (i18n)**: Soporte multi-idioma completo mediante `next-intl` (`/es`, `/en`, `/de`, `/fr`).

---

### ✅ Hito 2: Autenticación, Área de Cliente y Panel de Administración (Completado)
- **Autenticación y Seguridad**:
  - Integración completa con Supabase Auth SSR (Middleware y sincronización por cookies seguras).
  - Flujos de registro, login y logout adaptados a la localización (`/[locale]/auth/*`).
- **Área de Cliente — "Mi Aventura" (`/dashboard`)**:
  - Vista general de reservas activas, pasadas y estado del viaje.
  - Gestión de perfil de usuario (`/dashboard/profile`).
  - Navegación lateral reactiva (`DashboardNavClient`).
- **Panel de Control de Administración (`/admin`)**:
  - **Calendario Maestro (Gantt)**: Timeline interactivo (`@fullcalendar/resource-timeline`) para visualizar reservas por camper en tiempo real.
  - **Gestión de Flota (`/admin/campers`)**: Estado de vehículos, mantenimiento y disponibilidad.
  - **Gestión de Usuarios (`/admin/users`)**: Listado de clientes y validación de documentos (DNI/carnet).
  - **Ajustes y Precios (`/admin/settings`)**: Matriz de temporadas (Alta, Media, Baja) y tarifas dinámicas.

---

### ⏳ Hito 3: Pasarela de Pago y Automatizaciones CRM (Próximo hito)
- [ ] Integración de pasarela de pago **Redsys / CaixaBank** (TPV virtual oficial).
- [ ] Bloqueo temporal de fechas (hold de 30 minutos mientras se completa el pago).
- [ ] Checkout para usuarios invitados (creación automática de cuenta tras reservar).
- [ ] Webhooks e integración bidireccional con **GoHighLevel (GHL)** para automatización de WhatsApp, emails de confirmación y contratos.

---

## 🗺️ Mapa de Rutas de la Aplicación

| Ruta | Acceso | Descripción |
| :--- | :--- | :--- |
| `/[locale]/` | Público | Página de inicio con hero, buscador y experiencias |
| `/[locale]/campers` | Público | Catálogo completo de furgonetas camper |
| `/[locale]/campers/neo` | Público | Ficha interactiva de la camper NEO (Tour 360°, especificaciones) |
| `/[locale]/campers/space` | Público | Ficha interactiva de la camper SPACE |
| `/[locale]/conocenos` | Público | Historia, valores y equipo de Utopia Van Life |
| `/[locale]/contacto` | Público | Formulario de contacto y newsletter |
| `/[locale]/legal/*` | Público | Páginas legales (Privacidad, Términos, Cookies) |
| `/[locale]/auth/login` | Público | Inicio de sesión |
| `/[locale]/auth/register` | Público | Registro de nuevos usuarios |
| `/[locale]/checkout` | Público / Usuario | Flujo de confirmación de reserva y pago |
| `/[locale]/dashboard` | Protegido (Cliente) | Panel "Mi Aventura" con reservas y estado |
| `/[locale]/dashboard/profile` | Protegido (Cliente) | Edición de datos personales |
| `/[locale]/admin` | Protegido (Admin) | Panel principal de administración |
| `/[locale]/admin/calendar` | Protegido (Admin) | Calendario Gantt de ocupación de la flota |
| `/[locale]/admin/campers` | Protegido (Admin) | Gestión de vehículos |
| `/[locale]/admin/users` | Protegido (Admin) | Clientes y estado de verificación |
| `/[locale]/admin/settings` | Protegido (Admin) | Temporadas, precios base y extras |

---

## 🛠️ Stack Tecnológico

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router, Server & Client Components)
- **Lenguaje**: TypeScript
- **Base de Datos y Auth**: [Supabase](https://supabase.com/) (PostgreSQL, Supabase SSR Auth, Row Level Security)
- **Internacionalización**: `next-intl`
- **Estilos**: Vanilla CSS con tokens y sistema de diseño propio (*Impeccable Design System*), glassmorphism controlado y diseño responsivo.
- **Librerías Clave**:
  - `@fullcalendar/resource-timeline` (Gantt calendar para administración)
  - `lucide-react` (Iconografía)
  - `pannellum` (Visor de panoramas 360°)

---

## 🚀 Puesta en Marcha en Local

1. **Clonar el repositorio e instalar dependencias:**
   ```bash
   git clone https://github.com/javich8597/UtopiaVanLife_appWb.git
   cd UtopiaVanLife_appWb
   npm install
   ```

2. **Configurar variables de entorno (`.env.local`):**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
   NEXT_PUBLIC_WHATSAPP_NUMBER=34611560916
   ```

3. **Ejecutar el servidor de desarrollo:**
   ```bash
   npm run dev
   ```
   Abrir [http://localhost:3000/es](http://localhost:3000/es) en el navegador.

---

## 📞 Contacto y Soporte

- **Web oficial de referencia**: [utopiavanlife.com](https://www.utopiavanlife.com/)
- **Email**: info@utopiavanlife.com / administracion@utopiavanlife.com
- **Teléfono / WhatsApp**: +34 611 560 916
- **Ubicación**: Carrer Son Oms, Palma de Mallorca (Illes Balears)
