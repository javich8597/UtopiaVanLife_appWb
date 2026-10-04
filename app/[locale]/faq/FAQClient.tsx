'use client'

import FAQAccordionList from '@/components/faq/FAQAccordionList'

export default function FAQClient() {
  return (
    <main className="faq-page-main">
      <div className="container faq-container">
        <FAQAccordionList variant="dark" />
      </div>

      <style jsx>{`
        .faq-page-main {
          min-height: 100vh;
          padding-top: 80px;
          background: #0B0C0E;
        }
        .faq-container {
          padding-block: var(--space-10) var(--space-20);
        }
        @media (max-width: 640px) {
          .faq-page-main {
            padding-top: 72px;
          }
          .faq-container {
            padding-block: var(--space-6) var(--space-12);
          }
        }
      `}</style>
    </main>
  )
}
