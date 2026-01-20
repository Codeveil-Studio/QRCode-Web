import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  "/auth/login",
  "/auth/signup",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/verify-email",
  "/auth/callback",
  "/auth/confirm",
  "/auth/auth-code-error",
  "/report/",
  "/auth/signup/complete",
  "/auth/org-setup",
  "/auth/org-setup/complete",
  "/health",
];

const isPublicRoute = (pathname: string): boolean => {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files, API routes, and _next files
  if (
    pathname.startsWith("/_next/") ||
    pathname.includes(".") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/api/")
  ) {
    return NextResponse.next();
  }

  // Check if user has auth cookies
  const cookies = request.headers.get("cookie") || "";
  const hasAuthCookies =
    cookies.includes("accessToken") || cookies.includes("refreshToken");

  const isPublic = isPublicRoute(pathname);

  // If user is not authenticated and trying to access protected route
  if (!hasAuthCookies && !isPublic) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all request paths except static files and API routes
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
