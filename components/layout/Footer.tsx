'use client'

import { Link } from '@/i18n/routing'
import { Instagram, MessageCircle, Mail, MapPin } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__grid">
          {/* Brand */}
          <div className="footer__brand">
            <div className="footer__logo">
              <img src="/images/logo-white.png" alt="Utopia Van Life" className="footer__logo-img" />
            </div>
            <p className="footer__brand-desc">
              Alquiler de campers premium en Mallorca. Tu aventura de lujo empieza aquí.
            </p>
            <div className="footer__social">
              <a href="https://www.instagram.com/utopiavanlife/" target="_blank" rel="noopener noreferrer" className="footer__social-btn" aria-label="Instagram">
                <Instagram size={17} />
              </a>
              <a href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '34600000000'}`} target="_blank" rel="noopener noreferrer" className="footer__social-btn" aria-label="WhatsApp">
                <MessageCircle size={17} />
              </a>
              <a href="mailto:hola@utopiavanlife.com" className="footer__social-btn" aria-label="Email">
                <Mail size={17} />
              </a>
            </div>
          </div>

          {/* Links */}
          <div className="footer__col">
            <h4 className="footer__col-title">Campers</h4>
            <ul className="footer__links">
              <li><Link href="/campers" className="footer__link">Ver flota</Link></li>
              <li><Link href="/campers/neo" className="footer__link">Camper NEO</Link></li>
              <li><Link href="/campers/space" className="footer__link">Camper SPACE</Link></li>
              <li><Link href="/#faqs" className="footer__link">FAQs</Link></li>
            </ul>
          </div>

          <div className="footer__col">
            <h4 className="footer__col-title">Legal</h4>
            <ul className="footer__links">
              <li><Link href="/legal/privacidad" className="footer__link">Privacidad & RGPD</Link></li>
              <li><Link href="/legal/terminos" className="footer__link">Términos y condiciones</Link></li>
              <li><Link href="/legal/cookies" className="footer__link">Política de cookies</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div className="footer__col">
            <h4 className="footer__col-title">Contacto</h4>
            <ul className="footer__links">
              <li>
                <a href="mailto:info@utopiavanlife.com" className="footer__contact-link">
                  <Mail size={14} className="footer__contact-icon" />
                  <span>info@utopiavanlife.com</span>
                </a>
              </li>
              <li>
                <a href="tel:+34611560916" className="footer__contact-link">
                  <span className="footer__contact-text">+34 611 560 916</span>
                </a>
              </li>
              <li>
                <a href="https://wa.me/34611560916" target="_blank" rel="noopener noreferrer" className="footer__contact-link">
                  <MessageCircle size={14} className="footer__contact-icon" />
                  <span>WhatsApp</span>
                </a>
              </li>
              <li>
                <span className="footer__contact-address">
                  <MapPin size={14} className="footer__contact-icon" />
                  <span>Carrer Son Oms, Palma de Mallorca</span>
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Instagram feed callout */}
        <div className="footer__instagram">
          <div className="footer__instagram-header">
            <div className="footer__instagram-brand">
              <Instagram size={16} className="footer__instagram-icon" />
              <span>@utopiavanlife</span>
            </div>
            <a
              href="https://www.instagram.com/utopiavanlife/"
              target="_blank"
              rel="noopener noreferrer"
              className="footer__instagram-btn"
            >
              Seguir en Instagram
            </a>
          </div>
          <div className="footer__instagram-placeholder">
            <p className="footer__instagram-text">
              ✨ Sigue nuestras rutas, calas secretas y puestas de sol en Mallorca.
            </p>
          </div>
        </div>

        <div className="footer__bottom">
          <p className="footer__bottom-copy">
            © {new Date().getFullYear()} Utopia Van Life · Todos los derechos reservados
          </p>
          <p className="footer__bottom-credit">
            Hecho con <span className="footer__heart">♥</span> en Mallorca
          </p>
        </div>
      </div>

      <style jsx>{`
        .footer {
          background: #090A0C;
          color: #F5EFEB;
          padding-top: var(--space-16);
          padding-bottom: var(--space-8);
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          position: relative;
        }
        .footer__grid {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1.5fr;
          gap: var(--space-10);
          padding-bottom: var(--space-12);
          border-bottom: 1px solid rgba(255, 255, 255, 0.07);
        }
        .footer__brand {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }
        .footer__logo {
          margin-bottom: var(--space-4);
        }
        .footer__logo-img {
          height: 52px;
          width: auto;
          max-width: 190px;
          object-fit: contain;
          display: block;
        }
        .footer__brand-desc {
          font-size: 0.88rem;
          color: rgba(255, 255, 255, 0.55);
          max-width: 270px;
          line-height: 1.65;
          margin: 0;
        }
        .footer__social {
          display: flex;
          gap: 10px;
          margin-top: var(--space-5);
        }
        .footer__social-btn {
          width: 38px;
          height: 38px;
          border-radius: var(--radius-full);
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.04);
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255, 255, 255, 0.65);
          transition: all var(--transition-fast);
        }
        .footer__social-btn:hover {
          border-color: #CCA053;
          background: rgba(204, 160, 83, 0.12);
          color: #CCA053;
          transform: translateY(-2px);
        }
        .footer__col-title {
          font-size: 0.72rem;
          font-family: var(--font-sans);
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #CCA053;
          margin-bottom: var(--space-5);
        }
        .footer__links {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }
        :global(.footer__link) {
          font-size: 0.88rem;
          color: rgba(255, 255, 255, 0.6);
          text-decoration: none;
          transition: color var(--transition-fast), transform var(--transition-fast);
          display: inline-block;
        }
        :global(.footer__link:hover) {
          color: #ffffff;
          transform: translateX(2px);
        }
        .footer__contact-link {
          font-size: 0.88rem;
          color: rgba(255, 255, 255, 0.6);
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: color var(--transition-fast);
        }
        .footer__contact-link:hover {
          color: #ffffff;
        }
        .footer__contact-address {
          font-size: 0.88rem;
          color: rgba(255, 255, 255, 0.45);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        :global(.footer__contact-icon) {
          color: #CCA053;
          flex-shrink: 0;
        }
        .footer__contact-text {
          display: inline-flex;
          align-items: center;
        }

        /* Instagram card */
        .footer__instagram {
          margin-top: var(--space-10);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(12px);
        }
        .footer__instagram-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }
        .footer__instagram-brand {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.85rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.85);
        }
        :global(.footer__instagram-icon) {
          color: #CCA053;
        }
        .footer__instagram-btn {
          font-size: 0.74rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          padding: 6px 14px;
          border-radius: var(--radius-full);
          background: rgba(204, 160, 83, 0.12);
          border: 1px solid rgba(204, 160, 83, 0.35);
          color: #CCA053;
          text-decoration: none;
          transition: all var(--transition-fast);
        }
        .footer__instagram-btn:hover {
          background: #CCA053;
          color: #090A0C;
        }
        .footer__instagram-placeholder {
          padding: var(--space-5);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .footer__instagram-text {
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.5);
          text-align: center;
          margin: 0;
        }

        /* Bottom credits */
        .footer__bottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: var(--space-8);
          flex-wrap: wrap;
          gap: var(--space-2);
        }
        .footer__bottom-copy,
        .footer__bottom-credit {
          font-size: 0.78rem;
          color: rgba(255, 255, 255, 0.4);
          margin: 0;
        }
        .footer__heart {
          color: #CCA053;
        }

        @media (max-width: 860px) {
          .footer__grid {
            grid-template-columns: 1fr 1fr;
            gap: var(--space-8);
          }
          .footer__brand {
            grid-column: 1 / -1;
          }
        }
        @media (max-width: 640px) {
          .footer__grid {
            grid-template-columns: 1fr;
            gap: var(--space-6);
          }
          .footer__instagram-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }
          .footer__bottom {
            flex-direction: column;
            align-items: flex-start;
            gap: 6px;
          }
        }
      `}</style>
    </footer>
  )
}
