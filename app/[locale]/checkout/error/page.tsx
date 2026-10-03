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
        <div className="checkout-error-card">
            <div className="checkout-error-icon-wrap">
                <XCircle size={44} className="checkout-error-icon" />
            </div>

            <h1 className="checkout-error-title">
                El pago no se ha completado
            </h1>

            {orderId && (
                <p className="checkout-error-ref">
                    Referencia de Operación: <strong>#{orderId}</strong>
                </p>
            )}

            <p className="checkout-error-msg">
                La operación ha sido cancelada o denegada por la entidad bancaria en la pasarela segura de Redsys. No se ha realizado ningún cargo en tu cuenta.
            </p>

            <div className="checkout-error-actions">
                <button
                    onClick={() => router.back()}
                    className="checkout-btn-gold"
                >
                    <RefreshCw size={17} />
                    <span>Reintentar Reserva</span>
                </button>

                <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="checkout-btn-whatsapp"
                >
                    <MessageCircle size={18} />
                    <span>Ayuda por WhatsApp</span>
                </a>
            </div>

            <div className="checkout-error-bottom">
                <Link href="/campers" className="checkout-error-link">
                    <ArrowLeft size={16} />
                    <span>Ver todas las campers disponibles</span>
                </Link>
            </div>

            <style jsx>{`
                .checkout-error-card {
                    max-width: 600px;
                    margin: 0 auto;
                    text-align: center;
                    background: #131518;
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 24px;
                    padding: 48px 36px;
                    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
                }

                .checkout-error-icon-wrap {
                    width: 76px;
                    height: 76px;
                    border-radius: 50%;
                    background: rgba(239, 68, 68, 0.12);
                    border: 1px solid rgba(239, 68, 68, 0.25);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 20px;
                }

                :global(.checkout-error-icon) {
                    color: #EF4444;
                }

                .checkout-error-title {
                    font-size: 1.8rem;
                    font-weight: 800;
                    color: #FFFFFF;
                    margin: 0 0 12px;
                    letter-spacing: -0.02em;
                }

                .checkout-error-ref {
                    font-size: 0.88rem;
                    color: #94A3B8;
                    margin: 0 0 16px;
                }

                .checkout-error-ref strong {
                    color: #FFFFFF;
                }

                .checkout-error-msg {
                    color: #94A3B8;
                    font-size: 0.96rem;
                    line-height: 1.6;
                    max-width: 480px;
                    margin: 0 auto 28px;
                }

                .checkout-error-actions {
                    display: flex;
                    gap: 14px;
                    justify-content: center;
                    flex-wrap: wrap;
                }

                .checkout-btn-gold {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    background: linear-gradient(135deg, #CCA053 0%, #B2883B 100%);
                    color: #0B0C0E;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 999px;
                    font-weight: 700;
                    font-size: 0.94rem;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .checkout-btn-gold:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(204, 160, 83, 0.35);
                }

                .checkout-btn-whatsapp {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    background: rgba(37, 211, 102, 0.12);
                    border: 1px solid rgba(37, 211, 102, 0.35);
                    color: #25D366;
                    padding: 12px 24px;
                    border-radius: 999px;
                    font-weight: 700;
                    font-size: 0.94rem;
                    text-decoration: none;
                    transition: all 0.2s ease;
                }

                .checkout-btn-whatsapp:hover {
                    background: rgba(37, 211, 102, 0.2);
                    transform: translateY(-2px);
                }

                .checkout-error-bottom {
                    margin-top: 32px;
                    border-top: 1px solid rgba(255, 255, 255, 0.08);
                    padding-top: 20px;
                }

                .checkout-error-link {
                    color: #94A3B8;
                    font-size: 0.88rem;
                    font-weight: 600;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    text-decoration: none;
                    transition: color 0.2s ease;
                }

                .checkout-error-link:hover {
                    color: #CCA053;
                }

                @media (max-width: 640px) {
                    .checkout-error-card {
                        padding: 32px 20px;
                    }
                    .checkout-btn-gold,
                    .checkout-btn-whatsapp {
                        width: 100%;
                        justify-content: center;
                    }
                }
            `}</style>
        </div>
    )
}

export default function CheckoutErrorPage() {
    return (
        <>
            <Navbar />
            <main style={{ paddingTop: 120, paddingBottom: 80, minHeight: '80vh', background: '#0B0C0E' }}>
                <div className="container">
                    <Suspense fallback={<div className="skeleton" style={{ height: 400, background: '#131518', borderRadius: 24 }} />}>
                        <ErrorContent />
                    </Suspense>
                </div>
            </main>
            <Footer />
        </>
    )
}
