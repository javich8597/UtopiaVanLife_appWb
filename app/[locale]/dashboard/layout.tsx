import { redirect } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
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
  }

  // Get user profile data
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  return (
    <>
      <Navbar />
      <main style={{ paddingTop: 104, paddingBottom: 80, minHeight: '85vh', background: 'var(--white-broken)' }}>
        <div className="container">
          <div className="dashboard-grid">
            <DashboardNavClient user={user} profile={profile} />

            {/* Main Content */}
            <div className="dashboard-content">
              {children}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
