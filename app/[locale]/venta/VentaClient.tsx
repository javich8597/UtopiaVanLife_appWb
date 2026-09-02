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
  Clock
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
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <label style={{ fontSize: '0.92rem', fontWeight: 700, color: '#1E293B', display: 'block', marginBottom: 6 }}>
        {label}
      </label>

      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          padding: '12px 18px',
          borderRadius: 25,
          border: open ? '1.5px solid #A8A068' : '1px solid #CBD5E1',
          background: '#FFFFFF',
          fontSize: '0.95rem',
          color: value ? '#1E293B' : '#94A3B8',
          fontWeight: value ? 600 : 400,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          boxShadow: open ? '0 0 0 4px rgba(168, 160, 104, 0.15)' : '0 1px 3px rgba(0,0,0,0.02)',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          outline: 'none'
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {Icon && <Icon size={16} style={{ color: value ? '#A8A068' : '#94A3B8' }} />}
          <span>{value || placeholder}</span>
        </span>
        <ChevronDown
          size={18}
          style={{
            color: '#64748B',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        />
      </button>

      {/* Elegant Dropdown Floating Menu */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0,
          right: 0,
          background: '#FFFFFF',
          borderRadius: 18,
          border: '1px solid #EAE5D9',
          boxShadow: '0 14px 35px rgba(0,0,0,0.12)',
          padding: '6px',
          zIndex: 60
        }}>
          {options.map(opt => {
            const isSelected = value === opt.value
            return (
              <div
                key={opt.value}
                onClick={() => {
                  onChange(opt.value)
                  setOpen(false)
                }}
                style={{
                  padding: '10px 16px',
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  background: isSelected ? 'rgba(168, 160, 104, 0.12)' : 'transparent',
                  color: isSelected ? '#182B23' : '#475569',
                  fontWeight: isSelected ? 700 : 500,
                  fontSize: '0.92rem',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => {
                  if (!isSelected) e.currentTarget.style.background = '#F8FAFC'
                }}
                onMouseLeave={e => {
                  if (!isSelected) e.currentTarget.style.background = 'transparent'
                }}
              >
                <span>{opt.label}</span>
                {isSelected && <Check size={16} style={{ color: '#A8A068' }} strokeWidth={2.5} />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function VentaClient() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Ref for smooth scroll to catalog form
  const formRef = useRef<HTMLDivElement>(null)

  // Interactive Canvas background state
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mousePos = useRef({ x: -1000, y: -1000, targetX: -1000, targetY: -1000 })

  // Form state with select dropdown values
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

      // Ambient spotlight glow at mouse cursor
      if (mx > 0 && my > 0) {
        const gradient = ctx.createRadialGradient(mx, my, 0, mx, my, 220)
        gradient.addColorStop(0, 'rgba(168, 160, 104, 0.22)')
        gradient.addColorStop(0.5, 'rgba(24, 43, 35, 0.15)')
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
        let opacity = 0.2
        let radius = 1.4

        if (dist < maxDist) {
          const force = (1 - dist / maxDist)
          offsetX = - (dx / dist) * force * 14
          offsetY = - (dy / dist) * force * 14
          opacity = 0.2 + force * 0.65
          radius = 1.4 + force * 1.8
        }

        dot.x = dot.originX + offsetX
        dot.y = dot.originY + offsetY

        ctx.beginPath()
        ctx.arc(dot.x, dot.y, radius, 0, Math.PI * 2)
        ctx.fillStyle = dist < maxDist ? `rgba(234, 229, 217, ${opacity})` : `rgba(255, 255, 255, ${opacity})`
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
    <div style={{ fontFamily: 'var(--font-sans, system-ui, -apple-system, sans-serif)', color: '#1E293B', background: '#FFFFFF', lineHeight: 1.65 }}>

      {/* 1. SECCIÓN: HERO CON IMAGEN DE FONDO DE LA CAMPER, MATRIZ INTERACTIVA, ESCUDO Y LOGOS */}
      <section
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        style={{
          position: 'relative',
          background: '#090E0C',
          color: '#FFFFFF',
          padding: '90px 14px 60px',
          textAlign: 'center',
          overflow: 'hidden',
          cursor: 'crosshair',
          borderBottom: '1px solid rgba(255,255,255,0.08)'
        }}
      >
        {/* Camper Van Background Image */}
        <div style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1
        }}>
          <Image
            src="https://www.utopiavanlife.com/wp-content/uploads/2026/03/EXT01-e1774856689344.png"
            alt="Fiat Ducato Camper Utopia Van Life"
            fill
            unoptimized
            style={{ objectFit: 'cover', objectPosition: 'center 40%', opacity: 1.1 }}
            priority
          />
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(9, 14, 12, 0.35) 0%, rgba(17, 29, 24, 0.60) 60%, rgba(9, 14, 12, 0.85) 100%)'
          }} />
        </div>

        {/* Interactive Dynamic Canvas Particle Matrix */}
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 2
          }}
        />

        <div style={{ maxWidth: 940, margin: '0 auto', position: 'relative', zIndex: 3 }}>

          {/* Trust Badge with Shield & Check Icon */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(212, 175, 55, 0.4)',
            padding: '8px 20px',
            borderRadius: 999,
            fontSize: '0.9rem',
            fontWeight: 700,
            color: '#F5E6C8',
            marginBottom: 28,
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
          }}>
            <div style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #D4AF37 0%, #AA820A 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#000',
              boxShadow: '0 2px 8px rgba(212,175,55,0.5)'
            }}>
              <ShieldCheck size={16} />
            </div>
            <span>Distribuidores Oficiales Validados por Nomade Nation</span>
            <div style={{
              background: '#22C55E',
              color: '#FFF',
              borderRadius: '50%',
              width: 18,
              height: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: 2
            }}>
              <Check size={10} strokeWidth={3} />
            </div>
          </div>

          <h1 style={{
            fontSize: 'clamp(2.2rem, 4.8vw, 3.5rem)',
            fontWeight: 800,
            color: '#FFFFFF',
            lineHeight: 1.18,
            marginBottom: 20,
            letterSpacing: '-0.02em'
          }}>
            Distribuidores Oficiales de <br className="hide-mobile" />
            <span style={{ color: '#EAE5D9' }}>Nomade Nation en Mallorca</span>
          </h1>

          <p style={{
            fontSize: '1.2rem',
            color: 'rgba(255, 255, 255, 0.88)',
            maxWidth: 780,
            margin: '0 auto 36px',
            lineHeight: 1.65
          }}>
            Esto significa algo muy simple, pero muy importante: <strong>no estás comprando una camper más.</strong> Estás accediendo a una de las mejores camperizaciones del mercado, con respaldo directo y sin intermediarios.
          </p>

          {/* Action Button */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            flexWrap: 'wrap',
            marginBottom: 44
          }}>
            <button
              onClick={scrollToForm}
              style={{
                background: 'linear-gradient(135deg, #A8A068 0%, #8E8752 100%)',
                color: '#FFFFFF',
                border: 'none',
                padding: '14px 28px',
                borderRadius: 999,
                fontWeight: 700,
                fontSize: '1.05rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                boxShadow: '0 8px 24px rgba(168, 160, 104, 0.35)',
                transition: 'all 0.2s ease'
              }}
            >
              <Download size={18} />
              <span>Descarga nuestro catálogo</span>
              <ArrowDown size={16} />
            </button>
          </div>

          {/* Official Logos Bar (White Card) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 48,
            flexWrap: 'wrap',
            padding: '28px 48px',
            background: '#FFFFFF',
            borderRadius: 24,
            border: '1px solid #EAE5D9',
            boxShadow: '0 16px 40px rgba(0,0,0,0.28)',
            maxWidth: 780,
            margin: '0 auto'
          }}>
            <div style={{ height: 60, position: 'relative', width: 220 }}>
              <Image
                src="https://www.utopiavanlife.com/wp-content/uploads/2026/04/NomadeNation_Logo_Pos-1024x255.png"
                alt="Nomade Nation Logo"
                fill
                unoptimized
                priority
                style={{ objectFit: 'contain' }}
              />
            </div>
            <div style={{ height: 40, width: 2, background: '#CBD5E1' }} />
            <div style={{ height: 65, position: 'relative', width: 260 }}>
              <Image
                src="https://www.utopiavanlife.com/wp-content/uploads/2026/03/UTOPIA-VAN-LIFE-LOGO-web-negro-scaled-e1773919034809-1024x310.png"
                alt="Utopia Van Life Logo"
                fill
                unoptimized
                priority
                style={{ objectFit: 'contain' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2. SECCIÓN: MANIFIESTO VAN LIFE + FOTO EXPANDIDA A LA DERECHA (SIN PADDING) */}
      <section style={{
        background: '#1c1e0f',
        color: '#FFFFFF',
        position: 'relative',
        overflow: 'hidden',
        padding: 0,
        margin: 0,
        borderBottom: '1px solid rgba(255,255,255,0.08)'
      }}>
        <div style={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          alignItems: 'stretch',
          minHeight: 'clamp(320px, 35vw, 420px)'
        }}>
          {/* Left: Text Manifesto with comfortable padding */}
          <div style={{
            padding: 'clamp(28px, 4vw, 48px) clamp(24px, 5vw, 64px)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            maxWidth: 620
          }}>
            <h2 style={{
              fontSize: 'clamp(1.65rem, 2.6vw, 2.25rem)',
              fontWeight: 800,
              color: '#FFFFFF',
              lineHeight: 1.2,
              marginBottom: 14,
              letterSpacing: '-0.015em'
            }}>
              No estás comprando una camper. <br />
              <span style={{
                background: 'linear-gradient(135deg, #FFFFFF 20%, #EAE5D9 80%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Estás cambiando tu forma de vivir.
              </span>
            </h2>

            {/* Golden Ambient Divider */}
            <div style={{
              width: 48,
              height: 2,
              background: 'linear-gradient(90deg, #A8A068 0%, transparent 100%)',
              marginBottom: 16
            }} />

            <div style={{
              fontSize: 'clamp(0.92rem, 1.2vw, 1.02rem)',
              color: 'rgba(255, 255, 255, 0.90)',
              lineHeight: 1.65,
              display: 'flex',
              flexDirection: 'column',
              gap: 5
            }}>
              <p style={{ margin: 0 }}>La van life no es una moda.</p>
              <p style={{ margin: 0 }}>Es una forma de recuperar el control.</p>
              <p style={{ margin: 0 }}>Despertar frente al mar.</p>
              <p style={{ margin: 0 }}>Moverte cuando quieras.</p>
              <p style={{ margin: 0 }}>Vivir sin horarios, sin límites, sin permiso.</p>
              <p style={{ margin: 0 }}>Libertad, autonomía real y confort.</p>
              <p style={{
                margin: '6px 0 0',
                color: '#F5E6C8',
                fontWeight: 600,
                fontStyle: 'italic'
              }}>
                Porque si vas a dar el salto, hazlo bien.
              </p>
            </div>
          </div>

          {/* Right: Full Height & Width Expanded Photo Frame */}
          <div style={{
            position: 'relative',
            minHeight: 300,
            width: '100%',
            height: '100%'
          }}>
            <Image
              src="/images/camper-interior-sunset.jpg"
              alt="Interior camper Utopia Van Life al atardecer frente al mar"
              fill
              style={{ objectFit: 'cover', objectPosition: 'center' }}
              priority
            />
            {/* Subtle Inner Transition Gradient on the left edge */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(90deg, rgba(15,30,23,0.35) 0%, rgba(15,30,23,0) 20%)'
            }} />
          </div>
        </div>
      </section>

      {/* 3. SECCIÓN: Base fiable: Fiat Ducato (CARRUSEL ORIGINAL A LA IZQUIERDA Y TEXTO A LA DERECHA) */}
      <section style={{
        background: '#FCFCFC',
        padding: 0,
        margin: 0,
      }}>
        <div style={{ maxWidth: 1140, margin: '0 auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 56,
            alignItems: 'center'
          }}>
            {/* Left: Image Carousel (Homogeneous with Background & Smooth Crossfade) */}
            <div style={{
              position: 'relative',
              width: '100%',
              minHeight: 360,
              height: 'clamp(320px, 35vw, 420px)',
              background: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {CAROUSEL_IMAGES.map((img, idx) => (
                <div
                  key={idx}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: idx === currentSlide ? 1 : 0,
                    transition: 'opacity 0.8s ease-in-out',
                    pointerEvents: idx === currentSlide ? 'auto' : 'none'
                  }}
                >
                  <Image
                    src={img.url}
                    alt={img.alt}
                    fill
                    unoptimized
                    style={{ objectFit: 'contain' }}
                    priority={idx === 0}
                  />
                </div>
              ))}

              {/* Navigation Arrows (Discreet & Seamless) */}
              <button
                onClick={prevSlide}
                aria-label="Anterior"
                style={{
                  position: 'absolute', left: 4, top: '50%', transform: 'translateY(-50%)',
                  background: 'rgba(255, 255, 255, 0.88)', color: '#1E293B', border: '1px solid rgba(0,0,0,0.06)', width: 38, height: 38,
                  borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)', zIndex: 5, transition: 'all 0.2s'
                }}
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={nextSlide}
                aria-label="Siguiente"
                style={{
                  position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
                  background: 'rgba(255, 255, 255, 0.88)', color: '#1E293B', border: '1px solid rgba(0,0,0,0.06)', width: 38, height: 38,
                  borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)', zIndex: 5, transition: 'all 0.2s'
                }}
              >
                <ChevronRight size={20} />
              </button>

              {/* Subtle Pagination Indicators */}
              <div style={{
                position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)',
                display: 'flex', gap: 6, zIndex: 5
              }}>
                {CAROUSEL_IMAGES.map((_, idx) => (
                  <span
                    key={idx}
                    onClick={() => setCurrentSlide(idx)}
                    style={{
                      width: idx === currentSlide ? 24 : 8,
                      height: 5,
                      borderRadius: 4,
                      background: idx === currentSlide ? '#182B23' : '#CBD5E1',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Right: Text Content */}
            <div>
              <h2 style={{
                fontSize: 'clamp(2rem, 3.5vw, 2.6rem)',
                fontWeight: 700,
                color: '#1E293B',
                lineHeight: 1.25,
                marginBottom: 20
              }}>
                Base fiable: Fiat Ducato
              </h2>

              <p style={{ fontSize: '1.15rem', color: '#475569', marginBottom: 16 }}>
                Todas las unidades están construidas sobre Fiat Ducato:
              </p>

              <ul style={{
                paddingLeft: 24,
                margin: '0 0 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                fontSize: '1.1rem',
                color: '#475569'
              }}>
                <li>El modelo más camperizable del mercado</li>
                <li>Distribución perfecta del espacio</li>
                <li>Motor fiable y probado</li>
                <li>Fácil mantenimiento y disponibilidad de recambios</li>
              </ul>

              <p style={{ fontSize: '1.15rem', color: '#1E293B', fontWeight: 600, margin: '0 0 20px' }}>
                Una base sólida para una vida sin preocupaciones.
              </p>

              <button
                onClick={scrollToForm}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'linear-gradient(135deg, #182B23 0%, #0F1E17 100%)',
                  color: '#FFFFFF',
                  border: '1px solid rgba(168, 160, 104, 0.35)',
                  padding: '11px 24px',
                  borderRadius: 999,
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(24, 43, 35, 0.18)',
                  transition: 'all 0.2s ease'
                }}
              >
                <span>Solicitar catálogo en PDF</span>
                <ArrowDown size={15} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 4. SECCIÓN: Tu hogar, estés donde estés (FONDO OSCURO CON TEXTO A LA IZQUIERDA E IMAGEN P1050216 A LA DERECHA) */}
      <section style={{
        background: '#1c1e0f',
        color: '#FFFFFF',
        padding: '32px 14px'
      }}>
        <div style={{ maxWidth: 1140, margin: '0 auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 48,
            alignItems: 'center'
          }}>
            {/* Left: Text Content */}
            <div>
              <h2 style={{
                fontSize: 'clamp(1.9rem, 3.2vw, 2.5rem)',
                fontWeight: 700,
                color: '#FFFFFF',
                lineHeight: 1.25,
                marginBottom: 16
              }}>
                Tu hogar, estés donde estés
              </h2>

              <p style={{ fontSize: '1.1rem', color: '#CBD5E1', marginBottom: 14 }}>
                Cada camper está pensada como un hogar real:
              </p>

              <ul style={{
                paddingLeft: 24,
                margin: '0 0 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                fontSize: '1.05rem',
                color: '#CBD5E1'
              }}>
                <li>Materiales de alta calidad, resistentes y duraderos</li>
                <li>Acabados premium, sin improvisaciones</li>
                <li>Diseño funcional que aguanta el uso intensivo</li>
                <li>Todo optimizado para evitar problemas en el futuro</li>
              </ul>

              <p style={{ fontSize: '1.1rem', color: '#FFFFFF', lineHeight: 1.65, margin: 0, fontWeight: 500 }}>
                Porque cuando compras una camper, no compras un vehículo. Compras tu casa. Y tu casa no puede fallar.
              </p>
            </div>

            {/* Right: Original Image P1050216 */}
            <div style={{
              position: 'relative',
              borderRadius: 12,
              overflow: 'hidden',
              height: 380,
              boxShadow: '0 16px 40px rgba(0,0,0,0.3)',
              background: '#182B23'
            }}>
              <Image
                src="https://www.utopiavanlife.com/wp-content/uploads/2026/04/P1050216-scaled.png"
                alt="Tu hogar camper Utopia Van Life"
                fill
                unoptimized
                style={{ objectFit: 'cover' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 5. SECCIÓN: Descubre todos los modelos y precios (RÉPLICA EXACTA DE LA WEB ORIGINAL) */}
      <section style={{
        background: '#FFFFFF',
        position: 'relative',
        overflow: 'hidden',
        padding: 0,
        margin: 0
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          alignItems: 'center',
          width: '100%',
          minHeight: 'clamp(320px, 35vw, 420px)'
        }}>
          {/* Left: Van entering directly from the left edge touching top & bottom */}
          <div style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            minHeight: 'clamp(300px, 35vw, 420px)',
            background: 'transparent'
          }}>
            <Image
              src="https://www.utopiavanlife.com/wp-content/uploads/2026/04/EXT04-e1775029459357.png"
              alt="Descubre todos los modelos y precios Utopia Van Life"
              fill
              unoptimized
              style={{
                objectFit: 'cover',
                objectPosition: 'left center'
              }}
              priority
            />
          </div>

          {/* Right: Text Content */}
          <div style={{
            padding: 'clamp(24px, 4vw, 40px) clamp(24px, 5vw, 64px)',
            maxWidth: 600
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(168, 160, 104, 0.12)',
              border: '1px solid rgba(168, 160, 104, 0.28)',
              padding: '4px 12px',
              borderRadius: 999,
              fontSize: '0.76rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#857530',
              marginBottom: 12
            }}>
              Gama Utopia Van Life
            </div>

            <h2 style={{
              fontSize: 'clamp(1.85rem, 3vw, 2.5rem)',
              fontWeight: 800,
              color: '#0F1E17',
              lineHeight: 1.2,
              marginBottom: 10,
              letterSpacing: '-0.02em'
            }}>
              Descubre todos los modelos <br /> y precios
            </h2>

            <p style={{ fontSize: '0.98rem', color: '#64748B', marginBottom: 16, lineHeight: 1.5 }}>
              Hemos preparado un dossier técnico y catálogo completo donde podrás ver:
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: 10,
              marginBottom: 20
            }}>
              {[
                'Todos los modelos disponibles',
                'Configuraciones y medidas',
                'Extras y personalizaciones',
                'Precios y plazos de entrega'
              ].map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    padding: '8px 12px',
                    borderRadius: 10,
                    fontSize: '0.86rem',
                    fontWeight: 600,
                    color: '#1E293B'
                  }}
                >
                  <div style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: 'rgba(24, 43, 35, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Check size={12} color="#182B23" strokeWidth={3} />
                  </div>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 6. SECCIÓN: Descargar catálogo completo (PDF) & FORMULARIO (SECCIÓN OSCURA CON TARJETA BLANCA, DESPLEGABLES E ICONOS) */}
      <section
        ref={formRef}
        style={{
          background: 'linear-gradient(180deg, #090E0C 0%, #111D18 100%)',
          color: '#FFFFFF',
          padding: '34px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.08)'
        }}
      >
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: 56,
            alignItems: 'start'
          }}>
            {/* Left: Text & Contact / Social Icons */}
            <div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(255,255,255,0.08)',
                padding: '6px 16px',
                borderRadius: 999,
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#EAE5D9',
                marginBottom: 24
              }}>
                <Download size={16} />
                <span>Acceso Inmediato a PDF</span>
              </div>

              <h2 style={{
                fontSize: 'clamp(2rem, 3.5vw, 2.6rem)',
                fontWeight: 800,
                color: '#FFFFFF',
                lineHeight: 1.25,
                marginBottom: 24
              }}>
                Descargar catálogo completo (PDF)
              </h2>

              <div style={{
                fontSize: '1.1rem',
                color: 'rgba(255,255,255,0.85)',
                lineHeight: 1.75,
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                marginBottom: 32
              }}>
                <p style={{ margin: 0 }}>Para acceder al catálogo, solo tienes que rellenar el formulario y te lo enviaremos al instante.</p>
                <p style={{ margin: 0 }}>Una vez descargues el catálogo, nos pondremos en contacto contigo personalmente, con el objetivo de ayudarte a ver si este estilo de vida encaja contigo.</p>
                <p style={{ margin: 0, color: '#EAE5D9', fontWeight: 600 }}>Sabemos lo importante que es dar este paso y queremos que lo tengas todo claro.</p>
              </div>

              {/* Direct Contact Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 24, marginBottom: 28 }}>
                <a href="mailto:info@utopiavanlife.com" style={{ display: 'flex', alignItems: 'center', gap: 14, color: '#FFFFFF', textDecoration: 'none', fontSize: '1.02rem' }}>
                  <div style={{ padding: 10, background: 'rgba(255,255,255,0.08)', borderRadius: 10, display: 'flex' }}>
                    <Mail size={18} style={{ color: '#EAE5D9' }} />
                  </div>
                  <span>info@utopiavanlife.com</span>
                </a>
                <a href="mailto:administracion@utopiavanlife.com" style={{ display: 'flex', alignItems: 'center', gap: 14, color: '#FFFFFF', textDecoration: 'none', fontSize: '1.02rem' }}>
                  <div style={{ padding: 10, background: 'rgba(255,255,255,0.08)', borderRadius: 10, display: 'flex' }}>
                    <Mail size={18} style={{ color: '#EAE5D9' }} />
                  </div>
                  <span>administracion@utopiavanlife.com</span>
                </a>
                <a href="tel:+34611560916" style={{ display: 'flex', alignItems: 'center', gap: 14, color: '#FFFFFF', textDecoration: 'none', fontSize: '1.02rem' }}>
                  <div style={{ padding: 10, background: 'rgba(255,255,255,0.08)', borderRadius: 10, display: 'flex' }}>
                    <Phone size={18} style={{ color: '#EAE5D9' }} />
                  </div>
                  <span>+34 611 560 916</span>
                </a>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, color: '#FFFFFF', fontSize: '1.02rem' }}>
                  <div style={{ padding: 10, background: 'rgba(255,255,255,0.08)', borderRadius: 10, display: 'flex' }}>
                    <MapPin size={18} style={{ color: '#EAE5D9' }} />
                  </div>
                  <span>Carrer Son Oms, Palma de Mallorca (Illes Balears)</span>
                </div>
              </div>

              {/* Social Media Icons (Email, Instagram, Facebook) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: '0.9rem', color: '#EAE5D9', fontWeight: 600 }}>Síguenos:</span>
                <a
                  href="mailto:info@utopiavanlife.com"
                  aria-label="Email"
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Mail size={18} />
                </a>
                <a
                  href="https://www.instagram.com/utopiavanlife/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Instagram size={18} />
                </a>
                <a
                  href="https://www.facebook.com/utopiavanlife"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Facebook size={18} />
                </a>
              </div>
            </div>

            {/* Right: Form replica with High-End Custom Dropdowns */}
            <div style={{
              background: '#FFFFFF',
              color: '#1E293B',
              borderRadius: 24,
              padding: '36px 32px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.35)'
            }}>
              {submitted ? (
                <div style={{ textAlign: 'center', padding: '40px 16px' }}>
                  <CheckCircle2 size={60} style={{ color: '#22C55E', margin: '0 auto 16px' }} />
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#182B23', marginBottom: 8 }}>¡Solicitud enviada!</h3>
                  <p style={{ color: '#64748B', lineHeight: 1.6, fontSize: '1rem' }}>
                    Hemos recibido tus datos correctamente. El catálogo PDF ha sido generado y nuestro equipo contactará contigo para guiarte en tu proyecto.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                  {/* Nombre y Apellidos */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <input
                        type="text"
                        required
                        placeholder="Nombre *"
                        value={formData.firstName}
                        onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                        style={{
                          width: '100%', padding: '12px 18px', borderRadius: 25,
                          border: '1px solid #CBD5E1', fontSize: '0.95rem', outline: 'none', background: '#FFFFFF'
                        }}
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        required
                        placeholder="Apellidos *"
                        value={formData.lastName}
                        onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                        style={{
                          width: '100%', padding: '12px 18px', borderRadius: 25,
                          border: '1px solid #CBD5E1', fontSize: '0.95rem', outline: 'none', background: '#FFFFFF'
                        }}
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <input
                      type="email"
                      required
                      placeholder="Correo electrónico *"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      style={{
                        width: '100%', padding: '12px 18px', borderRadius: 25,
                        border: '1px solid #CBD5E1', fontSize: '0.95rem', outline: 'none', background: '#FFFFFF'
                      }}
                    />
                  </div>

                  {/* Teléfono */}
                  <div>
                    <input
                      type="tel"
                      required
                      placeholder="Teléfono *"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      style={{
                        width: '100%', padding: '12px 18px', borderRadius: 25,
                        border: '1px solid #CBD5E1', fontSize: '0.95rem', outline: 'none', background: '#FFFFFF'
                      }}
                    />
                  </div>

                  {/* ¿En qué estás interesado? (Custom Dropdown Elegante) */}
                  <CustomDropdown
                    label="¿En qué estás interesado?"
                    placeholder="Selecciona tu interés..."
                    value={formData.interest}
                    onChange={val => setFormData({ ...formData, interest: val })}
                    icon={Compass}
                    options={[
                      { label: 'Comprar camper', value: 'Comprar camper' },
                      { label: 'Alquiler', value: 'Alquiler' },
                      { label: 'Inversión / renting', value: 'Inversión / renting' }
                    ]}
                  />

                  {/* Presupuesto aproximado (Custom Dropdown Elegante) */}
                  <CustomDropdown
                    label="Presupuesto aproximado"
                    placeholder="Selecciona tu rango de presupuesto..."
                    value={formData.budget}
                    onChange={val => setFormData({ ...formData, budget: val })}
                    icon={Coins}
                    options={[
                      { label: '50.000€ – 70.000€', value: '50.000€ – 70.000€' },
                      { label: '70.000€ – 90.000€', value: '70.000€ – 90.000€' },
                      { label: '+90.000€', value: '+90.000€' }
                    ]}
                  />

                  {/* ¿Cuándo te gustaría tener tu camper? (Custom Dropdown Elegante) */}
                  <CustomDropdown
                    label="¿Cuándo te gustaría tener tu camper?"
                    placeholder="Selecciona el plazo estimado..."
                    value={formData.timeframe}
                    onChange={val => setFormData({ ...formData, timeframe: val })}
                    icon={Clock}
                    options={[
                      { label: '1–3 meses', value: '1–3 meses' },
                      { label: '3–6 meses', value: '3–6 meses' },
                      { label: 'Solo información', value: 'Solo información' }
                    ]}
                  />

                  {/* Textarea */}
                  <div>
                    <label style={{ fontSize: '0.92rem', fontWeight: 700, color: '#1E293B', display: 'block', marginBottom: 6 }}>
                      ¿Qué tipo de viajes te imaginas haciendo?
                    </label>
                    <textarea
                      rows={3}
                      value={formData.message}
                      onChange={e => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Cuéntanos tus planes, destinos o necesidades particulares..."
                      style={{
                        width: '100%', padding: '12px 18px', borderRadius: 16,
                        border: '1px solid #CBD5E1', fontSize: '0.95rem', outline: 'none', resize: 'vertical', background: '#FFFFFF'
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      background: '#A8A068',
                      color: '#FFFFFF',
                      border: 'none',
                      padding: '14px 28px',
                      borderRadius: 25,
                      fontWeight: 700,
                      fontSize: '1.02rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 10,
                      marginTop: 6,
                      boxShadow: '0 4px 14px rgba(168, 160, 104, 0.35)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Send size={18} />
                    <span>{submitting ? 'Enviando...' : 'Enviar'}</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 7. SECCIÓN: RESEÑAS VERIFICADAS DE GOOGLE (ULTRA COMPACTA Y 100% REAL) */}
      <section style={{
        background: '#FAF9F6',
        padding: '20px 18px 24px',
        borderTop: '1px solid #EAE5D9'
      }}>
        <div style={{
          maxWidth: 680,
          margin: '0 auto',
          background: '#FFFFFF',
          border: '1px solid #E6E1D8',
          borderRadius: 16,
          padding: '18px 24px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 10
        }}>
          {/* Google Icon & Rating Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            padding: '4px 12px',
            borderRadius: 999
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
            </svg>
            <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#1E293B' }}>5.0</span>
            <div style={{ display: 'flex', gap: 2, color: '#FBBC05' }}>
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={13} fill="#FBBC05" color="#FBBC05" />
              ))}
            </div>
          </div>

          {/* Centered Heading & Copy */}
          <div>
            <h2 style={{
              fontSize: '1.15rem',
              fontWeight: 800,
              color: '#1E293B',
              margin: '0 0 3px',
              letterSpacing: '-0.01em'
            }}>
              Opiniones de Clientes en Google
            </h2>
            <p style={{
              fontSize: '0.88rem',
              color: '#64748B',
              maxWidth: 520,
              margin: '0 auto',
              lineHeight: 1.45
            }}>
              Descubre cómo viven la experiencia quienes ya viajan con Utopia Van Life en Mallorca.
            </p>
          </div>

          {/* Centered Action Button */}
          <a
            href="https://www.google.com/maps/search/?api=1&query=Utopia+Van+Life+Palma+Mallorca"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              color: '#FFFFFF',
              background: 'linear-gradient(135deg, #182B23 0%, #0F1E17 100%)',
              border: '1px solid rgba(168, 160, 104, 0.4)',
              padding: '9px 22px',
              borderRadius: 999,
              fontWeight: 700,
              fontSize: '0.88rem',
              textDecoration: 'none',
              boxShadow: '0 3px 10px rgba(24, 43, 35, 0.18)',
              transition: 'all 0.2s ease',
              marginTop: 2
            }}
          >
            <span>Ver reseñas en Google</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </a>
        </div>
      </section>

    </div>
  )
}
