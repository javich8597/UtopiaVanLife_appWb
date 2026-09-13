import { getTranslations } from 'next-intl/server'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import AboutHero from '@/components/about/AboutHero'
import AboutContent from '@/components/about/AboutContent'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'AboutPage' })

  return {
    title: `${t('whoTitle')} | Utopia Van Life`,
    description: t('heroSubtitle'),
    openGraph: {
      title: `${t('whoTitle')} - Utopia Van Life`,
      description: t('heroSubtitle'),
      images: [
        {
          url: '/images/about/transit.jpg',
          width: 1024,
          height: 768,
          alt: 'Utopia Van Life Ford Transit clásica',
        },
      ],
    },
  }
}

export default async function AboutPage() {
  return (
    <>
      <Navbar />
      <main className="about-page" style={{ minHeight: '100vh', background: 'var(--white-broken)' }}>
        <AboutHero />
        <AboutContent />
      </main>
      <Footer />
    </>
  )
}
