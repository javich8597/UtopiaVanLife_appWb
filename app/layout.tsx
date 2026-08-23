import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Utopia Van Life | Alquiler de Campers en Mallorca',
  description: 'Descubre Mallorca como nunca antes. Alquila una camper premium y vive una experiencia única de calma y aventura lujosa.',
  keywords: 'alquiler camper mallorca, van life mallorca, autocaravana mallorca, road trip mallorca',
  authors: [{ name: 'Utopia Van Life' }],
  openGraph: {
    title: 'Utopia Van Life | Alquiler de Campers en Mallorca',
    description: 'Descubre Mallorca como nunca antes. Alquila una camper premium.',
    type: 'website',
    locale: 'es_ES',
  },
  manifest: '/manifest.json',
  themeColor: '#1A1A1A',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}
