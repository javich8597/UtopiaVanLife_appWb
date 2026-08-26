'use client'

import { useState, Suspense } from 'react'
import { Link, useRouter } from '@/i18n/routing'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { UserPlus, Eye, EyeOff } from 'lucide-react'

function RegisterForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const redirectUrl = searchParams.get('redirect') || '/dashboard?welcome=1'

    const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '' })
    const [showPwd, setShowPwd] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

    const formatError = (msg: string) => {
        if (msg.includes('User already registered') || msg.includes('already exists')) {
            return 'Este correo electrónico ya está registrado. Por favor, inicia sesión.'
        }
        if (msg.includes('Password should be at least')) {
            return 'La contraseña debe tener al menos 8 caracteres.'
        }
        return msg
    }

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        const supabase = createClient()

        const cleanEmail = form.email.trim().toLowerCase()

        const { data, error: err } = await supabase.auth.signUp({
            email: cleanEmail,
            password: form.password,
            options: {
                data: { full_name: form.full_name, phone: form.phone },
            },
        })

        if (err) {
            setError(formatError(err.message))
            setLoading(false)
            return
        }

        // If session was not immediately returned (e.g. if Supabase required sign-in), attempt sign in directly
        if (!data.session) {
            const { error: signInErr } = await supabase.auth.signInWithPassword({
                email: cleanEmail,
                password: form.password
            })
            if (signInErr) {
                // If direct signin fails, send them to login page with notice
                router.push('/auth/login')
                return
            }
        }

        router.refresh()
        router.push(redirectUrl)
    }

    return (
        <div className="auth-page">
            <div className="auth-page__bg" />
            <div className="auth-page__card">
                <div className="auth-page__header">
                    <Link href="/" className="auth-page__logo">Utopia Van Life</Link>
                    <h1 className="text-h3" style={{ marginTop: 'var(--space-2)' }}>Crea tu cuenta</h1>
                    <p className="text-small" style={{ color: 'var(--gray-600)' }}>Comienza tu aventura en Mallorca</p>
                </div>

                <form onSubmit={handleRegister} className="auth-page__form">
                    <div className="form-group">
                        <label className="form-label">Nombre completo</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="María García"
                            value={form.full_name}
                            onChange={e => set('full_name', e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input
                            type="email"
                            className="form-input"
                            placeholder="tu@email.com"
                            value={form.email}
                            onChange={e => set('email', e.target.value)}
                            required
                            autoComplete="email"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Teléfono</label>
                        <input
                            type="tel"
                            className="form-input"
                            placeholder="+34 600 000 000"
                            value={form.phone}
                            onChange={e => set('phone', e.target.value)}
                            required
                            autoComplete="tel"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Contraseña</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPwd ? 'text' : 'password'}
                                className="form-input"
                                placeholder="Mínimo 8 caracteres"
                                value={form.password}
                                onChange={e => set('password', e.target.value)}
                                required
                                minLength={8}
                                autoComplete="new-password"
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
                            <><UserPlus size={18} /> Crear cuenta</>
                        )}
                    </button>

                    <p className="text-xs" style={{ color: 'var(--gray-400)', textAlign: 'center', lineHeight: 1.5 }}>
                        Al registrarte aceptas nuestra{' '}
                        <Link href="/contacto" style={{ color: 'var(--forest-green)' }}>política de privacidad</Link>
                        {' '}y los{' '}
                        <Link href="/contacto" style={{ color: 'var(--forest-green)' }}>términos de uso</Link>.
                    </p>
                </form>

                <p className="text-small" style={{ color: 'var(--gray-600)', textAlign: 'center' }}>
                    ¿Ya tienes cuenta?{' '}
                    <Link href="/auth/login" style={{ color: 'var(--forest-green)', fontWeight: 600 }}>Iniciar sesión</Link>
                </p>
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
          position: fixed; inset: 0;
          background: url('https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1400&q=60') center/cover;
          opacity: 0.06; z-index: 0;
        }
        .auth-page__card {
          position: relative; z-index: 1;
          background: white;
          border-radius: var(--radius-xl);
          padding: var(--space-10);
          width: 100%; max-width: 420px;
          box-shadow: var(--shadow-xl);
          display: flex; flex-direction: column; gap: var(--space-5);
        }
        .auth-page__logo {
          font-family: var(--font-display); font-size: 1.3rem; color: var(--black-matte);
        }
        .auth-page__form {
          display: flex; flex-direction: column; gap: var(--space-4);
        }
      `}</style>
        </div>
    )
}

export default function RegisterPage() {
    return (
        <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Cargando...</div>}>
            <RegisterForm />
        </Suspense>
    )
}
