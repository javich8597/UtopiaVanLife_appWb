import Module from 'node:module'

/**
 * Supabase simulado para ejecutar rutas reales sin salir a la red: PostgREST, Auth y Storage en
 * memoria, detrás de `fetch`. No prueba RLS, triggers, columnas ni el comportamiento real de Auth.
 * Hay que importarlo antes que la ruta: sustituye `next/headers`, que necesita una petición de Next.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>

export const FAKE_SUPABASE = 'https://supabase.test'
const SESSION_COOKIE = 'sb-supabase-auth-token'

export interface RecordedRequest {
    method: string
    path: string
    query: URLSearchParams
    headers: Headers
    body: unknown
}

let sessionUser: Row | null = null

const loader = Module as unknown as { _load: (request: string, ...rest: unknown[]) => unknown }
const originalLoad = loader._load
loader._load = function (this: unknown, request: string, ...rest: unknown[]) {
    if (request !== 'next/headers') return originalLoad.call(this, request, ...rest)
    return {
        cookies: async () => ({
            getAll: () => sessionUser
                ? [{
                    name: SESSION_COOKIE,
                    value: JSON.stringify({
                        access_token: 'token-de-test',
                        refresh_token: 'refresco-de-test',
                        token_type: 'bearer',
                        expires_in: 3600,
                        expires_at: Math.floor(Date.now() / 1000) + 3600,
                        user: sessionUser,
                    }),
                }]
                : [],
            set() {},
        }),
    }
}

/** Las cuentas se simulan confirmadas salvo que el test ponga `email_confirmed_at: null` */
const confirmed = (user: Row) => ({ email_confirmed_at: '2026-01-01T00:00:00Z', ...user })

const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
    new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', ...headers } })

/** Comodines de LIKE: lo justo para `%texto%` */
const likeMatches = (value: unknown, pattern: string) =>
    typeof value === 'string' && value.includes(pattern.replace(/^[%*]|[%*]$/g, ''))

