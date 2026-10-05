import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const handleI18nRouting = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  // 1. Process internationalization routing
  const response = handleI18nRouting(request);

  // 2. Synchronize Supabase Auth session tokens & cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // 3. Refresh auth session
  const { data: { user } } = await supabase.auth.getUser();

  // 4. Zonas privadas sin sesión: al login conservando la página pedida
  //    (los layouts solo conocen la raíz y mandaban siempre a /dashboard o /admin).
  const privateMatch = request.nextUrl.pathname.match(/^\/(es|en|de|fr)(\/(?:dashboard|admin)(?:\/.*)?)$/);
  if (!user && privateMatch) {
    const [, locale, privatePath] = privateMatch;
    const loginUrl = new URL(`/${locale}/auth/login`, request.url);
    loginUrl.searchParams.set('redirect', privatePath + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    '/',
    '/(es|en|de|fr)/:path*',
    // auth/callback y auth/confirm son rutas sin idioma (enlaces de email): no deben redirigirse a /es/...
    '/((?!api|auth/callback|auth/confirm|_next/static|_next/image|images|videos|icons|favicon.ico|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json|mov|mp4)$).*)'
  ]
};
