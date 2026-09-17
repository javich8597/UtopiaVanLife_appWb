import type { Metadata } from 'next'
import '../globals.css'
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import NavigationLoader from '@/components/layout/NavigationLoader';

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

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params;
 
  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Poppins:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css"
          rel="stylesheet"
        />
      </head>
      <body>
        <NextIntlClientProvider messages={messages}>
          <NavigationLoader />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}

