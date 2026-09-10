import { sql } from "@/app/db"

export async function POST(
  request: Request
) {
  try {
    const body =
      await request.json()

    const orderId =
      body.orderId

    const email =
      body.email

    if (!orderId) {
      return Response.json(
        {
          error:
            "Missing order ID.",
        },
        { status: 400 }
      )
    }

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
            transaction_submitted_at
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
            transaction_submitted_at
        `

    if (
      result.length === 0
    ) {
      return Response.json(
        {
          error:
            "Upload your transaction screenshot first.",
        },
        { status: 400 }
      )
    }

    return Response.json({
      success: true,
      message:
        "Payment submission received.",
      order: result[0],
    })
  } catch (error) {
    console.error(
      "Payment submission error:",
      error
    )

    return Response.json(
      {
        error:
          "Unable to submit payment.",
      },
      { status: 500 }
    )
  }
}
