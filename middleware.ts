import { NextRequest, NextResponse } from "next/server"

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  const needsProtection =
    pathname.startsWith("/admin") ||
    (pathname === "/api/payment-methods" &&
      request.method === "PUT")

  if (!needsProtection) {
    return NextResponse.next()
  }

  const auth = request.headers.get("authorization")

  if (!auth || !auth.startsWith("Basic ")) {
    return unauthorized()
  }

  const encoded = auth.substring(6)

  try {
    const decoded = Buffer.from(encoded, "base64").toString("utf-8")
    const separator = decoded.indexOf(":")

    if (separator === -1) {
      return unauthorized()
    }

    const username = decoded.substring(0, separator)
    const password = decoded.substring(separator + 1)

    if (
      username !== process.env.ADMIN_USERNAME ||
      password !== process.env.ADMIN_PASSWORD
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
