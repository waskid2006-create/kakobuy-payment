import { NextRequest, NextResponse } from "next/server"

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const method = request.method

  // --------------------------------------------------
  // ADMIN PAGES
  // --------------------------------------------------
  // DO NOT redirect /admin to /admin/login here.
  // The admin page itself checks the login cookie.
  if (
    pathname === "/admin" ||
    pathname.startsWith("/admin/")
  ) {
    return NextResponse.next()
  }

  // --------------------------------------------------
  // ADMIN AUTH ROUTES
  // --------------------------------------------------

  if (
    pathname === "/api/admin-login" ||
    pathname === "/api/admin-check" ||
    pathname === "/api/admin-logout"
  ) {
    return NextResponse.next()
  }

  // --------------------------------------------------
  // PAYMENT METHODS
  // --------------------------------------------------
  // GET is PUBLIC because Page 3 needs to read
  // payment methods.
  //
  // ONLY PUT is protected because only the admin
  // should be allowed to change payment methods.
  // --------------------------------------------------

  if (
    pathname === "/api/payment-methods" &&
    method === "PUT"
  ) {
    const adminCookie =
      request.cookies.get("kakobuy_admin")

    if (
      !adminCookie ||
      adminCookie.value !== "authenticated"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      )
    }
  }

  // Everything else continues normally.
  return NextResponse.next()
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin-login",
    "/api/admin-check",
    "/api/admin-logout",
    "/api/payment-methods",
  ],
}
