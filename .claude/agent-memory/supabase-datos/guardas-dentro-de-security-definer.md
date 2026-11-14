---
name: guardas-dentro-de-security-definer
description: Dentro de una función SECURITY DEFINER, current_user es el dueño de la función: nunca sirve para comprobar quién escribe
metadata:
  type: feedback
---

En un trigger que decide QUIÉN puede escribir una columna, no comprobar el rol con `current_user` dentro de una función `SECURITY DEFINER`, ni con `session_user` en una base de Supabase.

**Why:** dentro de una función DEFINER, `current_user` es el **dueño** de la función (`postgres`), no el rol de la sesión. Escribí `current_user NOT IN ('authenticated','anon')` creyendo que detectaba una sesión SQL directa, y esa condición era **siempre verdadera**: cualquier escritura sin claims de JWT quedaba exenta de la protección, incluida una tarea de `pg_cron`. Y `session_user` tampoco sirve: PostgREST entra como `authenticator` y hace `SET LOCAL ROLE`, así que `session_user` es siempre `authenticator`.

**How to apply:** para un trigger que solo lee NEW/OLD y un ajuste, usar `SECURITY INVOKER` (no necesita privilegios y nadie puede saltarse un trigger): ahí `current_user` sí es el rol efectivo que PostgREST fijó (`authenticated`, `anon` o `service_role`). Leer además el rol del JWT (`request.jwt.claim.role`, y de respaldo `request.jwt.claims ->> 'role'`), y escribir **lista positiva** de roles permitidos, nunca un denylist. Si hace falta una puerta para corregir a mano, que sea `SET LOCAL ROLE service_role;` en la misma transacción, y no una excepción dentro de la función.
