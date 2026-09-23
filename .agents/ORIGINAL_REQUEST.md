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

## Follow-up — 2026-09-22T20:34:42Z

Implementar un flujo de reserva premium multi-paso estilo Holo-Van en una página dedicada (/[locale]/reserva/[slug]) con selección de fechas y horarios, paquete de KM, política de cancelación, extras categorizados, datos personales y pago completo por Redsys, con sincronización total e inmediata en los paneles de Administración y Usuario.

Working directory: c:\Users\javi_\Desktop\Proyectos\UtopiaVanLife\UtopiaVanLife_appWb
Integrity mode: development

## Requirements

### R1. Página Dedicada de Reserva Multi-Paso (/[locale]/reserva/[slug])
Página a pantalla completa inspirada en Holo-Van:
- **Cabecera**: Galería de fotos en miniatura de la camper, modelo y barra de progreso de pasos.
- **Paso 1: Fechas y Horarios**: Calendario interactivo con franjas horarias de recogida y devolución (mañana / tarde), sincronizado con disponibilidad en tiempo real.
- **Paso 2: Paquete de Kilometraje**: Selección de 2 opciones:
  - *150 km/día* (Incluido de serie sin coste).
  - *Kilometraje Ilimitado* (+15 €/día).
- **Paso 3: Política de Cancelación**: Selección de 2 opciones:
  - *Estándar* (Incluida de serie, modificación de fechas hasta 60 días antes).
  - *Flexible* (+8 €/día, cancelación escalonada: 100% >30 días, 50% entre 29-15 días, 1 cambio de fecha gratuito >15 días).
- **Paso 4: Experiencias y Extras**: Tarjetas interactivas de extras categorizados (Equipamiento, Deporte, Confort) con precios fijos o por día.
- **Paso 5: Datos Personales & Checkout**: Formulario con nombre, apellidos, número de viajeros, DNI/NIE, teléfono, email, dirección y notas especiales. Creación o vinculación automática y transparente de cuenta en Supabase para usuarios nuevos.
- **Sticky Trip Summary (Columna Lateral)**: Tarjeta flotante que recalcula en tiempo real cada selección (alquiler base, suplemento KM, suplemento cancelación, extras, subtotal a abonar, fianza informativa y servicios incluidos de serie).
- **Barra de Navegación Inferior**: Botones accesibles de "Volver" y "Continuar" / "Confirmar y Pagar".

### R2. Integración de Pago Redsys y Webhook
- Procesamiento del 100% del coste del viaje (alquiler + km + cancelación + extras) mediante la pasarela bancaria oficial Redsys (Tarjeta bancaria / Bizum).
- Notificación online del webhook (/api/webhooks/redsys) que marca la reserva como paid, bloquea automáticamente el intervalo en blocked_dates para asegurar el calendario y mantiene el estado pendiente de confirmación manual por el administrador.

### R3. Sincronización Integral en Paneles de Administración y Usuario
- **Panel de Administración (/admin/bookings)**: El detalle de cada reserva debe mostrar explícitamente el paquete de KM elegido, la política de cancelación contratada, el desglose pormenorizado de importes, los extras y los datos de contacto y facturación del cliente.
- **Calendario del Administrador (/admin/calendar)**: El bloqueo de fechas debe reflejarse inmediatamente.
- **Panel del Cliente (/dashboard)**: Si el usuario es nuevo, su cuenta queda creada y puede acceder a /dashboard y /dashboard/documentos para visualizar su reserva, facturas y aportar documentación del conductor.

### R4. Suite de Pruebas de Integración y Verificación Externa
- Pruebas automatizadas de extremo a extremo que validen el cálculo de precios con paquetes de KM y políticas de cancelación, la persistencia en base de datos, el bloqueo de calendario y la visualización en los paneles de administración y usuario.

## Acceptance Criteria

### Experiencia de Usuario y Wizard Multi-Paso
- [ ] La ruta /[locale]/reserva/[slug] permite recorrer los 5 pasos sin errores, validando los campos obligatorios antes de permitir avanzar y conservando el estado al retroceder.
- [ ] El resumen lateral ("YOUR TRIP") actualiza en tiempo real el precio total, suplementos de KM y cancelación, extras y la fianza informativa de forma reactiva.
- [ ] La selección de franjas horarias y fechas respeta los bloqueos existentes en blocked_dates y bookings.

### Persistencia y Pagos
- [ ] Al completar el formulario de datos personales con un nuevo email, se crea/asocia la cuenta en Supabase y la reserva almacena km_package, cancellation_policy, extras_selected, datos de facturación y el desglose de importes.
- [ ] Al pulsar "Pagar", se genera el formulario firmado de Redsys y tras la confirmación del webhook, la reserva pasa a paid y las fechas quedan bloqueadas en el calendario.

### Integración en Paneles Admin y User
- [ ] La reserva aparece en /admin/bookings con todas las especificaciones (paquete KM, política de cancelación, extras, cliente).
- [ ] El nuevo usuario puede acceder a su /dashboard y encontrar su reserva registrada.

