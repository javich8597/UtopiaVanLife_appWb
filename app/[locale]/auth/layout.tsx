import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Mi Aventura | Utopia Van Life',
    description: 'Accede a tu área privada de Utopia Van Life.',
    robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return children
}
