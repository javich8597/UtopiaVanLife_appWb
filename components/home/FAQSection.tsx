'use client'

import FAQAccordionList from '@/components/faq/FAQAccordionList'
import { useSiteTheme } from '@/lib/theme/siteThemeContext'

export default function FAQSection() {
  const { theme } = useSiteTheme()

  return (
    <section className="faq-section section" id="faqs">
      <div className="container">
        <FAQAccordionList variant={theme === 'light' ? 'light' : 'dark'} />
      </div>

      <style jsx>{`
        .faq-section {
          background-color: #0E1013;
          background-image:
            linear-gradient(180deg, rgba(14, 16, 19, 0.85) 0%, rgba(14, 16, 19, 0.89) 100%),
            url('/images/backgrounds/mallorca-bg-dark.webp');
          background-position: center center;
          background-size: cover;
          background-repeat: no-repeat;
          padding-block: 104px;
          position: relative;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        @media (max-width: 860px) {
          .faq-section {
            padding-block: 64px;
          }
        }
      `}</style>
    </section>
  )
}
