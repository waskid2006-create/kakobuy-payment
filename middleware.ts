import { NextRequest, NextResponse } from "next/server"

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Allow the admin page to load.
  // The admin page itself checks the login cookie.
  if (pathname.startsWith("/admin")) {
    return NextResponse.next()
  }

  // Protect payment-method changes.
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
