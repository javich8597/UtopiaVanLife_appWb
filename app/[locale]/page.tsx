import Navbar from '@/components/layout/Navbar'
import HeroSection from '@/components/home/HeroSection'
import FeaturedCampers from '@/components/home/FeaturedCampers'
import Rotating3DShowcase from '@/components/home/Rotating3DShowcase'
import AboutPreview from '@/components/home/AboutPreview'
import FAQSection from '@/components/home/FAQSection'
import CustomerReviews from '@/components/home/CustomerReviews'
import Footer from '@/components/layout/Footer'

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className="home-main">
        <HeroSection />
        <FeaturedCampers />
        <Rotating3DShowcase />
        <AboutPreview />
        <FAQSection />
        <CustomerReviews />
      </main>
      <Footer />
    </>
  )
}
