import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { FileCheck } from 'lucide-react'

export default function TermsPage() {
    return (
        <>
            <Navbar />
            <main style={{ paddingTop: 100, paddingBottom: 80, minHeight: '80vh', background: 'var(--white-broken)' }}>
                <div className="container" style={{ maxWidth: 840 }}>
                    <div style={{ background: 'white', borderRadius: 'var(--radius-xl)', padding: 'var(--space-10)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--gray-200)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
                            <div style={{ background: 'rgba(45,58,45,0.1)', color: 'var(--forest-green)', padding: 12, borderRadius: 12 }}>
                                <FileCheck size={28} />
                            </div>
                            <div>
                                <h1 className="text-h2">Términos y Condiciones</h1>
                                <p className="text-small" style={{ color: 'var(--gray-500)' }}>Condiciones generales de contratación y alquiler</p>
                            </div>
                        </div>

                        <div className="legal-content" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', lineHeight: 1.8, color: 'var(--gray-700)' }}>
                            <section>
                                <h2 className="text-h4" style={{ color: 'var(--black-matte)', marginBottom: 'var(--space-2)' }}>1. Requisitos del Conductor</h2>
                                <p>
                                    El arrendatario y los conductores autorizados deben tener al menos 23 años de edad y estar en posesión de un permiso de conducir de clase B en vigor con al menos 2 años de antigüedad.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-h4" style={{ color: 'var(--black-matte)', marginBottom: 'var(--space-2)' }}>2. Fianza y Seguro</h2>
                                <p>
                                    Se retendrá una fianza reembolsable (según el modelo de camper contratado: 500€ para NEO y 600€ para SPACE) en el momento de la entrega o check-in online para responder de posibles daños no cubiertos o desperfectos. La fianza será liberada en un plazo máximo de 48-72h tras la devolución del vehículo en las mismas condiciones de entrega.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-h4" style={{ color: 'var(--black-matte)', marginBottom: 'var(--space-2)' }}>3. Recogida y Devolución</h2>
                                <p>
                                    Las campers se entregan y recogen en los puntos acordados en Mallorca con el depósito de combustible lleno y limpias, debiendo ser devueltas en idénticas condiciones.
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
