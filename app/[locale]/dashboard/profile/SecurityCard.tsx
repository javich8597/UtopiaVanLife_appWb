'use client'

import { useState } from 'react'
import { Lock, Loader2, Check, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

/** Cambiar la contraseña y cerrar sesión en todos los dispositivos */
export default function SecurityCard() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    if (password.length < 8) return setMessage({ ok: false, text: 'La contraseña debe tener al menos 8 caracteres.' })
    if (password !== confirm) return setMessage({ ok: false, text: 'Las dos contraseñas no coinciden.' })
    setSaving(true)
    const { error } = await createClient().auth.updateUser({ password })
    setSaving(false)
    if (error) {
      const sameAsOld = /different from the old/i.test(error.message)
      return setMessage({ ok: false, text: sameAsOld ? 'La nueva contraseña debe ser distinta de la actual.' : 'No hemos podido cambiarla. Inténtalo de nuevo.' })
    }
    setPassword('')
    setConfirm('')
    setMessage({ ok: true, text: 'Contraseña cambiada.' })
  }

  const signOutEverywhere = async () => {
    if (!window.confirm('Se cerrará tu sesión en todos los dispositivos, también en este. ¿Continuar?')) return
    setSigningOut(true)
    await createClient().auth.signOut({ scope: 'global' })
    window.location.href = '/auth/login'
  }

  return (
    <section className="usr-card sec" aria-labelledby="sec-title">
      <h2 id="sec-title" className="sec-title"><Lock size={18} aria-hidden="true" /> Seguridad</h2>
      <form className="sec-form" onSubmit={save}>
        <label className="sec-field">
          <span>Nueva contraseña</span>
          <input type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} minLength={8} required />
        </label>
        <label className="sec-field">
          <span>Repite la contraseña</span>
          <input type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} minLength={8} required />
        </label>
        {message && <p className={`sec-msg ${message.ok ? 'sec-msg--ok' : ''}`} role="status">{message.ok && <Check size={14} />} {message.text}</p>}
        <div className="sec-actions">
          <button type="submit" className="usr-btn usr-btn--primary" disabled={saving}>
            {saving && <Loader2 size={16} className="sec-spin" />} Cambiar contraseña
          </button>
          <button type="button" className="usr-btn" onClick={signOutEverywhere} disabled={signingOut}>
            <LogOut size={16} /> Cerrar sesión en todos los dispositivos
          </button>
        </div>
      </form>
      <style jsx>{`
        .sec { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
        .sec-title { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 1.15rem; }
        .sec-form { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .sec-field { display: flex; flex-direction: column; gap: 6px; font-size: 0.85rem; color: var(--usr-text-2); }
        .sec-field input {
          min-height: 44px; padding: 10px 12px; border-radius: 12px; font: inherit; font-size: 1rem;
          border: 1px solid var(--usr-border, rgba(0,0,0,0.12)); background: var(--usr-surface, #fff); color: var(--usr-text, inherit);
        }
        .sec-msg { grid-column: 1 / -1; margin: 0; font-size: 0.88rem; color: var(--usr-rose); display: flex; align-items: center; gap: 6px; }
        .sec-msg--ok { color: var(--usr-sage); }
        .sec-actions { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 10px; }
        :global(.sec-spin) { animation: secspin 1s linear infinite; }
        @keyframes secspin { to { transform: rotate(360deg); } }
        @media (max-width: 640px) {
          .sec { padding: 16px; }
          .sec-form { grid-template-columns: 1fr; }
          .sec-actions :global(.usr-btn) { flex: 1 1 100%; justify-content: center; }
        }
      `}</style>
    </section>
  )
}
