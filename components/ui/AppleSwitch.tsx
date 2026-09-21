'use client'

import React from 'react'
import { Loader2 } from 'lucide-react'

export interface AppleSwitchProps {
  checked: boolean
  onChange: () => void
  disabled?: boolean
  label?: string
  id?: string
  size?: 'sm' | 'md'
  showStatusBadge?: boolean
}

export function AppleSwitch({
  checked,
  onChange,
  disabled = false,
  label,
  id,
  size = 'md',
  showStatusBadge = false,
}: AppleSwitchProps) {
  const isSm = size === 'sm'
  const width = isSm ? 38 : 46
  const height = isSm ? 22 : 26
  const knobSize = isSm ? 18 : 22
  const translate = isSm ? 16 : 20

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        verticalAlign: 'middle',
      }}
    >
      <button
        type="button"
        role="switch"
        id={id}
        aria-checked={checked}
        disabled={disabled}
        onClick={onChange}
        style={{
          position: 'relative',
          width: `${width}px`,
          height: `${height}px`,
          borderRadius: '9999px',
          background: checked ? '#34C759' : '#E5E7EB',
          border: 'none',
          padding: '2px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'background-color 0.22s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.22s ease',
          outline: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          boxShadow: checked
            ? '0 2px 5px rgba(52, 199, 89, 0.35)'
            : 'inset 0 1px 2px rgba(0, 0, 0, 0.08)',
          opacity: disabled ? 0.65 : 1,
          flexShrink: 0,
        }}
        onMouseDown={e => {
          if (!disabled) e.currentTarget.style.transform = 'scale(0.96)'
        }}
        onMouseUp={e => {
          if (!disabled) e.currentTarget.style.transform = 'scale(1)'
        }}
        onMouseLeave={e => {
          if (!disabled) e.currentTarget.style.transform = 'scale(1)'
        }}
      >
        <div
          style={{
            width: `${knobSize}px`,
            height: `${knobSize}px`,
            borderRadius: '50%',
            background: '#FFFFFF',
            boxShadow: '0 2px 5px rgba(0, 0, 0, 0.22), 0 0 1px rgba(0, 0, 0, 0.15)',
            transform: checked ? `translateX(${translate}px)` : 'translateX(0px)',
            transition: 'transform 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {disabled && (
            <Loader2
              size={isSm ? 10 : 12}
              className="animate-spin"
              style={{ color: checked ? '#34C759' : '#9CA3AF' }}
            />
          )}
        </div>
      </button>

      {label && (
        <span
          style={{
            fontSize: isSm ? '0.75rem' : '0.8rem',
            fontWeight: 700,
            color: checked ? '#15803d' : '#6B7280',
            userSelect: 'none',
            letterSpacing: '0.01em',
          }}
        >
          {label}
        </span>
      )}

      {showStatusBadge && (
        <span
          style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '9999px',
            background: checked ? 'rgba(52, 199, 89, 0.12)' : 'rgba(156, 163, 175, 0.15)',
            color: checked ? '#15803d' : '#4B5563',
            userSelect: 'none',
          }}
        >
          {checked ? 'ACTIVO' : 'INACTIVO'}
        </span>
      )}
    </div>
  )
}
