'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface LegalLayoutProps {
  title: string
  subtitle: string
  icon: React.ReactNode
  children: React.ReactNode
}

export default function LegalLayout({
  title,
  subtitle,
  icon,
  children
}: LegalLayoutProps) {
  return (
    <div className="legal-page">
      <div className="legal-container">
        {/* Back Link */}
        <div className="legal-nav">
          <Link href="/" className="legal-back-btn">
            <ArrowLeft size={16} />
            <span>Volver a Inicio</span>
          </Link>
        </div>

        {/* Main Reading Card */}
        <div className="legal-card">
          <div className="legal-card__header">
            <div className="legal-card__icon-wrap">
              {icon}
            </div>
            <div className="legal-card__header-text">
              <h1 className="legal-card__title">{title}</h1>
              <p className="legal-card__subtitle">{subtitle}</p>
            </div>
          </div>

          <div className="legal-card__divider" />

          <div className="legal-card__body">
            {children}
          </div>
        </div>
      </div>

      <style jsx>{`
        .legal-page {
          background: #0B0C0E;
          min-height: 85vh;
          padding: 120px 20px 80px;
          color: #F8FAFC;
        }

        .legal-container {
          max-width: 860px;
          margin: 0 auto;
        }

        .legal-nav {
          margin-bottom: 24px;
        }

        .legal-back-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #94A3B8;
          font-size: 0.88rem;
          font-weight: 600;
          text-decoration: none;
          padding: 8px 16px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          transition: all 0.2s ease;
        }

        .legal-back-btn:hover {
          color: #CCA053;
          border-color: rgba(204, 160, 83, 0.4);
          background: rgba(204, 160, 83, 0.08);
          transform: translateX(-2px);
        }

        .legal-card {
          background: #131518;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          padding: 44px 48px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
          position: relative;
          overflow: hidden;
        }

        .legal-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, #CCA053, transparent);
        }

        .legal-card__header {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 28px;
        }

        .legal-card__icon-wrap {
          width: 54px;
          height: 54px;
          border-radius: 16px;
          background: rgba(204, 160, 83, 0.12);
          border: 1px solid rgba(204, 160, 83, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #CCA053;
          flex-shrink: 0;
        }

        .legal-card__header-text {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .legal-card__title {
          font-size: clamp(1.7rem, 2.6vw, 2.2rem);
          font-weight: 800;
          color: #FFFFFF;
          margin: 0;
          letter-spacing: -0.02em;
        }

        .legal-card__subtitle {
          font-size: 0.92rem;
          color: #94A3B8;
          margin: 0;
        }

        .legal-card__divider {
          height: 1px;
          background: rgba(255, 255, 255, 0.08);
          margin-bottom: 32px;
        }

        .legal-card__body {
          display: flex;
          flex-direction: column;
          gap: 32px;
          line-height: 1.8;
          color: #94A3B8;
          font-size: 1rem;
        }

        :global(.legal-section) {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        :global(.legal-heading) {
          font-size: 1.25rem;
          font-weight: 700;
          color: #FFFFFF;
          margin: 0;
          letter-spacing: -0.01em;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        :global(.legal-heading::before) {
          content: '';
          display: inline-block;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #CCA053;
        }

        :global(.legal-text) {
          margin: 0;
          color: #94A3B8;
        }

        :global(.legal-list) {
          padding-left: 20px;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        :global(.legal-list li) {
          color: #94A3B8;
        }

        :global(.legal-list li strong) {
          color: #FFFFFF;
        }

        :global(.legal-link) {
          color: #CCA053;
          font-weight: 600;
          text-decoration: none;
          transition: color 0.15s ease;
        }

        :global(.legal-link:hover) {
          color: #E8CA7C;
          text-decoration: underline;
        }

        @media (max-width: 860px) {
          .legal-card {
            padding: 32px 24px;
          }
        }

        @media (max-width: 640px) {
          .legal-page {
            padding: 100px 14px 60px;
          }

          .legal-card {
            padding: 24px 18px;
            border-radius: 18px;
          }

          .legal-card__header {
            flex-direction: column;
            align-items: flex-start;
            gap: 14px;
          }

          .legal-card__icon-wrap {
            width: 46px;
            height: 46px;
            border-radius: 12px;
          }
        }
      `}</style>
    </div>
  )
}
