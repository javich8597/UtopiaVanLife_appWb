'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import {
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Send,
  Download,
  Mail,
  Phone,
  MapPin,
  ArrowDown,
  Check,
  Star,
  Instagram,
  Facebook,
  Compass,
  Coins,
  Clock,
  Sparkles
} from 'lucide-react'

const CAROUSEL_IMAGES = [
  {
    url: 'https://www.utopiavanlife.com/wp-content/uploads/2026/03/EXT01-e1774856689344.png',
    alt: 'Fiat Ducato Camper Exterior 1'
  },
  {
    url: 'https://www.utopiavanlife.com/wp-content/uploads/2026/03/EXT02-e1774856536428.png',
    alt: 'Fiat Ducato Camper Exterior 2'
  },
  {
    url: 'https://www.utopiavanlife.com/wp-content/uploads/2026/03/EXT04-1-e1775028933772.png',
    alt: 'Fiat Ducato Camper Exterior 3'
  }
]

// Elegant Custom Select Dropdown
function CustomDropdown({
  label,
  value,
  onChange,
  placeholder,
  options,
  icon: Icon
}: {
  label: string
  value: string
  onChange: (val: string) => void
  placeholder: string
  options: { label: string; value: string }[]
  icon?: any
}) {
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={dropdownRef} className="custom-dropdown">
      <label className="custom-dropdown__label">
        {label}
      </label>

      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`custom-dropdown__trigger ${open ? 'custom-dropdown__trigger--open' : ''} ${value ? 'custom-dropdown__trigger--selected' : ''}`}
      >
        <span className="custom-dropdown__value-wrap">
          {Icon && <Icon size={16} className="custom-dropdown__icon" />}
          <span>{value || placeholder}</span>
        </span>
        <ChevronDown
          size={18}
          className={`custom-dropdown__chevron ${open ? 'custom-dropdown__chevron--open' : ''}`}
        />
      </button>

      {open && (
        <div className="custom-dropdown__menu">
          {options.map(opt => {
            const isSelected = value === opt.value
            return (
              <div
                key={opt.value}
                onClick={() => {
                  onChange(opt.value)
                  setOpen(false)
                }}
                className={`custom-dropdown__item ${isSelected ? 'custom-dropdown__item--selected' : ''}`}
              >
                <span>{opt.label}</span>
                {isSelected && <Check size={16} className="custom-dropdown__check" strokeWidth={2.5} />}
              </div>
            )
          })}
        </div>
      )}

      <style jsx>{`
        .custom-dropdown {
          position: relative;
          width: 100%;
        }

        .custom-dropdown__label {
          font-size: 0.88rem;
          font-weight: 600;
          color: #E2E8F0;
          display: block;
          margin-bottom: 7px;
          letter-spacing: -0.01em;
        }

        .custom-dropdown__trigger {
          width: 100%;
          padding: 13px 18px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: #0B0C0E;
          font-size: 0.94rem;
          color: #94A3B8;
          font-weight: 400;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          outline: none;
        }

        .custom-dropdown__trigger:hover {
          border-color: rgba(204, 160, 83, 0.4);
          background: #0E1013;
        }

        .custom-dropdown__trigger--selected {
          color: #F8FAFC;
          font-weight: 600;
        }

        .custom-dropdown__trigger--open {
          border-color: #CCA053;
          box-shadow: 0 0 0 3px rgba(204, 160, 83, 0.18);
          background: #0E1013;
        }

        .custom-dropdown__value-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        :global(.custom-dropdown__icon) {
          color: #CCA053;
        }

        :global(.custom-dropdown__chevron) {
          color: #64748B;
          transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }

        :global(.custom-dropdown__chevron--open) {
          transform: rotate(180deg);
          color: #CCA053;
        }

        .custom-dropdown__menu {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          right: 0;
          background: #16191E;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
          padding: 6px;
          z-index: 60;
          backdrop-filter: blur(16px);
        }

        .custom-dropdown__item {
          padding: 11px 16px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          color: #94A3B8;
          font-weight: 500;
          font-size: 0.92rem;
          transition: all 0.15s ease;
        }

        .custom-dropdown__item:hover {
          background: rgba(255, 255, 255, 0.05);
          color: #FFFFFF;
        }

        .custom-dropdown__item--selected {
          background: rgba(204, 160, 83, 0.12);
          color: #CCA053;
          font-weight: 700;
        }

        :global(.custom-dropdown__check) {
          color: #CCA053;
        }
      `}</style>
    </div>
  )
}

