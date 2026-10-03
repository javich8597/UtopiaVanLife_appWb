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
            const res = await fetch('/api/checkout/redsys/initiate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ camperSlug, from, to, pax, extraIds }),
            })

            const data = await res.json()
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'No se pudo generar la orden de pago')
            }

            const { formAction, merchantParameters, signature, signatureVersion } = data

            // Create and submit hidden Redsys form
            const form = document.createElement('form')
            form.method = 'POST'
            form.action = formAction

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
            <div className="checkout-error-wrap">
                <h2 className="checkout-error-title">No se pudo iniciar el proceso de reserva</h2>
                <p className="checkout-error-desc">{error}</p>
                <button className="checkout-btn-back" onClick={() => router.back()}>
                    Volver atrás
                </button>

                <style jsx>{`
                    .checkout-error-wrap {
                        padding: 80px 20px;
                        text-align: center;
                        max-width: 600px;
                        margin: 0 auto;
                    }
                    .checkout-error-title {
                        color: #EF4444;
                        font-size: 1.5rem;
                        font-weight: 700;
                        margin-bottom: 12px;
                    }
                    .checkout-error-desc {
                        color: #94A3B8;
                        margin-bottom: 24px;
                    }
                    .checkout-btn-back {
                        background: rgba(255, 255, 255, 0.08);
                        color: #FFFFFF;
                        border: 1px solid rgba(255, 255, 255, 0.15);
                        padding: 10px 22px;
                        border-radius: 999px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s ease;
                    }
                    .checkout-btn-back:hover {
                        border-color: #CCA053;
                        color: #CCA053;
                    }
                `}</style>
            </div>
        )
    }

    const amountToPay = breakdown?.totalWithoutDeposit || 0

    return (
        <div className="checkout-layout">
            {/* Resumen de reserva */}
            <div className="checkout-summary">
                <button onClick={() => router.back()} className="checkout-back-link">
                    <ChevronLeft size={16} /> Volver
                </button>

                <h2 className="checkout-heading">Resumen de Reserva</h2>

                {isLoadingPreview || !breakdown ? (
                    <div className="checkout-skeleton" />
                ) : (
                    <div className="summary-card">
                        <div className="summary-card__header">
                            <div>
                                <span className="summary-badge">Utopia Van Life</span>
                                <h3 className="summary-camper-title">
                                    Camper {camper?.name || camperSlug?.toUpperCase()}
                                </h3>
                                <p className="summary-dates">
                                    {new Date(from!).toLocaleDateString('es-ES')} → {new Date(to!).toLocaleDateString('es-ES')}
                                </p>
                                <p className="summary-pax">{pax} viajeros</p>
                            </div>
                        </div>

                        <div className="summary-card__body">
                            <div className="summary-row">
                                <span>{breakdown.numNights} noches</span>
                                <span>{formatPrice(breakdown.baseTotal)}</span>
                            </div>

                            {breakdown.discountAmount > 0 && (
                                <div className="summary-row summary-row--discount">
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

                            <div className="summary-row summary-row--bold">
                                <span>Total Alquiler (Abonar ahora)</span>
                                <span>{formatPrice(breakdown.totalWithoutDeposit)}</span>
                            </div>

                            <div className="summary-row summary-row--muted">
                                <span>Fianza reembolsable (El día de entrega)</span>
                                <span>{formatPrice(breakdown.deposit)}</span>
                            </div>

                            <div className="summary-row summary-total">
                                <span>Importe a pagar ahora</span>
                                <span className="summary-total__amount">{formatPrice(amountToPay)}</span>
                            </div>
                        </div>

                        <div className="summary-safety-notice">
                            <div className="summary-safety-title">
                                <ShieldCheck size={16} />
                                <span>Pasarela Oficial Segura Redsys</span>
                            </div>
                            <span>Abonas el 100% del viaje con Tarjeta o Bizum mediante CaixaBank TPV Virtual seguro. La fianza se gestiona el día de la recogida.</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Pasarela y botón de pago */}
            <div className="checkout-payment">
                <div className="payment-card">
                    <div className="payment-card__header">
                        <div className="payment-icon-disc">
                            <Lock size={18} />
                        </div>
                        <h2 className="payment-title">Método de Pago Oficial</h2>
                    </div>

                    <p className="payment-desc">
                        Al continuar serás redirigido a la pasarela bancaria oficial y cifrada de <strong>Redsys / CaixaBank</strong> (Comercia Global Payments), donde podrás elegir abonar de forma 100% segura mediante:
                    </p>

                    {/* Métodos disponibles */}
                    <div className="payment-methods-grid">
                        <div className="payment-method-box">
                            <CreditCard size={28} className="payment-method-icon" />
                            <div className="payment-method-name">Tarjeta Bancaria</div>
                            <div className="payment-method-sub">Visa, Mastercard, Maestro</div>
                        </div>

                        <div className="payment-method-box">
                            <Smartphone size={28} className="payment-method-icon" />
                            <div className="payment-method-name">Bizum</div>
                            <div className="payment-method-sub">Pago instantáneo por móvil</div>
                        </div>
                    </div>

                    {/* Botón de acción */}
                    <button
                        onClick={handleInitiateRedsysPayment}
                        disabled={isLoadingPreview || isSubmitting || !breakdown}
                        className="payment-submit-btn"
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

                    <div className="payment-ssl-badge">
                        <ShieldCheck size={14} className="payment-ssl-icon" />
                        <span>Cifrado SSL 256 bits • Sistema seguro Redsys TPV Virtual</span>
                    </div>
                </div>

                <div ref={formContainerRef} style={{ display: 'none' }} />
            </div>

            <style jsx>{`
                .checkout-layout {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 40px;
                    align-items: start;
                    max-width: 1040px;
                    margin: 0 auto;
                }

                .checkout-back-link {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    color: #94A3B8;
                    font-size: 0.86rem;
                    font-weight: 600;
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 0;
                    transition: color 0.2s ease;
                }

                .checkout-back-link:hover {
                    color: #CCA053;
                }

                .checkout-heading {
                    font-size: 1.6rem;
                    font-weight: 800;
                    color: #FFFFFF;
                    margin: 18px 0 20px;
                    letter-spacing: -0.02em;
                }

                .checkout-skeleton {
                    height: 360px;
                    border-radius: 20px;
                    background: #131518;
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    animation: pulse 1.5s infinite;
                }

                @keyframes pulse {
                    0%, 100% { opacity: 0.6; }
                    50% { opacity: 0.3; }
                }

                .summary-card {
                    background: #131518;
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 20px;
                    padding: 28px;
                    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4);
                }

                .summary-badge {
                    display: inline-block;
                    font-size: 0.75rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.06em;
                    color: #CCA053;
                    background: rgba(204, 160, 83, 0.12);
                    border: 1px solid rgba(204, 160, 83, 0.25);
                    padding: 3px 10px;
                    border-radius: 999px;
                    margin-bottom: 8px;
                }

                .summary-camper-title {
                    font-size: 1.35rem;
                    font-weight: 800;
                    color: #FFFFFF;
                    margin: 0 0 6px;
                }

                .summary-dates {
                    font-size: 0.9rem;
                    color: #94A3B8;
                    margin: 0 0 4px;
                }

                .summary-pax {
                    font-size: 0.85rem;
                    color: #64748B;
                    margin: 0 0 20px;
                }

                .summary-card__body {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    border-top: 1px solid rgba(255, 255, 255, 0.08);
                    padding-top: 20px;
                }

                .summary-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 0.94rem;
                    color: #94A3B8;
                }

                .summary-row--discount {
                    color: #22C55E;
                }

                .summary-row--bold {
                    font-weight: 600;
                    color: #FFFFFF;
                }

                .summary-row--muted {
                    font-size: 0.85rem;
                    color: #64748B;
                }

                .summary-divider {
                    height: 1px;
                    background: rgba(255, 255, 255, 0.08);
                    margin: 4px 0;
                }

                .summary-total {
                    margin-top: 12px;
                    padding-top: 14px;
                    border-top: 1px solid rgba(255, 255, 255, 0.12);
                    font-size: 1.05rem;
                    font-weight: 700;
                    color: #FFFFFF;
                }

                .summary-total__amount {
                    font-size: 1.35rem;
                    color: #CCA053;
                }

                .summary-safety-notice {
                    margin-top: 20px;
                    padding: 14px 16px;
                    background: #0B0C0E;
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 12px;
                    font-size: 0.82rem;
                    color: #94A3B8;
                    line-height: 1.5;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .summary-safety-title {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-weight: 700;
                    color: #CCA053;
                }

                /* PAYMENT CARD */
                .payment-card {
                    background: #131518;
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 20px;
                    padding: 32px;
                    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4);
                }

                .payment-card__header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 16px;
                }

                .payment-icon-disc {
                    width: 38px;
                    height: 38px;
                    border-radius: 10px;
                    background: rgba(204, 160, 83, 0.12);
                    border: 1px solid rgba(204, 160, 83, 0.35);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #CCA053;
                }

                .payment-title {
                    font-size: 1.3rem;
                    font-weight: 800;
                    color: #FFFFFF;
                    margin: 0;
                    letter-spacing: -0.015em;
                }

                .payment-desc {
                    color: #94A3B8;
                    font-size: 0.9rem;
                    line-height: 1.55;
                    margin-bottom: 24px;
                }

                .payment-desc strong {
                    color: #FFFFFF;
                }

                .payment-methods-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 14px;
                    margin-bottom: 28px;
                }

                .payment-method-box {
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 14px;
                    padding: 18px 14px;
                    text-align: center;
                    background: #0B0C0E;
                    transition: border-color 0.2s ease;
                }

                .payment-method-box:hover {
                    border-color: rgba(204, 160, 83, 0.4);
                }

                :global(.payment-method-icon) {
                    color: #CCA053;
                    margin: 0 auto 8px;
                }

                .payment-method-name {
                    font-weight: 700;
                    font-size: 0.92rem;
                    color: #FFFFFF;
                }

                .payment-method-sub {
                    font-size: 0.78rem;
                    color: #64748B;
                    margin-top: 3px;
                }

                .payment-submit-btn {
                    width: 100%;
                    padding: 16px 24px;
                    font-size: 1.02rem;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    background: linear-gradient(135deg, #CCA053 0%, #B2883B 100%);
                    color: #0B0C0E;
                    border: none;
                    border-radius: 12px;
                    cursor: pointer;
                    box-shadow: 0 6px 20px rgba(204, 160, 83, 0.35);
                    transition: all 0.2s ease;
                }

                .payment-submit-btn:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 24px rgba(204, 160, 83, 0.45);
                    filter: brightness(1.05);
                }

                .payment-submit-btn:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                }

                .payment-ssl-badge {
                    margin-top: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    font-size: 0.8rem;
                    color: #64748B;
                }

                :global(.payment-ssl-icon) {
                    color: #22C55E;
                }

                @media (max-width: 860px) {
                    .checkout-layout {
                        grid-template-columns: 1fr;
                        gap: 28px;
                    }
                }

                @media (max-width: 640px) {
                    .summary-card,
                    .payment-card {
                        padding: 22px 18px;
                        border-radius: 18px;
                    }

                    .payment-methods-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </div>
    )
}

export default function CheckoutPage() {
    return (
        <>
            <Navbar />
            <main style={{ paddingTop: 110, paddingBottom: 80, minHeight: '100vh', background: '#0B0C0E' }}>
                <div className="container">
                    <Suspense fallback={<div className="skeleton" style={{ height: '60vh', background: '#131518', borderRadius: 20 }} />}>
                        <CheckoutContent />
                    </Suspense>
                </div>
            </main>
            <Footer />
        </>
    )
}
