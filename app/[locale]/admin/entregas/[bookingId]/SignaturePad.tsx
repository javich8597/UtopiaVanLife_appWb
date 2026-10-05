'use client'

import { useEffect, useRef, useState } from 'react'
import { Eraser } from 'lucide-react'

interface Props {
  onChange: (dataUrl: string | null) => void
}

/** Firma táctil del cliente en el móvil del admin (sin scroll al firmar, AGENTS.md regla 5) */
export default function SignaturePad({ onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const [hasInk, setHasInk] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current!
    const resize = () => {
      const ratio = window.devicePixelRatio || 1
      const { width, height } = canvas.getBoundingClientRect()
      canvas.width = width * ratio
      canvas.height = height * ratio
      const ctx = canvas.getContext('2d')!
      ctx.scale(ratio, ratio)
      ctx.lineWidth = 2.2
      ctx.lineCap = 'round'
      ctx.strokeStyle = '#1f1b17'
    }
    resize()
  }, [])

  const point = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  const down = (e: React.PointerEvent) => {
    canvasRef.current!.setPointerCapture(e.pointerId)
    drawing.current = true
    const ctx = canvasRef.current!.getContext('2d')!
    const p = point(e)
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
  }
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return
    const ctx = canvasRef.current!.getContext('2d')!
    const p = point(e)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    if (!hasInk) setHasInk(true)
  }
  const up = () => {
    if (!drawing.current) return
    drawing.current = false
    if (hasInk) onChange(canvasRef.current!.toDataURL('image/png'))
  }
  const clear = () => {
    const c = canvasRef.current!
    c.getContext('2d')!.clearRect(0, 0, c.width, c.height)
    setHasInk(false)
    onChange(null)
  }

  return (
    <div className="sp">
      <canvas
        ref={canvasRef}
        className="sp-canvas"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        aria-label="Firma del cliente"
      />
      <div className="sp-foot">
        <span>{hasInk ? 'Firma lista' : 'El cliente firma aquí con el dedo'}</span>
        <button type="button" className="adm-btn adm-btn--sm" onClick={clear}><Eraser size={14} /> Borrar</button>
      </div>
      <style jsx>{`
        .sp { display: flex; flex-direction: column; gap: 8px; }
        .sp-canvas {
          width: 100%; height: 180px; border-radius: 14px; background: #fbf8f2;
          border: 1px dashed var(--adm-border);
          touch-action: none; user-select: none; -webkit-user-select: none;
        }
        .sp-foot { display: flex; justify-content: space-between; align-items: center; gap: 10px; color: var(--adm-text-3); font-size: 0.85rem; }
      `}</style>
    </div>
  )
}
