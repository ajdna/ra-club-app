import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database.types";

// Paths reachable without being signed in.
// /monitoring is the Sentry tunnel route (next.config.ts → tunnelRoute).
// It must be public so the Sentry SDK can POST error reports from the browser
// without auth — otherwise the proxy redirects every Sentry event to /login.
const PUBLIC_PATHS = [
  "/login",
  "/auth",
  "/monitoring",
  "/manifest.json", // PWA manifest must be public — mobile browsers fetch it without cookies
  "/api",           // all API routes do their own auth — don't redirect to login
                    // NOTE: must be "/api" not "/api/" — isPublic appends "/" before startsWith
];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

/**
 * Refreshes the Supabase auth session on every request, keeps the auth cookies
 * in sync, and redirects unauthenticated users to /login for protected paths.
 * Called from the root `proxy.ts` (Next.js 16 renamed Middleware -> Proxy).
 *
 * This is an *optimistic* check (per the Next.js Proxy docs). Authoritative
 * authorization still happens in Server Components / Actions and via RLS.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // If env vars aren't set yet, don't crash the app — just pass through.
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return supabaseResponse;
  }

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: refreshes the session token. Do not run code between creating
  // the client and this call.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect unauthenticated users to the login page (protected paths only).
  const { pathname } = request.nextUrl;
  if (!user && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // If signed in and visiting /login, send them home.
  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
