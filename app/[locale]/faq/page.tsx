import type { Metadata } from 'next'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import FAQAccordionList from '@/components/faq/FAQAccordionList'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const isEs = locale === 'es'

  return {
    title: isEs
      ? 'Preguntas Frecuentes | Utopia Van Life Mallorca'
      : 'Frequently Asked Questions | Utopia Van Life Mallorca',
    description: isEs
      ? 'Resolvemos todas tus dudas sobre el alquiler de campers en Mallorca: sistema eléctrico Victron 540Ah, fianza de 1.000 €, seguro a todo riesgo, entrega y equipamiento.'
      : 'Everything you need to know about campervan rental in Mallorca: Victron 540Ah off-grid power, €1,000 security deposit, full insurance, pickup and equipment.',
    openGraph: {
      title: isEs
        ? 'Preguntas Frecuentes | Utopia Van Life Mallorca'
        : 'Frequently Asked Questions | Utopia Van Life Mallorca',
      description: isEs
        ? 'Resolvemos todas tus dudas sobre el alquiler de campers en Mallorca.'
        : 'Everything you need to know about campervan rental in Mallorca.',
    },
  }
}

export default function FAQPage() {
  return (
    <>
      <Navbar />
      <main className="faq-page-main bg-light-cream" style={{ minHeight: '80vh' }}>
        <div className="container" style={{ paddingBlock: 'var(--space-16) var(--space-20)' }}>
          <FAQAccordionList />
        </div>
      </main>
      <Footer />
    </>
  )
}
