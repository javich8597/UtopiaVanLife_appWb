'use client'

import { useState, useEffect, Suspense, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { formatPrice } from '@/lib/pricing/engine'
import { ChevronLeft, ShieldCheck, CreditCard, Smartphone, Lock, Loader2, ArrowRight } from 'lucide-react'

function CheckoutContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const camperSlug = searchParams.get('camper')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const pax = searchParams.get('pax') || '2'
    const extraIds = searchParams.get('extras') ? searchParams.get('extras')?.split(',') : []

    const [breakdown, setBreakdown] = useState<any>(null)
    const [camper, setCamper] = useState<any>(null)
    const [error, setError] = useState('')
    const [isLoadingPreview, setIsLoadingPreview] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const formContainerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!camperSlug || !from || !to) {
            setError('Faltan parámetros requeridos para la reserva.')
            setIsLoadingPreview(false)
            return
        }

        // Fetch pricing breakdown for checkout preview
        fetch('/api/checkout/redsys/preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ camperSlug, from, to, pax, extraIds }),
        })
            .then(async (res) => {
                const data = await res.json()
                if (!res.ok) {
                    throw new Error(data.error || 'Error al obtener desglose de precios')
                }
                setBreakdown(data.breakdown)
                setCamper(data.camper)
            })
            .catch((err) => {
                setError(err.message || 'Error de conexión al cargar la reserva')
            })
            .finally(() => {
                setIsLoadingPreview(false)
            })
    }, [camperSlug, from, to, pax, extraIds])

    const handleInitiateRedsysPayment = async () => {
        if (isSubmitting) return
        setIsSubmitting(true)
        setError('')

        try {
            const res = await fetch('/api/checkout/redsys/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ camperSlug, from, to, pax, extraIds }),
            })

            if (res.status === 401) {
                router.push(`/auth/login?redirect=/checkout?${searchParams.toString()}`)
                return
            }

            const data = await res.json()
            if (!res.ok || !data.formData) {
                throw new Error(data.error || 'No se pudo iniciar la conexión con el TPV de Redsys')
            }

            // Crear y auto-enviar el formulario oficial de Redsys
            const { url, signatureVersion, merchantParameters, signature } = data.formData

            const form = document.createElement('form')
            form.method = 'POST'
            form.action = url
            form.style.display = 'none'

            const inputVersion = document.createElement('input')
            inputVersion.type = 'hidden'
            inputVersion.name = 'Ds_SignatureVersion'
            inputVersion.value = signatureVersion
            form.appendChild(inputVersion)

            const inputParams = document.createElement('input')
            inputParams.type = 'hidden'
            inputParams.name = 'Ds_MerchantParameters'
            inputParams.value = merchantParameters
            form.appendChild(inputParams)

            const inputSignature = document.createElement('input')
            inputSignature.type = 'hidden'
            inputSignature.name = 'Ds_Signature'
            inputSignature.value = signature
            form.appendChild(inputSignature)

            document.body.appendChild(form)
            form.submit()

        } catch (err: any) {
            setError(err.message || 'Error al conectar con la pasarela bancaria')
            setIsSubmitting(false)
        }
    }

    if (error) {
        return (
            <div className="container" style={{ paddingBlock: 'var(--space-20)', textAlign: 'center' }}>
                <h2 className="text-h3" style={{ color: 'var(--error)' }}>No se pudo iniciar el proceso de reserva</h2>
                <p className="text-body" style={{ marginTop: 'var(--space-4)', color: 'var(--gray-600)' }}>{error}</p>
                <button className="btn btn-outline" style={{ marginTop: 'var(--space-6)' }} onClick={() => router.back()}>
                    Volver atrás
                </button>
            </div>
        )
    }

    const amountToPay = breakdown?.totalWithoutDeposit || 0

    return (
        <div className="checkout-layout">
            {/* Resumen de reserva */}
            <div className="checkout-summary">
                <button onClick={() => router.back()} className="checkout-back text-small">
                    <ChevronLeft size={16} /> Volver
                </button>

                <h2 className="text-h3" style={{ marginTop: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>Resumen de Reserva</h2>

                {isLoadingPreview || !breakdown ? (
                    <div className="skeleton" style={{ height: 350, borderRadius: 'var(--radius-lg)' }} />
                ) : (
                    <div className="summary-card">
                        <div className="summary-card__header">
                            <div>
                                <span className="badge badge-sand">Utopia Van Life</span>
                                <h3 className="text-h4" style={{ marginTop: 'var(--space-2)' }}>
                                    Camper {camper?.name || camperSlug?.toUpperCase()}
                                </h3>
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

                            <div className="summary-row" style={{ fontWeight: 600, color: 'var(--black-matte)' }}>
                                <span>Total Alquiler (Abonar ahora)</span>
                                <span>{formatPrice(breakdown.totalWithoutDeposit)}</span>
                            </div>

                            <div className="summary-row" style={{ color: 'var(--gray-500)', fontSize: '0.88rem' }}>
                                <span>Fianza reembolsable (El día de entrega)</span>
                                <span>{formatPrice(breakdown.deposit)}</span>
                            </div>

                            <div className="summary-row summary-total" style={{ marginTop: 'var(--space-4)' }}>
                                <span>Importe a pagar ahora</span>
                                <span>{formatPrice(amountToPay)}</span>
                            </div>
                        </div>

                        <div style={{ marginTop: 'var(--space-4)', padding: '12px 14px', background: '#F8FAF8', borderRadius: 8, border: '1px solid #E5EBE5', fontSize: '0.82rem', color: 'var(--gray-600)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: 'var(--forest-green)', marginBottom: 4 }}>
                                <ShieldCheck size={16} /> Pasarela Segura Redsys
                            </div>
                            Abonas el 100% del viaje con Tarjeta bancaria o Bizum a través del TPV Virtual oficial de CaixaBank. La fianza se gestiona el día de la recogida.
                        </div>
                    </div>
                )}
            </div>

            {/* Pasarela y botón de pago */}
            <div className="checkout-payment">
                <div style={{
                    background: 'white',
                    padding: 'clamp(20px, 4vw, 32px)',
                    borderRadius: 'var(--radius-xl)',
                    border: '1px solid var(--gray-200)',
                    boxShadow: 'var(--shadow-md)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                        <Lock size={20} style={{ color: 'var(--forest-green)' }} />
                        <h2 className="text-h3" style={{ margin: 0, fontSize: '1.35rem' }}>Método de Pago Oficial</h2>
                    </div>

                    <p style={{ color: 'var(--gray-600)', fontSize: '0.92rem', lineHeight: 1.5, marginBottom: 24 }}>
                        Al continuar serás redirigido a la pasarela bancaria oficial y cifrada de <strong>Redsys / CaixaBank</strong> (Comercia Global Payments), donde podrás elegir abonar tu reserva de forma 100% segura mediante:
                    </p>

                    {/* Métodos disponibles */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14, marginBottom: 28 }}>
                        <div style={{
                            border: '1.5px solid var(--gray-200)',
                            borderRadius: 12,
                            padding: '16px 14px',
                            textAlign: 'center',
                            background: '#FAFAFA',
                        }}>
                            <CreditCard size={28} style={{ color: 'var(--forest-green)', margin: '0 auto 8px' }} />
                            <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--gray-900)' }}>Tarjeta Bancaria</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)', marginTop: 2 }}>Visa, Mastercard, Maestro</div>
                        </div>

                        <div style={{
                            border: '1.5px solid var(--gray-200)',
                            borderRadius: 12,
                            padding: '16px 14px',
                            textAlign: 'center',
                            background: '#FAFAFA',
                        }}>
                            <Smartphone size={28} style={{ color: '#00A896', margin: '0 auto 8px' }} />
                            <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--gray-900)' }}>Bizum</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)', marginTop: 2 }}>Pago instantáneo por móvil</div>
                        </div>
                    </div>

                    {/* Botón de acción */}
                    <button
                        onClick={handleInitiateRedsysPayment}
                        disabled={isLoadingPreview || isSubmitting || !breakdown}
                        className="btn btn-forest btn-lg"
                        style={{
                            width: '100%',
                            padding: '16px 24px',
                            fontSize: '1.05rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 10,
                        }}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="animate-spin" size={20} />
                                <span>Conectando con Redsys CaixaBank...</span>
                            </>
                        ) : (
                            <>
                                <span>Confirmar y Pagar {formatPrice(amountToPay)}</span>
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>

                    <div style={{ marginTop: 20, textAlign: 'center' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            <ShieldCheck size={14} style={{ color: '#16a34a' }} />
                            Cifrado SSL de 256 bits • Sistema seguro Redsys TPV Virtual
                        </div>
                    </div>
                </div>

                <div ref={formContainerRef} style={{ display: 'none' }} />
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
