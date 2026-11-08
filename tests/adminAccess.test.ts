import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { NextRequest } from 'next/server'
import { isAdminSession } from '../lib/admin/auth'
import { middleware } from '../middleware'

describe('Control de acceso a /admin: isAdminSession', () => {
  it('un admin de public.users entra aunque no tenga app_metadata', async () => {
    assert.equal(await isAdminSession({ app_metadata: {} }, async () => 'admin'), true)
  })

  it('un admin de app_metadata entra sin consultar la base', async () => {
    let queried = false
    const ok = await isAdminSession({ app_metadata: { role: 'admin' } }, async () => { queried = true; return 'customer' })
    assert.equal(ok, true)
    assert.equal(queried, false)
  })

  it('un cliente no entra', async () => {
    assert.equal(await isAdminSession({ app_metadata: {} }, async () => 'customer'), false)
    assert.equal(await isAdminSession({ app_metadata: {} }, async () => null), false)
    assert.equal(await isAdminSession({ app_metadata: {} }, async () => undefined), false)
  })

  it('si falla la lectura del rol, se deniega', async () => {
    assert.equal(await isAdminSession({ app_metadata: {} }, async () => { throw new Error('RLS') }), false)
  })

  it('sin usuario no entra', async () => {
    assert.equal(await isAdminSession(null, async () => 'admin'), false)
  })

  it('user_metadata.role no concede acceso', async () => {
    const user = { app_metadata: {}, user_metadata: { role: 'admin' }, role: 'admin' } as { app_metadata: Record<string, unknown> }
    assert.equal(await isAdminSession(user, async () => 'customer'), false)
  })
})

/**
 * Ejecuta el middleware real con un Supabase simulado: la sesión llega en la cookie y las
 * llamadas a Auth y a public.users las contesta fetch, que no puede salir a ninguna red.
 */
describe('Control de acceso a /admin: middleware real', () => {
  const env = { ...process.env }
  const realFetch = globalThis.fetch
  const FAKE_SUPABASE = 'https://supabase.test'
  let authUser: Record<string, unknown> = {}
  let dbRole: string | null = null
  let usersQueries = 0

  before(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = FAKE_SUPABASE
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-de-test'

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = new URL(input instanceof Request ? input.url : String(input))
      assert.equal(url.origin, FAKE_SUPABASE, 'El test no debe llamar a ningún servicio real')
      const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
      if (url.pathname === '/auth/v1/user') return json(authUser)
      if (url.pathname === '/rest/v1/users') {
        usersQueries++
        return json(dbRole ? { role: dbRole } : null)
      }
      return json([])
    }) as typeof fetch
  })

  after(() => {
    globalThis.fetch = realFetch
    process.env = env
  })

  function sessionCookie() {
    const session = {
      access_token: 'token-de-test',
      refresh_token: 'refresh-de-test',
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: authUser,
    }
    return `sb-supabase-auth-token=base64-${Buffer.from(JSON.stringify(session)).toString('base64url')}`
  }

  async function enter(path: string) {
    usersQueries = 0
    const res = await middleware(new NextRequest(`http://localhost${path}`, { headers: { cookie: sessionCookie() } }))
    return { location: res.headers.get('location'), status: res.status }
  }

  const baseUser = { id: 'u1', aud: 'authenticated', role: 'authenticated', email: 'x@example.com', created_at: '2026-01-01T00:00:00Z' }

  it('un cliente que se pone role admin en user_metadata no entra en /admin', async () => {
    authUser = { ...baseUser, app_metadata: {}, user_metadata: { role: 'admin' } }
    dbRole = 'customer'
    const { location } = await enter('/es/admin/bookings')
    assert.match(location ?? '', /\/es\/auth\/login$/)
  })

  it('un admin de public.users entra en /admin', async () => {
    authUser = { ...baseUser, app_metadata: {}, user_metadata: {} }
    dbRole = 'admin'
    const { location } = await enter('/es/admin/bookings')
    assert.doesNotMatch(location ?? '', /auth\/login/)
    assert.equal(usersQueries, 1)
  })

  it('un admin de app_metadata entra en /admin', async () => {
    authUser = { ...baseUser, app_metadata: { role: 'admin' }, user_metadata: {} }
    dbRole = 'customer'
    const { location } = await enter('/es/admin')
    assert.doesNotMatch(location ?? '', /auth\/login/)
  })

  it('un cliente normal no entra y fuera de /admin no se consulta el rol', async () => {
    authUser = { ...baseUser, app_metadata: {}, user_metadata: {} }
    dbRole = 'customer'
    assert.match((await enter('/es/admin')).location ?? '', /\/es\/auth\/login$/)
    await enter('/es/dashboard')
    assert.equal(usersQueries, 0)
  })
})

describe('Control de acceso a /admin: ningún sitio fía de user_metadata', () => {
  const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

  it('el middleware no lee user_metadata', () => {
    const src = stripComments(readFileSync(new URL('../middleware.ts', import.meta.url), 'utf8'))
    assert.doesNotMatch(src, /user_metadata/)
  })

  it('isAdminUser ignora user_metadata', async () => {
    const { isAdminUser } = await import('../lib/admin/auth')
    assert.equal(isAdminUser({ user_metadata: { role: 'admin' } }), false)
  })
})
