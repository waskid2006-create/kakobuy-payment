import { sql } from "@/app/db"

export async function GET(request: Request) {
  const cookieStore = await cookies()
const adminCookie = cookieStore.get("kakobuy_admin")?.value

if (adminCookie !== "authenticated") {
  return Response.json(
    { success: false, error: "Unauthorized" },
    { status: 401 }
  )
}
  try {
    const { searchParams } =
      new URL(request.url)

    const id = searchParams.get("id")

    if (!id) {
      return Response.json(
        {
          error:
            "Missing payment method",
        },
        { status: 400 }
      )
    }

    const result = await sql`
      SELECT
        id,
        name,
        information,
        wallet_address,
        qr_image_url,
        hero_heading,
        hero_subtitle,
        footer_text
      FROM payment_methods
      WHERE id = ${id}
      LIMIT 1
    `

    if (result.length === 0) {
      return Response.json(
        {
          error:
            "Payment method not found",
        },
        { status: 404 }
      )
    }

    const row = result[0]

    return Response.json({
      success: true,
      paymentMethod: {
        id: row.id,
        name: row.name,
        information:
          row.information || "",
        wallet_address:
          row.wallet_address || "",
        qr_image:
          row.qr_image_url || null,
        hero_title:
          row.hero_heading || "",
        hero_subtitle:
          row.hero_subtitle || "",
        footer_text:
          row.footer_text || "",
      },
    })
  } catch (error) {
    console.error(
      "Payment method GET error:",
      error
    )

    return Response.json(
      {
        error:
          "Unable to load payment method",
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const contentType =
      request.headers.get(
        "content-type"
      ) || ""

    if (
      contentType.includes(
        "multipart/form-data"
      )
    ) {
      const formData =
        await request.formData()

      const id =
        formData.get("id")?.toString()

      const information =
        formData
          .get("information")
          ?.toString() || ""

      const walletAddress =
        formData
          .get("wallet_address")
          ?.toString() || ""

      const heroHeading =
        formData
          .get("hero_heading")
          ?.toString() ||
        "PAY WITH CRYPTO"

      const heroSubtitle =
        formData
          .get("hero_subtitle")
          ?.toString() ||
        "Secure and simple crypto payment"

      const footerText =
        formData
          .get("footer_text")
          ?.toString() || "KAKOBUY"

      const qr =
        formData.get("qr") ||
        formData.get("qr_image")

      if (!id) {
        return Response.json(
          {
            error:
              "Missing payment method",
          },
          { status: 400 }
        )
      }

      let qrImageUrl:
        | string
        | null = null

      if (
        qr instanceof File &&
        qr.size > 0
      ) {
        if (
          ![
            "image/jpeg",
            "image/png",
            "image/webp",
          ].includes(qr.type)
        ) {
          return Response.json(
            {
              error:
                "QR file must be JPG, PNG, or WEBP.",
            },
            { status: 400 }
          )
        }

        if (
          qr.size >
          5 * 1024 * 1024
        ) {
          return Response.json(
            {
              error:
                "QR image must be smaller than 5 MB.",
            },
            { status: 400 }
          )
        }

        const buffer =
          Buffer.from(
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
            wallet_address = ${walletAddress},
            qr_image_url = ${qrImageUrl},
            hero_heading = ${heroHeading},
            hero_subtitle = ${heroSubtitle},
            footer_text = ${footerText}
          WHERE id = ${id}
        `
      } else {
        await sql`
          UPDATE payment_methods
          SET
            information = ${information},
            wallet_address = ${walletAddress},
            hero_heading = ${heroHeading},
            hero_subtitle = ${heroSubtitle},
            footer_text = ${footerText}
          WHERE id = ${id}
        `
      }

      return Response.json({
        success: true,
        wallet_address:
          walletAddress,
        qr_image_url:
          qrImageUrl,
        hero_heading:
          heroHeading,
        hero_subtitle:
          heroSubtitle,
        footer_text:
          footerText,
      })
    }

    const body =
      await request.json()

    const id = body.id

    const information =
      body.information || ""

    const walletAddress =
      body.wallet_address || ""

    const heroHeading =
      body.hero_heading ||
      "PAY WITH CRYPTO"

    const heroSubtitle =
      body.hero_subtitle ||
      "Secure and simple crypto payment"

    const footerText =
      body.footer_text ||
      "KAKOBUY"

    const qrImageUrl =
      body.qr_image_url || ""

    if (!id) {
      return Response.json(
        {
          error:
            "Missing payment method",
        },
        { status: 400 }
      )
    }

    await sql`
      UPDATE payment_methods
      SET
        information = ${information},
        wallet_address = ${walletAddress},
        qr_image_url = ${qrImageUrl},
        hero_heading = ${heroHeading},
        hero_subtitle = ${heroSubtitle},
        footer_text = ${footerText}
      WHERE id = ${id}
    `

    return Response.json({
      success: true,
      wallet_address:
        walletAddress,
      qr_image_url:
        qrImageUrl,
      hero_heading:
        heroHeading,
      hero_subtitle:
        heroSubtitle,
      footer_text:
        footerText,
    })
  } catch (error) {
    console.error(
      "Payment method update error:",
      error
    )

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
