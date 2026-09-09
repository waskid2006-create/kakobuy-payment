import { sql } from "@/app/db"

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const {
      fullName,
      email,
      phone,
      country,
      address,
      city,
      state,
      items,
      total,
    } = body

    if (
      !fullName ||
      !email ||
      !phone ||
      !country ||
      !address ||
      !city ||
      !state
    ) {
      return Response.json(
        { error: "Please complete all delivery information." },
        { status: 400 }
      )
    }

    if (!Array.isArray(items) || items.length === 0) {
      return Response.json(
        { error: "Your cart is empty." },
        { status: 400 }
      )
    }

    const orderTotal = Number(total)

    if (!Number.isFinite(orderTotal) || orderTotal < 0) {
      return Response.json(
        { error: "Invalid order total." },
        { status: 400 }
      )
    }

    const result = await sql`
      INSERT INTO orders (
        full_name,
        email,
        phone,
        country,
        address,
        city,
        state,
        items,
        total,
        payment_status,
        wallet_copied
      )
      VALUES (
        ${fullName},
        ${email},
        ${phone},
        ${country},
        ${address},
        ${city},
        ${state},
        ${JSON.stringify(items)}::jsonb,
        ${orderTotal},
        'pending',
        false
      )
      RETURNING id
    `

    return Response.json({
      success: true,
      orderId: result[0].id,
    })
  } catch (error) {
    console.error("Create order error:", error)

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create order.",
      },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    const id = searchParams.get("id")
    const email = searchParams.get("email")

    if (!id) {
      return Response.json(
        { error: "Missing order ID." },
        { status: 400 }
      )
    }

    const result = email
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
            items,
            total,
            payment_method,
            payment_status,
            wallet_copied,
            wallet_copied_at,
            created_at
          FROM orders
          WHERE id = ${id}
          AND email = ${email}
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
            items,
            total,
            payment_method,
            payment_status,
            wallet_copied,
            wallet_copied_at,
            created_at
          FROM orders
          WHERE id = ${id}
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
    console.error("Get order error:", error)

    return Response.json(
      { error: "Unable to load order." },
      { status: 500 }
    )
  }
}
