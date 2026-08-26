import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest } from 'next/server';
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
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    '/',
    '/(es|en|de|fr)/:path*',
    '/((?!api|_next/static|_next/image|images|icons|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
  ]
};
