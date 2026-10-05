'use client'

import { Link } from '@/i18n/routing'
import { Check, Gauge, Fuel, Video, Camera, KeyRound, Clock } from 'lucide-react'
import { CHECKLIST, kmSummary } from '@/lib/handover/checklist'

interface Props {
  booking: any | null
  pickup: any | null
  ret: any | null
}

const fmtStamp = (d: string) => new Date(d).toLocaleString('es-ES', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

function HandoverCard({ h, title }: { h: any; title: string }) {
  const items = CHECKLIST[h.kind as 'pickup' | 'return']
  return (
    <section className="usr-card cs-card" aria-label={title}>
      <header className="cs-card__head">
        <h2>{title}</h2>
        <span className="usr-chip usr-chip--sage"><Check size={12} /> {fmtStamp(h.completed_at)}</span>
      </header>

      <div className="cs-facts">
        <span><Gauge size={16} /> {Number(h.km).toLocaleString('es-ES')} km</span>
        <span><Fuel size={16} /> Combustible: {h.fuel_level}</span>
      </div>

      <div className="cs-media">
        {h.exteriorVideoUrl && (
          <figure>
            <video src={h.exteriorVideoUrl} controls playsInline preload="metadata" />
            <figcaption><Video size={14} /> Exterior</figcaption>
          </figure>
        )}
        {h.interiorVideoUrl && (
          <figure>
            <video src={h.interiorVideoUrl} controls playsInline preload="metadata" />
            <figcaption><Video size={14} /> Interior</figcaption>
          </figure>
        )}
        {h.dashboardPhotoUrl && (
          <figure>
            <a href={h.dashboardPhotoUrl} target="_blank" rel="noopener"><img src={h.dashboardPhotoUrl} alt="Cuadro de mando" /></a>
            <figcaption><Camera size={14} /> Cuadro de mando</figcaption>
          </figure>
        )}
        {(h.damagePhotoUrls || []).map((url: string, i: number) => (
          <figure key={url}>
            <a href={url} target="_blank" rel="noopener"><img src={url} alt={`Daño registrado ${i + 1}`} /></a>
            <figcaption><Camera size={14} /> Daño registrado {i + 1}</figcaption>
          </figure>
        ))}
      </div>

      <ul className="cs-checks">
        {items.map(i => (
          <li key={i.id}><Check size={14} /> {i.label}</li>
        ))}
      </ul>
      {h.notes && <p className="cs-notes">{h.notes}</p>}
    </section>
  )
}

export default function CamperStatusClient({ booking, pickup, ret }: Props) {
  const camper = booking ? (Array.isArray(booking.campers) ? booking.campers[0] : booking.campers) : null
  const km = pickup && ret ? kmSummary(pickup.km, ret.km, booking?.num_nights, booking?.km_package) : null

  return (
    <div className="cs">
      <header className="usr-page-head">
        <div>
          <span className="usr-page-head__eyebrow">Estado de la camper</span>
          <h1 className="usr-page-head__title">{camper?.name ? `Tu ${camper.name}` : 'Tu camper'}</h1>
          <p className="usr-page-head__desc">
            Los vídeos, fotos y kilómetros que registramos contigo en la entrega y la devolución. Sirven de prueba para los dos.
          </p>
        </div>
      </header>

      {!booking && (
        <section className="usr-card cs-empty">
          <KeyRound size={28} />
          <p>Cuando tengas una reserva, aquí verás el estado de la camper en la entrega.</p>
          <Link href="/campers" className="usr-btn usr-btn--primary">Ver las campers</Link>
        </section>
      )}

      {booking && !pickup && (
        <section className="usr-card cs-empty">
          <Clock size={28} />
          <p>Aún no hemos hecho la entrega. Ese día grabaremos contigo la camper por dentro y por fuera, y lo tendrás aquí.</p>
        </section>
      )}

      {km && (
        <section className="usr-card cs-km">
          <strong>{km.driven.toLocaleString('es-ES')} km recorridos</strong>
          <span>
            {km.allowance === null ? 'Kilometraje ilimitado' : `${km.allowance.toLocaleString('es-ES')} km incluidos`}
            {km.extra > 0 ? ` · ${km.extra.toLocaleString('es-ES')} km de más` : ''}
          </span>
        </section>
      )}

      {pickup && <HandoverCard h={pickup} title="Entrega" />}
      {ret && <HandoverCard h={ret} title="Devolución" />}

      <style jsx>{`
        .cs { display: flex; flex-direction: column; gap: 16px; }
        .cs :global(.cs-card) { padding: 20px; display: flex; flex-direction: column; gap: 14px; }
        .cs :global(.cs-card__head) { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; }
        .cs :global(.cs-card__head h2) { margin: 0; font-size: 1.15rem; }
        .cs :global(.cs-facts) { display: flex; flex-wrap: wrap; gap: 16px; color: var(--usr-text-2); }
        .cs :global(.cs-facts span) { display: inline-flex; align-items: center; gap: 6px; }
        .cs :global(.cs-media) { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(240px, 100%), 1fr)); gap: 12px; }
        .cs :global(.cs-media figure) { margin: 0; display: flex; flex-direction: column; gap: 6px; }
        .cs :global(.cs-media video), .cs :global(.cs-media img) { width: 100%; aspect-ratio: 16 / 10; object-fit: cover; border-radius: 12px; background: #000; display: block; }
        .cs :global(.cs-media figcaption) { display: inline-flex; align-items: center; gap: 6px; font-size: 0.85rem; color: var(--usr-text-3); }
        .cs :global(.cs-checks) { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(220px, 100%), 1fr)); gap: 8px; }
        .cs :global(.cs-checks li) { display: flex; align-items: center; gap: 6px; font-size: 0.9rem; color: var(--usr-text-2); }
        .cs :global(.cs-notes) { margin: 0; font-size: 0.9rem; color: var(--usr-text-2); white-space: pre-line; }
        .cs :global(.cs-empty) { padding: 28px 20px; display: flex; flex-direction: column; align-items: center; gap: 12px; text-align: center; color: var(--usr-text-2); }
        .cs :global(.cs-km) { padding: 16px 20px; display: flex; flex-direction: column; gap: 4px; }
        @media (max-width: 640px) {
          .cs :global(.cs-card) { padding: 16px; }
        }
      `}</style>
    </div>
  )
}
