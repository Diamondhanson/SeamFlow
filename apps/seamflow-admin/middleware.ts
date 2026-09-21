// ============================================================================
// First line of the gate: no session, no page.
//
// Refreshes the Supabase session cookie on every request (the documented
// @supabase/ssr pattern) and sends anyone without one to /login. Whether a
// signed-in person is actually STAFF is checked in lib/auth, which can reach
// the database; this file cannot.
// ============================================================================

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC = ['/login', '/auth/callback'];

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Misconfigured: fail closed rather than serve pages unauthenticated.
  if (!url || !anonKey) {
    return new NextResponse('Sign-in is not configured.', { status: 503 });
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) req.cookies.set(name, value);
        res = NextResponse.next({ request: req });
        for (const { name, value, options } of list) res.cookies.set(name, value, options);
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  const isPublic = PUBLIC.some((p) => req.nextUrl.pathname.startsWith(p));
  if (!data.user && !isPublic) {
    const to = req.nextUrl.clone();
    to.pathname = '/login';
    to.search = '';
    return NextResponse.redirect(to);
  }
  return res;
}

export const config = {
  // Everything except Next's own assets.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt).*)'],
};
