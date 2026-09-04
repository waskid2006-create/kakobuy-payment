import { NextRequest, NextResponse } from "next/server"

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Protect the admin page and the payment-method API.
  const protectAdmin =
    pathname.startsWith("/admin") ||
    (pathname.startsWith("/api/payment-methods") &&
      request.method === "PUT")

  if (!protectAdmin) {
    return NextResponse.next()
  }

  const authHeader = request.headers.get("authorization")

  if (!authHeader?.startsWith("Basic ")) {
    return unauthorized()
  }

  try {
    const encoded = authHeader.split(" ")[1]
    const decoded = atob(encoded)
    const separator = decoded.indexOf(":")

    if (separator === -1) {
      return unauthorized()
    }

    const username = decoded.slice(0, separator)
    const password = decoded.slice(separator + 1)

    const validUsername = process.env.ADMIN_USERNAME
    const validPassword = process.env.ADMIN_PASSWORD

    if (
      username !== validUsername ||
      password !== validPassword
    ) {
      return unauthorized()
    }

    return NextResponse.next()
  } catch {
    return unauthorized()
  }
}

function unauthorized() {
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="KAKOBUY Admin"',
    },
  })
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/payment-methods",
  ],
}
