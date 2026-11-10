---
name: entorno-comprobaciones
description: Cómo ejecutar tests, lint y mutantes sin colgarse ni tocar la base real (Windows, sin Python), y por qué los tests de rutas usan tests/helpers/fakeSupabase.ts
metadata:
  type: project
---

`npm run lint` completo no termina: entra en `.claude/worktrees/**/.next`. Ejecuta `npx eslint <archivos>` solo sobre lo tocado (`-f json` si hace falta listar; el formato `unix` ya no viene con ESLint). `npm run build` no se ha ejecutado porque cargaría `.env.local`, que apunta a la base real. `npx tsc --noEmit` tardaba y daba 2 errores en `.next/**/validator.ts` por la ruta borrada `create-order`; con `.next` limpio (2026-11-09) sale limpio en ~1 min. Varios especialistas trabajan a la vez en la misma carpeta: `git status` enseña cambios que no son tuyos, así que no uses `git stash`, `git checkout --` ni commits que arrastren archivos ajenos, y mira de quién es cada archivo antes de tocarlo.

**Why:** varios especialistas comparten la carpeta y las reglas prohíben peticiones a Supabase real.

**How to apply:** para probar que un test detecta un fallo sin tocar la carpeta compartida, copia `lib`, `tests`, `app/api`, `tsconfig.json` y `package.json` a `$TMP/...`, crea el junction con `cmd //c mklink //J <copia>\node_modules <repo>\node_modules`, muta con `sed` y ejecuta `npx tsx --test` desde la copia; al acabar, `cmd //c rmdir` del junction antes de `rm -rf`. Nunca uses `git stash`. No hay Python en la máquina: edita con Edit/sed. Las rutas se ejecutan con `tests/helpers/fakeSupabase.ts`, importado antes que la ruta; para cruzar dos rutas reales (webhook y reintento), envuelve `globalThis.fetch` y detén el PATCH de un lado hasta que el otro termine (ver `tests/webhookRetryRace.test.ts`). Los resúmenes `ℹ tests/pass/fail/todo` salen con `--test-reporter=spec`.
