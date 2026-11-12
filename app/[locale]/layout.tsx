import type { Metadata, Viewport } from 'next'
import '../globals.css'
import '../theme-light.css'
import { cookies } from 'next/headers'
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import NavigationLoader from '@/components/layout/NavigationLoader';
import StyledJsxRegistry from '@/components/layout/StyledJsxRegistry';
import { SITE_THEME_COOKIE, SiteTheme } from '@/lib/theme/siteTheme';
import { SiteThemeProvider } from '@/lib/theme/siteThemeContext';

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
}

export const viewport: Viewport = {
  themeColor: '#1A1A1A',
}

import CookieBanner from '@/components/ui/CookieBanner';
import FloatingWhatsApp from '@/components/ui/FloatingWhatsApp';

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

  // Read theme cookie on server to prevent flash of wrong theme
  const cookieStore = await cookies();
  const rawTheme = cookieStore.get(SITE_THEME_COOKIE)?.value;
  const initialTheme: SiteTheme = rawTheme === 'light' ? 'light' : 'dark';

  return (
    <html lang={locale} data-theme={initialTheme} data-scroll-behavior="smooth">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=document.cookie.match(/(?:^|; )site_theme=([^;]*)/);var theme=t?decodeURIComponent(t[1]):localStorage.getItem('site_theme');if(theme==='light'||theme==='dark'){document.documentElement.dataset.theme=theme;}else{document.documentElement.dataset.theme='dark';}}catch(e){}})();`,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Manrope:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css"
          rel="stylesheet"
        />
      </head>
      <body>
        <StyledJsxRegistry>
          <NextIntlClientProvider messages={messages}>
            <SiteThemeProvider initialTheme={initialTheme}>
              <NavigationLoader />
              {children}
              <FloatingWhatsApp />
              <CookieBanner />
            </SiteThemeProvider>
          </NextIntlClientProvider>
        </StyledJsxRegistry>
      </body>
    </html>
  );
}

