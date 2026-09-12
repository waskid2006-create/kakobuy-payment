import { sql } from "@/app/db"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()

    const orderId = String(
      formData.get("orderId") || ""
    ).trim()

    const email = String(
      formData.get("email") || ""
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

    // Find the order
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
            AND LOWER(TRIM(email)) =
                LOWER(TRIM(${email}))
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

    // Buyer must upload screenshot first
    if (!currentOrder.transaction_image) {
      return Response.json(
        {
          success: false,
          error:
            "Upload your transaction screenshot first.",
        },
        { status: 400 }
      )
    }

    // Submit payment and set status to pending
    const result = email
      ? await sql`
          UPDATE orders
          SET
            transaction_submitted = true,
            transaction_submitted_at = NOW(),
            payment_status = 'pending',
            updated_at = NOW()
          WHERE id = ${orderId}
            AND LOWER(TRIM(email)) =
                LOWER(TRIM(${email}))
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
            payment_status = 'pending',
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

    if (result.length === 0) {
      return Response.json(
        {
          success: false,
          error: "Unable to submit your payment.",
        },
        { status: 500 }
      )
    }

    return Response.json({
      success: true,
      submitted: true,
      message:
        "Payment submission received successfully.",
      order: result[0],
    })
  } catch (error) {
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
