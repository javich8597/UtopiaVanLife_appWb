# Reglas comunes de los agentes de Utopia Van Life

Todo agente de `.claude/agents/` lee este archivo y `AGENTS.md` antes de empezar. Si algo de aquí choca con el encargo, para y dilo.

## 1. Seguridad del entorno

- `.env.local` apunta a la **base de datos Supabase real**: el servidor local escribe en datos reales. Redsys está en modo `test`.
- Sin permiso expreso de Javier **no** hagas: escrituras en base de datos o Storage, migraciones aplicadas, altas de cuentas, reservas de prueba, envíos de formularios, ni llamadas a Redsys producción.
- En el navegador, recorre los flujos solo hasta justo antes de enviar. Si no puedes llegar más lejos, márcalo como "sin verificar".
- Nunca muestres, copies ni registres valores de `.env.local`. Puedes citar nombres de variables.
- No hagas commit, push, merge ni despliegues salvo que te lo pidan.

## 2. Verde no significa que funcione

Las rondas de agentes de septiembre dieron "VICTORY CONFIRMED", "CLEAN" y "production-ready" con todos los tests pasando. Después aparecieron estos fallos en producción:

| Fallo real | Por qué no lo vieron |
|---|---|
| Un cliente podía hacerse `role = admin` desde el navegador | Revisaron las API, no las políticas RLS ni las columnas |
| La firma del contrato nunca se guardaba (faltaban columnas) | El código y los tests no tocan la base de datos real |
| La web pública no veía las reservas confirmadas (RLS) | Los tests usan datos en memoria, sin el rol del visitante |
| "Volver al pago" llamaba a una API inexistente | Nadie siguió el flujo de punta a punta |
| Fechas desplazadas un día | Tests en una sola zona horaria |

Consecuencias:

- Ningún test de `tests/` toca Supabase, RLS, Storage ni Redsys real. Pasar los tests no prueba nada de eso.
- Comprueba cada frontera: botón → ruta que existe → columna que existe → política que lo permite con **ese rol**.
- Prohibido dar veredictos globales ("production-ready", "todo correcto"). Di qué comprobaste y cómo.
- Los informes de `.agents/teamwork_preview_*` son históricos. No te fíes de sus conclusiones.
- Antes de empezar, ejecuta `git fetch` y mira si `origin/master` trae trabajo nuevo. También se trabaja en este repositorio con otras herramientas (los agentes de `.agents/agents/` son de Antigravity).

## 3. Niveles de evidencia

Etiqueta cada afirmación importante:

- **EJECUTADO**: lo viste funcionar (comando, navegador, consulta) y citas el resultado.
- **LEÍDO**: lo deduces del código y citas `archivo:línea`.
- **SIN VERIFICAR**: no pudiste comprobarlo. Di qué haría falta.

Nunca presentes algo LEÍDO como EJECUTADO.

## 4. Fuentes de verdad

- Gana el código. `PROJECT.md` está parcialmente desfasado (habla de reembolsos con Stripe; el pago es Redsys).
- Datos de las campers: https://www.utopiavanlife.com/ y https://nomade-nation.com/es-es
- Confirmado por Javier: SPACE tiene 2 plazas; ninguna camper tiene Starlink; las sillas de camping están incluidas; snorkel y mesa no están incluidos; no mencionar el material de las sábanas.
- Si falta un dato de negocio, pregúntalo. No lo inventes: ni precios, ni reseñas, ni cláusulas, ni especificaciones.

## 5. Forma de trabajar

- Lee el código antes de opinar y reutiliza lo existente en `lib/`.
- Cambios mínimos y dentro de tu territorio. Si el problema es de otro especialista, indícalo en "Traspasos".
- Al tocar lógica, añade un test que falle sin tu cambio. Estilo del proyecto: `node:test` con `tsx`, en `tests/`.
- Comprobaciones: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`. En la vista previa usa la configuración `next-dev` de `.claude/launch.json`.
- Fechas de reserva: cadenas `YYYY-MM-DD`. No uses `toISOString()` sobre fechas locales.
- Estilo de commits, si te los piden: `fix(area): descripción en español`.

## 6. Informe final

Escribe en español claro, sin relleno:

1. **Resultado**: una o dos frases.
2. **Cambios**: archivos y motivo.
3. **Evidencia**: con las etiquetas de la sección 3.
4. **Sin verificar y riesgos**.
5. **Traspasos**: qué debe mirar otro especialista.
6. **Decisiones para Javier**, si las hay.
