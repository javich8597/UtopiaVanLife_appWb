'use client'

export interface CamperVideoTour {
  src: string
  tag: string
  title: string
  desc: string
}

interface Props {
  videos: CamperVideoTour[]
}

export default function CamperVideoShowcase({ videos }: Props) {
  if (!videos || videos.length === 0) return null

  return (
    <section className="video-showcase-section" aria-label="Vídeos interactivos del vehículo">
      <div className="section-header">
        <div className="title-left">
          <span className="gold-accent-dot" />
          <h2 className="section-title">Video Tours Interactivos</h2>
        </div>
        <span className="section-hint">Haz clic en reproducir para ver los detalles en movimiento</span>
      </div>

      <div className="videos-grid">
        {videos.map((vid, idx) => (
          <div key={idx} className="video-card">
            <div className="video-player-wrap">
              <video
                src={vid.src}
                controls
                preload="metadata"
                playsInline
                className="camper-video-el"
              />
              <div className="video-tag-badge">
                <span>{vid.tag}</span>
              </div>
            </div>

            <div className="video-info">
              <h4 className="video-title">{vid.title}</h4>
              <p className="video-desc">{vid.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .video-showcase-section {
          width: 100%;
          margin-bottom: 56px;
        }
        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        .title-left {
          display: flex;
          align-items: center;
          gap: 10px;
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
        .section-hint {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.4);
        }
        .videos-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        .video-card {
          background: #131518;
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
        }
        .video-card:hover {
          transform: translateY(-2px);
          border-color: rgba(230, 202, 101, 0.3);
          box-shadow: 0 15px 35px -10px rgba(0, 0, 0, 0.6);
        }
        .video-player-wrap {
          position: relative;
          height: 240px;
          background: #000000;
          overflow: hidden;
        }
        .camper-video-el {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .video-tag-badge {
          position: absolute;
          top: 14px;
          left: 14px;
          background: rgba(11, 12, 14, 0.82);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          padding: 4px 10px;
          border-radius: 9999px;
          font-family: monospace;
          font-size: 10px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.9);
          letter-spacing: 0.12em;
          text-transform: uppercase;
          pointer-events: none;
        }
        .video-info {
          padding: 20px;
          flex: 1;
        }
        .video-title {
          font-size: 15px;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 6px 0;
        }
        .video-desc {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.55);
          line-height: 1.5;
          margin: 0;
        }

        /* Responsive Breakpoints */
        @media (max-width: 860px) {
          .videos-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          .video-player-wrap {
            height: 220px;
          }
        }

        @media (max-width: 640px) {
          .video-showcase-section {
            margin-bottom: 36px;
          }
          .section-hint {
            display: none;
          }
          .video-card {
            border-radius: 18px;
          }
          .video-player-wrap {
            height: 200px;
          }
        }
      `}</style>
    </section>
  )
}
