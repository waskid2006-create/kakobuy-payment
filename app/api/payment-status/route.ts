import { sql } from "@/app/db"

const VALID_STATUSES = [
  "pending",
  "confirmed",
  "failed",
]

/* ==================== 1. GET PAYMENT STATUS / ADMIN QUEUE ==================== */

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    const orderId = searchParams.get("orderId")?.trim() || ""
    const email = searchParams.get("email")?.trim() || ""

    /*
     * ADMIN MODE
     *
     * Only show buyers who have submitted a transaction
     * AND are still waiting for payment confirmation.
     */
    if (!orderId) {
      const result = await sql`
        SELECT
          id,
          full_name,
          email,
          total,
          payment_method,
          payment_status,
          wallet_copied,
          wallet_copied_at,
          transaction_image,
          transaction_submitted,
          transaction_submitted_at,
          created_at,
          updated_at
        FROM orders
        WHERE transaction_submitted = true
          AND COALESCE(payment_status, 'pending') = 'pending'
        ORDER BY
          transaction_submitted_at DESC NULLS LAST,
          created_at DESC
      `

      return Response.json({
        success: true,
        orders: result,
      })
    }

    /* ==================== BUYER / SINGLE ORDER MODE ==================== */

    const result = email
      ? await sql`
          SELECT
            id,
            full_name,
            email,
            total,
            payment_method,
            payment_status,
            wallet_copied,
            wallet_copied_at,
            transaction_image,
            transaction_submitted,
            transaction_submitted_at,
            created_at,
            updated_at
          FROM orders
          WHERE id = ${orderId}
            AND LOWER(TRIM(email)) = LOWER(TRIM(${email}))
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
            wallet_copied,
            wallet_copied_at,
            transaction_image,
            transaction_submitted,
            transaction_submitted_at,
            created_at,
            updated_at
          FROM orders
          WHERE id = ${orderId}
          LIMIT 1
        `

    if (result.length === 0) {
      return Response.json(
        {
          success: false,
          error: "Order not found.",
        },
        { status: 404 }
      )
    }

    return Response.json({
      success: true,
      order: result[0],
    })
  } catch (error) {
    console.error("Payment status GET error:", error)

    return Response.json(
      {
        success: false,
        error: "Unable to get payment status.",
      },
      { status: 500 }
    )
  }
}

/* ==================== 2. RECORD WALLET COPY ==================== */

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const orderId = String(body?.orderId || "").trim()
    const email = String(body?.email || "").trim()
    const paymentMethod = String(
      body?.paymentMethod || ""
    ).trim()

    if (!orderId) {
      return Response.json(
        {
          success: false,
          error: "Missing order ID.",
        },
        { status: 400 }
      )
    }

    const result = email
      ? await sql`
          UPDATE orders
          SET
            wallet_copied = true,
            wallet_copied_at = NOW(),
            payment_method = COALESCE(
              NULLIF(${paymentMethod}, ''),
              payment_method
            ),
            updated_at = NOW()
          WHERE id = ${orderId}
            AND LOWER(TRIM(email)) = LOWER(TRIM(${email}))
          RETURNING
            id,
            full_name,
            email,
            total,
            payment_method,
            payment_status,
            wallet_copied,
            wallet_copied_at,
            transaction_image,
            transaction_submitted,
            transaction_submitted_at,
            created_at,
            updated_at
        `
      : await sql`
          UPDATE orders
          SET
            wallet_copied = true,
            wallet_copied_at = NOW(),
            payment_method = COALESCE(
              NULLIF(${paymentMethod}, ''),
              payment_method
            ),
            updated_at = NOW()
          WHERE id = ${orderId}
          RETURNING
            id,
            full_name,
            email,
            total,
            payment_method,
            payment_status,
            wallet_copied,
            wallet_copied_at,
            transaction_image,
            transaction_submitted,
            transaction_submitted_at,
            created_at,
            updated_at
        `

    if (result.length === 0) {
      return Response.json(
        {
          success: false,
          error: "Order not found.",
        },
        { status: 404 }
      )
    }

    return Response.json({
      success: true,
      order: result[0],
    })
  } catch (error) {
    console.error("Payment status POST error:", error)

    return Response.json(
      {
        success: false,
        error: "Unable to update payment status.",
      },
      { status: 500 }
    )
  }
}

/* ==================== 3. ADMIN UPDATE PAYMENT STATUS ==================== */

export async function PUT(request: Request) {
  try {
    const body = await request.json()

    const orderId = String(body?.orderId || "").trim()

    const status = String(
      body?.status || ""
    )
      .trim()
      .toLowerCase()

    if (!orderId) {
      return Response.json(
        {
          success: false,
          error: "Missing order ID.",
        },
        { status: 400 }
      )
    }

    if (!VALID_STATUSES.includes(status)) {
      return Response.json(
        {
          success: false,
          error:
            "Invalid payment status. Use pending, confirmed, or failed.",
        },
        { status: 400 }
      )
    }

    const result = await sql`
      UPDATE orders
      SET
        payment_status = ${status},
        updated_at = NOW()
      WHERE id = ${orderId}
      RETURNING
        id,
        full_name,
        email,
        total,
        payment_method,
        payment_status,
        wallet_copied,
        wallet_copied_at,
        transaction_image,
        transaction_submitted,
        transaction_submitted_at,
        created_at,
        updated_at
    `

    if (result.length === 0) {
      return Response.json(
        {
          success: false,
          error: "Order not found.",
        },
        { status: 404 }
      )
    }

    return Response.json({
      success: true,
      order: result[0],
    })
  } catch (error) {
    console.error("Payment status PUT error:", error)

    return Response.json(
      {
        success: false,
        error: "Unable to update payment status.",
      },
      { status: 500 }
    )
  }
}
