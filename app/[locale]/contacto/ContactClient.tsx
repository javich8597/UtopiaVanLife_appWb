'use client'

import { useState } from 'react'
import { Mail, Phone, MapPin, Check, Instagram } from 'lucide-react'

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
  const [options, setOptions] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Newsletter Form State
  const [newsEmail, setNewsEmail] = useState('')
  const [newsSubmitting, setNewsSubmitting] = useState(false)
  const [newsSubmitted, setNewsSubmitted] = useState(false)

  const handleOptionChange = (option: string) => {
    if (options.includes(option)) {
      setOptions(options.filter(o => o !== option))
    } else {
      setOptions([...options, option])
    }
  }

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate API call (can be wired to GoHighLevel CRM or Supabase db later)
    await new Promise(resolve => setTimeout(resolve, 1500))

    setIsSubmitting(false)
    setSubmitted(true)
    // Clear fields
    setFirstName('')
    setLastName('')
    setEmail('')
    setPhone('')
    setOptions([])
  }

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newsEmail) return
    newsSubmitting || setNewsSubmitting(true)

    // Simulate newsletter subscription API call
    await new Promise(resolve => setTimeout(resolve, 1200))

    setNewsSubmitting(false)
    setNewsSubmitted(true)
    setNewsEmail('')
  }

  return (
    <main className="contact-page">
      {/* Header section */}
      <section className="contact-hero">
        <div className="container" style={{ textAlign: 'center' }}>
          <h1 className="text-display" style={{ color: 'var(--black-matte)' }}>
            {t.title}
          </h1>
          <p className="text-body-large" style={{ color: 'var(--gray-600)', marginTop: 'var(--space-4)', maxWidth: 600, marginLeft: 'auto', marginRight: 'auto' }}>
            {t.subtitle}
          </p>
        </div>
      </section>

      {/* Main Grid */}
      <section className="section bg-white" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="contact-grid">
            
            {/* Left Column: Info & Socials */}
            <div className="contact-info-col">
              <div className="info-card">
                <h3 className="text-h3" style={{ marginBottom: 'var(--space-6)' }}>
                  Información de contacto
                </h3>
                
                <ul className="info-list">
                  <li className="info-item">
                    <div className="info-icon">
                      <Mail size={20} />
                    </div>
                    <div>
                      <p className="info-label">{t.email}</p>
                      <a href="mailto:info@utopiavanlife.com" className="info-link">info@utopiavanlife.com</a>
                      <br />
                      <a href="mailto:administracion@utopiavanlife.com" className="info-link">administracion@utopiavanlife.com</a>
                    </div>
                  </li>

                  <li className="info-item">
                    <div className="info-icon">
                      <Phone size={20} />
                    </div>
                    <div>
                      <p className="info-label">{t.phone}</p>
                      <a href="tel:+34611560916" className="info-link">+34 611 560 916</a>
                    </div>
                  </li>

                  <li className="info-item">
                    <div className="info-icon">
                      <MapPin size={20} />
                    </div>
                    <div>
                      <p className="info-label">{t.address}</p>
                      <p className="info-value">Carrer Son Oms, Palma de Mallorca (Illes Balears)</p>
                    </div>
                  </li>
                </ul>

                <hr className="info-divider" />

                <div className="social-wrap">
                  <p className="info-label" style={{ marginBottom: 'var(--space-3)' }}>Síguenos</p>
                  <div className="social-buttons">
                    <a href="https://www.instagram.com/utopiavanlife/" target="_blank" rel="noopener noreferrer" className="social-btn">
                      <Instagram size={20} />
                      <span>Instagram</span>
                    </a>
                    <a href="https://www.tiktok.com/@utopiavanlife" target="_blank" rel="noopener noreferrer" className="social-btn">
                      <svg style={{ height: '20px', width: '20px', fill: 'currentColor' }} viewBox="0 0 448 512" xmlns="http://www.w3.org/2000/svg">
                        <path d="M448,209.91a210.06,210.06,0,0,1-122.77-39.25V349.38A162.55,162.55,0,1,1,185,188.31V278.2a74.62,74.62,0,1,0,52.23,71.18V0l88,0a121.18,121.18,0,0,0,1.86,22.17h0A122.18,122.18,0,0,0,381,102.39a121.43,121.43,0,0,0,67,20.14Z" />
                      </svg>
                      <span>TikTok</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Form */}
            <div className="contact-form-col">
              <div className="form-card">
                {submitted ? (
                  <div className="success-banner">
                    <div className="success-icon">
                      <Check size={28} />
                    </div>
                    <h3 className="text-h3" style={{ color: 'var(--forest-green)', marginTop: 'var(--space-4)' }}>
                      ¡Enviado!
                    </h3>
                    <p className="text-body" style={{ marginTop: 'var(--space-2)' }}>
                      {t.successMsg}
                    </p>
                    <button onClick={() => setSubmitted(false)} className="btn btn-forest btn-sm" style={{ marginTop: 'var(--space-6)' }}>
                      Enviar otro mensaje
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit} className="contact-form">
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="first_name">{t.name} *</label>
                        <input
                          type="text"
                          id="first_name"
                          value={firstName}
                          onChange={e => setFirstName(e.target.value)}
                          required
                          placeholder={t.name}
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="last_name">{t.lastName} *</label>
                        <input
                          type="text"
                          id="last_name"
                          value={lastName}
                          onChange={e => setLastName(e.target.value)}
                          required
                          placeholder={t.lastName}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="email">{t.email} *</label>
                      <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        placeholder={t.email}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="phone">{t.phone}</label>
                      <input
                        type="tel"
                        id="phone"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder={t.phone}
                      />
                    </div>

                    {/* Honey Pot Spam Trap (Hidden) */}
                    <div className="honey-pot" style={{ display: 'none' }}>
                      <label htmlFor="spam_check">Leave this empty</label>
                      <input type="text" id="spam_check" tabIndex={-1} autoComplete="off" />
                    </div>

                    <div className="form-group">
                      <label>{t.howHelp}</label>
                      <div className="checkbox-group">
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={options.includes('comprar')}
                            onChange={() => handleOptionChange('comprar')}
                          />
                          <span>{t.helpOption1}</span>
                        </label>
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={options.includes('alquilar')}
                            onChange={() => handleOptionChange('alquilar')}
                          />
                          <span>{t.helpOption2}</span>
                        </label>
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={options.includes('dudas')}
                            onChange={() => handleOptionChange('dudas')}
                          />
                          <span>{t.helpOption3}</span>
                        </label>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="btn btn-forest btn-lg btn-block"
                      style={{ marginTop: 'var(--space-4)' }}
                    >
                      {isSubmitting ? t.sending : t.submit}
                    </button>
                  </form>
                )}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="contact-map">
        <iframe
          loading="lazy"
          src="https://maps.google.com/maps?q=poligono%20Son%20Oms%2C%20Palma%20de%20Mallorca%20%28Illes%20Balears%29&t=m&z=14&output=embed&iwloc=near"
          title="poligono Son Oms, Palma de Mallorca (Illes Balears)"
          aria-label="poligono Son Oms, Palma de Mallorca (Illes Balears)"
          style={{ width: '100%', height: '400px', border: 0 }}
        />
      </section>

      {/* Newsletter Section */}
      <section className="section bg-cream">
        <div className="container" style={{ maxWidth: '680px', textAlign: 'center' }}>
          <h2 className="text-h2">
            {t.newsletterTitle}
          </h2>
          <p className="text-body" style={{ color: 'var(--gray-600)', marginTop: 'var(--space-2)', marginBottom: 'var(--space-6)' }}>
            {t.newsletterSubtitle}
          </p>

          {newsSubmitted ? (
            <div className="newsletter-success">
              <Check size={20} style={{ color: 'var(--forest-green)', marginRight: '8px' }} />
              <span>¡Te has unido con éxito!</span>
            </div>
          ) : (
            <form onSubmit={handleNewsletterSubmit} className="newsletter-form">
              <input
                type="email"
                required
                value={newsEmail}
                onChange={e => setNewsEmail(e.target.value)}
                placeholder={t.newsletterPlaceholder}
                className="newsletter-input"
              />
              <button
                type="submit"
                disabled={newsSubmitting}
                className="btn btn-forest"
              >
                {newsSubmitting ? '...' : t.newsletterSubmit}
              </button>
            </form>
          )}
        </div>
      </section>

      <style jsx>{`
        .contact-hero {
          background: var(--cream);
          padding: var(--space-20) 0 var(--space-12) 0;
        }
        .contact-grid {
          display: grid;
          grid-template-columns: 1.2fr 1.8fr;
          gap: var(--space-12);
          margin-top: calc(-1 * var(--space-8));
        }
        .info-card {
          background: var(--cream);
          padding: var(--space-8);
          border-radius: var(--radius-lg);
          height: 100%;
        }
        .info-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: var(--space-6);
        }
        .info-item {
          display: flex;
          gap: var(--space-4);
          align-items: flex-start;
        }
        .info-icon {
          flex-shrink: 0;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(43,76,55,0.08);
          color: var(--forest-green);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 2px;
        }
        .info-label {
          font-size: var(--text-xs);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--gray-500);
          font-weight: 600;
          margin-bottom: 2px;
        }
        .info-link {
          color: var(--black-matte);
          font-weight: 500;
          text-decoration: none;
          transition: color var(--transition-base);
        }
        .info-link:hover {
          color: var(--forest-green);
        }
        .info-value {
          color: var(--black-matte);
          font-weight: 500;
          margin: 0;
        }
        .info-divider {
          border: 0;
          border-top: 1px solid rgba(0,0,0,0.08);
          margin: var(--space-8) 0;
        }
        .social-buttons {
          display: flex;
          gap: var(--space-3);
          flex-wrap: wrap;
        }
        .social-btn {
          display: inline-flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-2) var(--space-4);
          background: white;
          border: 1px solid rgba(0,0,0,0.08);
          border-radius: var(--radius-md);
          color: var(--black-matte);
          font-size: var(--text-sm);
          font-weight: 500;
          text-decoration: none;
          transition: all var(--transition-base);
        }
        .social-btn:hover {
          background: var(--forest-green);
          color: white;
          border-color: var(--forest-green);
        }
        .form-card {
          background: white;
          border: 1px solid rgba(0,0,0,0.06);
          box-shadow: 0 4px 30px rgba(0,0,0,0.03);
          padding: var(--space-8);
          border-radius: var(--radius-lg);
        }
        .contact-form {
          display: flex;
          flex-direction: column;
          gap: var(--space-5);
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-4);
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }
        .form-group label {
          font-size: var(--text-sm);
          font-weight: 500;
          color: var(--gray-700);
        }
        .form-group input[type="text"],
        .form-group input[type="email"],
        .form-group input[type="tel"] {
          width: 100%;
          height: 48px;
          padding: 0 var(--space-4);
          border: 1px solid var(--gray-300);
          border-radius: var(--radius-md);
          font-size: var(--text-base);
          transition: all var(--transition-base);
        }
        .form-group input:focus {
          border-color: var(--forest-green);
          box-shadow: 0 0 0 2px rgba(43,76,55,0.1);
          outline: none;
        }
        .checkbox-group {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          margin-top: var(--space-1);
        }
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          font-size: var(--text-sm);
          color: var(--gray-700);
          cursor: pointer;
        }
        .checkbox-label input[type="checkbox"] {
          width: 18px;
          height: 18px;
          accent-color: var(--forest-green);
          cursor: pointer;
        }
        .success-banner {
          text-align: center;
          padding: var(--space-8) 0;
        }
        .success-icon {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: rgba(43,76,55,0.08);
          color: var(--forest-green);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto;
        }
        .contact-map {
          line-height: 0;
        }
        .newsletter-form {
          display: flex;
          gap: var(--space-2);
          max-width: 500px;
          margin: 0 auto;
        }
        .newsletter-input {
          flex: 1;
          height: 48px;
          padding: 0 var(--space-4);
          border: 1px solid var(--gray-300);
          border-radius: var(--radius-md);
          font-size: var(--text-base);
        }
        .newsletter-input:focus {
          border-color: var(--forest-green);
          outline: none;
        }
        .newsletter-success {
          display: inline-flex;
          align-items: center;
          background: rgba(43,76,55,0.08);
          padding: var(--space-3) var(--space-6);
          border-radius: var(--radius-full);
          font-weight: 500;
          color: var(--forest-green);
        }
        @media (max-width: 900px) {
          .contact-grid {
            grid-template-columns: 1fr;
            gap: var(--space-8);
          }
        }
        @media (max-width: 600px) {
          .form-row {
            grid-template-columns: 1fr;
          }
          .newsletter-form {
            flex-direction: column;
            gap: var(--space-3);
          }
        }
      `}</style>
    </main>
  )
}
