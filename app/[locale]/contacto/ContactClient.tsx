'use client'

import { useState } from 'react'
import Image from 'next/image'
import { 
  Mail, 
  Phone, 
  MapPin, 
  Check, 
  Instagram, 
  MessageCircle, 
  Clock, 
  Send,
  Sparkles,
  ArrowRight
} from 'lucide-react'

interface ContactClientProps {
  t: {
    title: string
    subtitle: string
    phone: string
    email: string
    address: string
    name: string
    lastName: string
    howHelp: string
    helpOption1: string
    helpOption2: string
    helpOption3: string
    submit: string
    sending: string
    successMsg: string
    newsletterTitle: string
    newsletterSubtitle: string
    newsletterPlaceholder: string
    newsletterSubmit: string
  }
}

export default function ContactClient({ t }: ContactClientProps) {
  // Contact Form State
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Newsletter Form State
  const [newsEmail, setNewsEmail] = useState('')
  const [newsSubmitting, setNewsSubmitting] = useState(false)
  const [newsSubmitted, setNewsSubmitted] = useState(false)

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate sending message
    await new Promise(resolve => setTimeout(resolve, 1200))

    setIsSubmitting(false)
    setSubmitted(true)
    setFirstName('')
    setLastName('')
    setEmail('')
    setPhone('')
    setMessage('')
  }

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newsEmail) return
    setNewsSubmitting(true)

    await new Promise(resolve => setTimeout(resolve, 1000))

    setNewsSubmitting(false)
    setNewsSubmitted(true)
    setNewsEmail('')
  }

  return (
    <div className="contact-page">
      {/* 1. Header Hero */}
      <section className="contact-hero">
        <div className="container">
          <span className="hero-kicker">UTOPIA VAN LIFE • ATENCIÓN PERSONALIZADA</span>
          <div className="hero-title-container">
            <div className="hero-logo-box">
              <Image 
                src="/images/logo-mountain.jpg" 
                alt="Utopia Van Life" 
                width={100} 
                height={100} 
                className="hero-logo-img"
              />
            </div>
            <h1 className="hero-title">{t.title}</h1>
            <div className="hero-logo-box">
              <Image 
                src="/images/logo-mountain.jpg" 
                alt="Utopia Van Life" 
                width={100} 
                height={100} 
                className="hero-logo-img"
              />
            </div>
          </div>
          <p className="hero-subtitle">{t.subtitle}</p>
        </div>
      </section>

      {/* 2. Main Content Grid */}
      <section className="contact-main">
        <div className="container">
          <div className="contact-grid">
            
            {/* Left Column: Direct Info & Channels */}
            <aside className="contact-info-panel">
              <div className="info-card">
                <h2 className="info-card-title">Canales Directos</h2>
                <p className="info-card-sub">Estamos a tu disposición para ayudarte a planificar tu ruta por Mallorca.</p>

                {/* Direct items */}
                <div className="info-items-stack">
                  
                  {/* Phone & WhatsApp */}
                  <div className="info-item">
                    <div className="info-icon-box">
                      <Phone size={18} />
                    </div>
                    <div className="info-item-content">
                      <span className="info-item-label">{t.phone}</span>
                      <div className="phone-row">
                        <a href="tel:+34611560916" className="info-item-value info-item-link">+34 611 560 916</a>
                        <a 
                          href="https://wa.me/34611560916?text=Hola%20Utopia%20Van%20Life,%20me%20gustar%C3%ADa%20solicitar%20informaci%C3%B3n" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="whatsapp-btn"
                          title="Abrir chat de WhatsApp"
                        >
                          <MessageCircle size={14} />
                          <span>WhatsApp</span>
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="info-item">
                    <div className="info-icon-box">
                      <Mail size={18} />
                    </div>
                    <div className="info-item-content">
                      <span className="info-item-label">{t.email}</span>
                      <a href="mailto:info@utopiavanlife.com" className="info-item-value info-item-link">info@utopiavanlife.com</a>
                      <a href="mailto:administracion@utopiavanlife.com" className="info-item-sublink">administracion@utopiavanlife.com</a>
                    </div>
                  </div>

                  {/* Base Location */}
                  <div className="info-item">
                    <div className="info-icon-box">
                      <MapPin size={18} />
                    </div>
                    <div className="info-item-content">
                      <span className="info-item-label">{t.address}</span>
                      <p className="info-item-value">Carrer Son Oms, Palma de Mallorca</p>
                      <span className="info-item-tag">✈ A 5 min del Aeropuerto de Palma (PMI)</span>
                    </div>
                  </div>

                  {/* Schedule */}
                  <div className="info-item">
                    <div className="info-icon-box">
                      <Clock size={18} />
                    </div>
                    <div className="info-item-content">
                      <span className="info-item-label">Horario de Atención</span>
                      <p className="info-item-value">Lunes a Domingo: 09:00 – 20:00h</p>
                    </div>
                  </div>
                </div>

                <div className="socials-divider" />

                {/* Social Media */}
                <div className="socials-wrap">
                  <span className="socials-label">Síguenos en Redes</span>
                  <div className="socials-row">
                    <a href="https://www.instagram.com/utopiavanlife/" target="_blank" rel="noopener noreferrer" className="social-pill">
                      <Instagram size={16} />
                      <span>Instagram</span>
                    </a>
                    <a href="https://www.tiktok.com/@utopiavanlife" target="_blank" rel="noopener noreferrer" className="social-pill">
                      <svg style={{ height: '16px', width: '16px', fill: 'currentColor' }} viewBox="0 0 448 512" xmlns="http://www.w3.org/2000/svg">
                        <path d="M448,209.91a210.06,210.06,0,0,1-122.77-39.25V349.38A162.55,162.55,0,1,1,185,188.31V278.2a74.62,74.62,0,1,0,52.23,71.18V0l88,0a121.18,121.18,0,0,0,1.86,22.17h0A122.18,122.18,0,0,0,381,102.39a121.43,121.43,0,0,0,67,20.14Z" />
                      </svg>
                      <span>TikTok</span>
                    </a>
                  </div>
                </div>

              </div>
            </aside>

            {/* Right Column: Contact Form */}
            <main className="contact-form-panel">
              <div className="form-card">
                {submitted ? (
                  <div className="success-banner">
                    <div className="success-icon-circle">
                      <Check size={28} />
                    </div>
                    <h3 className="success-title">¡Mensaje recibido!</h3>
                    <p className="success-text">{t.successMsg}</p>
                    <p className="success-subtext">Nos pondremos en contacto contigo en un plazo máximo de 24 horas laborables.</p>
                    <button onClick={() => setSubmitted(false)} className="btn-resend">
                      Enviar otro mensaje
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit} className="form-stack">
                    <div className="form-header">
                      <h2 className="form-title">Envíanos un Mensaje</h2>
                      <p className="form-sub">Escríbenos directamente y te responderemos a la mayor brevedad.</p>
                    </div>

                    {/* Name & Surname */}
                    <div className="grid-2">
                      <div className="field-block">
                        <label htmlFor="first_name" className="field-label">{t.name} *</label>
                        <input
                          type="text"
                          id="first_name"
                          value={firstName}
                          onChange={e => setFirstName(e.target.value)}
                          required
                          placeholder="Tu nombre"
                          className="field-input"
                        />
                      </div>
                      <div className="field-block">
                        <label htmlFor="last_name" className="field-label">{t.lastName} *</label>
                        <input
                          type="text"
                          id="last_name"
                          value={lastName}
                          onChange={e => setLastName(e.target.value)}
                          required
                          placeholder="Tus apellidos"
                          className="field-input"
                        />
                      </div>
                    </div>

                    {/* Email & Phone */}
                    <div className="grid-2">
                      <div className="field-block">
                        <label htmlFor="email" className="field-label">{t.email} *</label>
                        <input
                          type="email"
                          id="email"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          required
                          placeholder="ejemplo@correo.com"
                          className="field-input"
                        />
                      </div>
                      <div className="field-block">
                        <label htmlFor="phone" className="field-label">{t.phone}</label>
                        <input
                          type="tel"
                          id="phone"
                          value={phone}
                          onChange={e => setPhone(e.target.value)}
                          placeholder="+34 600 000 000"
                          className="field-input"
                        />
                      </div>
                    </div>

                    {/* Message */}
                    <div className="field-block">
                      <label htmlFor="message" className="field-label">Mensaje o Consulta *</label>
                      <textarea
                        id="message"
                        rows={4}
                        required
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        placeholder="Escribe aquí tu mensaje o consulta..."
                        className="field-textarea"
                      />
                    </div>

                    {/* Honey Pot Spam Trap (Hidden) */}
                    <div style={{ display: 'none' }}>
                      <input type="text" name="b_check" tabIndex={-1} autoComplete="off" />
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="btn-submit"
                    >
                      {isSubmitting ? (
                        <>
                          <span className="spinner" />
                          <span>{t.sending}</span>
                        </>
                      ) : (
                        <>
                          <span>{t.submit}</span>
                          <Send size={15} />
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </main>

          </div>
        </div>
      </section>

      {/* 3. Interactive Location Map */}
      <section className="contact-map-section">
        <div className="container">
          <div className="map-header">
            <div className="map-badge">
              <MapPin size={14} />
              <span>Base Principal Utopia Van Life • Mallorca</span>
            </div>
            <p className="map-subtitle">Polígono Son Oms, Palma (a 5 minutos del Aeropuerto PMI)</p>
          </div>
          
          <div className="map-frame-wrapper">
            <iframe
              loading="lazy"
              src="https://maps.google.com/maps?q=poligono%20Son%20Oms%2C%20Palma%20de%20Mallorca%20%28Illes%20Balears%29&t=m&z=14&output=embed&iwloc=near"
              title="Base Utopia Van Life - Polígono Son Oms, Palma"
              aria-label="Base Utopia Van Life - Polígono Son Oms, Palma"
              className="map-iframe"
            />
          </div>
        </div>
      </section>

      {/* 4. Newsletter Section */}
      <section className="newsletter-section">
        <div className="container">
          <div className="newsletter-card">
            <div className="newsletter-text">
              <h2 className="newsletter-title">{t.newsletterTitle}</h2>
              <p className="newsletter-sub">{t.newsletterSubtitle}</p>
            </div>

            <div className="newsletter-action">
              {newsSubmitted ? (
                <div className="newsletter-success-badge">
                  <Check size={18} />
                  <span>¡Te has unido con éxito! Revisa tu buzón.</span>
                </div>
              ) : (
                <form onSubmit={handleNewsletterSubmit} className="newsletter-form-inline">
                  <input
                    type="email"
                    required
                    value={newsEmail}
                    onChange={e => setNewsEmail(e.target.value)}
                    placeholder={t.newsletterPlaceholder}
                    className="newsletter-field"
                  />
                  <button
                    type="submit"
                    disabled={newsSubmitting}
                    className="newsletter-btn"
                  >
                    {newsSubmitting ? '...' : (
                      <>
                        <span>{t.newsletterSubmit}</span>
                        <ArrowRight size={15} />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      <style jsx>{`
        .contact-page {
          background: #FAF9F6;
          min-height: 100vh;
        }

        /* 1. Hero */
        .contact-hero {
          background: var(--cream);
          padding: clamp(96px, 10vw, 120px) 0 12px;
          text-align: center;
          border-bottom: 1px solid rgba(0, 0, 0, 0.04);
        }

        .hero-kicker {
          display: block;
          font-size: 0.74rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          color: var(--sand-dark);
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .hero-title-container {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: clamp(14px, 3.5vw, 28px);
          margin: 0 auto;
        }

        .hero-logo-box {
          width: clamp(56px, 7.5vw, 84px);
          height: clamp(56px, 7.5vw, 84px);
          border-radius: 50%;
          overflow: hidden;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
          border: 3px solid #FFFFFF;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.25s ease;
        }

        .hero-logo-box:hover {
          transform: scale(1.08);
        }

        .hero-logo-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
        }

        .hero-title {
          font-family: var(--font-heading);
          font-size: clamp(1.85rem, 4.5vw, 2.75rem);
          font-weight: 700;
          color: var(--forest-green);
          line-height: 1.15;
          margin: 0;
        }

        .hero-subtitle {
          font-size: clamp(0.95rem, 2vw, 1.1rem);
          color: var(--gray-600);
          max-width: 620px;
          margin: 10px auto 0;
          line-height: 1.55;
        }

        /* 2. Main Content */
        .contact-main {
          padding: clamp(20px, 3vw, 36px) 0 clamp(32px, 5vw, 60px) 0;
        }

        .contact-grid {
          display: grid;
          grid-template-columns: 1fr 1.4fr;
          gap: clamp(24px, 4vw, 48px);
          align-items: start;
        }

        @media (max-width: 960px) {
          .contact-grid {
            grid-template-columns: 1fr;
          }
        }

        /* Left Column: Info Panel */
        .info-card {
          background: white;
          border: 1px solid #E2E8F0;
          border-radius: var(--radius-lg);
          padding: clamp(24px, 3.5vw, 36px);
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
        }

        .info-card-title {
          font-family: var(--font-heading);
          font-size: 1.35rem;
          font-weight: 700;
          color: var(--forest-green);
          margin: 0;
        }

        .info-card-sub {
          font-size: 0.85rem;
          color: #64748B;
          margin: 4px 0 24px;
          line-height: 1.45;
        }

        .info-items-stack {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .info-item {
          display: flex;
          gap: 14px;
          align-items: flex-start;
        }

        .info-icon-box {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: rgba(45, 58, 45, 0.08);
          color: var(--forest-green);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .info-item-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .info-item-label {
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          color: var(--sand-dark);
          text-transform: uppercase;
        }

        .info-item-value {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--black-matte);
          margin: 0;
        }

        .info-item-link {
          text-decoration: none;
          transition: color 0.15s ease;
        }
        .info-item-link:hover {
          color: var(--forest-green);
        }

        .info-item-sublink {
          font-size: 0.82rem;
          color: #64748B;
          text-decoration: none;
        }
        .info-item-sublink:hover {
          color: var(--forest-green);
        }

        .info-item-tag {
          font-size: 0.75rem;
          font-weight: 600;
          color: #15803D;
          background: #DCFCE7;
          padding: 2px 8px;
          border-radius: var(--radius-full);
          margin-top: 4px;
          display: inline-block;
          width: fit-content;
        }

        .phone-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .whatsapp-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 10px;
          background: #F0FDF4;
          color: #15803D;
          border: 1px solid #BBF7D0;
          border-radius: var(--radius-full);
          font-size: 0.76rem;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.15s ease;
        }

        .whatsapp-btn:hover {
          background: #DCFCE7;
          border-color: #86EFAC;
          color: #166534;
        }

        .socials-divider {
          height: 1px;
          background: #F1F5F9;
          margin: 24px 0 20px;
        }

        .socials-wrap {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .socials-label {
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          color: var(--sand-dark);
          text-transform: uppercase;
        }

        .socials-row {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .social-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          background: #F8FAFC;
          border: 1px solid #CBD5E1;
          border-radius: var(--radius-md);
          color: var(--black-matte);
          font-size: 0.82rem;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.15s ease;
        }
        .social-pill:hover {
          background: var(--forest-green);
          color: white;
          border-color: var(--forest-green);
        }

        /* Right Column: Form Panel */
        .form-card {
          background: white;
          border: 1px solid #E2E8F0;
          border-radius: var(--radius-lg);
          padding: clamp(24px, 3.5vw, 36px);
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
        }

        .form-header {
          margin-bottom: 20px;
          padding-bottom: 12px;
          border-bottom: 1px solid #F1F5F9;
        }

        .form-title {
          font-family: var(--font-heading);
          font-size: 1.35rem;
          font-weight: 700;
          color: var(--forest-green);
          margin: 0;
        }

        .form-sub {
          font-size: 0.85rem;
          color: #64748B;
          margin: 3px 0 0;
        }

        .form-stack {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        @media (max-width: 600px) {
          .grid-2 {
            grid-template-columns: 1fr;
          }
        }

        .field-block {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .field-label {
          font-size: 0.82rem;
          font-weight: 700;
          color: #1E293B;
        }

        .field-input,
        .field-textarea {
          width: 100%;
          padding: 11px 14px;
          border: 1.5px solid #CBD5E1;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 500;
          color: #0F172A;
          background: #F8FAFC;
          box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.02);
          transition: all 0.2s ease;
          font-family: inherit;
        }

        .field-input:hover,
        .field-textarea:hover {
          border-color: #94A3B8;
          background: #F1F5F9;
        }

        .field-input:focus,
        .field-textarea:focus {
          outline: none;
          background: #FFFFFF;
          border-color: var(--forest-green);
          box-shadow: 0 0 0 4px rgba(26, 43, 33, 0.12);
        }

        .field-input::placeholder,
        .field-textarea::placeholder {
          color: #94A3B8;
          font-weight: 400;
        }

        .btn-submit {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 13px 24px;
          background: var(--forest-green);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(26, 43, 33, 0.18);
          margin-top: 6px;
        }

        .btn-submit:hover:not(:disabled) {
          background: #14231a;
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(26, 43, 33, 0.22);
        }

        .btn-submit:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Success Banner */
        .success-banner {
          text-align: center;
          padding: 36px 16px;
        }

        .success-icon-circle {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: #DCFCE7;
          color: #15803D;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
        }

        .success-title {
          font-family: var(--font-heading);
          font-size: 1.4rem;
          font-weight: 700;
          color: var(--forest-green);
          margin: 0;
        }

        .success-text {
          font-size: 0.95rem;
          color: #334155;
          margin: 8px 0 4px;
        }

        .success-subtext {
          font-size: 0.84rem;
          color: #64748B;
          margin: 0;
        }

        .btn-resend {
          margin-top: 24px;
          padding: 8px 18px;
          background: #F1F5F9;
          border: 1px solid #CBD5E1;
          border-radius: var(--radius-md);
          font-size: 0.85rem;
          font-weight: 600;
          color: #334155;
          cursor: pointer;
        }
        .btn-resend:hover {
          background: #E2E8F0;
        }

        /* 3. Location Map */
        .contact-map-section {
          padding: 0 0 clamp(40px, 6vw, 60px);
        }

        .map-header {
          text-align: center;
          margin-bottom: 20px;
        }

        .map-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.88rem;
          font-weight: 700;
          color: var(--forest-green);
        }

        .map-subtitle {
          font-size: 0.84rem;
          color: #64748B;
          margin: 3px 0 0;
        }

        .map-frame-wrapper {
          border-radius: var(--radius-lg);
          overflow: hidden;
          border: 1px solid #E2E8F0;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
          height: 380px;
        }

        .map-iframe {
          width: 100%;
          height: 100%;
          border: 0;
        }

        /* 4. Newsletter Strip */
        .newsletter-section {
          background: var(--cream);
          padding: clamp(36px, 5vw, 56px) 0;
          border-top: 1px solid rgba(0, 0, 0, 0.06);
        }

        .newsletter-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 28px;
          flex-wrap: wrap;
        }

        .newsletter-text {
          flex: 1;
          min-width: 280px;
        }

        .newsletter-title {
          font-family: var(--font-heading);
          font-size: clamp(1.2rem, 3vw, 1.5rem);
          font-weight: 700;
          color: var(--forest-green);
          margin: 0;
        }

        .newsletter-sub {
          font-size: 0.85rem;
          color: #64748B;
          margin: 4px 0 0;
          max-width: 480px;
        }

        .newsletter-action {
          flex: 1;
          min-width: 280px;
          max-width: 440px;
        }

        .newsletter-form-inline {
          display: flex;
          gap: 8px;
        }

        .newsletter-field {
          flex: 1;
          padding: 10px 14px;
          border: 1.5px solid #CBD5E1;
          border-radius: var(--radius-md);
          font-size: 0.88rem;
          color: #0F172A;
          background: white;
        }

        .newsletter-field:focus {
          outline: none;
          border-color: var(--forest-green);
        }

        .newsletter-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 10px 18px;
          background: var(--forest-green);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          transition: background-color 0.15s ease;
        }

        .newsletter-btn:hover {
          background: #14231a;
        }

        .newsletter-success-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #DCFCE7;
          color: #15803D;
          padding: 10px 18px;
          border-radius: var(--radius-md);
          font-size: 0.85rem;
          font-weight: 600;
        }

        @media (max-width: 768px) {
          .newsletter-card {
            flex-direction: column;
            align-items: flex-start;
          }
          .newsletter-action {
            width: 100%;
            max-width: 100%;
          }
        }
      `}</style>
    </div>
  )
}
