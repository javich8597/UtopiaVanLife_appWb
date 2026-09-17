'use client'

import FAQAccordionList from '@/components/faq/FAQAccordionList'

export default function FAQSection() {
  return (
    <section className="faq-section section" id="faqs">
      <div className="container">
        <FAQAccordionList />
      </div>

      <style jsx>{`
        .faq-section {
          background-color: var(--light-cream, #f7f6f2);
          padding-block: var(--space-20);
          position: relative;
        }
      `}</style>
    </section>
  )
}
