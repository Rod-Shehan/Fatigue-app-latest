import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PROTECTED_PAGE_PREFIXES = ["/sheets", "/drivers", "/manager", "/admin"];

function addSecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return res;
}

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Allow NextAuth and static assets
  if (path.startsWith("/api/auth")) {
    const res = NextResponse.next();
    return addSecurityHeaders(res);
  }

  // Protect API routes (except auth)
  if (path.startsWith("/api/")) {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (!token) {
      const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      return addSecurityHeaders(res);
    }
    const res = NextResponse.next();
    return addSecurityHeaders(res);
  }

  // Public pages
  if (path === "/" || path === "/login") {
    const res = NextResponse.next();
    return addSecurityHeaders(res);
  }

  // Protected page routes: redirect to login if no session
  const isProtected = PROTECTED_PAGE_PREFIXES.some(
    (p) => path === p || path.startsWith(`${p}/`)
  );
  if (isProtected) {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (!token) {
      const login = new URL("/login", req.url);
      login.searchParams.set("callbackUrl", path);
      const res = NextResponse.redirect(login);
      return addSecurityHeaders(res);
    }
  }

  const res = NextResponse.next();
  return addSecurityHeaders(res);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:ico|png|jpg|jpeg|gif|webp|svg)$).*)",
  ],
};

