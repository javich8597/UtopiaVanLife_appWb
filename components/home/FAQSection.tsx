'use client'

import FAQAccordionList from '@/components/faq/FAQAccordionList'

export default function FAQSection() {
  return (
    <section className="faq-section section" id="faqs">
      <div className="container">
        <FAQAccordionList theme="dark" />
      </div>

      <style jsx>{`
        .faq-section {
          background-color: #0F1115;
          padding-block: var(--space-20);
          position: relative;
        }
      `}</style>
    </section>
  )
}
