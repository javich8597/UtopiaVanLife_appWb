'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { loadStripe } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import CheckoutForm from '@/components/checkout/CheckoutForm'
import { formatPrice } from '@/lib/pricing/engine'
import { ChevronLeft } from 'lucide-react'

// Make sure to call loadStripe outside of a component's render to avoid recreating the Stripe object on every render.
// This is your public API key.
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

function CheckoutContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const camperSlug = searchParams.get('camper')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const pax = searchParams.get('pax') || '2'
    const extraIds = searchParams.get('extras') ? searchParams.get('extras')?.split(',') : []

    const [clientSecret, setClientSecret] = useState('')
    const [breakdown, setBreakdown] = useState<any>(null)
    const [error, setError] = useState('')

    useEffect(() => {
        if (!camperSlug || !from || !to) {
            setError('Faltan parámetros de reserva.')
            return
        }

        // Create PaymentIntent as soon as the page loads
        fetch('/api/checkout/create-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ camperSlug, from, to, pax, extraIds }),
        })
            .then((res) => {
                if (res.status === 401) {
                    router.push(`/auth/login?redirect=/checkout?${searchParams.toString()}`)
                    throw new Error('Debes iniciar sesión')
                }
                return res.json().then(data => ({ status: res.status, data }))
            })
            .then(({ status, data }) => {
                if (status !== 200) {
                    setError(data.error || 'Error al iniciar checkout')
                } else {
                    setClientSecret(data.clientSecret)
                    setBreakdown(data.breakdown)
                }
            })
            .catch((err) => {
                if (err.message !== 'Debes iniciar sesión') {
                    setError('Error de conexión')
                }
            })
    }, [camperSlug, from, to, pax, extraIds, router, searchParams])

    if (error) {
        return (
            <div className="container" style={{ paddingBlock: 'var(--space-20)', textAlign: 'center' }}>
                <h2 className="text-h3" style={{ color: 'var(--error)' }}>No se pudo iniciar el pago</h2>
                <p className="text-body" style={{ marginTop: 'var(--space-4)', color: 'var(--gray-600)' }}>{error}</p>
                <button className="btn btn-outline" style={{ marginTop: 'var(--space-6)' }} onClick={() => router.back()}>
                    Volver atrás
                </button>
            </div>
        )
    }

    const appearance = { theme: 'stripe' as const, variables: { colorPrimary: '#2D3A2D', borderRadius: '8px' } }
    const options = { clientSecret, appearance }

    return (
        <div className="checkout-layout">
            {/* Resumen de reserva */}
            <div className="checkout-summary">
                <button onClick={() => router.back()} className="checkout-back text-small">
                    <ChevronLeft size={16} /> Volver
                </button>

                <h2 className="text-h3" style={{ marginTop: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>Resumen de Reserva</h2>

                {!breakdown ? (
                    <div className="skeleton" style={{ height: 300, borderRadius: 'var(--radius-lg)' }} />
                ) : (
                    <div className="summary-card">
                        <div className="summary-card__header">
                            <div>
                                <span className="badge badge-sand">Utopia Van Life</span>
                                <h3 className="text-h4" style={{ marginTop: 'var(--space-2)' }}>Camper {camperSlug?.toUpperCase()}</h3>
                                <p className="text-small" style={{ color: 'var(--gray-600)', marginTop: 'var(--space-1)' }}>
                                    {new Date(from!).toLocaleDateString('es-ES')} → {new Date(to!).toLocaleDateString('es-ES')}
                                </p>
                                <p className="text-small" style={{ color: 'var(--gray-600)' }}>{pax} viajeros</p>
                            </div>
                        </div>

                        <div className="summary-card__body">
                            <div className="summary-row">
                                <span>{breakdown.numNights} noches</span>
                                <span>{formatPrice(breakdown.baseTotal)}</span>
                            </div>

                            {breakdown.discountAmount > 0 && (
                                <div className="summary-row" style={{ color: 'var(--success)' }}>
                                    <span>Descuento estancia larga ({breakdown.discountPct}%)</span>
                                    <span>-{formatPrice(breakdown.discountAmount)}</span>
                                </div>
                            )}

                            {breakdown.extrasTotal > 0 && (
                                <div className="summary-row">
                                    <span>Extras adicionales</span>
                                    <span>{formatPrice(breakdown.extrasTotal)}</span>
                                </div>
                            )}

                            <div className="summary-divider" />

                            <div className="summary-row" style={{ fontWeight: 500, color: 'var(--black-matte)' }}>
                                <span>Subtotal (Alquiler)</span>
                                <span>{formatPrice(breakdown.totalWithoutDeposit)}</span>
                            </div>
                            <div className="summary-row">
                                <span>Fianza reembolsable</span>
                                <span>{formatPrice(breakdown.deposit)}</span>
                            </div>

                            <div className="summary-row summary-total">
                                <span>Total a pagar</span>
                                <span>{formatPrice(breakdown.grandTotal)}</span>
                            </div>
                        </div>

                        <p className="text-xs" style={{ color: 'var(--gray-400)', marginTop: 'var(--space-4)', textAlign: 'center' }}>
                            Los pagos son procesados de forma segura mediante Stripe.
                        </p>
                    </div>
                )}
            </div>

            {/* Stripe Elements */}
            <div className="checkout-payment">
                {!clientSecret ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <span className="skeleton" style={{ width: 400, height: 400, borderRadius: 'var(--radius-lg)' }} />
                    </div>
                ) : (
                    <div>
                        <h2 className="text-h3" style={{ marginBottom: 'var(--space-6)' }}>Datos de Pago</h2>
                        <Elements options={options} stripe={stripePromise}>
                            <CheckoutForm amount={breakdown?.grandTotal || 0} />
                        </Elements>
                    </div>
                )}
            </div>

            
        </div>
    )
}

export default function CheckoutPage() {
    return (
        <>
            <Navbar />
            <main style={{ paddingTop: 90, paddingBottom: 80, minHeight: '100vh', background: 'var(--white-broken)' }}>
                <div className="container">
                    <Suspense fallback={<div className="skeleton" style={{ height: '60vh' }} />}>
                        <CheckoutContent />
                    </Suspense>
                </div>
            </main>
            <Footer />
        </>
    )
}
