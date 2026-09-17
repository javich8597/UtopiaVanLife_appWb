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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: '50vh' }}>
        {spinner}
      </div>
    )
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Cargando"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(250, 248, 245, 0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      {spinner}
    </div>
  )
}
