'use client'

import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'
import { Link } from '@/i18n/routing'

/**
 * Tarjeta Black & Gold compartida por las pantallas de recuperación de contraseña.
 * Replica el aspecto de login/registro; los estilos de formulario van en :global
 * dentro de .auth-card para que los hijos puedan usar las mismas clases.
 */
export default function AuthCard({
    title,
    subtitle,
    backHref = '/auth/login',
    backLabel = 'Volver al acceso',
    children,
    footer,
}: {
    title: string
    subtitle: string
    backHref?: string
    backLabel?: string
    children: React.ReactNode
    footer?: React.ReactNode
}) {
    return (
        <div className="auth-shell">
            <div className="auth-card">
                <div className="auth-card__top-nav">
                    <Link href={backHref} className="auth-card__back-link">
                        <ArrowLeft size={15} />
                        <span>{backLabel}</span>
                    </Link>
                </div>

                <div className="auth-card__header">
                    <Link href="/" className="auth-card__logo-link">
                        <Image
                            src="/images/logo-white.png"
                            alt="Utopia Van Life"
                            width={160}
                            height={42}
                            className="auth-card__logo-img"
                            priority
                        />
                    </Link>
                    <h1 className="auth-card__title">{title}</h1>
                    <p className="auth-card__subtitle">{subtitle}</p>
                </div>

                {children}

                {footer && <div className="auth-card__footer">{footer}</div>}
            </div>

            <style jsx>{`
                .auth-shell {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 32px 16px;
                    background: radial-gradient(circle at center, #15171b 0%, #0B0C0E 70%);
                    color: #F8FAFC;
                }

                .auth-card {
                    position: relative;
                    background: #131518;
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 24px;
                    padding: 40px 36px;
                    width: 100%;
                    max-width: 440px;
                    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6);
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                    overflow: hidden;
                }

                .auth-card::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 2px;
                    background: linear-gradient(90deg, transparent, #CCA053, transparent);
                }

                .auth-card__top-nav {
                    display: flex;
                }

                .auth-card :global(.auth-card__back-link) {
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
                }

                .auth-card :global(.auth-card__back-link:hover) {
                    color: #CCA053;
                    border-color: rgba(204, 160, 83, 0.4);
                }

                .auth-card__header {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    gap: 8px;
                }

                .auth-card :global(.auth-card__logo-img) {
                    object-fit: contain;
                    height: 38px;
                    width: auto;
                    margin-bottom: 8px;
                }

                .auth-card__title {
                    font-size: 1.55rem;
                    font-weight: 800;
                    color: #FFFFFF;
                    margin: 0;
                    letter-spacing: -0.02em;
                }

                .auth-card__subtitle {
                    font-size: 0.88rem;
                    color: #94A3B8;
                    margin: 0;
                    line-height: 1.5;
                }

                .auth-card :global(.auth-card__form) {
                    display: flex;
                    flex-direction: column;
                    gap: 18px;
                }

                .auth-card :global(.auth-card__group) {
                    display: flex;
                    flex-direction: column;
                    gap: 7px;
                }

                .auth-card :global(.auth-card__label) {
                    font-size: 0.86rem;
                    font-weight: 600;
                    color: #E2E8F0;
                }

                .auth-card :global(.auth-card__input) {
                    width: 100%;
                    padding: 13px 16px;
                    border-radius: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    background: #0B0C0E;
                    font-size: 0.94rem;
                    color: #FFFFFF;
                    outline: none;
                }

                .auth-card :global(.auth-card__input:focus) {
                    border-color: #CCA053;
                    box-shadow: 0 0 0 3px rgba(204, 160, 83, 0.18);
                }

                .auth-card :global(.auth-card__input::placeholder) {
                    color: #64748B;
                }

                .auth-card :global(.auth-card__msg) {
                    padding: 12px 14px;
                    border-radius: 10px;
                    font-size: 0.86rem;
                    line-height: 1.45;
                }

                .auth-card :global(.auth-card__msg--error) {
                    background: rgba(239, 68, 68, 0.12);
                    border: 1px solid rgba(239, 68, 68, 0.3);
                    color: #FCA5A5;
                }

                .auth-card :global(.auth-card__msg--ok) {
                    background: rgba(204, 160, 83, 0.1);
                    border: 1px solid rgba(204, 160, 83, 0.35);
                    color: #E8CA7C;
                }

                .auth-card :global(.auth-card__btn) {
                    width: 100%;
                    min-height: 48px;
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
                    text-decoration: none;
                }

                .auth-card :global(.auth-card__btn:disabled) {
                    opacity: 0.7;
                    cursor: not-allowed;
                }

                .auth-card__footer {
                    border-top: 1px solid rgba(255, 255, 255, 0.08);
                    padding-top: 16px;
                    font-size: 0.88rem;
                    color: #94A3B8;
                    text-align: center;
                }

                .auth-card__footer :global(a) {
                    color: #CCA053;
                    font-weight: 700;
                    text-decoration: none;
                }

                @media (max-width: 640px) {
                    .auth-card {
                        padding: 28px 20px;
                        border-radius: 20px;
                    }
                }
            `}</style>
        </div>
    )
}