export default function VentaClient() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const formRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mousePos = useRef({ x: -1000, y: -1000, targetX: -1000, targetY: -1000 })

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    interest: '',
    budget: '',
    timeframe: '',
    message: ''
  })

  // Canvas interactive dot matrix animation
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number

    const handleResize = () => {
      if (!canvas.parentElement) return
      canvas.width = canvas.parentElement.clientWidth
      canvas.height = canvas.parentElement.clientHeight
    }

    handleResize()
    window.addEventListener('resize', handleResize)

    const spacing = 28
    let dots: { x: number; y: number; originX: number; originY: number }[] = []

    const initDots = () => {
      dots = []
      const cols = Math.ceil(canvas.width / spacing) + 1
      const rows = Math.ceil(canvas.height / spacing) + 1
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = i * spacing
          const y = j * spacing
          dots.push({ x, y, originX: x, originY: y })
        }
      }
    }

    initDots()

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Smooth mouse interpolation
      mousePos.current.x += (mousePos.current.targetX - mousePos.current.x) * 0.1
      mousePos.current.y += (mousePos.current.targetY - mousePos.current.y) * 0.1

      const mx = mousePos.current.x
      const my = mousePos.current.y

      // Ambient luxury gold spotlight glow at mouse cursor
      if (mx > 0 && my > 0) {
        const gradient = ctx.createRadialGradient(mx, my, 0, mx, my, 220)
        gradient.addColorStop(0, 'rgba(204, 160, 83, 0.22)')
        gradient.addColorStop(0.5, 'rgba(19, 21, 24, 0.15)')
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }

      // Draw interactive matrix dots
      for (let i = 0; i < dots.length; i++) {
        const dot = dots[i]
        const dx = mx - dot.originX
        const dy = my - dot.originY
        const dist = Math.sqrt(dx * dx + dy * dy)
        const maxDist = 160

        let offsetX = 0
        let offsetY = 0
        let opacity = 0.18
        let radius = 1.3

        if (dist < maxDist) {
          const force = (1 - dist / maxDist)
          offsetX = - (dx / dist) * force * 14
          offsetY = - (dy / dist) * force * 14
          opacity = 0.25 + force * 0.7
          radius = 1.3 + force * 1.8
        }

        dot.x = dot.originX + offsetX
        dot.y = dot.originY + offsetY

        ctx.beginPath()
        ctx.arc(dot.x, dot.y, radius, 0, Math.PI * 2)
        ctx.fillStyle = dist < maxDist ? `rgba(204, 160, 83, ${opacity})` : `rgba(255, 255, 255, ${opacity})`
        ctx.fill()
      }

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    mousePos.current.targetX = e.clientX - rect.left
    mousePos.current.targetY = e.clientY - rect.top
  }

  const handlePointerLeave = () => {
    mousePos.current.targetX = -1000
    mousePos.current.targetY = -1000
  }

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Auto-rotate Section 3 Fiat Ducato carousel every 3.5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev === CAROUSEL_IMAGES.length - 1 ? 0 : prev + 1))
    }, 3500)
    return () => clearInterval(timer)
  }, [])

  const prevSlide = () => {
    setCurrentSlide(prev => (prev === 0 ? CAROUSEL_IMAGES.length - 1 : prev - 1))
  }

  const nextSlide = () => {
    setCurrentSlide(prev => (prev === CAROUSEL_IMAGES.length - 1 ? 0 : prev + 1))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    await new Promise(resolve => setTimeout(resolve, 1200))
    setSubmitting(false)
    setSubmitted(true)
  }

  return (
    <div className="venta-page">

      {/* 1. SECCIÓN: HERO CON FONDO CAMPER, MATRIZ INTERACTIVA Y LOGOS */}
      <section
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        className="venta-hero"
      >
        {/* Background Image */}
        <div className="venta-hero__bg">
          <Image
            src="https://www.utopiavanlife.com/wp-content/uploads/2026/03/EXT01-e1774856689344.png"
            alt="Fiat Ducato Camper Utopia Van Life"
            fill
            unoptimized
            className="venta-hero__bg-img"
            priority
          />
          <div className="venta-hero__overlay" />
        </div>

        {/* Dynamic Canvas Matrix */}
        <canvas ref={canvasRef} className="venta-hero__canvas" />

        <div className="venta-hero__content">
          {/* Trust Badge */}
          <div className="venta-hero__badge">
            <div className="venta-hero__badge-icon">
              <ShieldCheck size={16} />
            </div>
            <span>Distribuidores Oficiales Validados por Nomade Nation</span>
            <div className="venta-hero__badge-check">
              <Check size={11} strokeWidth={3} />
            </div>
          </div>

          <h1 className="venta-hero__title">
            Distribuidores Oficiales de <br className="hide-mobile" />
            <span className="venta-hero__title-accent">Nomade Nation en Mallorca</span>
          </h1>

          <p className="venta-hero__desc">
            Esto significa algo muy simple, pero muy importante: <strong>no estás comprando una camper más.</strong> Estás accediendo a una de las mejores camperizaciones del mercado europeo, con respaldo directo y sin intermediarios.
          </p>

          <div className="venta-hero__actions">
            <button onClick={scrollToForm} className="venta-btn-gold">
              <Download size={18} />
              <span>Descarga nuestro catálogo</span>
              <ArrowDown size={16} />
            </button>
          </div>

          {/* Official Logos Card */}
          <div className="venta-logos-card">
            <div className="venta-logos-card__item venta-logos-card__item--nomade">
              <Image
                src="https://www.utopiavanlife.com/wp-content/uploads/2026/04/NomadeNation_Logo_Pos-1024x255.png"
                alt="Nomade Nation Logo"
                fill
                unoptimized
                priority
                className="venta-logos-card__img"
              />
            </div>
            <div className="venta-logos-card__divider" />
            <div className="venta-logos-card__item venta-logos-card__item--utopia">
              <Image
                src="https://www.utopiavanlife.com/wp-content/uploads/2026/03/UTOPIA-VAN-LIFE-LOGO-web-negro-scaled-e1773919034809-1024x310.png"
                alt="Utopia Van Life Logo"
                fill
                unoptimized
                priority
                className="venta-logos-card__img"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2. SECCIÓN: MANIFIESTO VAN LIFE + FOTO ATARDECER */}
      <section className="venta-manifesto">
        <div className="venta-manifesto__grid">
          <div className="venta-manifesto__text-col">
            <div className="venta-manifesto__kicker">
              <Sparkles size={14} className="venta-gold-icon" />
              <span>Filosofía de Vida</span>
            </div>
            <h2 className="venta-manifesto__title">
              No estás comprando una camper. <br />
              <span className="venta-manifesto__title-gradient">
                Estás cambiando tu forma de vivir.
              </span>
            </h2>

            <div className="venta-manifesto__divider" />

            <div className="venta-manifesto__lines">
              <p>La van life no es una moda pasajera.</p>
              <p>Es una forma de recuperar el control y el tiempo.</p>
              <p>Despertar frente al mar con el sonido de las olas.</p>
              <p>Moverte cuando quieras y hacia donde el horizonte te guíe.</p>
              <p>Vivir sin horarios rígidos, sin límites, con absoluta libertad.</p>
              <p className="venta-manifesto__punchline">
                Porque si vas a dar el salto, hazlo con la máxima excelencia.
              </p>
            </div>
          </div>

          <div className="venta-manifesto__img-col">
            <Image
              src="/images/camper-interior-sunset.jpg"
              alt="Interior camper Utopia Van Life al atardecer frente al mar"
              fill
              className="venta-manifesto__img"
              priority
            />
            <div className="venta-manifesto__img-shadow" />
          </div>
        </div>
      </section>

      {/* 3. SECCIÓN: Base fiable: Fiat Ducato */}
      <section className="venta-fiat">
        <div className="venta-container">
          <div className="venta-fiat__grid">
            {/* Left: Image Carousel */}
            <div className="venta-fiat__carousel">
              {CAROUSEL_IMAGES.map((img, idx) => (
                <div
                  key={idx}
                  className={`venta-fiat__slide ${idx === currentSlide ? 'venta-fiat__slide--active' : ''}`}
                >
                  <Image
                    src={img.url}
                    alt={img.alt}
                    fill
                    unoptimized
                    className="venta-fiat__img"
                    priority={idx === 0}
                  />
                </div>
              ))}

              <button onClick={prevSlide} aria-label="Anterior" className="venta-fiat__nav-btn venta-fiat__nav-btn--prev">
                <ChevronLeft size={20} />
              </button>
              <button onClick={nextSlide} aria-label="Siguiente" className="venta-fiat__nav-btn venta-fiat__nav-btn--next">
                <ChevronRight size={20} />
              </button>

              <div className="venta-fiat__dots">
                {CAROUSEL_IMAGES.map((_, idx) => (
                  <span
                    key={idx}
                    onClick={() => setCurrentSlide(idx)}
                    className={`venta-fiat__dot ${idx === currentSlide ? 'venta-fiat__dot--active' : ''}`}
                  />
                ))}
              </div>
            </div>

            {/* Right: Text Content */}
            <div className="venta-fiat__text">
              <span className="venta-tag">Ingeniería y Durabilidad</span>
              <h2 className="venta-section-title">
                Base fiable: Fiat Ducato
              </h2>

              <p className="venta-section-desc">
                Todas las unidades están construidas sobre la galardonada plataforma Fiat Ducato:
              </p>

              <ul className="venta-fiat__list">
                <li>
                  <div className="venta-check-disc"><Check size={13} strokeWidth={3} /></div>
                  <span>El chasis más camperizable y seguro del mercado europeo</span>
                </li>
                <li>
                  <div className="venta-check-disc"><Check size={13} strokeWidth={3} /></div>
                  <span>Distribución ergonómica perfecta del espacio habitable</span>
                </li>
                <li>
                  <div className="venta-check-disc"><Check size={13} strokeWidth={3} /></div>
                  <span>Motorización diésel de última generación, eficiente y probada</span>
                </li>
                <li>
                  <div className="venta-check-disc"><Check size={13} strokeWidth={3} /></div>
                  <span>Fácil mantenimiento con red de servicio y recambios en toda Europa</span>
                </li>
              </ul>

              <p className="venta-fiat__highlight">
                Una base sólida para una vida sobre ruedas sin preocupaciones.
              </p>

              <button onClick={scrollToForm} className="venta-btn-gold-outline">
                <span>Solicitar catálogo en PDF</span>
                <ArrowDown size={15} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 4. SECCIÓN: Tu hogar, estés donde estés */}
      <section className="venta-home">
        <div className="venta-container">
          <div className="venta-home__grid">
            <div className="venta-home__text">
              <span className="venta-tag">Confort Sin Concesiones</span>
              <h2 className="venta-section-title">
                Tu hogar, estés donde estés
              </h2>

              <p className="venta-section-desc">
                Cada camper está concebida como una residencia real de alta gama:
              </p>

              <ul className="venta-home__list">
                <li>
                  <div className="venta-check-disc"><Check size={13} strokeWidth={3} /></div>
                  <span>Materiales de grado náutico, resistentes y duraderos</span>
                </li>
                <li>
                  <div className="venta-check-disc"><Check size={13} strokeWidth={3} /></div>
                  <span>Acabados artesanales premium sin improvisaciones</span>
                </li>
                <li>
                  <div className="venta-check-disc"><Check size={13} strokeWidth={3} /></div>
                  <span>Aislamiento térmico y acústico extremo para todas las estaciones</span>
                </li>
                <li>
                  <div className="venta-check-disc"><Check size={13} strokeWidth={3} /></div>
                  <span>Sistema de energía solar y litio para autonomía total fuera de red</span>
                </li>
              </ul>

              <p className="venta-home__quote">
                &ldquo;Porque cuando compras una camper, no compras un vehículo. Compras tu casa. Y tu casa no puede fallar.&rdquo;
              </p>
            </div>

            <div className="venta-home__img-wrap">
              <Image
                src="https://www.utopiavanlife.com/wp-content/uploads/2026/04/P1050216-scaled.png"
                alt="Tu hogar camper Utopia Van Life"
                fill
                unoptimized
                className="venta-home__img"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 5. SECCIÓN: Descubre todos los modelos y precios */}
      <section className="venta-models">
        <div className="venta-models__grid">
          <div className="venta-models__img-wrap">
            <Image
              src="https://www.utopiavanlife.com/wp-content/uploads/2026/04/EXT04-e1775029459357.png"
              alt="Descubre todos los modelos y precios Utopia Van Life"
              fill
              unoptimized
              className="venta-models__img"
              priority
            />
          </div>

          <div className="venta-models__text-wrap">
            <div className="venta-tag">
              Gama Utopia Van Life
            </div>

            <h2 className="venta-section-title">
              Descubre todos los modelos <br /> y precios detallados
            </h2>

            <p className="venta-section-desc">
              Hemos preparado un dossier técnico y catálogo completo donde podrás consultar:
            </p>

            <div className="venta-models__cards-grid">
              {[
                'Todos los modelos disponibles (NEO y SPACE)',
                'Configuraciones y dimensiones técnicas',
                'Packs de personalización y extras premium',
                'Precios cerrados y plazos de entrega'
              ].map((item, idx) => (
                <div key={idx} className="venta-models__card">
                  <div className="venta-check-disc"><Check size={12} strokeWidth={3} /></div>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 6. SECCIÓN: Descargar catálogo completo & FORMULARIO */}
      <section ref={formRef} className="venta-form-section">
        <div className="venta-container">
          <div className="venta-form-section__grid">
            {/* Left: Info */}
            <div className="venta-form-section__info">
              <div className="venta-tag">
                <Download size={15} />
                <span>Acceso Inmediato a PDF</span>
              </div>

              <h2 className="venta-section-title">
                Descargar catálogo completo (PDF)
              </h2>

              <div className="venta-form-section__desc">
                <p>Para acceder al dossier técnico y precios, rellena el formulario y te enviaremos el enlace oficial al instante.</p>
                <p>Una vez descargues el catálogo, nuestro equipo de especialistas se pondrá en contacto contigo de forma personalizada para resolver todas tus dudas sobre configuraciones e importación.</p>
                <p className="venta-gold-text">Sabemos lo trascendental que es dar este paso y queremos que tengas toda la claridad técnica antes de decidir.</p>
              </div>

              {/* Direct Concierge Contact */}
              <div className="venta-contact-cards">
                <a href="mailto:info@utopiavanlife.com" className="venta-contact-item">
                  <div className="venta-contact-icon-wrap">
                    <Mail size={18} />
                  </div>
                  <span>info@utopiavanlife.com</span>
                </a>

                <a href="mailto:administracion@utopiavanlife.com" className="venta-contact-item">
                  <div className="venta-contact-icon-wrap">
                    <Mail size={18} />
                  </div>
                  <span>administracion@utopiavanlife.com</span>
                </a>

                <a href="tel:+34611560916" className="venta-contact-item">
                  <div className="venta-contact-icon-wrap">
                    <Phone size={18} />
                  </div>
                  <span>+34 611 560 916</span>
                </a>

                <div className="venta-contact-item">
                  <div className="venta-contact-icon-wrap">
                    <MapPin size={18} />
                  </div>
                  <span>Carrer Son Oms, Palma de Mallorca (Illes Balears)</span>
                </div>
              </div>

              {/* Social Media */}
              <div className="venta-socials">
                <span className="venta-socials__label">Síguenos:</span>
                <a
                  href="mailto:info@utopiavanlife.com"
                  aria-label="Email"
                  className="venta-socials__btn"
                >
                  <Mail size={17} />
                </a>
                <a
                  href="https://www.instagram.com/utopiavanlife/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="venta-socials__btn"
                >
                  <Instagram size={17} />
                </a>
                <a
                  href="https://www.facebook.com/utopiavanlife"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="venta-socials__btn"
                >
                  <Facebook size={17} />
                </a>
              </div>
            </div>

            {/* Right: Form Card */}
            <div className="venta-form-card">
              {submitted ? (
                <div className="venta-form-success">
                  <CheckCircle2 size={56} className="venta-form-success__icon" />
                  <h3 className="venta-form-success__title">¡Solicitud recibida con éxito!</h3>
                  <p className="venta-form-success__desc">
                    Hemos procesado tus datos. El dossier técnico PDF ha sido remitido a tu correo y un asesor de Utopia Van Life te contactará para orientarte de forma personalizada.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="venta-form">
                  <div className="venta-form__row">
                    <input
                      type="text"
                      required
                      placeholder="Nombre *"
                      value={formData.firstName}
                      onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                      className="venta-input"
                    />
                    <input
                      type="text"
                      required
                      placeholder="Apellidos *"
                      value={formData.lastName}
                      onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                      className="venta-input"
                    />
                  </div>

                  <input
                    type="email"
                    required
                    placeholder="Correo electrónico *"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="venta-input"
                  />

                  <input
                    type="tel"
                    required
                    placeholder="Teléfono *"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="venta-input"
                  />

                  <CustomDropdown
                    label="¿En qué estás interesado?"
                    placeholder="Selecciona tu interés..."
                    value={formData.interest}
                    onChange={val => setFormData({ ...formData, interest: val })}
                    icon={Compass}
                    options={[
                      { label: 'Comprar camper nueva (Nomade Nation)', value: 'Comprar camper' },
                      { label: 'Alquiler vacacional / Probar antes de comprar', value: 'Alquiler' },
                      { label: 'Inversión / Renting camper', value: 'Inversión / renting' }
                    ]}
                  />

                  <CustomDropdown
                    label="Presupuesto aproximado"
                    placeholder="Selecciona tu rango de presupuesto..."
                    value={formData.budget}
                    onChange={val => setFormData({ ...formData, budget: val })}
                    icon={Coins}
                    options={[
                      { label: '50.000€ – 70.000€', value: '50.000€ – 70.000€' },
                      { label: '70.000€ – 90.000€', value: '70.000€ – 90.000€' },
                      { label: '+90.000€ (Gama Top)', value: '+90.000€' }
                    ]}
                  />

                  <CustomDropdown
                    label="¿Cuándo te gustaría tener tu camper?"
                    placeholder="Selecciona el plazo estimado..."
                    value={formData.timeframe}
                    onChange={val => setFormData({ ...formData, timeframe: val })}
                    icon={Clock}
                    options={[
                      { label: '1–3 meses (Inmediato)', value: '1–3 meses' },
                      { label: '3–6 meses', value: '3–6 meses' },
                      { label: 'Solo información previa', value: 'Solo información' }
                    ]}
                  />

                  <div className="venta-form__field">
                    <label className="venta-form__label">
                      ¿Qué tipo de viajes o proyectos imaginas realizar?
                    </label>
                    <textarea
                      rows={3}
                      value={formData.message}
                      onChange={e => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Cuéntanos tus destinos soñados, configuración preferida o dudas concretas..."
                      className="venta-textarea"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="venta-btn-gold venta-btn-gold--submit"
                  >
                    <Send size={18} />
                    <span>{submitting ? 'Enviando solicitud...' : 'Solicitar Catálogo PDF'}</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 7. SECCIÓN: RESEÑAS VERIFICADAS DE GOOGLE */}
      <section className="venta-reviews">
        <div className="venta-container">
          <div className="venta-reviews__card">
            <div className="venta-reviews__badge">
              <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
              </svg>
              <span className="venta-reviews__score">5.0</span>
              <div className="venta-reviews__stars">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={14} fill="#CCA053" color="#CCA053" />
                ))}
              </div>
            </div>

            <h3 className="venta-reviews__title">
              Experiencias y Opiniones Verificadas en Google
            </h3>
            <p className="venta-reviews__desc">
              Descubre cómo viven la experiencia quienes ya viajan y confían en Utopia Van Life en Mallorca.
            </p>

            <a
              href="https://www.google.com/maps/search/?api=1&query=Utopia+Van+Life+Palma+Mallorca"
              target="_blank"
              rel="noopener noreferrer"
              className="venta-btn-gold-outline"
            >
              <span>Ver reseñas en Google Maps</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* STYLES */}
      <style jsx>{`
        .venta-page {
          background: #0B0C0E;
          color: #F8FAFC;
          font-family: var(--font-sans, system-ui, -apple-system, sans-serif);
          line-height: 1.65;
          overflow-x: hidden;
        }

        .venta-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
        }

        /* 1. HERO */
        .venta-hero {
          position: relative;
          background: #0B0C0E;
          color: #FFFFFF;
          padding: 100px 20px 80px;
          text-align: center;
          overflow: hidden;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .venta-hero__bg {
          position: absolute;
          inset: 0;
          z-index: 1;
        }

        :global(.venta-hero__bg-img) {
          object-fit: cover;
          object-position: center 40%;
          opacity: 0.85;
        }

        .venta-hero__overlay {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at center, rgba(11, 12, 14, 0.4) 0%, rgba(11, 12, 14, 0.82) 65%, #0B0C0E 100%),
                      linear-gradient(180deg, rgba(11, 12, 14, 0.6) 0%, #0B0C0E 100%);
        }

        .venta-hero__canvas {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 2;
        }

        .venta-hero__content {
          max-width: 960px;
          margin: 0 auto;
          position: relative;
          z-index: 3;
        }

        .venta-hero__badge {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: rgba(19, 21, 24, 0.75);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border: 1px solid rgba(204, 160, 83, 0.35);
          padding: 8px 22px;
          border-radius: 999px;
          font-size: 0.88rem;
          font-weight: 700;
          color: #E8CA7C;
          margin-bottom: 28px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
        }

        .venta-hero__badge-icon {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: linear-gradient(135deg, #CCA053 0%, #99732B 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #0B0C0E;
          box-shadow: 0 2px 8px rgba(204, 160, 83, 0.4);
        }

        .venta-hero__badge-check {
          background: #22C55E;
          color: #FFF;
          border-radius: 50%;
          width: 18px;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-left: 2px;
        }

        .venta-hero__title {
          font-size: clamp(2.2rem, 4.8vw, 3.6rem);
          font-weight: 800;
          color: #FFFFFF;
          line-height: 1.16;
          margin-bottom: 22px;
          letter-spacing: -0.025em;
        }

        .venta-hero__title-accent {
          background: linear-gradient(135deg, #FFFFFF 10%, #E8CA7C 50%, #CCA053 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .venta-hero__desc {
          font-size: 1.15rem;
          color: #94A3B8;
          max-width: 800px;
          margin: 0 auto 36px;
          line-height: 1.7;
        }

        .venta-hero__desc strong {
          color: #FFFFFF;
          font-weight: 600;
        }

        .venta-hero__actions {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          margin-bottom: 48px;
        }

        .venta-logos-card {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 48px;
          padding: 24px 44px;
          background: rgba(19, 21, 24, 0.7);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
          max-width: 760px;
          margin: 0 auto;
        }

        .venta-logos-card__item {
          position: relative;
        }

        .venta-logos-card__item--nomade {
          height: 52px;
          width: 200px;
        }

        .venta-logos-card__item--utopia {
          height: 56px;
          width: 240px;
        }

        :global(.venta-logos-card__img) {
          object-fit: contain;
          filter: brightness(0) invert(1) opacity(0.9);
          transition: filter 0.2s ease;
        }

        .venta-logos-card__item:hover :global(.venta-logos-card__img) {
          filter: brightness(0) invert(1) opacity(1);
        }

        .venta-logos-card__divider {
          height: 38px;
          width: 1px;
          background: rgba(255, 255, 255, 0.15);
        }

        /* 2. MANIFESTO */
        .venta-manifesto {
          background: #0E1013;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          position: relative;
          overflow: hidden;
        }

        .venta-manifesto__grid {
          width: 100%;
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          align-items: stretch;
          min-height: 440px;
        }

        .venta-manifesto__text-col {
          padding: clamp(36px, 5vw, 64px) clamp(24px, 5vw, 72px);
          display: flex;
          flex-direction: column;
          justify-content: center;
          max-width: 680px;
        }

        .venta-manifesto__kicker {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #CCA053;
          margin-bottom: 14px;
        }

        .venta-manifesto__title {
          font-size: clamp(1.8rem, 2.8vw, 2.4rem);
          font-weight: 800;
          color: #FFFFFF;
          line-height: 1.22;
          margin-bottom: 16px;
          letter-spacing: -0.02em;
        }

        .venta-manifesto__title-gradient {
          background: linear-gradient(135deg, #FFFFFF 20%, #E8CA7C 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .venta-manifesto__divider {
          width: 48px;
          height: 2px;
          background: linear-gradient(90deg, #CCA053 0%, transparent 100%);
          margin-bottom: 22px;
        }

        .venta-manifesto__lines {
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-size: 1.02rem;
          color: #94A3B8;
          line-height: 1.6;
        }

        .venta-manifesto__lines p {
          margin: 0;
        }

        .venta-manifesto__punchline {
          margin-top: 10px !important;
          color: #E8CA7C !important;
          font-weight: 600;
          font-style: italic;
        }

        .venta-manifesto__img-col {
          position: relative;
          min-height: 340px;
          width: 100%;
        }

        :global(.venta-manifesto__img) {
          object-fit: cover;
          object-position: center;
        }

        .venta-manifesto__img-shadow {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, #0E1013 0%, rgba(14, 16, 19, 0.2) 25%, transparent 100%);
        }

        /* 3. FIAT DUCATO */
        .venta-fiat {
          background: #0B0C0E;
          padding: 80px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .venta-fiat__grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 56px;
          align-items: center;
        }

        .venta-fiat__carousel {
          position: relative;
          width: 100%;
          height: 380px;
          background: #131518;
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          overflow: hidden;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .venta-fiat__slide {
          position: absolute;
          inset: 20px;
          opacity: 0;
          transition: opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1);
          pointer-events: none;
        }

        .venta-fiat__slide--active {
          opacity: 1;
          pointer-events: auto;
        }

        :global(.venta-fiat__img) {
          object-fit: contain;
        }

        .venta-fiat__nav-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(19, 21, 24, 0.85);
          backdrop-filter: blur(8px);
          color: #FFFFFF;
          border: 1px solid rgba(255, 255, 255, 0.12);
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
          z-index: 5;
          transition: all 0.2s ease;
        }

        .venta-fiat__nav-btn:hover {
          border-color: #CCA053;
          color: #CCA053;
          background: #16191E;
        }

        .venta-fiat__nav-btn--prev {
          left: 14px;
        }

        .venta-fiat__nav-btn--next {
          right: 14px;
        }

        .venta-fiat__dots {
          position: absolute;
          bottom: 14px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 6px;
          z-index: 5;
        }

        .venta-fiat__dot {
          width: 8px;
          height: 4px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.2);
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .venta-fiat__dot--active {
          width: 24px;
          background: #CCA053;
        }

        .venta-fiat__text {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .venta-fiat__list {
          padding: 0;
          margin: 0 0 24px;
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 12px;
          font-size: 1.05rem;
          color: #94A3B8;
        }

        .venta-fiat__list li {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .venta-fiat__highlight {
          font-size: 1.08rem;
          color: #FFFFFF;
          font-weight: 600;
          margin: 0 0 24px;
        }

        /* 4. HOME SECTION */
        .venta-home {
          background: #0E1013;
          padding: 80px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .venta-home__grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 56px;
          align-items: center;
        }

        .venta-home__text {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .venta-home__list {
          padding: 0;
          margin: 0 0 24px;
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 12px;
          font-size: 1.05rem;
          color: #94A3B8;
        }

        .venta-home__list li {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .venta-home__quote {
          font-size: 1.08rem;
          color: #E8CA7C;
          line-height: 1.65;
          margin: 0;
          font-style: italic;
          border-left: 2px solid #CCA053;
          padding-left: 16px;
        }

        .venta-home__img-wrap {
          position: relative;
          border-radius: 24px;
          overflow: hidden;
          height: 400px;
          box-shadow: 0 20px 48px rgba(0, 0, 0, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: #131518;
        }

        :global(.venta-home__img) {
          object-fit: cover;
        }

        /* 5. MODELS SECTION */
        .venta-models {
          background: #0B0C0E;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          position: relative;
          overflow: hidden;
        }

        .venta-models__grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          align-items: center;
          width: 100%;
          min-height: 440px;
        }

        .venta-models__img-wrap {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 380px;
        }

        :global(.venta-models__img) {
          object-fit: cover;
          object-position: left center;
        }

        .venta-models__text-wrap {
          padding: clamp(36px, 5vw, 64px) clamp(24px, 5vw, 64px);
          max-width: 620px;
        }

        .venta-models__cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 12px;
          margin-top: 20px;
        }

        .venta-models__card {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #131518;
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 12px 14px;
          border-radius: 12px;
          font-size: 0.88rem;
          font-weight: 600;
          color: #E2E8F0;
          transition: border-color 0.2s ease;
        }

        .venta-models__card:hover {
          border-color: rgba(204, 160, 83, 0.35);
        }

        /* 6. FORM SECTION */
        .venta-form-section {
          background: radial-gradient(circle at 75% 20%, rgba(204, 160, 83, 0.08) 0%, transparent 50%),
                      linear-gradient(180deg, #0B0C0E 0%, #0E1013 100%);
          padding: 80px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .venta-form-section__grid {
          display: grid;
          grid-template-columns: 1fr 1.05fr;
          gap: 56px;
          align-items: start;
        }

        .venta-form-section__desc {
          display: flex;
          flex-direction: column;
          gap: 14px;
          font-size: 1.05rem;
          color: #94A3B8;
          line-height: 1.7;
          margin-bottom: 32px;
        }

        .venta-form-section__desc p {
          margin: 0;
        }

        .venta-gold-text {
          color: #E8CA7C !important;
          font-weight: 600;
        }

        .venta-contact-cards {
          display: flex;
          flex-direction: column;
          gap: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          padding-top: 24px;
          margin-bottom: 28px;
        }

        .venta-contact-item {
          display: flex;
          align-items: center;
          gap: 14px;
          color: #E2E8F0;
          text-decoration: none;
          font-size: 0.98rem;
          transition: color 0.2s ease;
        }

        .venta-contact-item:hover {
          color: #CCA053;
        }

        .venta-contact-icon-wrap {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: #131518;
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #CCA053;
          flex-shrink: 0;
        }

        .venta-socials {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .venta-socials__label {
          font-size: 0.9rem;
          color: #94A3B8;
          font-weight: 600;
        }

        .venta-socials__btn {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #131518;
          border: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #94A3B8;
          transition: all 0.2s ease;
        }

        .venta-socials__btn:hover {
          border-color: #CCA053;
          color: #CCA053;
          background: #16191E;
          transform: translateY(-2px);
        }

        /* FORM CARD */
        .venta-form-card {
          background: #131518;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          padding: 38px 34px;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6);
        }

        .venta-form-success {
          text-align: center;
          padding: 48px 16px;
        }

        :global(.venta-form-success__icon) {
          color: #22C55E;
          margin: 0 auto 16px;
        }

        .venta-form-success__title {
          font-size: 1.5rem;
          font-weight: 800;
          color: #FFFFFF;
          margin-bottom: 10px;
        }

        .venta-form-success__desc {
          color: #94A3B8;
          line-height: 1.65;
          font-size: 1rem;
        }

        .venta-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .venta-form__row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .venta-input {
          width: 100%;
          padding: 13px 18px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: #0B0C0E;
          font-size: 0.94rem;
          color: #FFFFFF;
          outline: none;
          transition: all 0.2s ease;
        }

        .venta-input:focus {
          border-color: #CCA053;
          box-shadow: 0 0 0 3px rgba(204, 160, 83, 0.18);
          background: #0E1013;
        }

        .venta-input::placeholder {
          color: #64748B;
        }

        .venta-form__field {
          display: flex;
          flex-direction: column;
        }

        .venta-form__label {
          font-size: 0.88rem;
          font-weight: 600;
          color: #E2E8F0;
          display: block;
          margin-bottom: 7px;
        }

        .venta-textarea {
          width: 100%;
          padding: 13px 18px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: #0B0C0E;
          font-size: 0.94rem;
          color: #FFFFFF;
          outline: none;
          resize: vertical;
          transition: all 0.2s ease;
        }

        .venta-textarea:focus {
          border-color: #CCA053;
          box-shadow: 0 0 0 3px rgba(204, 160, 83, 0.18);
          background: #0E1013;
        }

        .venta-textarea::placeholder {
          color: #64748B;
        }

        /* 7. REVIEWS */
        .venta-reviews {
          background: #0B0C0E;
          padding: 60px 0;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }

        .venta-reviews__card {
          max-width: 680px;
          margin: 0 auto;
          background: #131518;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 28px 32px;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 12px;
        }

        .venta-reviews__badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 5px 14px;
          border-radius: 999px;
        }

        .venta-reviews__score {
          font-weight: 800;
          font-size: 0.92rem;
          color: #FFFFFF;
        }

        .venta-reviews__stars {
          display: flex;
          gap: 2px;
        }

        .venta-reviews__title {
          font-size: 1.25rem;
          font-weight: 800;
          color: #FFFFFF;
          margin: 0;
          letter-spacing: -0.015em;
        }

        .venta-reviews__desc {
          font-size: 0.92rem;
          color: #94A3B8;
          max-width: 520px;
          margin: 0;
          line-height: 1.5;
        }

        /* REUSABLE UI ELEMENTS */
        .venta-tag {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(204, 160, 83, 0.12);
          border: 1px solid rgba(204, 160, 83, 0.3);
          padding: 5px 14px;
          border-radius: 999px;
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #E8CA7C;
          margin-bottom: 14px;
        }

        .venta-section-title {
          font-size: clamp(1.9rem, 3.2vw, 2.5rem);
          font-weight: 800;
          color: #FFFFFF;
          line-height: 1.2;
          margin: 0 0 16px;
          letter-spacing: -0.02em;
        }

        .venta-section-desc {
          font-size: 1.1rem;
          color: #94A3B8;
          margin: 0 0 20px;
          line-height: 1.65;
        }

        .venta-check-disc {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: rgba(204, 160, 83, 0.16);
          border: 1px solid rgba(204, 160, 83, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #CCA053;
          flex-shrink: 0;
        }

        .venta-gold-icon {
          color: #CCA053;
        }

        /* BUTTONS */
        .venta-btn-gold {
          background: linear-gradient(135deg, #CCA053 0%, #B2883B 100%);
          color: #0B0C0E;
          border: none;
          padding: 14px 30px;
          border-radius: 999px;
          font-weight: 700;
          font-size: 1.02rem;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          box-shadow: 0 8px 24px rgba(204, 160, 83, 0.3);
          transition: all 0.25s ease;
        }

        .venta-btn-gold:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(204, 160, 83, 0.45);
          filter: brightness(1.06);
        }

        .venta-btn-gold--submit {
          width: 100%;
          padding: 15px 28px;
          margin-top: 8px;
          color: #0B0C0E;
        }

        .venta-btn-gold-outline {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(204, 160, 83, 0.08);
          color: #E8CA7C;
          border: 1px solid rgba(204, 160, 83, 0.4);
          padding: 11px 24px;
          border-radius: 999px;
          font-size: 0.9rem;
          font-weight: 700;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .venta-btn-gold-outline:hover {
          background: rgba(204, 160, 83, 0.16);
          border-color: #CCA053;
          color: #FFFFFF;
          transform: translateY(-2px);
        }

        /* RESPONSIVE BREAKPOINTS (AGENTS.md) */
        @media (max-width: 860px) {
          .venta-manifesto__grid,
          .venta-fiat__grid,
          .venta-home__grid,
          .venta-models__grid,
          .venta-form-section__grid {
            grid-template-columns: 1fr;
            gap: 40px;
          }

          .venta-hero {
            padding: 80px 16px 60px;
          }

          .venta-logos-card {
            gap: 24px;
            padding: 20px 24px;
          }

          .venta-logos-card__item--nomade {
            width: 150px;
            height: 42px;
          }

          .venta-logos-card__item--utopia {
            width: 170px;
            height: 44px;
          }

          .hide-mobile {
            display: none;
          }
        }

        @media (max-width: 640px) {
          .venta-hero__title {
            font-size: 2rem;
          }

          .venta-hero__badge {
            font-size: 0.78rem;
            padding: 6px 14px;
          }

          .venta-logos-card {
            flex-direction: column;
            gap: 16px;
          }

          .venta-logos-card__divider {
            width: 80px;
            height: 1px;
          }

          .venta-form__row {
            grid-template-columns: 1fr;
          }

          .venta-form-card {
            padding: 24px 18px;
          }

          .venta-btn-gold {
            width: 100%;
          }

          .venta-models__cards-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}
