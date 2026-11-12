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
          background: #0E1013;
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