### Calidad de Código y Validación
- [ ] Todos los tests de la suite (npm test) se ejecutan y superan con 0 fallos.
- [ ] El comando de compilación npm run build finaliza con éxito con 0 errores de TypeScript y linting.

## 2026-09-22T23:38:33Z

Rediseñar la experiencia visual de Utopia Van Life elevando la marca a un nivel premium con una estética **Cinematográfica Dark Mode / Outdoor Nocturno** (fondo carbón mate, acentos dorados y ámbar cálido, tipografía editorial y contrastes elegantes), aprovechando el rico catálogo multimedia de `public/` (vídeos de fondo, tours de vídeo, planos blueprint interactivos con hotspots, y fotografía de NEO y SPACE) con micro-animaciones interactivas fluidas inspiradas en Emil Kowalski y Framer Motion, manteniendo una interfaz limpia, visual y sin sobrecarga cognitiva.

Working directory: c:\Users\javi_\Desktop\Proyectos\UtopiaVanLife\UtopiaVanLife_appWb
Integrity mode: development

## Requirements

### R1. Hero Cinematográfico Dark Mode con Vídeo de Fondo y Buscador
- Fondo inmersivo con vídeo cinematográfico nocturno/outdoor (`public/videos/video_noche_min.mp4` o `hero-bg.mov`) con fallback de póster de alta calidad y overlay oscuro graduado.
- Tipografía editorial de alto impacto con titulares espaciados, badges sutiles y acentos cálidos.
- Barra de búsqueda de fechas y pasajeros integrada con estética dark glassmorphism (desenfoque `backdrop-blur-md`, bordes sutiles y feedback interactivo).

### R2. Showcase Interactivo de Campers NEO & SPACE
- Selector de modelo fluido entre **NEO** y **SPACE** con animación de transición spring.
- Cuatro modos de exploración interactiva por modelo:
  1. *Exterior*: Renders y fotografías exteriores de alta definición (`public/images/campers/[slug]/exterior/`).
  2. *Interior*: Vistas panorámicas y detalles de salón, cocina y dormitorio (`public/images/campers/[slug]/interior/`).
  3. *Blueprint Técnico*: Plano acotado con puntos interactivos (*hotspots*) que despliegan detalles de ingeniería (540Ah Litio Victron, 400W Solar, A/C Dometic, etc.).
  4. *Vídeo Tour*: Reproductor integrado para previsualizar los clips de `public/videos/campers/[slug]/` (tours interiores, cocina, garaje).
- Botón destacado hacia el flujo de reserva (`/reserva/[slug]`).

### R3. Secciones Editoriales: Ingeniería, Artesanía y Experiencias
- Sección "Por qué Utopia / Ingeniería & Artesanía" con las fotografías de marca de `public/images/brand/` y tarjetas interactivas con iluminación sutil (spotlight hover effect y micro-animaciones Framer Motion).
- Sección de Experiencias y Rutas por Mallorca aprovechando `public/images/lifestyle/`.
- FAQ y pie de página alineados con la atmósfera cinematográfica oscura.

### R4. Fichas de Producto de Camper (`/campers/[slug]`)
- Actualización de la página individual de la camper para incorporar la galería multimedia completa, planos técnicos, reproductor de clips de vídeo y enlace directo al asistente `/reserva/[slug]`.

### R5. Rendimiento, Accesibilidad y Verificación
- Carga diferida (*lazy loading*) de vídeos e imágenes pesadas para garantizar máxima fluidez y tiempo de carga rápido.
- Soporte para `prefers-reduced-motion`.
- Verificación exhaustiva: 220/220 tests de la suite (`npm test`) pasando con 100% de éxito y compilación de producción `npm run build` sin errores.

## Acceptance Criteria

### Experiencia Visual e Interactiva
- [ ] La página principal (`/[locale]`) presenta una atmósfera coherente Dark Mode / Outdoor Nocturno con vídeo de fondo funcional, tipografía de alta gama y buscador responsive.
- [ ] El Showcase de Campers permite alternar entre NEO y SPACE y navegar entre las vistas de Exterior, Interior, Blueprint con hotspots interactivos y Vídeo Tour sin saltos bruscos.
- [ ] Las tarjetas de características y experiencias cuentan con micro-animaciones fluidas (hover, active y transiciones) que responden de inmediato sin sobrecargar el navegador.

### Conectividad y Rutas
- [ ] Todos los botones de reserva en la Home y en las fichas de producto enlazan correctamente hacia la página de reserva dedicada `/[locale]/reserva/[slug]` conservando los parámetros seleccionados.
- [ ] La página de detalle de camper `/[locale]/campers/[slug]` refleja la nueva estética premium e incorpora los assets multimedia correspondientes.

### Calidad Técnica y Build
- [ ] La suite de tests automatizados (`npm test`) mantiene el 100% de pruebas superadas (mínimo 220 tests sin fallos).
- [ ] El comando de compilación npm run build finaliza con éxito con 0 errores de TypeScript y linting.
