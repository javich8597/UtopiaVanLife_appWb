'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Check, X } from 'lucide-react'

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent')
    if (!consent) {
      setIsVisible(true)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem('cookie_consent', 'accepted')
    setIsVisible(false)
  }

  const handleReject = () => {
    localStorage.setItem('cookie_consent', 'rejected')
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <div className="cookie-banner-wrapper">
      <div className="cookie-banner">
        <div className="cookie-banner-content">
          <h3 className="cookie-title">Privacidad y Cookies</h3>
          <p className="cookie-text">
            Utilizamos cookies propias y de terceros para fines analíticos y para mostrarte publicidad 
            personalizada en base a un perfil elaborado a partir de tus hábitos de navegación.
            Puedes leer nuestra <Link href="/es/legal/cookies" className="cookie-link">Política de Cookies</Link> para más información.
          </p>
        </div>
        <div className="cookie-banner-actions">
          <button onClick={handleReject} className="cookie-btn cookie-btn--reject">
            <X size={16} />
            Rechazar no esenciales
          </button>
          <button onClick={handleAccept} className="cookie-btn cookie-btn--accept">
            <Check size={16} />
            Aceptar todas
          </button>
        </div>
      </div>
      <style jsx>{`
        .cookie-banner-wrapper {
          position: fixed;
          bottom: 24px;
          left: 24px;
          right: 24px;
          z-index: 999999;
          display: flex;
          justify-content: center;
          pointer-events: none;
        }

        .cookie-banner {
          background: #0B0C0E;
          border: 1px solid #1E293B;
          border-radius: 16px;
          padding: 24px;
          max-width: 800px;
          width: 100%;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05);
          display: flex;
          flex-direction: column;
          gap: 20px;
          pointer-events: auto;
          color: #F8FAFC;
        }

        .cookie-title {
          font-size: 1.05rem;
          font-weight: 700;
          margin: 0 0 8px 0;
          color: #FFFFFF;
        }

        .cookie-text {
          font-size: 0.85rem;
          color: #94A3B8;
          line-height: 1.5;
          margin: 0;
        }

        .cookie-link {
          color: #CCA053;
          text-decoration: underline;
          text-underline-offset: 4px;
        }

        .cookie-link:hover {
          color: #E2B666;
        }

        .cookie-banner-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 12px;
          flex-wrap: wrap;
        }

        .cookie-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 18px;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .cookie-btn--reject {
          background: transparent;
          border: 1px solid #334155;
          color: #CBD5E1;
        }

        .cookie-btn--reject:hover {
          background: #1E293B;
          color: #FFFFFF;
        }

        .cookie-btn--accept {
          background: #1A2B21;
          border: 1px solid #233B2D;
          color: #E2E8F0;
        }

        .cookie-btn--accept:hover {
          background: #233B2D;
          color: #FFFFFF;
        }

        @media (min-width: 768px) {
          .cookie-banner {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
          }
          .cookie-banner-content {
            flex: 1;
          }
          .cookie-banner-actions {
            flex-shrink: 0;
          }
        }

        @media (max-width: 640px) {
          .cookie-banner-wrapper {
            bottom: max(env(safe-area-inset-bottom, 16px), 16px);
            left: 16px;
            right: 16px;
          }
          .cookie-banner {
            padding: 20px;
            gap: 16px;
            border-radius: 20px;
          }
          .cookie-banner-actions {
            flex-direction: column;
            width: 100%;
            gap: 10px;
          }
          .cookie-btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  )
}
