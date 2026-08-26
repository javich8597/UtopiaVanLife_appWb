import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { ShieldCheck } from 'lucide-react'

export default function PrivacyPage() {
    return (
        <>
            <Navbar />
            <main style={{ paddingTop: 100, paddingBottom: 80, minHeight: '80vh', background: 'var(--white-broken)' }}>
                <div className="container" style={{ maxWidth: 840 }}>
                    <div style={{ background: 'white', borderRadius: 'var(--radius-xl)', padding: 'var(--space-10)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--gray-200)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
                            <div style={{ background: 'rgba(45,58,45,0.1)', color: 'var(--forest-green)', padding: 12, borderRadius: 12 }}>
                                <ShieldCheck size={28} />
                            </div>
                            <div>
                                <h1 className="text-h2">Política de Privacidad y RGPD</h1>
                                <p className="text-small" style={{ color: 'var(--gray-500)' }}>Última actualización: Agosto 2026</p>
                            </div>
                        </div>

                        <div className="legal-content" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', lineHeight: 1.8, color: 'var(--gray-700)' }}>
                            <section>
                                <h2 className="text-h4" style={{ color: 'var(--black-matte)', marginBottom: 'var(--space-2)' }}>1. Responsable del Tratamiento</h2>
                                <p>
                                    Utopia Van Life S.L., con domicilio en Palma de Mallorca (Islas Baleares), es el responsable del tratamiento de los datos personales facilitados a través de esta plataforma web.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-h4" style={{ color: 'var(--black-matte)', marginBottom: 'var(--space-2)' }}>2. Finalidad del Tratamiento de Datos</h2>
                                <p>
                                    Recopilamos y tratamos tus datos personales con las siguientes finalidades:
                                </p>
                                <ul style={{ paddingLeft: '1.5rem', marginTop: 'var(--space-2)' }}>
                                    <li>Gestionar la reserva, contratación y entrega de vehículos camper.</li>
                                    <li>Verificación del carnet de conducir y cumplimiento de los requisitos del seguro de vehículos.</li>
                                    <li>Procesamiento de pagos y gestión de fianzas mediante pasarelas bancarias seguras.</li>
                                    <li>Envío de comunicaciones sobre tu reserva o asistencia en carretera.</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-h4" style={{ color: 'var(--black-matte)', marginBottom: 'var(--space-2)' }}>3. Tus Derechos</h2>
                                <p>
                                    De conformidad con el Reglamento General de Protección de Datos (RGPD), puedes ejercer en cualquier momento tus derechos de acceso, rectificación, supresión, limitación y oposición enviando un correo a <a href="mailto:hola@utopiavanlife.com" style={{ color: 'var(--forest-green)', fontWeight: 600 }}>hola@utopiavanlife.com</a>.
                                </p>
                            </section>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    )
}
