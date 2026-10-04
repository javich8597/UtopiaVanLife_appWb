'use client'

import { useState, Suspense } from 'react'
import { Link, useRouter } from '@/i18n/routing'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { safeRedirectPath } from '@/lib/auth/safeRedirect'
import { UserPlus, Eye, EyeOff, ArrowLeft } from 'lucide-react'

function RegisterForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const redirectUrl = safeRedirectPath(searchParams.get('redirect'), '/dashboard?welcome=1')

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

        // If session was not immediately returned, attempt direct sign in
        if (!data.session) {
            const { error: signInErr } = await supabase.auth.signInWithPassword({
                email: cleanEmail,
                password: form.password
            })
            if (signInErr) {
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
            <div className="auth-page__overlay" />

            <div className="auth-page__card">
                <div className="auth-page__top-nav">
                    <Link href="/" className="auth-page__back-link">
                        <ArrowLeft size={15} />
                        <span>Inicio</span>
                    </Link>
                </div>

                <div className="auth-page__header">
                    <Link href="/" className="auth-page__logo-link" aria-label="Utopia Van Life Inicio">
                        <img
                            src="/images/logo-white.png"
                            alt="Utopia Van Life"
                            className="auth-page__logo-img"
                        />
                    </Link>
                    <h1 className="auth-page__title">Crea tu cuenta</h1>
                    <p className="auth-page__subtitle">Comienza tu aventura y reserva tu camper en Mallorca</p>
                </div>

                <form onSubmit={handleRegister} className="auth-page__form">
                    <div className="auth-form-group">
                        <label className="auth-form-label">Nombre completo</label>
                        <input
                            type="text"
                            className="auth-form-input"
                            placeholder="María García"
                            value={form.full_name}
                            onChange={e => set('full_name', e.target.value)}
                            required
                        />
                    </div>

                    <div className="auth-form-group">
                        <label className="auth-form-label">Correo electrónico</label>
                        <input
                            type="email"
                            className="auth-form-input"
                            placeholder="tu@email.com"
                            value={form.email}
                            onChange={e => set('email', e.target.value)}
                            required
                            autoComplete="email"
                        />
                    </div>

                    <div className="auth-form-group">
                        <label className="auth-form-label">Teléfono de contacto</label>
                        <input
                            type="tel"
                            className="auth-form-input"
                            placeholder="+34 600 000 000"
                            value={form.phone}
                            onChange={e => set('phone', e.target.value)}
                            required
                        />
                    </div>

                    <div className="auth-form-group">
                        <label className="auth-form-label">Contraseña</label>
                        <div className="auth-pwd-wrapper">
                            <input
                                type={showPwd ? 'text' : 'password'}
                                className="auth-form-input auth-form-input--pwd"
                                placeholder="Mínimo 8 caracteres"
                                value={form.password}
                                onChange={e => set('password', e.target.value)}
                                required
                                minLength={8}
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPwd(!showPwd)}
                                className="auth-pwd-toggle"
                                aria-label={showPwd ? 'Ocultar contraseña' : 'Ver contraseña'}
                            >
                                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="auth-error-box">
                            {error}
                        </div>
                    )}

                    <button type="submit" className="auth-btn-gold" disabled={loading}>
                        {loading ? (
                            <span className="auth-spinner" />
                        ) : (
                            <><UserPlus size={18} /> Crear mi cuenta</>
                        )}
                    </button>

                    <p className="auth-terms-text">
                        Al registrarte aceptas nuestra{' '}
                        <Link href="/legal/privacidad" className="auth-terms-link">política de privacidad</Link>
                        {' '}y los{' '}
                        <Link href="/legal/terminos" className="auth-terms-link">términos de uso</Link>.
                    </p>
                </form>

                <div className="auth-page__footer">
                    <p className="auth-footer-text">
                        ¿Ya tienes cuenta?{' '}
                        <Link href="/auth/login" className="auth-footer-link">Iniciar sesión</Link>
                    </p>
                </div>
            </div>

            <style jsx>{`
                .auth-page {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 32px 16px;
                    position: relative;
                    background: #0B0C0E;
                    color: #F8FAFC;
                    font-family: var(--font-sans, system-ui, -apple-system, sans-serif);
                }

                .auth-page__bg {
                    position: fixed;
                    inset: 0;
                    background: url('https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1600&q=80') center/cover;
                    opacity: 0.15;
                    z-index: 0;
                }

                .auth-page__overlay {
                    position: fixed;
                    inset: 0;
                    background: radial-gradient(circle at center, rgba(11, 12, 14, 0.7) 0%, #0B0C0E 100%);
                    z-index: 0;
                }

                .auth-page__card {
                    position: relative;
                    z-index: 1;
                    background: #131518;
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 24px;
                    padding: 40px 36px;
                    width: 100%;
                    max-width: 440px;
                    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6);
                    display: flex;
                    flex-direction: column;
                    gap: 22px;
                    overflow: hidden;
                }

                .auth-page__card::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 2px;
                    background: linear-gradient(90deg, transparent, #CCA053, transparent);
                }

                .auth-page__top-nav {
                    display: flex;
                    justify-content: flex-start;
                }

                .auth-page__back-link {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    color: #94A3B8;
                    font-size: 0.82rem;
                    font-weight: 600;
                    text-decoration: none;
                    padding: 5px 12px;
                    border-radius: 999px;
                    background: rgba(255, 255, 255, 0.04);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    transition: all 0.2s ease;
                }

                .auth-page__back-link:hover {
                    color: #CCA053;
                    border-color: rgba(204, 160, 83, 0.4);
                    background: rgba(204, 160, 83, 0.08);
                }

                .auth-page__header {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    gap: 8px;
                }

                .auth-page__logo-link {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 12px;
                    transition: transform 0.2s ease, opacity 0.2s ease;
                }

                .auth-page__logo-link:hover {
                    opacity: 0.9;
                    transform: scale(1.02);
                }

                .auth-page__logo-img,
                :global(.auth-page__logo-img) {
                    object-fit: contain;
                    height: 48px;
                    width: auto;
                    max-width: 185px;
                    display: block;
                    filter: brightness(0) invert(1);
                }

                .auth-page__title {
                    font-size: 1.55rem;
                    font-weight: 800;
                    color: #FFFFFF;
                    margin: 0;
                    letter-spacing: -0.02em;
                }

                .auth-page__subtitle {
                    font-size: 0.88rem;
                    color: #94A3B8;
                    margin: 0;
                }

                .auth-page__form {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .auth-form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .auth-form-label {
                    font-size: 0.86rem;
                    font-weight: 600;
                    color: #E2E8F0;
                }

                .auth-form-input {
                    width: 100%;
                    padding: 12px 16px;
                    border-radius: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    background: #0B0C0E;
                    font-size: 0.94rem;
                    color: #FFFFFF;
                    outline: none;
                    transition: all 0.2s ease;
                }

                .auth-form-input:focus {
                    border-color: #CCA053;
                    box-shadow: 0 0 0 3px rgba(204, 160, 83, 0.18);
                    background: #0E1013;
                }

                .auth-form-input::placeholder {
                    color: #64748B;
                }

                .auth-pwd-wrapper {
                    position: relative;
                    width: 100%;
                }

                .auth-form-input--pwd {
                    padding-right: 44px;
                }

                .auth-pwd-toggle {
                    position: absolute;
                    right: 12px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #94A3B8;
                    background: none;
                    border: none;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 6px;
                    transition: color 0.2s ease;
                }

                .auth-pwd-toggle:hover {
                    color: #CCA053;
                }

                .auth-error-box {
                    padding: 12px 14px;
                    background: rgba(239, 68, 68, 0.12);
                    border: 1px solid rgba(239, 68, 68, 0.3);
                    border-radius: 10px;
                    color: #FCA5A5;
                    font-size: 0.86rem;
                    line-height: 1.45;
                }

                .auth-btn-gold {
                    width: 100%;
                    background: linear-gradient(135deg, #CCA053 0%, #B2883B 100%);
                    color: #0B0C0E;
                    border: none;
                    padding: 14px 20px;
                    border-radius: 12px;
                    font-weight: 700;
                    font-size: 0.98rem;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    box-shadow: 0 4px 16px rgba(204, 160, 83, 0.3);
                    transition: all 0.2s ease;
                    margin-top: 4px;
                }

                .auth-btn-gold:hover:not(:disabled) {
                    transform: translateY(-1px);
                    box-shadow: 0 6px 20px rgba(204, 160, 83, 0.45);
                    filter: brightness(1.05);
                }

                .auth-btn-gold:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                }

                .auth-terms-text {
                    font-size: 0.78rem;
                    color: #64748B;
                    text-align: center;
                    line-height: 1.5;
                    margin: 2px 0 0;
                }

                .auth-terms-link {
                    color: #CCA053;
                    text-decoration: none;
                }

                .auth-terms-link:hover {
                    text-decoration: underline;
                }

                .auth-spinner {
                    width: 18px;
                    height: 18px;
                    border: 2px solid rgba(11, 12, 14, 0.3);
                    border-top-color: #0B0C0E;
                    border-radius: 50%;
                    display: inline-block;
                    animation: spin 0.8s linear infinite;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                .auth-page__footer {
                    border-top: 1px solid rgba(255, 255, 255, 0.08);
                    padding-top: 16px;
                }

                .auth-footer-text {
                    font-size: 0.88rem;
                    color: #94A3B8;
                    text-align: center;
                    margin: 0;
                }

                .auth-footer-link {
                    color: #CCA053;
                    font-weight: 700;
                    text-decoration: none;
                    transition: color 0.15s ease;
                }

                .auth-footer-link:hover {
                    color: #E8CA7C;
                    text-decoration: underline;
                }

                @media (max-width: 640px) {
                    .auth-page__card {
                        padding: 28px 20px;
                        border-radius: 20px;
                    }

                    .auth-page__logo-img,
                    :global(.auth-page__logo-img) {
                        height: 40px;
                        max-width: 155px;
                    }
                }
            `}</style>
        </div>
    )
}

export default function RegisterPage() {
    return (
        <Suspense fallback={<div style={{ minHeight: '100vh', background: '#0B0C0E', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>Cargando...</div>}>
            <RegisterForm />
        </Suspense>
    )
}
