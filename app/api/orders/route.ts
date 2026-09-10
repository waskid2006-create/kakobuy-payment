import { NextResponse } from "next/server"
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
      return NextResponse.json(
        {
          ok: false,
          error: "Please complete all delivery information.",
        },
        { status: 400 }
      )
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "Your cart is empty.",
        },
        { status: 400 }
      )
    }

    const orderTotal = Number(total)

    if (!Number.isFinite(orderTotal) || orderTotal < 0) {
      return NextResponse.json(
        {
          ok: false,
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

    return NextResponse.json({
      ok: true,
      orderId: result[0].id,
    })
  } catch (error) {
    console.error("Order API error:", error)

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to create order.",
      },
      { status: 500 }
    )
  }
}
