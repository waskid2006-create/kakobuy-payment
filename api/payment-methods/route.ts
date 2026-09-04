import { sql } from "@/app/db"

export async function GET(request: Request) {
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
}

export async function PUT(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || ""

    /*
     * IMAGE UPLOAD
     */
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData()

      const id = formData.get("id")?.toString()
      const information =
        formData.get("information")?.toString() || ""

      const qr = formData.get("qr")

      if (!id) {
        return Response.json(
          { error: "Missing payment method" },
          { status: 400 }
        )
      }

      let qrImageUrl = ""

      if (qr instanceof File) {
        if (!qr.type.startsWith("image/")) {
          return Response.json(
            { error: "QR file must be an image" },
            { status: 400 }
          )
        }

        /*
         * Limit QR images to 5 MB.
         */
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
    }

    /*
     * NORMAL JSON UPDATE
     */
    const body = await request.json()

    const {
      id,
      information,
      qr_image_url,
    } = body

    if (!id) {
      return Response.json(
        { error: "Missing payment method" },
        { status: 400 }
      )
    }

    await sql`
      UPDATE payment_methods
      SET
        information = ${information || ""},
        qr_image_url = ${qr_image_url || ""}
      WHERE id = ${id}
    `

    return Response.json({
      success: true,
      qr_image_url: qr_image_url || "",
    })
  } catch (error) {
    console.error("Payment method update error:", error)

    return Response.json(
      {
        error: "Unable to save payment method",
      },
      { status: 500 }
    )
  }
}
