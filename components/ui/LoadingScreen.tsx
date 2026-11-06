'use client'

import React from 'react'

export default function LoadingScreen({ fullScreen = true }: { fullScreen?: boolean }) {
  const spinner = (
    <div className="animate-utopia-fade-in">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/videos/loading/Loading logo fast.gif"
        alt=""
        role="status"
        aria-label="Cargando"
        draggable={false}
        className="pointer-events-none select-none"
        style={{
          width: 'clamp(100px, 18vw, 140px)',
          height: 'clamp(100px, 18vw, 140px)',
          borderRadius: '50%',
          objectFit: 'cover',
          boxShadow:
            '0 16px 40px -8px rgba(26, 26, 26, 0.18), 0 2px 8px rgba(0, 0, 0, 0.06)',
        }}
      />
    </div>
  )

  if (!fullScreen) {
    return (
      <div className="loader-partial">
        {spinner}
        <style jsx>{`
          .loader-partial {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            min-height: 50vh;
          }
        `}</style>
      </div>
    )
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Cargando"
      className="loader-full"
    >
      {spinner}
      <style jsx>{`
        .loader-full {
          position: fixed;
          inset: 0;
          z-index: 99999;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: rgba(11, 12, 14, 0.9);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
      `}</style>
    </div>
  )
}
