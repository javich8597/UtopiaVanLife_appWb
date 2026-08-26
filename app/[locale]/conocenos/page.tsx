import { getTranslations } from 'next-intl/server'
import Image from 'next/image'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

export default async function AboutPage() {
    const t = await getTranslations('AboutPage')

    return (
        <>
            <Navbar />
            <main className="about-page">
                {/* Hero Section */}
                <section className="about-hero">
                    <div className="about-hero__video-wrap">
                        <video
                            className="about-hero__video"
                            autoPlay
                            muted
                            loop
                            playsInline
                            suppressHydrationWarning
                        >
                            <source src="/videos/video_noche_min.mp4" type="video/mp4" />
                        </video>
                        <div className="about-hero__overlay" />
                    </div>
                    <div className="container about-hero__content">
                        <h1 className="text-display" style={{ color: 'white', whiteSpace: 'pre-line' }}>
                            {t('heroTitle')}
                        </h1>
                        <p className="text-body-large" style={{ color: 'rgba(255,255,255,0.85)', marginTop: 'var(--space-6)', maxWidth: 600 }}>
                            {t('heroSubtitle')}
                        </p>
                    </div>
                </section>

                {/* Who We Are */}
                <section className="section bg-white">
                    <div className="container">
                        <div className="about-grid">
                            <div className="about-text-col">
                                <span className="text-label" style={{ color: 'var(--sand-dark)' }}>{t('whoTitle')}</span>
                                <h2 className="text-h2" style={{ marginTop: 'var(--space-2)', marginBottom: 'var(--space-6)' }}>
                                    Utopia Van Life
                                </h2>
                                <p className="text-body-large" style={{ fontWeight: 500, color: 'var(--black-matte)', whiteSpace: 'pre-line' }}>
                                    {t('whoText1')}
                                </p>
                                <p className="text-body" style={{ color: 'var(--gray-600)', marginTop: 'var(--space-4)', whiteSpace: 'pre-line' }}>
                                    {t('whoText2')}
                                </p>
                                <p className="text-body" style={{ color: 'var(--gray-600)', marginTop: 'var(--space-4)' }}>
                                    {t('whoText3')}
                                </p>
                            </div>
                            <div className="about-image-col">
                                <div className="about-img-wrap">
                                    <Image
                                        src="/images/about/transit.jpg"
                                        alt="Utopia Van Life Transit"
                                        fill
                                        style={{ objectFit: 'cover' }}
                                        sizes="(max-width: 768px) 100vw, 50vw"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Our Method */}
                <section className="section" style={{ background: 'var(--cream)' }}>
                    <div className="container" style={{ textAlign: 'center', maxWidth: 800 }}>
                        <span className="text-label" style={{ color: 'var(--sand-dark)' }}>Utopia</span>
                        <h2 className="text-h2" style={{ marginTop: 'var(--space-2)', marginBottom: 'var(--space-6)' }}>
                            {t('methodTitle')}
                        </h2>
                        <p className="text-body-large" style={{ fontWeight: 500, color: 'var(--black-matte)' }}>
                            {t('methodText1')}
                        </p>
                        <p className="text-body" style={{ color: 'var(--gray-600)', marginTop: 'var(--space-4)' }}>
                            {t('methodText2')}
                        </p>
                    </div>
                </section>

                {/* Our Philosophy */}
                <section className="section bg-white">
                    <div className="container">
                        <div className="about-grid about-grid--reverse">
                            <div className="about-text-col">
                                <span className="text-label" style={{ color: 'var(--sand-dark)' }}>{t('philosophyTitle')}</span>
                                <h2 className="text-h2" style={{ marginTop: 'var(--space-2)', marginBottom: 'var(--space-6)' }}>
                                    {t('philosophyTitle')}
                                </h2>
                                <p className="text-body-large" style={{ fontWeight: 500, color: 'var(--black-matte)' }}>
                                    {t('philosophyText1')}
                                </p>
                                <p className="text-body" style={{ color: 'var(--gray-600)', marginTop: 'var(--space-4)', whiteSpace: 'pre-line' }}>
                                    {t('philosophyText2')}
                                </p>
                                <p className="text-body" style={{ color: 'var(--gray-600)', marginTop: 'var(--space-4)' }}>
                                    {t('philosophyText3')}
                                </p>
                                <p className="text-body" style={{ color: 'var(--gray-600)', marginTop: 'var(--space-4)' }}>
                                    {t('philosophyText4')}
                                </p>
                            </div>
                            <div className="about-image-col">
                                <div className="about-img-wrap">
                                    <Image
                                        src="/images/about/interior-about.png"
                                        alt="Utopia Van Life Interior"
                                        fill
                                        style={{ objectFit: 'cover' }}
                                        sizes="(max-width: 768px) 100vw, 50vw"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
            <Footer />

            <style>{`
                .about-hero {
                    position: relative;
                    height: 70vh;
                    min-height: 500px;
                    display: flex;
                    align-items: center;
                    overflow: hidden;
                }
                .about-hero__video-wrap {
                    position: absolute;
                    inset: 0;
                    z-index: 1;
                }
                .about-hero__video {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .about-hero__overlay {
                    position: absolute;
                    inset: 0;
                    background: rgba(26,26,26,0.45);
                }
                .about-hero__content {
                    position: relative;
                    z-index: 2;
                }
                .about-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: var(--space-12);
                    align-items: center;
                }
                .about-grid--reverse {
                    direction: rtl;
                }
                .about-grid--reverse .about-text-col {
                    direction: ltr;
                }
                .about-grid--reverse .about-image-col {
                    direction: ltr;
                }
                .about-img-wrap {
                    position: relative;
                    height: 500px;
                    border-radius: var(--radius-lg);
                    overflow: hidden;
                    box-shadow: 0 4px 24px rgba(0,0,0,0.06);
                }
                @media (max-width: 768px) {
                    .about-grid {
                        grid-template-columns: 1fr;
                        gap: var(--space-8);
                    }
                    .about-grid--reverse {
                        direction: ltr;
                    }
                    .about-img-wrap {
                        height: 350px;
                    }
                }
            `}</style>
        </>
    )
}
