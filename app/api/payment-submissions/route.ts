import { sql } from "@/app/db"

export async function GET() {
  try {
    const result = await sql`
      SELECT
        id,
        full_name,
        email,
        phone,
        total,
        payment_method,
        payment_status,
        transaction_image,
        transaction_submitted,
        transaction_submitted_at,
        created_at
      FROM orders
      WHERE transaction_submitted = true
      ORDER BY transaction_submitted_at DESC
      LIMIT 50
    `

    return Response.json({
      success: true,
      submissions: result,
    })
  } catch (error) {
    console.error(
      "Payment submissions error:",
      error
    )

    return Response.json(
      {
        success: false,
        error:
          "Unable to load payment submissions.",
      },
      { status: 500 }
    )
  }
}
