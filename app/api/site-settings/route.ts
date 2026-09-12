import { cookies } from "next/headers"
import { put } from "@vercel/blob"
import { sql } from "@/app/db"

async function isAdmin() {
  const cookieStore = await cookies()

  return (
    cookieStore.get("kakobuy_admin")?.value ===
    "authenticated"
  )
}

export async function GET() {
  try {
    const result = await sql`
      SELECT logo_url
      FROM site_settings
      WHERE id = 1
      LIMIT 1
    `

    return Response.json({
      success: true,
      logo_url: result[0]?.logo_url || "",
    })
  } catch (error) {
    console.error("Site settings GET error:", error)

    return Response.json(
      {
        success: false,
        error: "Unable to load site settings.",
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    // Admin authentication
    if (!(await isAdmin())) {
      return Response.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const logo = formData.get("logo")

    if (!(logo instanceof File)) {
      return Response.json(
        {
          success: false,
          error: "Please select a logo image.",
        },
        { status: 400 }
      )
    }

    // Allowed image formats
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ]

    if (!allowedTypes.includes(logo.type)) {
      return Response.json(
        {
          success: false,
          error: "Logo must be JPG, PNG, or WEBP.",
        },
        { status: 400 }
      )
    }

    // Maximum 5MB
    if (logo.size > 5 * 1024 * 1024) {
      return Response.json(
        {
          success: false,
          error: "Logo must be smaller than 5MB.",
        },
        { status: 400 }
      )
    }

    /*
      Upload the logo to the existing
      public Vercel Blob store.

      IMPORTANT:
      Do not use the old private Blob store.
      The Kakobuy-public store must be connected
      to this Vercel project.
    */

    const extension =
      logo.type === "image/png"
        ? "png"
        : logo.type === "image/webp"
          ? "webp"
          : "jpg"

    const blob = await put(
      `kakobuy/logo-${Date.now()}.${extension}`,
      logo,
      {
        access: "public",
        addRandomSuffix: true,
        ...(process.env.BLOB_STORE_ID
          ? { storeId: process.env.BLOB_STORE_ID }
          : {}),
      }
    )

    const logoUrl = blob.url

    if (!logoUrl) {
      return Response.json(
        {
          success: false,
          error: "Logo uploaded but no image URL was returned.",
        },
        { status: 500 }
      )
    }

    // Save the public Blob URL in Neon
    await sql`
      INSERT INTO site_settings (
        id,
        logo_url,
        updated_at
      )
      VALUES (
        1,
        ${logoUrl},
        NOW()
      )
      ON CONFLICT (id)
      DO UPDATE SET
        logo_url = EXCLUDED.logo_url,
        updated_at = NOW()
    `

    return Response.json({
      success: true,
      logo_url: logoUrl,
      message: "Logo saved successfully.",
    })
  } catch (error) {
    console.error("Site settings PUT error:", error)

    return Response.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to save logo.",
      },
      { status: 500 }
    )
  }
}
