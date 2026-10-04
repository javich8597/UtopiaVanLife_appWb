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
  Sparkles
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
  const [submitted, setSubmitted] = useState(false)


  // El formulario no tiene servidor de correo: se envía por WhatsApp (o email) con el
  // mensaje ya redactado, en vez de simular un envío que nunca llegaba a nadie.
  const composedMessage = () => [
    `Hola Utopia Van Life, soy ${firstName} ${lastName}.`,
    message,
    `Email: ${email}`,
    phone ? `Teléfono: ${phone}` : null,
  ].filter((line): line is string => line !== null).join('\n\n')

  const mailtoHref = () =>
    `mailto:info@utopiavanlife.com?subject=${encodeURIComponent(`Consulta de ${firstName} ${lastName}`.trim())}&body=${encodeURIComponent(composedMessage())}`

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    window.open(`https://wa.me/34611560916?text=${encodeURIComponent(composedMessage())}`, '_blank', 'noopener,noreferrer')
    setSubmitted(true)
  }

  return (
    <div className="contact-page">
      {/* 1. Header Hero */}
      <section className="contact-hero">
        <div className="container">
          <div className="hero-kicker-wrap">
            <Sparkles size={13} className="hero-kicker-icon" />
            <span className="hero-kicker">UTOPIA CONCIERGE · ATENCIÓN EXCLUSIVA MALLORCA</span>
          </div>
          <h1 className="hero-title">{t.title}</h1>
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
                      <Instagram size={15} />
                      <span>Instagram</span>
                    </a>
                    <a href="https://www.tiktok.com/@utopiavanlife" target="_blank" rel="noopener noreferrer" className="social-pill">
                      <svg className="social-svg-icon" viewBox="0 0 448 512" xmlns="http://www.w3.org/2000/svg">
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
                    <h3 className="success-title">Tu mensaje está listo en WhatsApp</h3>
                    <p className="success-text">Pulsa enviar en WhatsApp y te respondemos personalmente, normalmente en menos de 15 minutos.</p>
                    <p className="success-subtext">¿Prefieres email? <a href={mailtoHref()} className="info-item-link">Envíalo a info@utopiavanlife.com</a></p>
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
                    <div className="visually-hidden">
                      <input type="text" name="b_check" tabIndex={-1} autoComplete="off" />
                    </div>

                    {/* Submit Button */}
                    <button type="submit" className="btn-submit">
                      <span>Enviar por WhatsApp</span>
                      <Send size={15} />
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
              <MapPin size={14} className="map-badge-icon" />
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


      <style jsx>{`
        .contact-page {
          background: #0B0C0E;
          min-height: 100vh;
          padding-top: 76px;
          color: #FFFFFF;
        }

        /* 1. Hero */
        .contact-hero {
          background: radial-gradient(ellipse 80% 60% at 50% -20%, rgba(204, 160, 83, 0.14), transparent 70%), #0B0C0E;
          padding: 4.5rem 0 3rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          text-align: center;
        }

        .hero-kicker-wrap {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 14px;
          border-radius: var(--radius-full);
          background: rgba(204, 160, 83, 0.12);
          border: 1px solid rgba(204, 160, 83, 0.35);
          margin-bottom: 1rem;
        }
        :global(.hero-kicker-icon) {
          color: #CCA053;
        }
        .hero-kicker {
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.18em;
          color: #CCA053;
          text-transform: uppercase;
        }

        .hero-title {
          font-family: var(--font-display, sans-serif);
          font-size: clamp(2.4rem, 5vw, 3.8rem);
          font-weight: 800;
          color: #FFFFFF;
          line-height: 1.1;
          margin: 0;
          letter-spacing: -0.02em;
          text-transform: uppercase;
        }

        .hero-subtitle {
          font-size: clamp(0.95rem, 2vw, 1.1rem);
          color: rgba(255, 255, 255, 0.65);
          max-width: 620px;
          margin: 12px auto 0;
          line-height: 1.6;
        }

        /* 2. Main Content */
        .contact-main {
          padding: var(--space-12) 0 var(--space-16);
        }

        .contact-grid {
          display: grid;
          grid-template-columns: 1fr 1.35fr;
          gap: 2.5rem;
          align-items: start;
        }

        @media (max-width: 960px) {
          .contact-grid {
            grid-template-columns: 1fr;
          }
        }

        /* Left Column: Info Panel */
        .info-card {
          background: #131518;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          padding: 2.2rem 2rem;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
        }

        .info-card-title {
          font-family: var(--font-display, sans-serif);
          font-size: 1.35rem;
          font-weight: 800;
          color: #FFFFFF;
          margin: 0;
          letter-spacing: -0.01em;
          text-transform: uppercase;
        }

        .info-card-sub {
          font-size: 0.88rem;
          color: rgba(255, 255, 255, 0.55);
          margin: 6px 0 24px;
          line-height: 1.5;
        }

        .info-items-stack {
          display: flex;
          flex-direction: column;
          gap: 22px;
        }

        .info-item {
          display: flex;
          gap: 14px;
          align-items: flex-start;
        }

        .info-icon-box {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: rgba(204, 160, 83, 0.12);
          color: #CCA053;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .info-item-content {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .info-item-label {
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.14em;
          color: #CCA053;
          text-transform: uppercase;
        }

        .info-item-value {
          font-size: 0.95rem;
          font-weight: 600;
          color: #FFFFFF;
          margin: 0;
        }

        .info-item-link {
          text-decoration: none;
          transition: color 0.15s ease;
        }
        .info-item-link:hover {
          color: #CCA053;
        }

        .info-item-sublink {
          font-size: 0.82rem;
          color: rgba(255, 255, 255, 0.5);
          text-decoration: none;
          transition: color 0.15s ease;
        }
        .info-item-sublink:hover {
          color: #CCA053;
        }

        .info-item-tag {
          font-size: 0.75rem;
          font-weight: 600;
          color: #CCA053;
          background: rgba(204, 160, 83, 0.12);
          border: 1px solid rgba(204, 160, 83, 0.25);
          padding: 3px 10px;
          border-radius: var(--radius-full);
          margin-top: 6px;
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
          gap: 6px;
          padding: 4px 12px;
          border-radius: var(--radius-full);
          background: #25D366;
          color: #0B0C0E;
          font-size: 0.75rem;
          font-weight: 700;
          text-decoration: none;
          transition: all 0.2s ease;
        }
        .whatsapp-btn:hover {
          background: #1EBE5D;
          transform: translateY(-1px);
        }

        .socials-divider {
          height: 1px;
          background: rgba(255, 255, 255, 0.08);
          margin: 24px 0 20px;
        }

        .socials-wrap {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .socials-label {
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.5);
        }

        .socials-row {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .social-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: var(--radius-full);
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.84rem;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s ease;
        }
        .social-pill:hover {
          border-color: #CCA053;
          background: rgba(204, 160, 83, 0.12);
          color: #CCA053;
          transform: translateY(-2px);
        }
        .social-svg-icon {
          width: 15px;
          height: 15px;
          fill: currentColor;
        }

        /* Right Column: Form Panel */
        .form-card {
          background: #131518;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          padding: 2.5rem 2.2rem;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
        }

        .form-header {
          margin-bottom: 24px;
        }

        .form-title {
          font-family: var(--font-display, sans-serif);
          font-size: 1.5rem;
          font-weight: 800;
          color: #FFFFFF;
          margin: 0;
          letter-spacing: -0.01em;
          text-transform: uppercase;
        }

        .form-sub {
          font-size: 0.88rem;
          color: rgba(255, 255, 255, 0.55);
          margin: 6px 0 0;
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

        @media (max-width: 640px) {
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
          font-size: 0.78rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.7);
        }

        .field-input,
        .field-textarea {
          width: 100%;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 14px;
          padding: 12px 16px;
          font-size: 0.92rem;
          color: #FFFFFF;
          outline: none;
          box-sizing: border-box;
          font-family: inherit;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .field-input:focus,
        .field-textarea:focus {
          border-color: #CCA053;
          box-shadow: 0 0 0 3px rgba(204, 160, 83, 0.18);
          background: rgba(255, 255, 255, 0.06);
        }

        .field-input::placeholder,
        .field-textarea::placeholder {
          color: rgba(255, 255, 255, 0.35);
        }

        .field-textarea {
          resize: vertical;
          min-height: 110px;
        }

        .visually-hidden {
          display: none;
        }

        .btn-submit {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 14px 28px;
          border-radius: var(--radius-full);
          background: #CCA053;
          color: #0B0C0E;
          font-size: 0.92rem;
          font-weight: 700;
          letter-spacing: 0.02em;
          border: none;
          cursor: pointer;
          margin-top: 8px;
          box-shadow: 0 6px 20px rgba(204, 160, 83, 0.35);
          transition: all 0.2s ease;
        }

        .btn-submit:hover:not(:disabled) {
          background: #d8ad5e;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(204, 160, 83, 0.45);
        }

        .btn-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(11, 12, 14, 0.3);
          border-top-color: #0B0C0E;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Success */
        .success-banner {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 2rem 1rem;
          gap: 12px;
        }

        .success-icon-circle {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: rgba(204, 160, 83, 0.15);
          color: #CCA053;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .success-title {
          font-family: var(--font-display, sans-serif);
          font-size: 1.4rem;
          font-weight: 800;
          color: #FFFFFF;
          margin: 0;
        }

        .success-text {
          font-size: 0.95rem;
          color: rgba(255, 255, 255, 0.8);
          margin: 0;
          max-width: 440px;
        }

        .success-subtext {
          font-size: 0.82rem;
          color: rgba(255, 255, 255, 0.5);
          margin: 0;
        }

        .btn-resend {
          margin-top: 12px;
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #FFFFFF;
          padding: 8px 18px;
          border-radius: var(--radius-full);
          cursor: pointer;
          font-size: 0.85rem;
          font-weight: 600;
          transition: all 0.2s ease;
        }
        .btn-resend:hover {
          border-color: #CCA053;
          color: #CCA053;
        }

        /* 3. Location Map */
        .contact-map-section {
          padding-bottom: 5rem;
        }

        .map-header {
          text-align: center;
          margin-bottom: 1.5rem;
        }

        .map-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.85rem;
          font-weight: 700;
          color: #FFFFFF;
        }
        :global(.map-badge-icon) {
          color: #CCA053;
        }

        .map-subtitle {
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.5);
          margin: 4px 0 0;
        }

        .map-frame-wrapper {
          border-radius: 24px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 20px 48px rgba(0, 0, 0, 0.6);
          height: 380px;
        }

        .map-iframe {
          width: 100%;
          height: 100%;
          border: none;
          filter: invert(90%) hue-rotate(180deg) brightness(95%) contrast(90%);
        }

        /* 4. Newsletter */
        .newsletter-section {
          padding-bottom: 6rem;
        }

        .newsletter-card {
          border-radius: 28px;
          background: radial-gradient(ellipse at 50% 0%, rgba(204, 160, 83, 0.15), transparent 70%), #131518;
          border: 1px solid rgba(204, 160, 83, 0.25);
          padding: 3.5rem 3rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 2.5rem;
          box-shadow: 0 20px 48px rgba(0, 0, 0, 0.6);
        }

        .newsletter-title {
          font-family: var(--font-display, sans-serif);
          font-size: clamp(1.6rem, 2.8vw, 2.2rem);
          font-weight: 800;
          color: #FFFFFF;
          margin: 0;
          letter-spacing: -0.01em;
          text-transform: uppercase;
        }

        .newsletter-sub {
          font-size: 0.92rem;
          color: rgba(255, 255, 255, 0.65);
          margin: 6px 0 0;
          max-width: 480px;
        }

        .newsletter-form-inline {
          display: flex;
          gap: 10px;
          width: 100%;
          max-width: 440px;
        }

        .newsletter-field {
          flex: 1;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: var(--radius-full);
          padding: 12px 20px;
          font-size: 0.9rem;
          color: #FFFFFF;
          outline: none;
          box-sizing: border-box;
          transition: all 0.2s ease;
        }
        .newsletter-field:focus {
          border-color: #CCA053;
          box-shadow: 0 0 0 3px rgba(204, 160, 83, 0.18);
        }
        .newsletter-field::placeholder {
          color: rgba(255, 255, 255, 0.35);
        }

        .newsletter-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 12px 22px;
          border-radius: var(--radius-full);
          background: #CCA053;
          color: #0B0C0E;
          font-weight: 700;
          font-size: 0.88rem;
          border: none;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s ease;
        }
        .newsletter-btn:hover {
          background: #d8ad5e;
          transform: translateY(-1px);
        }

        .newsletter-success-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          border-radius: var(--radius-full);
          background: rgba(204, 160, 83, 0.15);
          border: 1px solid rgba(204, 160, 83, 0.4);
          color: #CCA053;
          font-weight: 600;
          font-size: 0.88rem;
        }

        @media (max-width: 860px) {
          .newsletter-card {
            flex-direction: column;
            align-items: flex-start;
            padding: 2.5rem 1.8rem;
          }
          .newsletter-form-inline {
            max-width: 100%;
          }
        }

        @media (max-width: 640px) {
          .contact-hero {
            padding: 3rem 0 2rem;
          }
          .info-card,
          .form-card {
            padding: 1.8rem 1.4rem;
          }
          .newsletter-form-inline {
            flex-direction: column;
          }
          .newsletter-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  )
}
