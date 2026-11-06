# 🚐 Equipo de 8 Agentes Especializados — Utopia Van Life (`utopiavanlife.es`)

Este directorio contiene la configuración del equipo multidisciplinar de **8 agentes especializados** en Antigravity para la plataforma de alquiler y venta de furgonetas camper premium de **Utopia Van Life** en Mallorca y España (modelos **NEO** y **SPACE**).

---

## 👥 Miembros del Equipo, Roles y Dominios

| Agente | Archivo Canónico | Alias Compatible | Rol y Dominio Principal | Prohibición Estricta |
| :--- | :--- | :--- | :--- | :--- |
| **`@ZEUS`** | [zeus.md](file:///c:/Users/javi_/Desktop/Proyectos/UtopiaVanLife/UtopiaVanLife_appWb/.agents/agents/zeus.md) | [orquestador.md](file:///c:/Users/javi_/Desktop/Proyectos/UtopiaVanLife/UtopiaVanLife_appWb/.agents/agents/orquestador.md) | **Orquestador Principal & Tech Lead.** Punto de contacto único, análisis integral, descomposición de tareas en 8 fases, arbitraje técnico y guardián de la marca Utopia. | **No redacta código** ni diseña interfaces ni redacta copys finales. |
| **`@ATLAS`** | [atlas.md](file:///c:/Users/javi_/Desktop/Proyectos/UtopiaVanLife/UtopiaVanLife_appWb/.agents/agents/atlas.md) | — | **Data Architect & Concurrency.** Modelos Supabase (PostgreSQL), control anti-overbooking con locks de 15 min, índices GiST y políticas de seguridad RLS. | **No diseña interfaces** ni gestiona pasarelas de pago. |
| **`@ENGINE`** | [engine.md](file:///c:/Users/javi_/Desktop/Proyectos/UtopiaVanLife/UtopiaVanLife_appWb/.agents/agents/engine.md) | [backend-integrations.md](file:///c:/Users/javi_/Desktop/Proyectos/UtopiaVanLife/UtopiaVanLife_appWb/.agents/agents/backend-integrations.md) | **Backend & Booking Core.** Transacciones, TPV Redsys (HMAC-SHA256, 3DES), motor de precios V2, fianza de 1.000 € y reglas de conductor (25 años, 2 años carnet B). | **No toca estilos CSS** ni maquetación visual en cliente. |
| **`@PIXEL`** | [pixel.md](file:///c:/Users/javi_/Desktop/Proyectos/UtopiaVanLife/UtopiaVanLife_appWb/.agents/agents/pixel.md) | [frontend-ui-engineer.md](file:///c:/Users/javi_/Desktop/Proyectos/UtopiaVanLife/UtopiaVanLife_appWb/.agents/agents/frontend-ui-engineer.md) | **Frontend & UX/UI Specialist.** Next.js 16, Tailwind v4, mobile-first radical (AGENTS.md), comparador NEO vs SPACE, galería interior 360, extras y Core Web Vitals. | **No gestiona bases de datos** ni lógica profunda de backend/servidor. |
| **`@HERMES`** | [hermes.md](file:///c:/Users/javi_/Desktop/Proyectos/UtopiaVanLife/UtopiaVanLife_appWb/.agents/agents/hermes.md) | [growth-seo-copywriter.md](file:///c:/Users/javi_/Desktop/Proyectos/UtopiaVanLife/UtopiaVanLife_appWb/.agents/agents/growth-seo-copywriter.md) | **Growth, SEO & Copywriting.** CRO, desactivación de objeciones, narrativa Victron 540Ah, SEO local balear, i18n multilingüe (ES, FR, EN, DE) y marcado Schema.org. | **No modifica código** de infraestructura ni lógica transaccional. |
| **`@SHIELD`** | [shield.md](file:///c:/Users/javi_/Desktop/Proyectos/UtopiaVanLife/UtopiaVanLife_appWb/.agents/agents/shield.md) | — | **Ciberseguridad & DevSecOps.** Cabeceras HTTP de grado bancario (HSTS, CSP, X-Frame-Options), WAF Cloudflare, rate limiting, blindaje PCI-DSS y ocultación de huellas. | **No diseña componentes visuales** ni redacta textos comerciales. |
| **`@ALFRED`** | [alfred.md](file:///c:/Users/javi_/Desktop/Proyectos/UtopiaVanLife/UtopiaVanLife_appWb/.agents/agents/alfred.md) | — | **Customer Ops & Automatizaciones.** Emisión de contratos PDF (jspdf) con 31 cláusulas y firma táctil, WhatsApp API, check-in en Son Oms (PMI), Cerbo GX y RGPD. | **No diseña estilos CSS** ni altera la arquitectura técnica de la webapp. |
| **`@SENTINEL`** | [sentinel.md](file:///c:/Users/javi_/Desktop/Proyectos/UtopiaVanLife/UtopiaVanLife_appWb/.agents/agents/sentinel.md) | [qa-performance-compliance.md](file:///c:/Users/javi_/Desktop/Proyectos/UtopiaVanLife/UtopiaVanLife_appWb/.agents/agents/qa-performance-compliance.md) | **QA & Test Automation.** Certificación Quality Gate ineludible, pruebas de estrés del checkout (solapes, temporadas), suites de regresión y auditoría Core Web Vitals. | **No aplica cambios de código**; diagnostica, audita y valida formalmente. |

---

## 🔄 Flujo de Trabajo Secuencial en 8 Fases

```
                 [Usuario / Stakeholder]
                            │
                            ▼
           1. @ZEUS (Diagnóstico & Descomposición Atómica)
                            │
        ┌───────────────────┴───────────────────┐
        ▼                                       ▼
2. @ATLAS (Data & Locks)               3. @ENGINE (Booking Core & Redsys)
        │                                       │
        └───────────────────┬───────────────────┘
                            │
                            ▼
           4. @PIXEL (Frontend, UX Mobile & Microinteracciones)
                            │
                            ▼
           5. @HERMES (Copywriting CRO & SEO Local Balear)
                            │
                            ▼
           6. @SHIELD (Hardening HTTP, WAF & Blindaje PCI-DSS)
                            │
                            ▼
           7. @ALFRED (Automatización Contratos PDF & Son Oms)
                            │
                            ▼
           8. @SENTINEL (Quality Gate, Tests E2E & Core Web Vitals)
                            │
                            ▼
               [APROBADO PARA PRODUCCIÓN ✅]
                            │
                            ▼
          @ZEUS (Síntesis & Entrega Ejecutiva al Usuario)
```

---

## 🚀 Cómo Invocar a los Agentes

### 1. Invocación Directa por Mención (`@`)
En el chat de Google Antigravity puedes invocar a cualquier especialista directamente escribiendo su identificador:
- `@zeus`: Para dirigir el proyecto, solicitar diagnósticos holísticos o coordinar tareas complejas.
- `@atlas`: Para migraciones de base de datos, optimización de queries SQL o control de concurrencia.
- `@engine`: Para ajustes en la pasarela Redsys, cálculo de tarifas o endpoints transaccionales.
- `@pixel`: Para desarrollo de componentes React, maquetación mobile-first o ajustes de animación.
- `@hermes`: Para nuevos copys de venta, optimización SEO de páginas o traducciones multilingües.
- `@shield`: Para auditorías de seguridad, configuración de cabeceras HTTP o políticas WAF.
- `@alfred`: Para generación de contratos PDF, flujos de WhatsApp o logística de entrega en Son Oms.
- `@sentinel`: Para auditorías de calidad previas a desplegar o comprobación de regresiones.

### 2. Desde la Interfaz Gráfica (GUI)
- Selecciona el agente en el desplegable de modelos/agentes de la barra inferior de chat.
- O escribe `/agents` para abrir el panel interactivo de gestión de agentes.

### 3. Desde la Línea de Comandos (CLI)
```bash
# Iniciar sesión con el Orquestador:
agy --agent zeus

# Ejecutar auditoría de calidad con QA:
agy --agent sentinel

# Ejecutar con aliases compatibles previos:
agy --agent orquestador
agy --agent qa-performance-compliance
```
