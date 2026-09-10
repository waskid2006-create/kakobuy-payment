import { sql } from "@/app/db"

const VALID_STATUSES = ["pending", "confirmed", "failed"]

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    const orderId = searchParams.get("orderId")
    const email = searchParams.get("email")

    if (!orderId) {
      return Response.json(
        { error: "Missing order ID." },
        { status: 400 }
      )
    }

    const result = email
      ? await sql`
          SELECT
            id,
            total,
            payment_method,
            payment_status,
            wallet_copied,
            wallet_copied_at
          FROM orders
          WHERE id = ${orderId}
          AND email = ${email}
          LIMIT 1
        `
      : await sql`
          SELECT
            id,
            total,
            payment_method,
            payment_status,
            wallet_copied,
            wallet_copied_at
          FROM orders
          WHERE id = ${orderId}
          LIMIT 1
        `

    if (result.length === 0) {
      return Response.json(
        { error: "Order not found." },
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
      { error: "Unable to get payment status." },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const orderId = body.orderId
    const email = body.email
    const paymentMethod = body.paymentMethod

    if (!orderId) {
      return Response.json(
        { error: "Missing order ID." },
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
              ${paymentMethod || null},
              payment_method
            ),
            updated_at = NOW()
          WHERE id = ${orderId}
          AND email = ${email}
          RETURNING
            id,
            total,
            payment_method,
            payment_status,
            wallet_copied,
            wallet_copied_at
        `
      : await sql`
          UPDATE orders
          SET
            wallet_copied = true,
            wallet_copied_at = NOW(),
            payment_method = COALESCE(
              ${paymentMethod || null},
              payment_method
            ),
            updated_at = NOW()
          WHERE id = ${orderId}
          RETURNING
            id,
            total,
            payment_method,
            payment_status,
            wallet_copied,
            wallet_copied_at
        `

    if (result.length === 0) {
      return Response.json(
        { error: "Order not found." },
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
      { error: "Unable to update payment status." },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()

    const orderId = body.orderId
    const status = String(body.status || "").toLowerCase()

    if (!orderId) {
      return Response.json(
        { error: "Missing order ID." },
        { status: 400 }
      )
    }

    if (!VALID_STATUSES.includes(status)) {
      return Response.json(
        {
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
        total,
        payment_method,
        payment_status,
        wallet_copied,
        wallet_copied_at
    `

    if (result.length === 0) {
      return Response.json(
        { error: "Order not found." },
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
      { error: "Unable to update payment status." },
      { status: 500 }
    )
  }
        }
