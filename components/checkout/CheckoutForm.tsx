'use client'

import { useEffect, useState } from 'react'
import {
    PaymentElement,
    useStripe,
    useElements
} from '@stripe/react-stripe-js'

export default function CheckoutForm({ amount }: { amount: number }) {
    const stripe = useStripe()
    const elements = useElements()

    const [message, setMessage] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (!stripe) return

        const clientSecret = new URLSearchParams(window.location.search).get(
            'payment_intent_client_secret'
        )

        if (!clientSecret) return

        stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
            switch (paymentIntent?.status) {
                case 'succeeded':
                    setMessage('¡Pago completado con éxito!')
                    break
                case 'processing':
                    setMessage('Tu pago está siendo procesado.')
                    break
                case 'requires_payment_method':
                    setMessage('Tu pago no se pudo procesar, intenta de nuevo.')
                    break
                default:
                    setMessage('Algo salió mal.')
                    break
            }
        })
    }, [stripe])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!stripe || !elements) return

        setIsLoading(true)

        const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/checkout/success`,
            },
        })

        if (error.type === 'card_error' || error.type === 'validation_error') {
            setMessage(error.message || 'Error en validación')
        } else {
            setMessage('Un error inesperado ocurrió.')
        }

        setIsLoading(false)
    }

    return (
        <form id="payment-form" onSubmit={handleSubmit} className="checkout-form">
            <PaymentElement id="payment-element" options={{ layout: 'tabs' }} />
            <button disabled={isLoading || !stripe || !elements} id="submit" className="btn btn-forest btn-lg" style={{ width: '100%', marginTop: 'var(--space-6)' }}>
                <span id="button-text">
                    {isLoading ? <div className="spinner"></div> : `Pagar ${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount)}`}
                </span>
            </button>
            {message && <div id="payment-message" className="form-error" style={{ marginTop: 'var(--space-4)', textAlign: 'center' }}>{message}</div>}

            <style jsx>{`
        .checkout-form {
          background: white;
          padding: var(--space-6);
          border-radius: var(--radius-lg);
          border: 1px solid var(--gray-200);
          box-shadow: var(--shadow-md);
        }
        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255,255,255,0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 1s linear infinite;
          margin: 0 auto;
        }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
        </form>
    )
}
