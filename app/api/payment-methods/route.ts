import { cookies } from "next/headers"
import { put } from "@vercel/blob"
import { sql } from "@/app/db"

// ============================================================
// ADMIN CHECK
// ============================================================

async function isAdmin() {
  const cookieStore = await cookies()

  return (
    cookieStore.get("kakobuy_admin")?.value ===
    "authenticated"
  )
}

// ============================================================
// GET — PUBLIC
// Buyers need to read payment methods.
// ============================================================

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return Response.json(
        {
          success: false,
          error: "Missing payment method",
        },
        { status: 400 }
      )
    }

    const result = await sql`
      SELECT
        id,
        name,
        information,
        wallet_address,
        qr_image
      FROM payment_methods
      WHERE id = ${id}
      LIMIT 1
    `

    if (result.length === 0) {
      return Response.json(
        {
          success: false,
          error: "Payment method not found",
        },
        { status: 404 }
      )
    }

    const row = result[0]

    return Response.json({
      success: true,

      paymentMethod: {
        id: row.id,
        name: row.name,

        information:
          row.information || "",

        wallet_address:
          row.wallet_address || "",

        // Keep the frontend name qr_image_url
        qr_image_url:
          row.qr_image || "",
      },
    })
  } catch (error) {
    console.error(
      "Payment method GET error:",
      error
    )

    return Response.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to load payment method",
      },
      { status: 500 }
    )
  }
}

// ============================================================
// PUT — ADMIN ONLY
// Saves wallet address, payment information and QR image.
// ============================================================

export async function PUT(request: Request) {
  try {
    if (!(await isAdmin())) {
      return Response.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      )
    }

    const contentType =
      request.headers.get("content-type") || ""

    // ========================================================
    // MULTIPART FORM DATA
    // ========================================================

    if (
      contentType.includes(
        "multipart/form-data"
      )
    ) {
      const formData =
        await request.formData()

      const id =
        formData.get("id")?.toString() || ""

      const information =
        formData
          .get("information")
          ?.toString() || ""

      const walletAddress =
        formData
          .get("wallet_address")
          ?.toString() || ""

      const qr =
        formData.get("qr") ||
        formData.get("qr_image")

      if (!id) {
        return Response.json(
          {
            success: false,
            error: "Missing payment method",
          },
          { status: 400 }
        )
      }

      let qrImageUrl: string | null = null

      // ------------------------------------------------------
      // QR UPLOAD
      // ------------------------------------------------------

      if (
        qr instanceof File &&
        qr.size > 0
      ) {
        const allowedTypes = [
          "image/jpeg",
          "image/png",
          "image/webp",
        ]

        if (!allowedTypes.includes(qr.type)) {
          return Response.json(
            {
              success: false,
              error:
                "QR file must be JPG, PNG, or WEBP.",
            },
            { status: 400 }
          )
        }

        if (
          qr.size >
          5 * 1024 * 1024
        ) {
          return Response.json(
            {
              success: false,
              error:
                "QR image must be smaller than 5 MB.",
            },
            { status: 400 }
          )
        }

        const extension =
          qr.type === "image/png"
            ? "png"
            : qr.type === "image/webp"
              ? "webp"
              : "jpg"

        const blob = await put(
          `kakobuy/qr/${id}-${Date.now()}.${extension}`,
          qr,
          {
            access: "public",
            addRandomSuffix: true,

            ...(process.env.BLOB_STORE_ID
              ? {
                  storeId:
                    process.env.BLOB_STORE_ID,
                }
              : {}),
          }
        )

        qrImageUrl = blob.url
      }

      // ------------------------------------------------------
      // SAVE WITH QR
      // ------------------------------------------------------

      if (qrImageUrl) {
        await sql`
          UPDATE payment_methods
          SET
            information =
              ${information},

            wallet_address =
              ${walletAddress},

            qr_image =
              ${qrImageUrl},

            updated_at =
              NOW()

          WHERE id = ${id}
        `
      } else {
        // ----------------------------------------------------
        // SAVE WITHOUT CHANGING EXISTING QR
        // ----------------------------------------------------

        await sql`
          UPDATE payment_methods
          SET
            information =
              ${information},

            wallet_address =
              ${walletAddress},

            updated_at =
              NOW()

          WHERE id = ${id}
        `
      }

      return Response.json({
        success: true,
        message:
          "Payment method saved successfully.",
      })
    }

    // ========================================================
    // JSON
    // Used when there is no QR upload.
    // ========================================================

    const body = await request.json()

    const id =
      body?.id

    const information =
      body?.information || ""

    const walletAddress =
      body?.wallet_address || ""

    const qrImageUrl =
      body?.qr_image_url ||
      body?.qr_image ||
      ""

    if (!id) {
      return Response.json(
        {
          success: false,
          error:
            "Missing payment method",
        },
        { status: 400 }
      )
    }

    await sql`
      UPDATE payment_methods
      SET
        information =
          ${information},

        wallet_address =
          ${walletAddress},

        qr_image =
          ${qrImageUrl},

        updated_at =
          NOW()

      WHERE id = ${id}
    `

    return Response.json({
      success: true,
      message:
        "Payment method saved successfully.",
    })
  } catch (error) {
    console.error(
      "Payment method update error:",
      error
    )

    return Response.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to save payment method",
      },
      { status: 500 }
    )
  }
}
