'use client'

import { useEffect, useState } from 'react'
import { KeyRound } from 'lucide-react'
import { Link, useRouter } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/client'
import AuthCard from '../AuthCard'

export default function NewPasswordPage() {
    const router = useRouter()
    const [hasSession, setHasSession] = useState<boolean | null>(null)
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        createClient().auth.getUser().then(({ data }) => setHasSession(Boolean(data.user)))
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        if (password.length < 8) {
            setError('La contraseña debe tener al menos 8 caracteres.')
            return
        }
        if (password !== confirm) {
            setError('Las dos contraseñas no coinciden.')
            return
        }

        setLoading(true)
        const { error: err } = await createClient().auth.updateUser({ password })
        if (err) {
            setError('No hemos podido guardar la contraseña. Pide un enlace nuevo e inténtalo otra vez.')
            setLoading(false)
            return
        }
        router.refresh()
        router.push('/dashboard')
    }

    return (
        <AuthCard
            title="Nueva contraseña"
            subtitle="Elige una contraseña de al menos 8 caracteres."
        >
            {hasSession === false ? (
                <>
                    <div className="auth-card__msg auth-card__msg--error" role="alert">
                        El enlace ha caducado o ya se usó. Pide uno nuevo para continuar.
                    </div>
                    <Link href="/auth/recuperar" className="auth-card__btn">Pedir un enlace nuevo</Link>
                </>
            ) : (
                <form onSubmit={handleSubmit} className="auth-card__form">
                    <div className="auth-card__group">
                        <label className="auth-card__label" htmlFor="new-password">Contraseña nueva</label>
                        <input
                            id="new-password"
                            type="password"
                            className="auth-card__input"
                            placeholder="Mínimo 8 caracteres"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            minLength={8}
                            autoComplete="new-password"
                        />
                    </div>
                    <div className="auth-card__group">
                        <label className="auth-card__label" htmlFor="confirm-password">Repite la contraseña</label>
                        <input
                            id="confirm-password"
                            type="password"
                            className="auth-card__input"
                            value={confirm}
                            onChange={e => setConfirm(e.target.value)}
                            required
                            minLength={8}
                            autoComplete="new-password"
                        />
                    </div>

                    {error && <div className="auth-card__msg auth-card__msg--error" role="alert">{error}</div>}

                    <button type="submit" className="auth-card__btn" disabled={loading || hasSession === null}>
                        <KeyRound size={18} /> {loading ? 'Guardando…' : 'Guardar y entrar'}
                    </button>
                </form>
            )}
        </AuthCard>
    )
}
