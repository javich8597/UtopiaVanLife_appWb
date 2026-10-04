import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Nuestras campers | Utopia Van Life',
    description: 'SPACE y NEO: campers de alta gama con autonomía solar, ducha interior y seguro a todo riesgo para recorrer Mallorca.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return children
}
