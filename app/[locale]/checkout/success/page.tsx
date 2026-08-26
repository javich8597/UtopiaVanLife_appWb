'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { CheckCircle2, Ticket, ArrowRight, XCircle } from 'lucide-react'

function SuccessContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const redirectStatus = searchParams.get('redirect_status')

    if (!redirectStatus) {
        return (
            <div style={{ textAlign: 'center', paddingBlock: 'var(--space-20)' }}>
                <div className="spinner" style={{ borderColor: 'var(--forest-green)', borderTopColor: 'transparent', width: 40, height: 40, margin: '0 auto' }} />
                <p className="text-body" style={{ marginTop: 'var(--space-4)' }}>Verificando tu reserva...</p>
            </div>
        )
    }

    const isSuccess = redirectStatus === 'succeeded'

    return (
        <div className="success-container">
            {isSuccess ? (
                <>
                    <div className="success-icon-wrapper">
                        <CheckCircle2 size={64} style={{ color: 'var(--success)' }} strokeWidth={1.5} />
                    </div>
                    <h1 className="text-h2" style={{ marginTop: 'var(--space-6)' }}>¡Reserva Confirmada!</h1>
                    <p className="text-body" style={{ color: 'var(--gray-600)', marginTop: 'var(--space-2)', maxWidth: 400, marginInline: 'auto' }}>
                        Tu aventura soñada está lista. Hemos enviado los detalles a tu email.
                    </p>

                    <div className="success-actions" style={{ marginTop: 'var(--space-10)', display: 'flex', gap: 'var(--space-4)', justifyContent: 'center' }}>
                        <Link href="/dashboard" className="btn btn-forest">
                            <Ticket size={18} /> Ir a Mi Aventura
                        </Link>
                        <Link href="/" className="btn btn-outline">
                            Volver al inicio <ArrowRight size={18} />
                        </Link>
                    </div>
                </>
            ) : (
                <>
                    <div className="success-icon-wrapper">
                        <XCircle size={64} style={{ color: 'var(--error)' }} strokeWidth={1.5} />
                    </div>
                    <h1 className="text-h2" style={{ marginTop: 'var(--space-6)' }}>Pago no completado</h1>
                    <p className="text-body" style={{ color: 'var(--gray-600)', marginTop: 'var(--space-2)', maxWidth: 400, marginInline: 'auto' }}>
                        Hubo un problema procesando tu pago. La reserva no se ha completado.
                    </p>
                    <button className="btn btn-forest" style={{ marginTop: 'var(--space-8)' }} onClick={() => router.push('/')}>
                        Volver a intentar
                    </button>
                </>
            )}

            <style jsx>{`
        .success-container {
          text-align: center;
          padding-block: var(--space-20);
          max-width: 600px;
          margin: 0 auto;
        }
        .success-icon-wrapper {
          width: 96px; height: 96px;
          border-radius: 50%;
          background: ${isSuccess ? 'var(--mint)' : '#fee2e2'};
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto;
        }
      `}</style>
        </div>
    )
}

export default function CheckoutSuccessPage() {
    return (
        <>
            <Navbar />
            <main style={{ paddingTop: 90, paddingBottom: 80, minHeight: '80vh', background: 'var(--white-broken)' }}>
                <div className="container">
                    <div style={{ background: 'white', borderRadius: 'var(--radius-xl)', padding: 'var(--space-10)', boxShadow: 'var(--shadow-sm)' }}>
                        <Suspense fallback={<div className="skeleton" style={{ height: 400 }} />}>
                            <SuccessContent />
                        </Suspense>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    )
}
