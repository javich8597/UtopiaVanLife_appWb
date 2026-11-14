import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isValidServiceRoleKey } from '@/lib/admin/auth'
import {
  cronConfirmEnabled,
  cronSecretConfigured,
  isCronAuthorized,
  recordCronRun,
  runCronRetention,
} from '@/lib/admin/retentionCron'

/**
 * TAREA SEMANAL DE CONSERVACIÓN: purga de la documentación de identidad, lanzada por Vercel Cron.
 *
 *   GET /api/cron/retention/documents        (la programa `vercel.json`)
 *
 * Es una puerta APARTE de `POST /api/admin/retention/documents`, que sigue exigiendo sesión de
 * administrador y no se ha tocado. Esta autentica por secreto: Vercel envía
 * `Authorization: Bearer <CRON_SECRET>` si la variable CRON_SECRET existe en el proyecto. La
 * comparación es de tiempo constante y, si la variable no está definida (o tiene menos de 16
 * caracteres), la ruta DENIEGA siempre: la ausencia de secreto no abre nada.
 *
 * No acepta parámetros: ni `confirm`, ni cliente, ni reserva, ni tope. Ni la cabecera ni la URL
 * pueden ampliar lo que hace. Siempre revisa toda la base, hasta 50 reservas por plazo y pasada.
 *
 * ARRANCA EN SIMULACIÓN. Con `RETENTION_CRON_CONFIRM` ausente o distinta de «true», la tarea solo
 * simula: no borra nada, y deja el resultado en `retention_cron_runs` para revisarlo. Javier quiere
 * revisar las primeras semanas antes de darle permiso de borrar.
 *
 * CÓMO SE DA PERMISO DE BORRAR (cuando llegue el momento): en Vercel, Project Settings ->
 * Environment Variables, definir `RETENTION_CRON_CONFIRM=true` en Production y volver a desplegar
 * (las variables nuevas no llegan a los despliegues anteriores). Para volver a simular, borrar la
 * variable o ponerle cualquier otro valor y volver a desplegar. El modo de cada ejecución queda
 * escrito en `retention_cron_runs.mode`.
 *
 * Con confirmación, encadena pasadas hasta vaciar la cola (`runCronRetention`): tope de 10 vueltas y
 * de 45 s, y se detiene si lo que queda está atascado. Las atascadas necesitan mano humana: la
 * pantalla /admin/conservacion las lista.
 *
 * Exige la clave de servicio igual que la ruta del administrador (503 si no hay una válida). Los
 * errores se registran en el log del servidor; nunca se devuelve `error.message`.
 *
 * Quién la lanzó: en `retention_purge_log.ran_by` queda NULL (ninguna persona) y la pantalla lo
 * muestra como «Tarea programada». Un administrador a mano siempre deja su id.
 */

export const dynamic = 'force-dynamic'
/** 60 s: el máximo que admiten todos los planes de Vercel. El presupuesto del bucle es de 45 s */
export const maxDuration = 60

export async function GET(request: Request) {
  try {
    if (!isCronAuthorized(request.headers.get('authorization'))) {
      if (!cronSecretConfigured()) {
        console.error('retention cron: CRON_SECRET no está definido (o es demasiado corto); se deniega toda petición')
      }
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!isValidServiceRoleKey(serviceKey) || !url) {
      console.error('retention cron: sin SUPABASE_SERVICE_ROLE_KEY válida; no se puede purgar')
      return NextResponse.json(
        { error: 'El servidor no tiene el acceso privilegiado a la base de datos configurado: no se puede ejecutar la purga.' },
        { status: 503 }
      )
    }
    // Siempre con la clave de servicio: aquí no hay sesión a la que recurrir
    const db = createClient(url, serviceKey!.trim(), { auth: { persistSession: false, autoRefreshToken: false } })

    const confirm = cronConfirmEnabled()
    const ranAt = new Date()
    const result = await runCronRetention(db, { confirm })
    const recorded = await recordCronRun(db, result, ranAt)

    console.info('[retención] tarea semanal terminada', {
      mode: result.mode,
      outcome: result.outcome,
      stopReason: result.stopReason,
      passes: result.passes,
      durationMs: result.durationMs,
      ...result.totals,
      stalled: result.stalledTotal,
      truncated: result.truncated,
      recorded,
    })

    if (result.outcome === 'error') {
      return NextResponse.json({ error: 'No se pudo ejecutar la tarea de conservación', mode: result.mode, recorded }, { status: 500 })
    }
    // Un 409 deja la ejecución en rojo en el panel de Vercel Cron: es lo que se quiere cuando la
    // purga se niega (falta la migración o la sonda de sello falló). No se ha borrado nada
    const status = result.outcome === 'blocked' ? 409 : 200
    return NextResponse.json(
      {
        ok: result.outcome !== 'blocked',
        mode: result.mode,
        outcome: result.outcome,
        stopReason: result.stopReason,
        passes: result.passes,
        durationMs: result.durationMs,
        totals: result.totals,
        truncated: result.truncated,
        stalled: result.stalledTotal,
        warnings: result.warnings,
        ...(result.blocked ? { blocked: result.blocked } : {}),
        recorded,
        ...(recorded ? {} : { recordWarning: 'No se pudo guardar el resultado en retention_cron_runs (¿está aplicada la migración 20261115?). Consta solo en el log del servidor.' }),
      },
      { status }
    )
  } catch (error) {
    console.error('retention cron error:', error)
    return NextResponse.json({ error: 'No se pudo ejecutar la tarea de conservación' }, { status: 500 })
  }
}
