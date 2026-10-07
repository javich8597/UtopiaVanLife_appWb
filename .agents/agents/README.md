# 🚐 Equipo de Agentes Especializados — Utopia Van Life (`utopiavanlife.es`)

Este directorio contiene la configuración de agentes especializados para auditar, terminar y escalar la plataforma web de **Utopia Van Life** en Google Antigravity.

---

## 👥 Miembros del Equipo y Roles

| Agente | Archivo | Rol y Dominio | Prohibición Estricta |
| :--- | :--- | :--- | :--- |
| **`orquestador`** | [orquestador.md](file:///c:/Users/javi_/Desktop/Proyectos/UtopiaVanLife/UtopiaVanLife_appWb/.agents/agents/orquestador.md) | Lead Project & Solution Architect. Punto de contacto único, análisis global, descomposición de tareas y coordinación. | **No redacta código** ni diseña interfaces directamente. |
| **`frontend-ui-engineer`** | [frontend-ui-engineer.md](file:///c:/Users/javi_/Desktop/Proyectos/UtopiaVanLife/UtopiaVanLife_appWb/.agents/agents/frontend-ui-engineer.md) | Frontend & UI Engineer. Next.js 16, Tailwind CSS v4, styled-jsx responsive mobile-first, assets multimedia vanlife, microinteracciones y WCAG 2.1. | **No gestiona bases de datos** ni lógica profunda de backend/servidor. |
| **`backend-integrations`** | [backend-integrations.md](file:///c:/Users/javi_/Desktop/Proyectos/UtopiaVanLife/UtopiaVanLife_appWb/.agents/agents/backend-integrations.md) | Backend & Integrations Specialist. Lógica transaccional, Supabase SSR/Admin, pasarela Redsys (HMAC-SHA256), motor de precios V2, APIs y webhooks. | **No diseña layouts visuales** ni define paletas de estilos. |
| **`growth-seo-copywriter`** | [growth-seo-copywriter.md](file:///c:/Users/javi_/Desktop/Proyectos/UtopiaVanLife/UtopiaVanLife_appWb/.agents/agents/growth-seo-copywriter.md) | Growth, SEO & Copywriter Camper (CRO). Narrativa de valor, conversión, marcado Schema.org, metadatos y arquitectura semántica. | **No edita código directamente** en el repo; entrega especificaciones estructuradas. |
| **`qa-performance-compliance`** | [qa-performance-compliance.md](file:///c:/Users/javi_/Desktop/Proyectos/UtopiaVanLife/UtopiaVanLife_appWb/.agents/agents/qa-performance-compliance.md) | QA, Performance & Compliance Engineer. Pruebas E2E, Core Web Vitals móviles (4G), RGPD/Cookies/LSSI-CE y certificación Quality Gate. | **No aprueba tareas** con fallos de severidad Alta o Media pendientes. |

---

## 🔄 Flujo de Trabajo y Protocolo de Colaboración

```
Usuario / Stakeholder
         │
         ▼
 1. ORQUESTADOR
    ├── (1) Diagnóstico
    ├── (2) Plan de Tareas Delegadas ───► Orden secuencial:
    │                                     1. GROWTH, SEO & COPYWRITER
    │                                     2. FRONTEND & UI ENGINEER
    │                                     3. BACKEND & INTEGRATIONS
    │                                     4. QA, PERFORMANCE & COMPLIANCE
    └── (3) Checklist de Éxito
                                          │
                                          ▼
                               Quality Gate Obligatorio:
                       [APROBADO PARA PRODUCCIÓN ✅]
```

### Reglas de Oro:
1. **Plan en 3 Pasos del Orquestador**: Diagnóstico preliminar, Plan de tareas delegadas y Checklist de criterios de aceptación.
2. **Límites de Dominio Estrictos**: Cada agente trabaja exclusivamente en su ámbito para evitar sobreescrituras y contaminación de contexto.
3. **Quality Gate Ineludible**: Ninguna funcionalidad, hito o refactorización se considera terminada sin el dictamen favorable de `qa-performance-compliance`.

---

## 🚀 Cómo Invocarlos

### 1. Desde la Interfaz Gráfica (Antigravity 2.0 / IDE)
- Haz clic en el selector de modelo/agente en la barra de chat y selecciona `orquestador` para interactuar con el director del proyecto.
- O escribe `/agents` en el chat para abrir la consola de gestión interactiva de agentes.

### 2. Desde la CLI
```bash
# Iniciar sesión directamente con el Orquestador:
agy --agent orquestador

# Ejecutar auditoría de calidad directamente con QA:
agy --agent qa-performance-compliance
```
