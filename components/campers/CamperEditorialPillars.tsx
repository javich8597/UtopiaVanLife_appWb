'use client'

import Image from 'next/image'

export interface EditorialPillarsData {
  heroBadge: string
  heroTitle: string
  heroDesc: string
  heroImg: string
  card1: {
    num: string
    category: string
    title: string
    desc: string
    img: string
    footerLabel: string
    footerVal: string
  }
  card2: {
    num: string
    category: string
    title: string
    desc: string
    img: string
    footerLabel: string
    footerVal: string
  }
  card3: {
    num: string
    category: string
    title: string
    desc: string
    img: string
    footerLabel: string
    footerVal: string
  }
}

interface Props {
  data: EditorialPillarsData
}

export default function CamperEditorialPillars({ data }: Props) {
  if (!data) return null

  return (
    <section className="editorial-pillars-section" aria-label="Diseño y arquitectura interior">
      <div className="section-header">
        <span className="gold-accent-dot" />
        <h2 className="section-title">Diseño & Confort Nómada</h2>
      </div>

      {/* Hero Banner Pillar */}
      <div className="pillar-hero-banner">
        <div className="hero-img-wrap">
          <Image
            src={data.heroImg}
            alt={data.heroTitle}
            fill
            sizes="(max-width: 860px) 100vw, 1200px"
            className="pillar-hero-img"
          />
        </div>
        <div className="hero-gradient" />
        <div className="hero-content">
          <span className="hero-badge">{data.heroBadge}</span>
          <h3 className="hero-heading">{data.heroTitle}</h3>
          <p className="hero-description">{data.heroDesc}</p>
        </div>
      </div>

      {/* 3 Pillars Grid */}
      <div className="pillars-grid">
        {/* Card 1: Arquitectura */}
        <div className="pillar-card">
          <div className="card-media-wrap">
            <Image
              src={data.card1.img}
              alt={data.card1.title}
              fill
              sizes="(max-width: 860px) 100vw, 33vw"
              className="pillar-card-img"
            />
            <div className="card-tag">
              <span>{data.card1.num} · {data.card1.category}</span>
            </div>
          </div>
          <div className="card-body">
            <div>
              <h4 className="card-title">{data.card1.title}</h4>
              <p className="card-desc">{data.card1.desc}</p>
            </div>
            <div className="card-footer">
              <span>{data.card1.footerLabel}</span>
              <span className="card-footer-val">{data.card1.footerVal}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Materiales */}
        <div className="pillar-card">
          <div className="card-media-wrap">
            <Image
              src={data.card2.img}
              alt={data.card2.title}
              fill
              sizes="(max-width: 860px) 100vw, 33vw"
              className="pillar-card-img"
            />
            <div className="card-tag">
              <span>{data.card2.num} · {data.card2.category}</span>
            </div>
          </div>
          <div className="card-body">
            <div>
              <h4 className="card-title">{data.card2.title}</h4>
              <p className="card-desc">{data.card2.desc}</p>
            </div>
            <div className="card-footer">
              <span>{data.card2.footerLabel}</span>
              <span className="card-footer-val">{data.card2.footerVal}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Experiencia */}
        <div className="pillar-card">
          <div className="card-media-wrap">
            <Image
              src={data.card3.img}
              alt={data.card3.title}
              fill
              sizes="(max-width: 860px) 100vw, 33vw"
              className="pillar-card-img"
            />
            <div className="card-tag">
              <span>{data.card3.num} · {data.card3.category}</span>
            </div>
          </div>
          <div className="card-body">
            <div>
              <h4 className="card-title">{data.card3.title}</h4>
              <p className="card-desc">{data.card3.desc}</p>
            </div>
            <div className="card-footer">
              <span>{data.card3.footerLabel}</span>
              <span className="card-footer-val">{data.card3.footerVal}</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .editorial-pillars-section {
          width: 100%;
          margin-bottom: 56px;
        }
        .section-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
        }
        .gold-accent-dot {
          width: 8px;
          height: 8px;
          border-radius: 9999px;
          background: #e6ca65;
          display: inline-block;
        }
        .section-title {
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.7);
          margin: 0;
        }
        .pillar-hero-banner {
          position: relative;
          border-radius: 28px;
          overflow: hidden;
          background: #131518;
          border: 1px solid rgba(255, 255, 255, 0.08);
          height: 380px;
          margin-bottom: 24px;
        }
        .hero-img-wrap {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }
        :global(.pillar-hero-img) {
          object-fit: cover;
        }
        .hero-gradient {
          position: absolute;
          inset: 0;
          background: linear-gradient(to right, rgba(0, 0, 0, 0.9) 0%, rgba(0, 0, 0, 0.55) 50%, rgba(0, 0, 0, 0.2) 100%);
        }
        .hero-content {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: 44px;
          max-width: 640px;
          z-index: 2;
        }
        .hero-badge {
          font-family: monospace;
          font-size: 11px;
          font-weight: 800;
          color: #e6ca65;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          margin-bottom: 8px;
        }
        .hero-heading {
          font-size: 32px;
          font-weight: 900;
          color: #ffffff;
          line-height: 1.15;
          margin: 0 0 12px 0;
        }
        .hero-description {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.72);
          line-height: 1.6;
          margin: 0;
          font-weight: 300;
        }
        .pillars-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        .pillar-card {
          background: #131518;
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: transform 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease;
        }
        .pillar-card:hover {
          transform: translateY(-2px);
          border-color: rgba(230, 202, 101, 0.3);
          box-shadow: 0 15px 35px -10px rgba(0, 0, 0, 0.6);
        }
        .card-media-wrap {
          position: relative;
          height: 210px;
          width: 100%;
          overflow: hidden;
        }
        :global(.pillar-card-img) {
          object-fit: cover;
          transition: transform 0.6s ease;
        }
        .pillar-card:hover :global(.pillar-card-img) {
          transform: scale(1.05);
        }
        .card-tag {
          position: absolute;
          top: 14px;
          left: 14px;
          background: rgba(11, 12, 14, 0.8);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          padding: 4px 10px;
          border-radius: 9999px;
          font-family: monospace;
          font-size: 10px;
          font-weight: 700;
          color: #e6ca65;
          letter-spacing: 0.15em;
          text-transform: uppercase;
        }
        .card-body {
          padding: 22px;
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .card-title {
          font-size: 17px;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 8px 0;
        }
        .card-desc {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.6);
          line-height: 1.6;
          margin: 0;
        }
        .card-footer {
          margin-top: 18px;
          padding-top: 14px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.45);
        }
        .card-footer-val {
          color: #e6ca65;
          font-weight: 600;
        }

        /* Responsive Breakpoints */
        @media (max-width: 860px) {
          .hero-content {
            padding: 30px;
          }
          .hero-heading {
            font-size: 26px;
          }
          .pillars-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          .card-media-wrap {
            height: 200px;
          }
        }

        @media (max-width: 640px) {
          .editorial-pillars-section {
            margin-bottom: 36px;
          }
          .pillar-hero-banner {
            height: 320px;
            border-radius: 20px;
          }
          .hero-content {
            padding: 20px;
          }
          .hero-heading {
            font-size: 22px;
          }
          .hero-description {
            font-size: 12px;
          }
          .pillar-card {
            border-radius: 18px;
          }
        }
      `}</style>
    </section>
  )
}
