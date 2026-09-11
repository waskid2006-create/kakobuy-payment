import { NextResponse } from "next/server"
import { sql } from "@/app/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    const id =
      searchParams.get("id") ||
      searchParams.get("orderId")

    const email =
      searchParams.get("email")?.trim() || ""

    if (!id) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing order ID.",
        },
        { status: 400 }
      )
    }

    const numericId = Number(id)

    if (
      !Number.isInteger(numericId) ||
      numericId <= 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid order ID.",
        },
        { status: 400 }
      )
    }

    const orders = email
      ? await sql`
          SELECT
            id,
            full_name,
            email,
            phone,
            country,
            address,
            city,
            state,
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
          WHERE id = ${numericId}
            AND LOWER(TRIM(email)) =
                LOWER(TRIM(${email}))
          LIMIT 1
        `
      : await sql`
          SELECT
            id,
            full_name,
            email,
            phone,
            country,
            address,
            city,
            state,
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
          WHERE id = ${numericId}
          LIMIT 1
        `

    if (orders.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "Order not found.",
        },
        { status: 404 }
      )
    }

    const order = orders[0]

    const items = await sql`
      SELECT
        order_id,
        product_id,
        product_name,
        size,
        style,
        color,
        quantity,
        unit_price,
        total
      FROM order_items
      WHERE order_id = ${numericId}
      ORDER BY id ASC
    `

    return NextResponse.json({
      ok: true,
      order: {
        ...order,
        items,
      },
    })
  } catch (error) {
    console.error(
      "Order GET error:",
      error
    )

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to load order.",
      },
      { status: 500 }
    )
  }
}
