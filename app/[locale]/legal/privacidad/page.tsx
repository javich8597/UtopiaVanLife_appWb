import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import LegalLayout from '@/components/legal/LegalLayout'
import { ShieldCheck } from 'lucide-react'

export async function generateMetadata() {
  return {
    title: 'Política de Privacidad y RGPD | Utopia Van Life',
    description: 'Información sobre el tratamiento de datos personales y cumplimiento del RGPD en Utopia Van Life Mallorca.',
  }
}

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main>
        <LegalLayout
          title="Política de Privacidad y RGPD"
          subtitle="Última actualización: Agosto 2026"
          icon={<ShieldCheck size={28} />}
        >
          <section className="legal-section">
            <h2 className="legal-heading">1. Responsable del Tratamiento</h2>
            <p className="legal-text">
              Utopia Van Life S.L., con domicilio en Palma de Mallorca (Islas Baleares), es el responsable del tratamiento de los datos personales facilitados a través de esta plataforma web.
            </p>
          </section>

          <section className="legal-section">
            <h2 className="legal-heading">2. Finalidad del Tratamiento de Datos</h2>
            <p className="legal-text">
              Recopilamos y tratamos tus datos personales con las siguientes finalidades legítimas:
            </p>
            <ul className="legal-list">
              <li><strong>Gestión de reservas:</strong> Contratación, entrega y devolución de vehículos camper.</li>
              <li><strong>Verificación de requisitos:</strong> Comprobación del carnet de conducir y cumplimiento de las condiciones de la póliza de seguro.</li>
              <li><strong>Pasarela de pago segura:</strong> Procesamiento de pagos y retención o liberación de fianzas mediante entidades bancarias homologadas.</li>
              <li><strong>Asistencia y atención al cliente:</strong> Notificaciones sobre el estado de tu alquiler o soporte en carretera 24/7.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2 className="legal-heading">3. Tus Derechos</h2>
            <p className="legal-text">
              De conformidad con el Reglamento General de Protección de Datos (RGPD) y la LOPDGDD, puedes ejercer en cualquier momento tus derechos de acceso, rectificación, supresión, limitación del tratamiento, portabilidad y oposición remitiendo tu solicitud a{' '}
              <a href="mailto:hola@utopiavanlife.com" className="legal-link">hola@utopiavanlife.com</a>.
            </p>
          </section>
        </LegalLayout>
      </main>
      <Footer />
    </>
  )
}
