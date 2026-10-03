'use client'

import FAQAccordionList from '@/components/faq/FAQAccordionList'

export default function FAQSection() {
  return (
    <section className="faq-section section" id="faqs">
      <div className="container">
        <FAQAccordionList variant="dark" />
      </div>

      <style jsx>{`
        .faq-section {
          background-color: #0B0C0E;
          padding-block: 100px;
          position: relative;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
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
