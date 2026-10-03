import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import LegalLayout from '@/components/legal/LegalLayout'
import { FileCheck } from 'lucide-react'

export async function generateMetadata() {
  return {
    title: 'Términos y Condiciones | Utopia Van Life',
    description: 'Condiciones generales de contratación y alquiler de furgonetas camper en Mallorca con Utopia Van Life.',
  }
}

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main>
        <LegalLayout
          title="Términos y Condiciones"
          subtitle="Condiciones generales de contratación y alquiler"
          icon={<FileCheck size={28} />}
        >
          <section className="legal-section">
            <h2 className="legal-heading">1. Requisitos del Conductor</h2>
            <p className="legal-text">
              El arrendatario y todos los conductores autorizados deben tener al menos 25 años de edad cumplidos y estar en posesión de un permiso de conducir de clase B en vigor con al menos 2 años de antigüedad acreditada.
            </p>
          </section>

          <section className="legal-section">
            <h2 className="legal-heading">2. Fianza y Cobertura de Seguro</h2>
            <p className="legal-text">
              Todas nuestras furgonetas camper disponen de seguro a todo riesgo. En el momento del check-in se retendrá una fianza reembolsable de 1.000€ mediante tarjeta bancaria para responder de posibles contingencias o desperfectos no cubiertos por la póliza. Dicha fianza será liberada íntegramente tras la inspección de devolución del vehículo en el mismo estado de conservación.
            </p>
          </section>

          <section className="legal-section">
            <h2 className="legal-heading">3. Entrega y Devolución en Mallorca</h2>
            <p className="legal-text">
              Los vehículos se entregan y recogen en los puntos convenidos en Mallorca con el depósito de combustible lleno y en óptimas condiciones de limpieza, debiendo ser reintegrados en el mismo estado pactado.
            </p>
          </section>
        </LegalLayout>
      </main>
      <Footer />
    </>
  )
}
