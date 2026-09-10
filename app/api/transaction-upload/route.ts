import { put } from "@vercel/blob"
import { sql } from "@/app/db"

const MAX_SIZE =
  5 * 1024 * 1024

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
]

export async function POST(
  request: Request
) {
  try {
    const form =
      await request.formData()

    const file =
      form.get("file")

    const orderId =
      String(
        form.get("orderId") || ""
      )

    const email =
      String(
        form.get("email") || ""
      )

    if (!orderId) {
      return Response.json(
        {
          error:
            "Missing order ID.",
        },
        { status: 400 }
      )
    }

    if (!(file instanceof File)) {
      return Response.json(
        {
          error:
            "Please upload an image.",
        },
        { status: 400 }
      )
    }

    if (
      !ALLOWED_TYPES.includes(
        file.type
      )
    ) {
      return Response.json(
        {
          error:
            "Only JPG, PNG, and WEBP images are allowed.",
        },
        { status: 400 }
      )
    }

    if (
      file.size > MAX_SIZE
    ) {
      return Response.json(
        {
          error:
            "Image must be smaller than 5 MB.",
        },
        { status: 400 }
      )
    }

    const orderCheck = email
      ? await sql`
          SELECT id
          FROM orders
          WHERE id = ${orderId}
          AND email = ${email}
          LIMIT 1
        `
      : await sql`
          SELECT id
          FROM orders
          WHERE id = ${orderId}
          LIMIT 1
        `

    if (
      orderCheck.length === 0
    ) {
      return Response.json(
        {
          error:
            "Order not found.",
        },
        { status: 404 }
      )
    }

    const extension =
      file.type ===
      "image/png"
        ? "png"
        : file.type ===
          "image/webp"
        ? "webp"
        : "jpg"

    const filename =
      `transactions/${orderId}-${Date.now()}.${extension}`

    /*
     * IMPORTANT:
     *
     * This requires the Blob store connected
     * to this Vercel project to support public
     * access.
     */
    const blob =
      await put(
        filename,
        file,
        {
          access: "public",
          addRandomSuffix: true,
        }
      )

    const updated =
      email
        ? await sql`
            UPDATE orders
            SET
              transaction_image = ${blob.url},
              transaction_submitted = false,
              updated_at = NOW()
            WHERE id = ${orderId}
            AND email = ${email}
            RETURNING
              id,
              transaction_image,
              transaction_submitted
          `
        : await sql`
            UPDATE orders
            SET
              transaction_image = ${blob.url},
              transaction_submitted = false,
              updated_at = NOW()
            WHERE id = ${orderId}
            RETURNING
              id,
              transaction_image,
              transaction_submitted
          `

    if (
      updated.length === 0
    ) {
      return Response.json(
        {
          error:
            "Unable to save transaction image.",
        },
        { status: 500 }
      )
    }

    return Response.json({
      success: true,
      image: blob.url,
      order: updated[0],
    })
  } catch (error) {
    console.error(
      "Transaction upload error:",
      error
    )

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to upload transaction image.",
      },
      { status: 500 }
    )
  }
      }
