'use client'

import { usePathname } from 'next/navigation'

export default function FloatingWhatsApp() {
  const pathname = usePathname() || ''

  // Excluir en cliente (/dashboard), admin (/admin) y en el flujo de pasos de reserva (/reserva, /reservar, /checkout)
  const isExcluded =
    pathname.includes('/admin') ||
    pathname.includes('/dashboard') ||
    pathname.includes('/reserva') ||
    pathname.includes('/reservar') ||
    pathname.includes('/checkout')

  if (isExcluded) return null

  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '34611560916'
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent('¡Hola Utopia Van Life! Me gustaría recibir información sobre el alquiler de campers.')}`

  return (
    <>
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Contactar por WhatsApp"
        className="floating-whatsapp"
      >
        <svg
          viewBox="0 0 32 32"
          width="24"
          height="24"
          fill="currentColor"
          className="floating-whatsapp__icon"
          aria-hidden="true"
        >
          <path d="M16 2.5C8.544 2.5 2.5 8.544 2.5 16c0 2.528.694 4.896 1.902 6.92L2.5 29.5l6.786-1.874A13.435 13.435 0 0 0 16 29.5c7.456 0 13.5-6.044 13.5-13.5S23.456 2.5 16 2.5zm0 24.688c-2.186 0-4.238-.616-5.992-1.688l-.43-.26-4.226 1.168 1.128-4.136-.282-.444A11.134 11.134 0 0 1 4.812 16c0-6.178 5.01-11.188 11.188-11.188S27.188 9.822 27.188 16 22.178 27.188 16 27.188zm6.544-8.892c-.36-.18-2.13-1.05-2.46-1.17-.33-.12-.57-.18-.81.18-.24.36-.93 1.17-1.14 1.41-.21.24-.42.27-.78.09-.36-.18-1.52-.56-2.9-1.79-1.07-.95-1.79-2.13-2-2.49-.21-.36-.02-.55.16-.73.16-.16.36-.42.54-.63.18-.21.24-.36.36-.6.12-.24.06-.45-.03-.63-.09-.18-.81-1.95-1.11-2.67-.29-.7-.59-.61-.81-.62h-.69c-.24 0-.63.09-.96.45-.33.36-1.26 1.23-1.26 3 0 1.77 1.29 3.48 1.47 3.72.18.24 2.54 3.88 6.16 5.44.86.37 1.53.59 2.06.76.87.28 1.66.24 2.29.15.7-.1 2.13-.87 2.43-1.71.3-.84.3-1.56.21-1.71-.09-.15-.33-.24-.69-.42z" />
        </svg>
      </a>

      <style jsx>{`
        .floating-whatsapp {
          position: fixed;
          bottom: calc(20px + env(safe-area-inset-bottom, 0px));
          right: 20px;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: #25D366;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #1EBE5D;
          box-shadow: none;
          z-index: 999;
          transition: transform 0.2s ease, opacity 0.2s ease;
          text-decoration: none;
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
        }

        .floating-whatsapp:hover {
          transform: scale(1.05);
          opacity: 0.95;
        }

        .floating-whatsapp:active {
          transform: scale(0.95);
        }

        .floating-whatsapp__icon {
          display: block;
        }

        @media (max-width: 640px) {
          .floating-whatsapp {
            bottom: calc(16px + env(safe-area-inset-bottom, 0px));
            right: 16px;
            width: 42px;
            height: 42px;
          }
          .floating-whatsapp__icon {
            width: 22px;
            height: 22px;
          }
        }
      `}</style>
    </>
  )
}
