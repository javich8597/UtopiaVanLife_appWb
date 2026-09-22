'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { XCircle, ArrowLeft, RefreshCw, MessageCircle } from 'lucide-react'

function ErrorContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const orderId = searchParams.get('order') || searchParams.get('orderId') || ''

    const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '34611560916'
    const whatsappText = encodeURIComponent(
        `Hola Utopia Van Life, he tenido un problema al realizar el pago de mi reserva${orderId ? ` (#${orderId})` : ''} en Redsys. ¿Podríais ayudarme?`
    )
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappText}`

    return (
        <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center', paddingBlock: 'var(--space-12)' }}>
            <div style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: '#FEE2E2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
            }}>
                <XCircle size={48} style={{ color: '#DC2626' }} />
            </div>

            <h1 className="text-h2" style={{ marginBottom: 12 }}>
                El pago no se ha completado
            </h1>

            {orderId && (
                <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginBottom: 8 }}>
                    Referencia de Operación: <strong>#{orderId}</strong>
                </p>
            )}

            <p className="text-body" style={{ color: 'var(--gray-600)', maxWidth: 480, margin: '0 auto 28px', lineHeight: 1.6 }}>
                La operación ha sido cancelada o denegada por la entidad bancaria en la pasarela de Redsys. No se ha realizado ningún cargo en tu cuenta.
            </p>

            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                    onClick={() => router.back()}
                    className="btn btn-forest"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
                >
                    <RefreshCw size={18} />
                    <span>Reintentar Reserva</span>
                </button>

                <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        borderColor: '#25D366',
                        color: '#15803D'
                    }}
                >
                    <MessageCircle size={18} style={{ color: '#25D366' }} />
                    <span>Ayuda por WhatsApp</span>
                </a>
            </div>

            <div style={{ marginTop: 32 }}>
                <Link href="/campers" style={{ color: 'var(--gray-500)', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'underline' }}>
                    <ArrowLeft size={16} /> Ver todas las campers disponibles
                </Link>
            </div>
        </div>
    )
}

export default function CheckoutErrorPage() {
    return (
        <>
            <Navbar />
            <main style={{ paddingTop: 100, paddingBottom: 80, minHeight: '80vh', background: 'var(--white-broken)' }}>
                <div className="container">
                    <Suspense fallback={<div className="skeleton" style={{ height: 400 }} />}>
                        <ErrorContent />
                    </Suspense>
                </div>
            </main>
            <Footer />
        </>
    )
}
