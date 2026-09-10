/* ==================== 1. IMPORTS ==================== */
import { put } from "@vercel/blob"
import { sql } from "@/app/db"

/* ==================== 2. UPLOAD SETTINGS ==================== */
const MAX_SIZE = 5 * 1024 * 1024

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
]

/* ==================== 3. POST ==================== */
export async function POST(request: Request) {
  try {
    /* ==================== 4. READ FORM DATA ==================== */
    const form = await request.formData()

    const file = form.get("file")

    const orderId = String(
      form.get("orderId") || ""
    ).trim()

    const email = String(
      form.get("email") || ""
    ).trim()

    /* ==================== 5. CHECK ORDER ID ==================== */
    if (!orderId) {
      return Response.json(
        {
          success: false,
          error: "Missing order ID.",
        },
        { status: 400 }
      )
    }

    /* ==================== 6. CHECK FILE ==================== */
    if (!(file instanceof File)) {
      return Response.json(
        {
          success: false,
          error: "Please upload an image.",
        },
        { status: 400 }
      )
    }

    /* ==================== 7. CHECK FILE TYPE ==================== */
    if (!ALLOWED_TYPES.includes(file.type)) {
      return Response.json(
        {
          success: false,
          error:
            "Only JPG, PNG, and WEBP images are allowed.",
        },
        { status: 400 }
      )
    }

    /* ==================== 8. CHECK FILE SIZE ==================== */
    if (file.size <= 0) {
      return Response.json(
        {
          success: false,
          error: "The selected image is empty.",
        },
        { status: 400 }
      )
    }

    if (file.size > MAX_SIZE) {
      return Response.json(
        {
          success: false,
          error: "Image must be smaller than 5 MB.",
        },
        { status: 400 }
      )
    }

    /* ==================== 9. CHECK ORDER ==================== */
    const orderCheck = email
      ? await sql`
          SELECT
            id,
            email,
            transaction_image,
            transaction_submitted
          FROM orders
          WHERE id = ${orderId}
          AND email = ${email}
          LIMIT 1
        `
      : await sql`
          SELECT
            id,
            email,
            transaction_image,
            transaction_submitted
          FROM orders
          WHERE id = ${orderId}
          LIMIT 1
        `

    if (orderCheck.length === 0) {
      return Response.json(
        {
          success: false,
          error: "Order not found.",
        },
        { status: 404 }
      )
    }

    /* ==================== 10. GET FILE EXTENSION ==================== */
    const extension =
      file.type === "image/png"
        ? "png"
        : file.type === "image/webp"
        ? "webp"
        : "jpg"

    /* ==================== 11. CREATE FILE NAME ==================== */
    const filename =
      `transactions/${orderId}-${Date.now()}.${extension}`

    /* ==================== 12. UPLOAD TO VERCEL BLOB ==================== */
    const blob = await put(
      filename,
      file,
      {
        access: "public",
        addRandomSuffix: true,
      }
    )

    /* ==================== 13. SAVE IMAGE URL ==================== */
    const updated = email
      ? await sql`
          UPDATE orders
          SET
            transaction_image = ${blob.url},
            transaction_submitted = false,
            transaction_submitted_at = NULL,
            updated_at = NOW()
          WHERE id = ${orderId}
          AND email = ${email}
          RETURNING
            id,
            full_name,
            email,
            total,
            payment_method,
            payment_status,
            transaction_image,
            transaction_submitted,
            transaction_submitted_at,
            updated_at
        `
      : await sql`
          UPDATE orders
          SET
            transaction_image = ${blob.url},
            transaction_submitted = false,
            transaction_submitted_at = NULL,
            updated_at = NOW()
          WHERE id = ${orderId}
          RETURNING
            id,
            full_name,
            email,
            total,
            payment_method,
            payment_status,
            transaction_image,
            transaction_submitted,
            transaction_submitted_at,
            updated_at
        `

    /* ==================== 14. CHECK DATABASE UPDATE ==================== */
    if (updated.length === 0) {
      return Response.json(
        {
          success: false,
          error:
            "The screenshot uploaded, but it could not be saved to the order.",
        },
        { status: 500 }
      )
    }

    /* ==================== 15. SUCCESS ==================== */
    return Response.json({
      success: true,
      message: "Transaction screenshot uploaded successfully.",
      image: blob.url,
      transaction_image: blob.url,
      uploaded: true,
      order: updated[0],
    })
  } catch (error) {
    /* ==================== 16. ERROR ==================== */
    console.error(
      "Transaction upload error:",
      error
    )

    return Response.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to upload transaction screenshot.",
      },
      { status: 500 }
    )
  }
}
