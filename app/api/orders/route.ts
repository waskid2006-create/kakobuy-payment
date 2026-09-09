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
        {
          error: "Please complete all delivery information.",
        },
        { status: 400 }
      )
    }

    if (!Array.isArray(items) || items.length === 0) {
      return Response.json(
        {
          error: "Your cart is empty.",
        },
        { status: 400 }
      )
    }

    const orderTotal = Number(total)

    if (!Number.isFinite(orderTotal) || orderTotal < 0) {
      return Response.json(
        {
          error: "Invalid order total.",
        },
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
        total
      )
      VALUES (
        ${String(fullName).trim()},
        ${String(email).trim()},
        ${String(phone).trim()},
        ${String(country).trim()},
        ${String(address).trim()},
        ${String(city).trim()},
        ${String(state).trim()},
        ${JSON.stringify(items)},
        ${orderTotal.toFixed(2)}
      )
      RETURNING
        id,
        full_name,
        email,
        total,
        payment_status,
        wallet_copied,
        created_at
    `

    return Response.json({
      success: true,
      order: result[0],
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
