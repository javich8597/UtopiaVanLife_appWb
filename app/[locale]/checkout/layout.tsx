import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Pago de tu reserva | Utopia Van Life',
    description: 'Estado del pago de tu reserva en Utopia Van Life.',
    robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return children
}
