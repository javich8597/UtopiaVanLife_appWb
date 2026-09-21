# Original User Request

## Initial Request — 2026-09-18T00:46:57Z

Completar, pulir y validar integralmente todas las secciones y subsecciones de Usuario (/dashboard) y Administrador (/admin) en Utopia Van Life, organizando el trabajo en equipo de subagentes con roles distribuidos (implementación, verificación técnica y evaluación black-box independiente de diseño y funcionalidad).

Working directory: c:\Users\javi_\Desktop\Proyectos\UtopiaVanLife\UtopiaVanLife_appWb
Integrity mode: development

## Requirements

### R1. Finalización Integral del Área de Usuario (/dashboard)
Completar e interconectar todos los flujos y pantallas de usuario:
- Dashboard principal (`/dashboard`): información y estado de reservas activas/próximas, cuenta atrás para el viaje, check-in pendiente y accesos directos.
- Perfil (`/dashboard/profile`): visualización y actualización de datos personales, teléfono de contacto, dirección y datos del permiso de conducir.
- Documentación y Contrato (`/dashboard/documentos`): subida de carnet de conducir (anverso/reverso) y pasaporte/DNI, estados de verificación en tiempo real, modal interactivo de firma digital del contrato oficial de alquiler y generación/descarga del documento PDF firmado.
- Manual de la Camper (`/dashboard/manual`): guía de uso y operación de todos los sistemas del vehículo (electricidad 12V/220V, aguas limpias/grises, cocina de gas, techo elevable/cama, calefacción estacionaria y resolución de averías frecuentes).
- Guía de Viaje de Mallorca (`/dashboard/guia`): catálogo de spots recomendados, normativas de pernocta y acampada en la isla, puntos de recarga de agua y consejos para nómadas.

### R2. Finalización Integral del Área de Administrador (/admin)
Completar y asegurar la operatividad de todas las herramientas de gestión:
- Panel principal de métricas (`/admin`): KPIs de facturación confirmada, reservas activas, cobros pendientes, usuarios registrados y listado de últimas reservas.
- Gestión de reservas (`/admin/bookings`): filtrado por estado (confirmadas, en curso, pendientes, completadas, canceladas), búsqueda en tiempo real, modal de detalle con desglose de precios y extras, y flujos de aprobación y reembolsos.
- Calendario de ocupación (`/admin/calendar`): vista cronológica/calendario de reservas y bloqueos por vehículo.
- Gestión de campers (`/admin/campers`): inventario de la flota, especificaciones técnicas y estado de operatividad.
- Verificación de documentos (`/admin/verifications`): cola de documentos pendientes de revisión con visor de imágenes y acciones para aprobar o rechazar con motivo explícito.
- Gestión de usuarios y clientes (`/admin/users`): tabla de clientes, historial de alquileres, estado de documentación y ficha de detalle.
- Editor de plantillas de contratos (`/admin/contrato`): editor visual y persistencia de las condiciones y cláusulas legales.
- Configuración de tarifas y temporadas (`/admin/settings`): configuración de temporadas alta/media/baja y precios base por noche.

### R3. Verificación Técnica Automatizada
- La suite de tests automatizados (`npm.cmd test`) debe ejecutar y validar todos los casos sin ningún fallo.
- El build de producción de Next.js (`npm.cmd run build`) debe compilar de forma limpia con código de salida 0.
- Comprobar que no existan enlaces rotos, rutas no implementadas, botones sin acción o discrepancias de tipos en tiempo de ejecución.

### R4. Evaluación Black-Box Independiente (Funcional y Visual)
Un agente evaluador independiente sin acceso ni inspección previa del código fuente debe auditar la aplicación como usuario real y administrador exigente:
- Auditar la calidad estética y coherencia visual con la identidad de marca Utopia Van Life (diseño premium, acabados de alto nivel estilo Apple/Emil Kowalski, microinteracciones, tipografía y diseño responsive).
- Probar exhaustivamente los flujos funcionales completos: casos límite, estados vacíos (empty states), retroalimentación ante errores de red o validación y consistencia de datos entre el panel de usuario y el panel de admin.
- Emitir un veredicto estructurado e imparcial confirmando la cobertura completa y señalando cualquier defecto antes del visto bueno final.

## Acceptance Criteria

### Experiencia de Usuario (/dashboard)
- [ ] Todas las 5 subsecciones de usuario (`/dashboard`, `/profile`, `/documentos`, `/manual`, `/guia`) cargan sin errores y presentan estados vacíos atractivos si no hay datos.
- [ ] El flujo de subida de documentos y firma de contrato permite al usuario firmar digitalmente y descargar el contrato generado.
- [ ] El manual interactivo y la guía de Mallorca son totalmente navegables y ofrecen contenido estructurado y de alta calidad.

### Panel de Administración (/admin)
- [ ] Todas las 8 subsecciones de admin (`/admin`, `/bookings`, `/calendar`, `/campers`, `/verifications`, `/users`, `/contrato`, `/settings`) son plenamente operativas.
- [ ] Las acciones críticas (aprobar reserva, procesar reembolso, aprobar/rechazar documentos, guardar plantilla de contrato y tarifas de temporada) persisten los datos y actualizan el estado visual sin errores.
- [ ] La búsqueda y los filtros por estado en reservas y usuarios funcionan de manera instantánea y precisa.

### Estabilidad Técnica y Evaluación de Calidad
- [ ] `npm.cmd test` ejecuta con 0 fallos (100% tests pasando).
- [ ] `npm.cmd run build` completa con éxito (exit code 0).
- [ ] La auditoría independiente black-box certifica que tanto el diseño visual como las funcionalidades cumplen el estándar de producto premium sin cabos sueltos.
