import Navbar from '@/components/layout/Navbar'
import HeroSection from '@/components/home/HeroSection'
import CamperShowcase from '@/components/home/CamperShowcase'
import WhyUtopia from '@/components/home/WhyUtopia'
import ExperiencesSection from '@/components/home/ExperiencesSection'
import FAQSection from '@/components/home/FAQSection'
import Footer from '@/components/layout/Footer'

export default function HomePage() {
  return (
    <>
      <Navbar variant="dark" />
      <main>
        <HeroSection />
        <CamperShowcase />
        <WhyUtopia />
        <ExperiencesSection />
        <FAQSection />
      </main>
      <Footer />
    </>
  )
}
