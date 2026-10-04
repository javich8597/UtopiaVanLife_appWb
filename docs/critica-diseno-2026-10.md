# Crítica de diseño · Utopia Van Life (rama Black&Gold, 5 oct 2026)

Público objetivo: clientes premium que buscan aventura nómada con confort (parejas, 30-55 años, "quiet luxury").
Método: recorrido en local de la web pública y del flujo de reserva hasta justo antes del pago (sin enviar nada a Redsys ni a la base de datos), y revisión por código del panel de cliente y del admin (no inicié sesión porque usaría la base de datos real).

## Impresión general

El hero y la home transmiten exactamente lo que buscáis: negro mate, dorado contenido, fotos reales y un buscador visible desde el primer segundo. El problema no es la estética de la portada sino la **coherencia**: el cliente ve datos distintos según la página (plazas, kilómetros, sábanas, qué está incluido) y, al pulsar reservar, salta a un asistente de estilo claro y verde que parece otra marca. Para un cliente premium la confianza se pierde en esas costuras, no en el hero.

## Arreglado en la rama `claude/project-thread-wx2nb4`

| Hallazgo | Gravedad | Qué hice |
|---|---|---|
| El asistente preseleccionaba recogida 09:00 y devolución 19:00, que suman **+1 día de suplemento** (+140 € en SPACE) sin que el cliente lo eligiera. En la UE las opciones de pago no pueden venir premarcadas. | 🔴 Crítica | Ahora vienen marcadas las franjas "Estándar" (15:00 / 12:00). El suplemento solo aparece si el cliente lo elige. |
| `/checkout` antiguo llamaba a `/api/checkout/redsys/initiate`, que no existe, y calculaba otro precio (600 € frente a 700 € del asistente). Llegaban ahí el botón de la ficha de la camper y "Volver al pago" del panel. | 🔴 Crítica | `/checkout` reenvía al asistente `/reserva/[slug]` con fechas, viajeros, horarios y extras. Los dos botones van directos al asistente. |
| Los extras elegidos en la ficha se perdían al ir al pago. | 🟡 Moderada | El asistente los recibe preseleccionados. |
| Ficha de SPACE: "4 plazas / 4 Viaje-4 Descanso", mientras el asistente y la descripción dicen 2. | 🔴 Crítica | Puesto a 2 plazas en la ficha y en el selector de modelo. **Confírmalo**: si SPACE homologa 4, hay que cambiarlo en `specs.seats` y en el asistente. |
| Ficha: "Kilometraje ilimitado por toda Mallorca" incluido, pero el asistente incluye 150 km/día y cobra el ilimitado (+90 €). | 🔴 Crítica | Cambiado a "150 km/día incluidos · ilimitado opcional". |
| Login sin "¿Olvidaste tu contraseña?". | 🟡 Moderada | Nuevas páginas `/auth/recuperar` y `/auth/nueva-contrasena` con el mismo estilo Black&Gold. |
| Logo invisible en login y registro (logo oscuro sobre fondo oscuro). | 🟡 Moderada | Usa `logo-white.png`. |
| `?redirect=` del login y `?next=` de `/auth/callback` aceptaban URLs externas (open redirect). | 🟡 Moderada | Solo se aceptan rutas internas (`lib/auth/safeRedirect.ts`). |
| Cabecera del asistente en móvil: "Ficha de la camper" partido en dos líneas y el nombre del paso cortado ("echas y Horarios"). | 🟢 Menor | En ≤640px solo flecha + miniatura y los círculos de pasos (el paso ya se lee en "PASO 1 DE 5"). |
| Pestaña del navegador: "Reserva SPACE · Wizard Multi-Paso". | 🟢 Menor | "Reserva SPACE \| Utopia Van Life". |
| Panel: horarios de reserva por defecto 14-18 / 10-12, distintos a los reales 15-19 / 09-12. | 🟢 Menor | Igualados a los del asistente. |

## Necesita tu decisión o tus datos

1. **Texto "No AAAAA es sólo una camper"** en la descripción de NEO (home y listado). Viene de la base de datos: corrígelo desde Admin › Campers.
2. **Incluido vs. extra de pago.** El resumen dice que incluye "2 sillas de camping y 2 máscaras de snorkel" y la página de reservar dice "mesa exterior de cortesía", pero en el paso 4 se venden *Kit Snorkel*, *Silla de Camping* y *Mesa Plegable (18 €)*. O se quitan de extras o se quita de "incluido" (Admin › Extras).
3. **Sábanas:** la home dice "algodón percal", reservar dice "lino", la ficha "100% algodón". Dime cuál es la verdad y lo unifico.
4. **NEO:** la ficha habla de Starlink, garaje para bicis y cama 192×130; la home dice maletero 2.230 L y cama 135×190. Confirma Starlink y medidas.
5. **Precio en home** (154 €/noche "fijo") frente a 140 € en reservar para noviembre. Recomiendo poner "desde" y el precio mínimo, como hace la ficha.

## Pendiente de diseño (recomendaciones, no tocado)

1. **Asistente de reserva en Black&Gold.** Es el momento de más ansiedad (pagar 700 €+) y es el único tramo con fondo crema, verde bosque y tipografía distinta. Recomiendo pasarlo al mismo sistema oscuro/dorado que login y panel. Es el cambio de diseño de mayor impacto; puedo hacerlo en otra rama.
2. **Prueba social.** No hay reseñas, valoración Google ni fotos de clientes en todo el embudo. Para ticket alto es lo que más convierte: una franja de 3 testimonios + nota media cerca del buscador y en el paso 5.
3. **Tipografía de titulares.** Conviven tres estilos: sans negra ("Nuestra Flota"), serif ("Espacios pensados para desconectar") y cursiva degradada ("con vistas que cambian cada día", con la última letra recortada). Elegir uno para H2 y reservar la cursiva dorada solo para el acento.
4. **Botones verdes** ("Ver detalles de SPACE", chips de la galería 360°) fuera de la paleta. Pasarlos a contorno dorado.
5. **Doble ruta de pago en código.** `/api/checkout/redsys/preview` y `create-order` quedan sin uso tras el reenvío; se pueden borrar cuando confirmes que nada externo los llama.
6. **"Volver al pago" crea una reserva nueva** (la pendiente anterior caduca sola). Lo ideal es un endpoint que reintente el pago de la misma reserva.
7. **Accesibilidad:** las etiquetas del login no están asociadas a sus campos (`htmlFor`), y en la home hay textos grises pequeños sobre negro cercanos al límite de contraste.

## Lo que funciona bien

- Hero con buscador integrado y la coordenada "39.6953° N": premium sin ser ostentoso.
- Desglose económico en vivo y transparente (fianza explicada, "no se cobra ahora").
- Panel de cliente "un único siguiente paso" (pagar → carnet → contrato → recogida): muy claro.
- Admin protegido por rol tanto en la página como en todas las API.

## Para que funcione la recuperación de contraseña

En Supabase › Authentication › URL Configuration, añade a *Redirect URLs* `https://<tu-dominio>/auth/callback` (y `http://localhost:3000/auth/callback` para pruebas). Sin eso Supabase rechaza el enlace del email.