function matches(row: Row, column: string, filter: string): boolean {
    const dot = filter.indexOf('.')
    const op = filter.slice(0, dot)
    const value = filter.slice(dot + 1)
    const cell = row[column]
    switch (op) {
        case 'eq': return String(cell) === value
        case 'neq': return cell !== null && cell !== undefined && String(cell) !== value
        case 'is': return value === 'null' ? cell === null || cell === undefined : String(cell) === value
        case 'in': return value.replace(/^\(|\)$/g, '').split(',').map(v => v.replace(/"/g, '')).includes(String(cell))
        case 'lte': return String(cell) <= value
        case 'gte': return String(cell) >= value
        case 'lt': return String(cell) < value
        case 'like': return likeMatches(cell, value)
        default: throw new Error(`Filtro no simulado: ${column}=${filter}`)
    }
}

const RESERVED_PARAMS = ['select', 'limit', 'order', 'on_conflict', 'columns']

export function installFakeSupabase(initial: Record<string, Row[]> = {}) {
    const tables: Record<string, Row[]> = {
        campers: [], users: [], bookings: [], blocked_dates: [],
        seasons_v2: [], season_periods: [], duration_discounts: [], extras: [],
        ...initial,
    }
    const authUsers: Row[] = []
    let nextAuthId = 0
    const requests: RecordedRequest[] = []
    const failures: { table?: string; method?: string } = {}
    let beforeWrite: { table: string; run: () => void } | null = null

    const previousEnv = {
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    }
    const realFetch = globalThis.fetch
    process.env.NEXT_PUBLIC_SUPABASE_URL = FAKE_SUPABASE
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-de-test'
    // Tiene la forma que exige isValidServiceRoleKey (empieza por "eyJ" y pasa de 50 caracteres):
    // en producción la clave es obligatoria, y las rutas que no la ven válida responden 503 en lugar
    // de seguir con la sesión del cliente. No es una clave real ni abre nada: el fetch está simulado
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiJ9.clave-de-test-sin-valor-real.firma-de-test'

    function rest(req: RecordedRequest, table: string): Response {
        if (failures.table === table && failures.method === req.method) {
            return json({ message: 'fallo simulado', code: 'XX000' }, 500)
        }
        if (req.method !== 'GET' && beforeWrite?.table === table) {
            const { run } = beforeWrite
            beforeWrite = null
            run()
        }

        const rows = (tables[table] ??= [])
        const selected = () => {
            const found = rows.filter(row => [...req.query.entries()].every(([column, filter]) =>
                RESERVED_PARAMS.includes(column) || matches(row, column, filter)))
            const limit = Number(req.query.get('limit'))
            return limit > 0 ? found.slice(0, limit) : found
        }
        const prefer = req.headers.get('prefer') || ''
        const reply = (data: Row[]) => {
            if (!prefer.includes('return=representation') && req.method !== 'GET') return new Response(null, { status: 204 })
            if ((req.headers.get('accept') || '').includes('vnd.pgrst.object')) {
                return data.length === 1 ? json(data[0]) : json({ message: 'sin una sola fila' }, 406)
            }
            return json(data)
        }

        if (req.method === 'GET') return reply(selected())
        if (req.method === 'POST') {
            const incoming = (Array.isArray(req.body) ? req.body : [req.body]) as Row[]
            const inserted: Row[] = []
            for (const values of incoming) {
                const existing = rows.find(r => values.id !== undefined && r.id === values.id)
                if (existing && prefer.includes('ignore-duplicates')) continue
                if (existing) { Object.assign(existing, values); inserted.push(existing); continue }
                const row = { id: `${table}-${rows.length + 1}`, ...values }
                rows.push(row)
                inserted.push(row)
            }
            return reply(inserted)
        }
        if (req.method === 'PATCH') {
            const found = selected()
            found.forEach(row => Object.assign(row, req.body as Row))
            return reply(found)
        }
        if (req.method === 'DELETE') {
            const found = selected()
            tables[table] = rows.filter(row => !found.includes(row))
            return reply(found)
        }
        throw new Error(`Método no simulado: ${req.method}`)
    }

    function auth(req: RecordedRequest): Response {
        if (req.path === '/auth/v1/user') return sessionUser ? json(confirmed(sessionUser)) : json({ message: 'sin sesión' }, 401)
        if (req.path === '/auth/v1/admin/users' && req.method === 'POST') {
            const { email, user_metadata } = req.body as Row
            if (authUsers.some(u => u.email === email)) {
                return json({ code: 422, error_code: 'email_exists', msg: 'Ya existe' }, 422)
            }
            nextAuthId++
            const user = { id: `00000000-0000-4000-8000-${String(nextAuthId).padStart(12, '0')}`, aud: 'authenticated', email, user_metadata }
            authUsers.push(user)
            return json(user)
        }
        const byId = req.path.match(/^\/auth\/v1\/admin\/users\/(.+)$/)
        if (byId && req.method === 'DELETE') {
            authUsers.splice(authUsers.findIndex(u => u.id === byId[1]), 1)
            return json({})
        }
        if (byId && req.method === 'PUT') {
            if (failures.table === 'auth') return json({ code: 500, msg: 'fallo simulado' }, 500)
            const user = authUsers.find(u => u.id === byId[1])!
            Object.assign(user, req.body as Row)
            return json(confirmed(user))
        }
        if (byId && req.method === 'GET') {
            const user = authUsers.find(u => u.id === byId[1])
            return user ? json(confirmed(user)) : json({ code: 404, msg: 'No existe' }, 404)
        }
        if (req.path === '/auth/v1/admin/users' && req.method === 'GET') {
            return json({ users: authUsers.map(confirmed), aud: 'authenticated' }, 200, { 'x-total-count': String(authUsers.length) })
        }
        throw new Error(`Auth no simulado: ${req.method} ${req.path}`)
    }

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        const request = input instanceof Request ? input : new Request(input, init)
        const url = new URL(request.url)
        if (url.origin !== FAKE_SUPABASE) throw new Error(`El test no debe llamar a ${url.origin}`)

        const raw = init?.body ?? (input instanceof Request ? await input.clone().text() : undefined)
        const isText = typeof raw === 'string'
        const recorded: RecordedRequest = {
            method: request.method,
            path: url.pathname,
            query: url.searchParams,
            headers: request.headers,
            body: isText && raw ? JSON.parse(raw) : raw,
        }
        requests.push(recorded)

        if (url.pathname.startsWith('/rest/v1/')) return rest(recorded, url.pathname.slice('/rest/v1/'.length))
        if (url.pathname.startsWith('/auth/v1/')) return auth(recorded)
        if (url.pathname.startsWith('/storage/v1/object/') && failures.table === 'storage') {
            return json({ statusCode: '500', error: 'fallo', message: 'fallo simulado' }, 500)
        }
        if (url.pathname.startsWith('/storage/v1/')) return json({ Id: 'id', Key: 'key', name: 'documents' })
        throw new Error(`Ruta no simulada: ${url.pathname}`)
    }) as typeof fetch

    return {
        tables,
        authUsers,
        requests,
        failures,
        /** Se ejecuta justo antes de la siguiente escritura en esa tabla */
        onBeforeWrite(table: string, run: () => void) { beforeWrite = { table, run } },
        setSession(user: Row | null) { sessionUser = user },
        writesTo: (table: string) => requests.filter(r => r.path === `/rest/v1/${table}` && r.method !== 'GET'),
        restore() {
            sessionUser = null
            globalThis.fetch = realFetch
            for (const [key, value] of Object.entries(previousEnv)) {
                if (value === undefined) delete process.env[key]
                else process.env[key] = value
            }
        },
    }
}
