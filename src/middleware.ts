import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Passthrough middleware that surfaces the current path+query as an
 * `x-pathname` request header. The (app) layout reads it to build a
 * `?next=` param when redirecting an unauthenticated/expired user to /login,
 * so a tapped push notification lands on the right screen after re-login.
 */
export function middleware(req: NextRequest) {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  // Run on app pages only — skip static assets, image optimizer, and API routes.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
