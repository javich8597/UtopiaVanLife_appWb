'use client'

import { useEffect, useRef, useState } from 'react'
import { Video, Square, RotateCcw, Upload, Loader2, Check } from 'lucide-react'
import { pickVideoMime, VIDEO_BITS_PER_SECOND, VIDEO_CONSTRAINTS, VIDEO_MAX_SECONDS, formatBytes } from '@/lib/handover/media'

interface Props {
  label: string
  hint: string
  uploadedUrl?: string | null
  onUpload: (file: Blob, ext: string) => Promise<void>
}

type Phase = 'idle' | 'preview' | 'recording' | 'review' | 'uploading'

/** Graba un vídeo ligero con la cámara trasera del móvil y lo sube (720p, ~1 Mbps, máx. 3 min) */
export default function VideoRecorder({ label, hint, uploadedUrl, onUpload }: Props) {
  const liveRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const [phase, setPhase] = useState<Phase>('idle')
  const [seconds, setSeconds] = useState(0)
  const [clip, setClip] = useState<{ blob: Blob; url: string; ext: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Se detecta tras montar para no desajustar el HTML del servidor (hidratación)
  const [format, setFormat] = useState<ReturnType<typeof pickVideoMime>>(null)
  useEffect(() => { setFormat(pickVideoMime()) }, [])

  const stopStream = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }
  useEffect(() => () => { stopStream(); if (clip) URL.revokeObjectURL(clip.url) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase !== 'recording') return
    const t = setInterval(() => {
      setSeconds(s => {
        if (s + 1 >= VIDEO_MAX_SECONDS) recorderRef.current?.stop()
        return s + 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [phase])

  const openCamera = async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia(VIDEO_CONSTRAINTS)
      streamRef.current = stream
      setPhase('preview')
      requestAnimationFrame(() => {
        if (liveRef.current) {
          liveRef.current.srcObject = stream
          liveRef.current.play().catch(() => {})
        }
      })
    } catch {
      setError('No hemos podido abrir la cámara. Revisa los permisos del navegador o sube un vídeo grabado con el móvil.')
    }
  }

  const start = () => {
    if (!streamRef.current || !format) return
    chunksRef.current = []
    const rec = new MediaRecorder(streamRef.current, { mimeType: format.mime, videoBitsPerSecond: VIDEO_BITS_PER_SECOND, audioBitsPerSecond: 64_000 })
    rec.ondataavailable = e => { if (e.data.size) chunksRef.current.push(e.data) }
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: format.mime.split(';')[0] })
      setClip({ blob, url: URL.createObjectURL(blob), ext: format.ext })
      stopStream()
      setPhase('review')
    }
    recorderRef.current = rec
    rec.start(1000)
    setSeconds(0)
    setPhase('recording')
  }

  const retake = () => {
    if (clip) URL.revokeObjectURL(clip.url)
    setClip(null)
    openCamera()
  }

  const upload = async () => {
    if (!clip) return
    setPhase('uploading')
    setError(null)
    try {
      await onUpload(clip.blob, clip.ext)
      URL.revokeObjectURL(clip.url)
      setClip(null)
      setPhase('idle')
    } catch (e: any) {
      setError(e.message)
      setPhase('review')
    }
  }

  // Alternativa: vídeo ya grabado con la cámara del móvil (se sube tal cual)
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > 50 * 1024 * 1024) {
      setError('El vídeo pesa más de 50 MB. Grábalo desde aquí para que ocupe menos.')
      return
    }
    setPhase('uploading')
    setError(null)
    try {
      await onUpload(file, (file.name.split('.').pop() || 'mp4').toLowerCase())
      setPhase('idle')
    } catch (err: any) {
      setError(err.message)
      setPhase('idle')
    }
  }

  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  return (
    <div className="vr">
      <div className="vr-head">
        <strong>{label}</strong>
        <span>{hint}</span>
      </div>

      {uploadedUrl && phase === 'idle' && (
        <div className="vr-done">
          <video src={uploadedUrl} controls playsInline preload="metadata" className="vr-video" />
          <span className="vr-ok"><Check size={14} /> Guardado</span>
        </div>
      )}

      {(phase === 'preview' || phase === 'recording') && (
        <div className="vr-stage">
          <video ref={liveRef} muted playsInline className="vr-video" />
          {phase === 'recording' && <span className="vr-timer">● {mmss(seconds)} / {mmss(VIDEO_MAX_SECONDS)}</span>}
        </div>
      )}

      {clip && (phase === 'review' || phase === 'uploading') && (
        <div className="vr-stage">
          <video src={clip.url} controls playsInline className="vr-video" />
          <span className="vr-size">{formatBytes(clip.blob.size)}</span>
        </div>
      )}

      {error && <p className="vr-error" role="alert">{error}</p>}

      <div className="vr-actions">
        {phase === 'idle' && (
          <>
            {format ? (
              <button type="button" className="adm-btn adm-btn--primary" onClick={openCamera}>
                <Video size={16} /> {uploadedUrl ? 'Volver a grabar' : 'Grabar vídeo'}
              </button>
            ) : null}
            <label className="adm-btn">
              <Upload size={16} /> Subir vídeo
              <input type="file" accept="video/*" capture="environment" className="vr-file" onChange={onFile} />
            </label>
          </>
        )}
        {phase === 'preview' && (
          <button type="button" className="adm-btn adm-btn--primary" onClick={start}><Video size={16} /> Empezar a grabar</button>
        )}
        {phase === 'recording' && (
          <button type="button" className="adm-btn adm-btn--danger" onClick={() => recorderRef.current?.stop()}><Square size={16} /> Parar</button>
        )}
        {phase === 'review' && (
          <>
            <button type="button" className="adm-btn" onClick={retake}><RotateCcw size={16} /> Repetir</button>
            <button type="button" className="adm-btn adm-btn--primary" onClick={upload}><Upload size={16} /> Guardar vídeo</button>
          </>
        )}
        {phase === 'uploading' && (
          <span className="vr-uploading"><Loader2 size={16} className="vr-spin" /> Subiendo…</span>
        )}
      </div>

      <style jsx>{`
        .vr { display: flex; flex-direction: column; gap: 12px; }
        .vr-head { display: flex; flex-direction: column; gap: 2px; }
        .vr-head span { color: var(--adm-text-3); font-size: 0.85rem; }
        .vr-stage, .vr-done { position: relative; border-radius: 14px; overflow: hidden; background: #000; }
        .vr-video { display: block; width: 100%; max-height: 60vh; object-fit: contain; background: #000; }
        .vr-timer, .vr-size, .vr-ok {
          position: absolute; top: 10px; left: 10px; padding: 4px 10px; border-radius: 999px;
          font-size: 0.8rem; font-weight: 700; background: rgba(0,0,0,0.6); color: #fff;
          display: inline-flex; align-items: center; gap: 4px;
        }
        .vr-timer { color: #ff6b6b; }
        .vr-error { color: var(--adm-rose); font-size: 0.88rem; margin: 0; }
        .vr-actions { display: flex; flex-wrap: wrap; gap: 10px; }
        .vr-file { display: none; }
        .vr-uploading { display: inline-flex; align-items: center; gap: 8px; color: var(--adm-text-2); }
        :global(.vr-spin) { animation: vrspin 1s linear infinite; }
        @keyframes vrspin { to { transform: rotate(360deg); } }
        @media (max-width: 640px) {
          .vr-actions :global(.adm-btn) { flex: 1 1 100%; justify-content: center; min-height: 44px; }
        }
      `}</style>
    </div>
  )
}
