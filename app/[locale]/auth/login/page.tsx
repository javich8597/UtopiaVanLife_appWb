'use client'

import { useState, Suspense } from 'react'
import { Link, useRouter } from '@/i18n/routing'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, LogIn } from 'lucide-react'

function LoginForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const redirectUrl = searchParams.get('redirect') || '/dashboard'

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPwd, setShowPwd] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const formatError = (msg: string) => {
        if (msg.includes('Invalid login credentials')) {
            return 'Email o contraseña incorrectos. Por favor, verifica tus datos.'
        }
        if (msg.includes('Email not confirmed')) {
            return 'Tu email aún no ha sido confirmado. Hemos activado la confirmación directa para nuevos accesos.'
        }
        if (msg.includes('User not found')) {
            return 'No existe ninguna cuenta registrada con este email.'
        }
        return msg
    }

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        const supabase = createClient()
        const { error: err } = await supabase.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password
        })

        if (err) {
            setError(formatError(err.message))
            setLoading(false)
            return
        }

        // Force a router refresh so server components get the fresh auth session
        router.refresh()
        router.push(redirectUrl)
    }

    return (
        <div className="auth-page">
            <div className="auth-page__bg" />
            <div className="auth-page__card">
                <div className="auth-page__header">
                    <Link href="/" className="auth-page__logo">Utopia Van Life</Link>
                    <h1 className="text-h3" style={{ marginTop: 'var(--space-2)' }}>Bienvenido de vuelta</h1>
                    <p className="text-small" style={{ color: 'var(--gray-600)' }}>Accede a tu aventura</p>
                </div>

                <form onSubmit={handleLogin} className="auth-page__form">
                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input
                            type="email"
                            className="form-input"
                            placeholder="tu@email.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Contraseña</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPwd ? 'text' : 'password'}
                                className="form-input"
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                autoComplete="current-password"
                                style={{ paddingRight: '2.5rem' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPwd(!showPwd)}
                                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)', background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div style={{ padding: '0.75rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', fontSize: '0.875rem' }}>
                            {error}
                        </div>
                    )}

                    <button type="submit" className="btn btn-forest btn-lg" style={{ width: '100%' }} disabled={loading}>
                        {loading ? (
                            <span className="animate-spin" style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block' }} />
                        ) : (
                            <><LogIn size={18} /> Entrar</>
                        )}
                    </button>
                </form>

                <div className="auth-page__footer">
                    <p className="text-small" style={{ color: 'var(--gray-600)', textAlign: 'center' }}>
                        ¿No tienes cuenta?{' '}
                        <Link href="/auth/register" style={{ color: 'var(--forest-green)', fontWeight: 600 }}>Regístrate</Link>
                    </p>
                </div>
            </div>

            <style jsx>{`
        .auth-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-6);
          position: relative;
          background: var(--white-broken);
        }
        .auth-page__bg {
          position: fixed;
          inset: 0;
          background: url('https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?w=1400&q=60') center/cover;
          opacity: 0.06;
          z-index: 0;
        }
        .auth-page__card {
          position: relative;
          z-index: 1;
          background: white;
          border-radius: var(--radius-xl);
          padding: var(--space-10);
          width: 100%;
          max-width: 420px;
          box-shadow: var(--shadow-xl);
          display: flex;
          flex-direction: column;
          gap: var(--space-6);
        }
        .auth-page__logo {
          font-family: var(--font-display);
          font-size: 1.3rem;
          color: var(--black-matte);
        }
        .auth-page__form {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }
      `}</style>
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Cargando...</div>}>
            <LoginForm />
        </Suspense>
    )
}
