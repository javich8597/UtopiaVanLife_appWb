'use client'

import Link from 'next/link'
import { Instagram, MessageCircle, Mail, MapPin } from 'lucide-react'

export default function Footer() {
    return (
        <footer className="footer">
            <div className="container">
                <div className="footer__grid">
                    {/* Brand */}
                    <div className="footer__brand">
                        <div className="footer__logo">
                            <span>Utopia</span>
                            <span className="footer__logo-sub">Van Life</span>
                        </div>
                        <p className="text-small" style={{ color: 'var(--gray-400)', maxWidth: 260, lineHeight: 1.7 }}>
                            Alquiler de campers premium en Mallorca. Tu aventura de lujo empieza aquí.
                        </p>
                        <div className="footer__social">
                            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="footer__social-btn" aria-label="Instagram">
                                <Instagram size={18} />
                            </a>
                            <a href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '34600000000'}`} target="_blank" rel="noopener noreferrer" className="footer__social-btn" aria-label="WhatsApp">
                                <MessageCircle size={18} />
                            </a>
                            <a href="mailto:hola@utopiavanlife.com" className="footer__social-btn" aria-label="Email">
                                <Mail size={18} />
                            </a>
                        </div>
                    </div>

                    {/* Links */}
                    <div className="footer__col">
                        <h4 className="footer__col-title">Campers</h4>
                        <ul className="footer__links">
                            <li><Link href="/campers">Ver flota</Link></li>
                            <li><Link href="/campers?season=alta">Temporada Alta</Link></li>
                            <li><Link href="/#faqs">FAQs</Link></li>
                        </ul>
                    </div>

                    <div className="footer__col">
                        <h4 className="footer__col-title">Legal</h4>
                        <ul className="footer__links">
                            <li><Link href="/legal/privacidad">Privacidad & RGPD</Link></li>
                            <li><Link href="/legal/terminos">Términos y condiciones</Link></li>
                            <li><Link href="/legal/cookies">Política de cookies</Link></li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div className="footer__col">
                        <h4 className="footer__col-title">Contacto</h4>
                        <ul className="footer__links">
                            <li>
                                <a href="mailto:hola@utopiavanlife.com">
                                    <Mail size={14} style={{ display: 'inline', marginRight: 6 }} />
                                    hola@utopiavanlife.com
                                </a>
                            </li>
                            <li>
                                <a href={`https://wa.me/34600000000`} target="_blank" rel="noopener noreferrer">
                                    <MessageCircle size={14} style={{ display: 'inline', marginRight: 6 }} />
                                    WhatsApp
                                </a>
                            </li>
                            <li>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--gray-400)' }}>
                                    <MapPin size={14} />
                                    Mallorca, Islas Baleares
                                </span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Instagram placeholder */}
                <div className="footer__instagram">
                    <div className="footer__instagram-header">
                        <Instagram size={16} />
                        <span>@utopiavanlife</span>
                        <span className="badge badge-gray" style={{ marginLeft: 'auto' }}>Próximamente</span>
                    </div>
                    <div className="footer__instagram-placeholder">
                        <p className="text-small" style={{ color: 'var(--gray-400)', textAlign: 'center' }}>
                            ✨ Nuestro feed de Instagram llegará pronto. Síguenos para no perderte nada.
                        </p>
                    </div>
                </div>

                <div className="footer__bottom">
                    <p className="text-xs" style={{ color: 'var(--gray-400)' }}>
                        © {new Date().getFullYear()} Utopia Van Life · Todos los derechos reservados
                    </p>
                    <p className="text-xs" style={{ color: 'var(--gray-400)' }}>
                        Hecho con ♥ en Mallorca
                    </p>
                </div>
            </div>

            <style jsx>{`
        .footer {
          background: var(--black-matte);
          color: var(--white-broken);
          padding-top: var(--space-16);
          padding-bottom: var(--space-8);
        }
        .footer__grid {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1.5fr;
          gap: var(--space-10);
          padding-bottom: var(--space-12);
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .footer__logo {
          font-family: var(--font-display);
          font-size: 1.6rem;
          font-weight: 400;
          display: flex;
          flex-direction: column;
          margin-bottom: var(--space-4);
          gap: 2px;
        }
        .footer__logo-sub {
          font-size: 0.7rem;
          font-family: var(--font-sans);
          letter-spacing: 0.18em;
          text-transform: uppercase;
          opacity: 0.5;
        }
        .footer__social {
          display: flex;
          gap: var(--space-2);
          margin-top: var(--space-4);
        }
        .footer__social-btn {
          width: 38px; height: 38px;
          border-radius: var(--radius-md);
          border: 1px solid rgba(255,255,255,0.12);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--gray-400);
          transition: all var(--transition-fast);
        }
        .footer__social-btn:hover {
          border-color: rgba(255,255,255,0.4);
          color: white;
        }
        .footer__col-title {
          font-size: 0.7rem;
          font-family: var(--font-sans);
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--gray-400);
          margin-bottom: var(--space-4);
        }
        .footer__links {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }
        .footer__links li a,
        .footer__links li span {
          font-size: 0.9rem;
          color: rgba(255,255,255,0.65);
          transition: color var(--transition-fast);
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }
        .footer__links li a:hover { color: white; }

        /* Instagram placeholder */
        .footer__instagram {
          margin-top: var(--space-12);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: var(--radius-lg);
          overflow: hidden;
        }
        .footer__instagram-header {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-4) var(--space-5);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          font-size: 0.85rem;
          color: rgba(255,255,255,0.7);
        }
        .footer__instagram-placeholder {
          padding: var(--space-10);
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100px;
          background: rgba(255,255,255,0.02);
        }
        .footer__bottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: var(--space-8);
          flex-wrap: wrap;
          gap: var(--space-2);
        }

        @media (max-width: 768px) {
          .footer__grid {
            grid-template-columns: 1fr 1fr;
            gap: var(--space-8);
          }
          .footer__brand {
            grid-column: 1 / -1;
          }
        }
        @media (max-width: 480px) {
          .footer__grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
        </footer>
    )
}
