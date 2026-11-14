---
name: render-de-pantallas-sin-props
description: Cómo renderizar en servidor un componente cliente que no recibe props (estado interno de fetch+useEffect) sembrando useState por orden, para probar la pantalla con datos sin navegador ni jsdom
metadata:
  type: feedback
---

Para probar una pantalla cuyo estado viene de `fetch` dentro de `useEffect` y que **no recibe props** (p. ej. `app/[locale]/admin/conservacion/RetentionClient.tsx`), `renderToStaticMarkup` solo da la vista de «cargando»: los efectos no corren en servidor y aquí no hay jsdom ni testing-library (no están en `devDependencies`, y añadirlas sería tocar `package.json`).

Receta que funciona (2026-11-14, `tests/qa_retencionQuintaRonda.test.ts`): **sembrar `useState` por orden de declaración**. `tsx` compila los tests y los componentes a CJS, así que `import { useState } from 'react'` acaba siendo un acceso a la propiedad del módulo en cada llamada: sustituir `React.useState` (el default import ES el objeto de exports del módulo) antes de `renderToStaticMarkup` y restaurarlo en un `finally` intercepta las llamadas del componente.

```ts
const reactModule = React as unknown as { useState: (i: unknown) => [unknown, unknown] }
// i-ésima llamada -> STATE_ORDER[i]; si el nombre está en `seed`, se devuelve el valor sembrado
```

Reglas para que no se quede en verde midiendo otra cosa:

- Un test aparte comprueba que el render por defecto consume **exactamente** tantos `useState` como nombres conoce la lista, con un mensaje que dice «revisa el orden de los useState». Si alguien añade o reordena un estado, sale rojo en vez de sembrar el estado equivocado.
- Los hijos (iconos de lucide, `AdminStatTiles`) no usan `useState`, así que no desplazan el orden; si algún día lo usan, el test del recuento lo dice.
- Para saber si un botón está bloqueado: localizar el texto y cortar hacia atrás hasta el `<button` anterior; React escribe `disabled=""`.
- `<style jsx>` en servidor imprime el aviso «Received `true` for a non-boolean attribute `jsx`». Es ruido conocido de estos tests, no un fallo.

**Why:** 31 tests de la pantalla de conservación eran `grep` sobre el código fuente. Un `grep` muere con cualquier cambio del texto, pero **sobrevive a desactivar la guarda dejando el texto intacto** (`!isPurgeConfirmText(confirmText) && false`): decía que el borrado en dos pasos estaba comprobado y no lo estaba. Con el render sembrado murieron 16 mutaciones de comportamiento de la pantalla que el `grep` no veía.

**How to apply:** úsalo para pantallas con estado interno (listas vacías, errores, modales por pasos, avisos de la respuesta). Lo que sigue SIN VERIFICAR aunque el render pase: estilos, 375/1280 px, tema oscuro, foco, bloqueo de scroll real y cualquier guarda que solo se dispare con un clic (los `onClick` no se pueden invocar desde `renderToStaticMarkup`). Ver [[mutar-para-validar-tests]].
