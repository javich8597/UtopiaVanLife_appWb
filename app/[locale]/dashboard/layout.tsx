import { cookies } from 'next/headers'
import { redirect } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/server'
import { USER_THEME_COOKIE } from '@/lib/user/theme'
import DashboardNavClient from './DashboardNavClient'

export default async function DashboardLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect({ href: '/auth/login?redirect=/dashboard', locale })
    return null
  }

  // Get user profile data
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  const cookieStore = await cookies()
  const initialTheme = cookieStore.get(USER_THEME_COOKIE)?.value === 'dark' ? 'dark' : 'light'

  return (
    <DashboardNavClient user={user} profile={profile} initialTheme={initialTheme}>
      {children}
    </DashboardNavClient>
  )
}
