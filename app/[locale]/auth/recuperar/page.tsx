'use client'

import { useState } from 'react'
import { useLocale } from 'next-intl'
import { Mail } from 'lucide-react'
import { Link } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/client'
import AuthCard from '../AuthCard'

export default function RecoverPasswordPage() {
    const locale = useLocale()
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [sent, setSent] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        const supabase = createClient()
        const next = `/${locale}/auth/nueva-contrasena`
        const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
            redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        })

        setLoading(false)
        // Mismo mensaje exista o no la cuenta, para no revelar qué emails están registrados
        if (err && !err.message.toLowerCase().includes('not found')) {
            setError('No hemos podido enviar el enlace ahora mismo. Inténtalo de nuevo en unos minutos.')
            return
        }
        setSent(true)
    }

    return (
        <AuthCard
            title="Recupera tu acceso"
            subtitle="Te enviamos un enlace para crear una contraseña nueva."
            footer={<p>¿La recordaste? <Link href="/auth/login">Inicia sesión</Link></p>}
        >
            {sent ? (
                <div className="auth-card__msg auth-card__msg--ok" role="status">
                    Si {email} tiene cuenta en Utopia, en unos minutos recibirás el enlace. Revisa también la carpeta de spam.
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="auth-card__form">
                    <div className="auth-card__group">
                        <label className="auth-card__label" htmlFor="recover-email">Correo electrónico</label>
                        <input
                            id="recover-email"
                            type="email"
                            className="auth-card__input"
                            placeholder="tu@email.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                        />
                    </div>

                    {error && <div className="auth-card__msg auth-card__msg--error" role="alert">{error}</div>}

                    <button type="submit" className="auth-card__btn" disabled={loading}>
                        <Mail size={18} /> {loading ? 'Enviando…' : 'Enviar enlace'}
                    </button>
                </form>
            )}
        </AuthCard>
    )
}
