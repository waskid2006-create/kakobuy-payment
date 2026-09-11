import { cookies } from "next/headers"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const password = String(body?.password || "")

    const adminPassword =
      process.env.ADMIN_PASSWORD

    if (!adminPassword) {
      return Response.json(
        {
          success: false,
          error: "ADMIN_PASSWORD is not configured.",
        },
        { status: 500 }
      )
    }

    if (!password || password !== adminPassword) {
      return Response.json(
        {
          success: false,
          error: "Incorrect password.",
        },
        { status: 401 }
      )
    }

    const cookieStore = await cookies()

    cookieStore.set(
      "kakobuy_admin",
      "authenticated",
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24,
      }
    )

    return Response.json({
      success: true,
    })
  } catch (error) {
    console.error(
      "Admin login error:",
      error
    )

    return Response.json(
      {
        success: false,
        error: "Unable to process login.",
      },
      { status: 500 }
    )
  }
}
