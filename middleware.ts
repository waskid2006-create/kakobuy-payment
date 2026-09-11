import { NextRequest, NextResponse } from "next/server"

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Protect the admin dashboard with the same cookie
  // created by /api/admin-login.
  if (pathname.startsWith("/admin")) {
    const adminCookie = request.cookies.get("kakobuy_admin")

    if (adminCookie?.value !== "authenticated") {
      return NextResponse.redirect(
        new URL("/", request.url)
      )
    }
  }

  // Protect payment settings updates.
  if (
    pathname === "/api/payment-methods" &&
    request.method === "PUT"
  ) {
    const adminCookie = request.cookies.get("kakobuy_admin")

    if (adminCookie?.value !== "authenticated") {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      )
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/payment-methods",
  ],
}
