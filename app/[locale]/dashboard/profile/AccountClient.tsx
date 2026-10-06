'use client'

import { Link } from '@/i18n/routing'
import { ShieldCheck, LogOut, ChevronRight, IdCard, Moon, Sun } from 'lucide-react'
import { useUserTheme, useSetUserTheme } from '@/lib/user/themeContext'
import { useSignOut } from '@/lib/user/useSignOut'
import SecurityCard from './SecurityCard'

interface Props {
  email: string
  fullName: string
  isAdmin: boolean
  verificationStatus: string | null
}

// Estado de los datos del alquiler, con el mismo criterio que la pantalla Datos y carnet
function verificationLabel(status: string | null): { text: string; tone: string } {
  if (status === 'verified' || status === 'approved') return { text: 'Validado', tone: 'sage' }
  if (status === 'pending' || status === 'pending_validation') return { text: 'En revisión', tone: 'sky' }
  if (status === 'rejected') return { text: 'Rechazado', tone: 'rose' }
  return { text: 'Pendiente', tone: 'amber' }
}

export default function AccountClient({ email, fullName, isAdmin, verificationStatus }: Props) {
  const theme = useUserTheme()
  const setTheme = useSetUserTheme()
  const { signOut, loggingOut } = useSignOut()
  const initial = (fullName || email || 'U').trim().charAt(0).toUpperCase()
  const status = verificationLabel(verificationStatus)

  return (
    <div className="acc">
      <header className="usr-page-head">
        <div>
          <span className="usr-page-head__eyebrow">Mi perfil</span>
          <h1 className="usr-page-head__title">Tu cuenta</h1>
        </div>
      </header>

      <section className="usr-card acc-id">
        <span className="acc-id__avatar" aria-hidden="true">{initial}</span>
        <div className="acc-id__text">
          <strong className="acc-id__name">{fullName || 'Viajero Utopia'}</strong>
          <span className="acc-id__mail">{email}</span>
        </div>
      </section>

      <Link href="/dashboard/datos" className="usr-card acc-link">
        <span className="acc-link__icon"><IdCard size={20} aria-hidden="true" /></span>
        <span className="acc-link__text">
          <strong>Datos y carnet</strong>
          <span>Tus datos de conductor y documentación para el contrato</span>
        </span>
        <span className={`usr-tag usr-tag--${status.tone}`}>{status.text}</span>
        <ChevronRight size={18} className="acc-link__arrow" aria-hidden="true" />
      </Link>

      <SecurityCard />

      <section className="usr-account acc-section" aria-label="Preferencias y sesión">
        <span className="usr-account__label">Preferencias</span>
        <div className="usr-account__row acc-theme">
          {theme === 'dark' ? <Moon size={18} aria-hidden="true" /> : <Sun size={18} aria-hidden="true" />}
          <span>Tema</span>
          <div className="acc-theme__switch" role="group" aria-label="Tema del panel">
            <button type="button" className={theme === 'light' ? 'is-on' : ''} aria-pressed={theme === 'light'} onClick={() => setTheme('light')}>Claro</button>
            <button type="button" className={theme === 'dark' ? 'is-on' : ''} aria-pressed={theme === 'dark'} onClick={() => setTheme('dark')}>Oscuro</button>
          </div>
        </div>
        {isAdmin && (
          <Link href="/admin" className="usr-account__row">
            <ShieldCheck size={18} aria-hidden="true" />
            <span>Panel admin</span>
            <ChevronRight size={18} className="usr-account__arrow" aria-hidden="true" />
          </Link>
        )}
        <button
          id="dash-account-logout-btn"
          type="button"
          className="usr-account__row usr-account__row--danger"
          onClick={signOut}
          disabled={loggingOut}
        >
          <LogOut size={18} aria-hidden="true" />
          <span>{loggingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}</span>
        </button>
      </section>

      <style jsx>{`
        .acc {
          display: flex;
          flex-direction: column;
          gap: 18px;
          max-width: 720px;
        }
        .acc-id {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px;
        }
        .acc-id__avatar {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: var(--usr-primary-bg);
          color: var(--usr-primary-text);
          font-family: var(--font-heading);
          font-size: 1.4rem;
          font-weight: 700;
        }
        .acc-id__text {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .acc-id__name {
          font-size: 1.1rem;
          color: var(--usr-text);
        }
        .acc-id__mail {
          font-size: 0.88rem;
          color: var(--usr-text-2);
          overflow: hidden;
          text-overflow: ellipsis;
        }
        @media (max-width: 640px) {
          .acc-id {
            padding: 16px;
          }
        }
      `}</style>
      <style jsx global>{`
        .acc-link {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 16px 18px;
          text-decoration: none;
          color: var(--usr-text);
        }
        .acc-link:hover {
          border-color: var(--usr-border-strong);
        }
        .acc-link__icon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: var(--usr-surface-2);
          color: var(--usr-gold-text);
        }
        .acc-link__text {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
          min-width: 0;
        }
        .acc-link__text span {
          font-size: 0.85rem;
          color: var(--usr-text-2);
        }
        .acc-link__arrow {
          color: var(--usr-text-2);
          flex-shrink: 0;
        }
        .acc-section {
          margin-top: 0;
        }
        .acc-theme {
          cursor: default;
        }
        .acc-theme__switch {
          margin-left: auto;
          display: inline-flex;
          padding: 3px;
          border: 1px solid var(--usr-border);
          border-radius: 999px;
          background: var(--usr-surface-2);
        }
        .acc-theme__switch button {
          min-height: 34px;
          padding: 0 14px;
          border: 0;
          border-radius: 999px;
          background: transparent;
          font: inherit;
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--usr-text-2);
          cursor: pointer;
        }
        .acc-theme__switch button.is-on {
          background: var(--usr-surface);
          color: var(--usr-text);
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
        }
        @media (max-width: 640px) {
          .acc-link__text span {
            display: none;
          }
        }
      `}</style>
    </div>
  )
}
