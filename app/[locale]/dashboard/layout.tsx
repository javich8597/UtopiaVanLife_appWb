import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { BookOpen, UserCircle, LogOut } from 'lucide-react'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/auth/login?redirect=/dashboard')
  }

  // Get user profile data, using maybeSingle to avoid 406 Not Acceptable (PGRST116) if trigger is delayed
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  return (
    <>
      <Navbar />
      <main style={{ paddingTop: 100, paddingBottom: 80, minHeight: '80vh', background: 'var(--white-broken)' }}>
        <div className="container">
          <div className="dashboard-grid">
            {/* Sidebar */}
            <aside className="dashboard-sidebar">
              <div className="user-card">
                <div className="user-avatar">
                  {profile?.full_name?.charAt(0) || user.email?.charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--black-matte)' }}>{profile?.full_name || 'Viajero'}</div>
                  <div className="text-xs" style={{ color: 'var(--gray-500)' }}>{user.email}</div>
                </div>
              </div>

              <div className="sidebar-links">
                <Link href="/dashboard" className="sidebar-link">
                  <BookOpen size={18} />
                  Mis Reservas
                </Link>
                <Link href="/dashboard/profile" className="sidebar-link">
                  <UserCircle size={18} />
                  Mi Perfil & Documentos
                  {profile?.verification_status === 'not_submitted' && (
                    <span className="badge badge-warning">!</span>
                  )}
                </Link>
              </div>

              <form action="/auth/signout" method="post" style={{ marginTop: 'auto' }}>
                <button className="sidebar-link" style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--error)' }}>
                  <LogOut size={18} />
                  Cerrar Sesión
                </button>
              </form>
            </aside>

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
