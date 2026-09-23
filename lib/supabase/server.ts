import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
    const cookieStore = await cookies()

    const client = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // Server component - can be ignored
                    }
                },
            },
        }
    )

    if (process.env.NODE_ENV === 'development' && cookieStore.get('x-dev-test-user')?.value === 'true') {
        const originalAuthGetUser = client.auth.getUser.bind(client.auth)
        client.auth.getUser = async (jwt?: string) => {
            const realRes = await originalAuthGetUser(jwt)
            if (realRes.data?.user) return realRes
            return {
                data: {
                    user: {
                        id: 'usr-dev-javier',
                        email: 'javipn85@gmail.com',
                        user_metadata: { full_name: 'Javier' },
                        app_metadata: {},
                        aud: 'authenticated',
                        created_at: new Date().toISOString()
                    } as any
                },
                error: null
            }
        }
    }

    return client
}
