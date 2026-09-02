import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import VentaClient from './VentaClient'

export async function generateMetadata() {
  return {
    title: 'Venta de Campers en Mallorca | Utopia Van Life',
    description: 'Distribuidores Oficiales de Nomade Nation en Mallorca. Compra tu camper Fiat Ducato L3H2 (Modelos NEO y SPACE) con acabados de lujo y autonomía eléctrica Pro.',
  }
}

export default function VentaPage() {
  return (
    <>
      <Navbar />
      <main style={{ paddingTop: 72 }}>
        <VentaClient />
      </main>
      <Footer />
    </>
  )
}
