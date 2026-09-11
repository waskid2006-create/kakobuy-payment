import { NextRequest, NextResponse } from "next/server"

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Never redirect the admin login page.
  if (pathname === "/admin/login") {
    return NextResponse.next()
  }

  // Allow the admin dashboard to load.
  // The dashboard itself will check authentication.
  if (pathname.startsWith("/admin")) {
    return NextResponse.next()
  }

  // Only protect ADMIN changes to payment methods.
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
