import { getTranslations } from 'next-intl/server'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import ContactClient from './ContactClient'

export default async function ContactPage() {
  const translations = await getTranslations('ContactPage')

  // Map translations to plain object to pass to client component safely
  const t = {
    title: translations('title'),
    subtitle: translations('subtitle'),
    phone: translations('phone'),
    email: translations('email'),
    address: translations('address'),
    name: translations('name'),
    lastName: translations('lastName'),
    howHelp: translations('howHelp'),
    helpOption1: translations('helpOption1'),
    helpOption2: translations('helpOption2'),
    helpOption3: translations('helpOption3'),
    submit: translations('submit'),
    sending: translations('sending'),
    successMsg: translations('successMsg'),
    newsletterTitle: translations('newsletterTitle'),
    newsletterSubtitle: translations('newsletterSubtitle'),
    newsletterPlaceholder: translations('newsletterPlaceholder'),
    newsletterSubmit: translations('newsletterSubmit'),
  }

  return (
    <>
      <Navbar />
      <ContactClient t={t} />
      <Footer />
    </>
  )
}
