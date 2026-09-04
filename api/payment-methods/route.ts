import { sql } from "@/app/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return Response.json(
        { error: "Missing payment method" },
        { status: 400 }
      )
    }

    const result = await sql`
      SELECT id, name, information, qr_image_url
      FROM payment_methods
      WHERE id = ${id}
      LIMIT 1
    `

    if (result.length === 0) {
      return Response.json(
        { error: "Payment method not found" },
        { status: 404 }
      )
    }

    return Response.json(result[0])
  } catch (error) {
    console.error("Payment method GET error:", error)

    return Response.json(
      { error: "Unable to load payment method" },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || ""

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData()

      const id = formData.get("id")?.toString()

      const information =
        formData.get("information")?.toString() || ""

      // Accept either field name
      const qr =
        formData.get("qr") ||
        formData.get("qr_image")

      if (!id) {
        return Response.json(
          { error: "Missing payment method" },
          { status: 400 }
        )
      }

      let qrImageUrl: string | null = null

      if (qr instanceof File && qr.size > 0) {
        if (!qr.type.startsWith("image/")) {
          return Response.json(
            { error: "QR file must be an image" },
            { status: 400 }
          )
        }

        if (qr.size > 5 * 1024 * 1024) {
          return Response.json(
            { error: "QR image must be smaller than 5 MB" },
            { status: 400 }
          )
        }

        const buffer = Buffer.from(
          await qr.arrayBuffer()
        )

        qrImageUrl =
          `data:${qr.type};base64,` +
          buffer.toString("base64")
      }

      if (qrImageUrl) {
        await sql`
          UPDATE payment_methods
          SET
            information = ${information},
            qr_image_url = ${qrImageUrl}
          WHERE id = ${id}
        `
      } else {
        await sql`
          UPDATE payment_methods
          SET
            information = ${information}
          WHERE id = ${id}
        `
      }

      return Response.json({
        success: true,
        qr_image_url: qrImageUrl,
      })
    }

    const body = await request.json()

    const id = body.id
    const information = body.information || ""
    const qrImageUrl = body.qr_image_url || ""

    if (!id) {
      return Response.json(
        { error: "Missing payment method" },
        { status: 400 }
      )
    }

    await sql`
      UPDATE payment_methods
      SET
        information = ${information},
        qr_image_url = ${qrImageUrl}
      WHERE id = ${id}
    `

    return Response.json({
      success: true,
      qr_image_url: qrImageUrl,
    })
  } catch (error) {
    console.error("Payment method update error:", error)

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to save payment method",
      },
      { status: 500 }
    )
  }
}
