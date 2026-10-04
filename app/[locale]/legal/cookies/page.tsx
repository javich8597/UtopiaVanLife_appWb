import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import LegalLayout from '@/components/legal/LegalLayout'
import { Cookie } from 'lucide-react'

export async function generateMetadata() {
  return {
    title: 'Política de Cookies | Utopia Van Life',
    description: 'Información sobre el uso de cookies y almacenamiento local en Utopia Van Life Mallorca.',
  }
}

export default function CookiesPage() {
  return (
    <>
      <Navbar />
      <main>
        <LegalLayout
          title="Política de Cookies"
          subtitle="Información sobre el uso de cookies en Utopia Van Life"
          icon={<Cookie size={28} />}
        >
          <section className="legal-section">
            <h2 className="legal-heading">1. ¿Qué son las Cookies?</h2>
            <p className="legal-text">
              Una cookie es un fichero técnico que se descarga en tu dispositivo al acceder a determinadas páginas web. Las cookies permiten almacenar y recuperar información sobre tus preferencias de navegación, idioma de visualización y estado de autenticación segura.
            </p>
          </section>

          <section className="legal-section">
            <h2 className="legal-heading">2. Cookies Técnicas Utilizadas</h2>
            <p className="legal-text">
              Nuestra plataforma utiliza únicamente cookies técnicas estrictamente necesarias para el correcto funcionamiento del servicio:
            </p>
            <ul className="legal-list">
              <li><strong>NEXT_LOCALE:</strong> Permite recordar tus preferencias de idioma (español, inglés, alemán, etc.) durante toda tu navegación.</li>
              <li><strong>sb-*-auth-token:</strong> Gestiona tu sesión de usuario de forma encriptada y segura tras acceder a Mi Aventura o al área de reservas.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2 className="legal-heading">3. Desactivación o Configuración</h2>
            <p className="legal-text">
              Puedes permitir, bloquear o eliminar las cookies instaladas en tu equipo mediante la configuración de las opciones del navegador instalado en tu ordenador o dispositivo móvil. Ten en cuenta que si deshabilitas las cookies técnicas necesarias, es posible que algunas funciones de la plataforma no operen de manera óptima.
            </p>
          </section>
        </LegalLayout>
      </main>
      <Footer />
    </>
  )
}
