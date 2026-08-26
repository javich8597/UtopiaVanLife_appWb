import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { Cookie } from 'lucide-react'

export default function CookiesPage() {
    return (
        <>
            <Navbar />
            <main style={{ paddingTop: 100, paddingBottom: 80, minHeight: '80vh', background: 'var(--white-broken)' }}>
                <div className="container" style={{ maxWidth: 840 }}>
                    <div style={{ background: 'white', borderRadius: 'var(--radius-xl)', padding: 'var(--space-10)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--gray-200)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
                            <div style={{ background: 'rgba(45,58,45,0.1)', color: 'var(--forest-green)', padding: 12, borderRadius: 12 }}>
                                <Cookie size={28} />
                            </div>
                            <div>
                                <h1 className="text-h2">Política de Cookies</h1>
                                <p className="text-small" style={{ color: 'var(--gray-500)' }}>Información sobre el uso de cookies en Utopia Van Life</p>
                            </div>
                        </div>

                        <div className="legal-content" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', lineHeight: 1.8, color: 'var(--gray-700)' }}>
                            <section>
                                <h2 className="text-h4" style={{ color: 'var(--black-matte)', marginBottom: 'var(--space-2)' }}>1. ¿Qué son las Cookies?</h2>
                                <p>
                                    Una cookie es un fichero que se descarga en tu dispositivo al acceder a determinadas páginas web. Las cookies permiten almacenar y recuperar información sobre tus preferencias de navegación, idioma y sesión activa.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-h4" style={{ color: 'var(--black-matte)', marginBottom: 'var(--space-2)' }}>2. Cookies que utilizamos</h2>
                                <p>
                                    Utilizamos cookies técnicas y estrictamente necesarias para el funcionamiento de la plataforma:
                                </p>
                                <ul style={{ paddingLeft: '1.5rem', marginTop: 'var(--space-2)' }}>
                                    <li><strong>NEXT_LOCALE:</strong> Para recordar tu idioma preferido (español, inglés, etc.).</li>
                                    <li><strong>sb-*-auth-token:</strong> Para mantener segura tu sesión de usuario tras iniciar sesión.</li>
                                </ul>
                            </section>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    )
}
