/* ==================== 1. IMPORT DATABASE ==================== */
import { sql } from "@/app/db"

/* ==================== 2. POST PAYMENT SUBMISSION ==================== */
export async function POST(request: Request) {
  try {
    /* ==================== 3. READ REQUEST ==================== */
    const body = await request.json()

    const orderId = String(
      body?.orderId || ""
    ).trim()

    const email = String(
      body?.email || ""
    ).trim()

    /* ==================== 4. CHECK ORDER ID ==================== */
    if (!orderId) {
      return Response.json(
        {
          success: false,
          error: "Missing order ID.",
        },
        { status: 400 }
      )
    }

    /* ==================== 5. FIND ORDER ==================== */
    const existingOrder = email
      ? await sql`
          SELECT
            id,
            full_name,
            email,
            total,
            payment_method,
            payment_status,
            transaction_image,
            transaction_submitted,
            transaction_submitted_at
          FROM orders
          WHERE id = ${orderId}
          AND email = ${email}
          LIMIT 1
        `
      : await sql`
          SELECT
            id,
            full_name,
            email,
            total,
            payment_method,
            payment_status,
            transaction_image,
            transaction_submitted,
            transaction_submitted_at
          FROM orders
          WHERE id = ${orderId}
          LIMIT 1
        `

    /* ==================== 6. ORDER NOT FOUND ==================== */
    if (existingOrder.length === 0) {
      return Response.json(
        {
          success: false,
          error: "Order not found.",
        },
        { status: 404 }
      )
    }

    const currentOrder = existingOrder[0]

    /* ==================== 7. CHECK SCREENSHOT ==================== */
    if (
      !currentOrder.transaction_image
    ) {
      return Response.json(
        {
          success: false,
          error:
            "Upload your transaction screenshot first.",
        },
        { status: 400 }
      )
    }

    /* ==================== 8. MARK SUBMITTED ==================== */
    const result = email
      ? await sql`
          UPDATE orders
          SET
            transaction_submitted = true,
            transaction_submitted_at = NOW(),
            payment_status = COALESCE(
              payment_status,
              'pending'
            ),
            updated_at = NOW()
          WHERE id = ${orderId}
          AND email = ${email}
          AND transaction_image IS NOT NULL
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
            created_at,
            updated_at
        `
      : await sql`
          UPDATE orders
          SET
            transaction_submitted = true,
            transaction_submitted_at = NOW(),
            payment_status = COALESCE(
              payment_status,
              'pending'
            ),
            updated_at = NOW()
          WHERE id = ${orderId}
          AND transaction_image IS NOT NULL
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
            created_at,
            updated_at
        `

    /* ==================== 9. CHECK UPDATE ==================== */
    if (result.length === 0) {
      return Response.json(
        {
          success: false,
          error:
            "Unable to submit your payment.",
        },
        { status: 500 }
      )
    }

    /* ==================== 10. SUCCESS ==================== */
    return Response.json({
      success: true,
      submitted: true,
      message:
        "Payment submission received successfully.",
      order: result[0],
    })
  } catch (error) {
    /* ==================== 11. ERROR ==================== */
    console.error(
      "Payment submission error:",
      error
    )

    return Response.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to submit payment.",
      },
      { status: 500 }
    )
  }
}
