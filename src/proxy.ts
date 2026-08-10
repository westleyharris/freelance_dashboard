import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasPublicEnv } from "@/lib/env";

/**
 * Routes reachable without signing in.
 *
 * /signup is public by necessity — you can't authenticate before an account
 * exists — but it refuses to create a second one. See app/signup/actions.ts.
 */
const PUBLIC_PREFIXES = ["/login", "/signup", "/intake", "/api/cron", "/setup"];

export async function proxy(request: NextRequest) {
  // Middleware runs before every route, so anything thrown here becomes a bare
  // "Internal Server Error" with no page at all. Bail out to a diagnosable
  // screen rather than taking the whole site down over a missing variable.
  if (!hasPublicEnv()) {
    if (request.nextUrl.pathname === "/setup") return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = "/setup";
    url.search = "";
    return NextResponse.redirect(url);
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Must be getUser(), not getSession() — getUser revalidates the JWT with
  // Supabase rather than trusting a cookie that could be forged. This also
  // refreshes the session cookie on every request, which is what keeps a long
  // calling session from silently logging out.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except static assets and image optimization.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
