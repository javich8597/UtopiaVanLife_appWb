import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Reservar camper en Mallorca | Utopia Van Life',
    description: 'Consulta la disponibilidad en tiempo real de nuestras campers en Mallorca y reserva directamente.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return children
}
