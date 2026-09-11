"use client"

import { useEffect, useState } from "react"

const methods = [
  {
    id: "bitcoin",
    name: "Bitcoin",
    symbol: "₿",
  },
  {
    id: "ethereum",
    name: "Ethereum",
    symbol: "Ξ",
  },
  {
    id: "tron",
    name: "TRON",
    symbol: "TRX",
  },
  {
    id: "binance",
    name: "Binance",
    symbol: "BNB",
  },
]

const CHECK_ORDER_URL =
  "https://kakobuy-check-order.vercel.app/"

type OrderItem = {
  productId?: number | string
  productName?: string
  name?: string
  size?: string
  style?: string
  color?: string
  quantity?: number | string
  unitPrice?: number | string
}

type Order = {
  id: number | string
  full_name?: string
  email?: string
  phone?: string
  country?: string
  address?: string
  city?: string
  state?: string
  items?: OrderItem[]
  total: number | string
  payment_method?: string
  payment_status?: "pending" | "confirmed" | "failed"
  wallet_copied?: boolean
  transaction_image?: string | null
  transaction_submitted?: boolean
  transaction_submitted_at?: string | null
  created_at?: string
}

type PaymentMethod = {
  id?: string
  name?: string
  symbol?: string
  information?: string
  wallet_address?: string
  address?: string
  qr_image?: string | null
  qr_image_url?: string | null
  hero_title?: string
  hero_heading?: string
  hero_subtitle?: string
  footer_text?: string
}

type PageDetails = {
  orderId: string
  email: string
  total: string
  method: string
}

export default function PaymentPage() {
  const [order, setOrder] =
    useState<Order | null>(null)

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState("")

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod | null>(null)

  const [paymentMethodLoading, setPaymentMethodLoading] =
    useState(true)

  const [paymentVisible, setPaymentVisible] =
    useState(false)

  const [timeLeft, setTimeLeft] =
    useState(300)

  const [copied, setCopied] =
    useState(false)

  const [transactionFile, setTransactionFile] =
    useState<File | null>(null)

  const [transactionPreview, setTransactionPreview] =
    useState("")

  const [transactionUploaded, setTransactionUploaded] =
    useState(false)

  const [uploading, setUploading] =
    useState(false)

  const [submitting, setSubmitting] =
    useState(false)

  const [submissionMessage, setSubmissionMessage] =
    useState("")

  const [uploadError, setUploadError] =
    useState("")

  /*
   * IMPORTANT:
   * URL details are now loaded AFTER the page mounts.
   * This prevents Page 3 from incorrectly saying
   * "Missing order ID" when the URL contains ?orderId=29.
   */
  const [details, setDetails] =
    useState<PageDetails>({
      orderId: "",
      email: "",
      total: "",
      method: "bitcoin",
    })

  /* ==================== READ URL ==================== */

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const params =
      new URLSearchParams(
        window.location.search
      )

    const orderId =
      params.get("orderId") ||
      params.get("id") ||
      ""

    const email =
      params.get("email")?.trim() ||
      ""

    const total =
      params.get("total") ||
      ""

    const method =
      params.get("method") ||
      "bitcoin"

    setDetails({
      orderId,
      email,
      total,
      method,
    })
  }, [])

  /* ==================== LOAD ORDER ==================== */

  async function loadOrder() {
    /*
     * Do nothing until the URL has been read.
     *
     * This is different from the old version.
     * We no longer immediately show "Missing order ID"
     * during the first render.
     */
    if (!details.orderId) {
      return
    }

    try {
      setError("")

      const params =
        new URLSearchParams()

      params.set(
        "id",
        details.orderId
      )

      if (details.email) {
        params.set(
          "email",
          details.email
        )
      }

      const response =
        await fetch(
          `/api/orders?${params.toString()}`,
          {
            method: "GET",
            cache: "no-store",
          }
        )

      const data =
        await response.json()

      if (
        !response.ok ||
        !data?.order
      ) {
        throw new Error(
          data?.error ||
            "Unable to load this order."
        )
      }

      setOrder(data.order)
      setError("")
    } catch (err) {
      console.error(
        "Load order error:",
        err
      )

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load this order."
      )
    } finally {
      setLoading(false)
    }
  }

  /* ==================== LOAD PAYMENT METHOD ==================== */

  async function loadPaymentMethod() {
    try {
      setPaymentMethodLoading(true)

      const method =
        details.method ||
        "bitcoin"

      const response =
        await fetch(
          `/api/payment-methods?id=${encodeURIComponent(
            method
          )}`,
          {
            method: "GET",
            cache: "no-store",
          }
        )

      const text =
        await response.text()

      let data: any = {}

      try {
        data = JSON.parse(text)
      } catch {
        throw new Error(
          "Invalid payment method response."
        )
      }

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to load payment method."
        )
      }

      setPaymentMethod(
        data?.paymentMethod ||
          data?.method ||
          data
      )
    } catch (err) {
      console.error(
        "Payment method error:",
        err
      )
    } finally {
      setPaymentMethodLoading(false)
    }
  }

  /*
   * Load order and payment method only AFTER
   * the URL details have been read.
   */
  useEffect(() => {
    if (!details.orderId) {
      return
    }

    loadOrder()
    loadPaymentMethod()
  }, [
    details.orderId,
    details.email,
    details.method,
  ])

  /*
   * If there is genuinely no order ID after the
   * browser URL has been read, show the error.
   */
  useEffect(() => {
    if (
      details.orderId === "" &&
      typeof window !== "undefined"
    ) {
      const hasQuery =
        window.location.search.length > 0

      if (
        hasQuery &&
        !new URLSearchParams(
          window.location.search
        ).get("orderId") &&
        !new URLSearchParams(
          window.location.search
        ).get("id")
      ) {
        setLoading(false)
        setError("Missing order ID.")
      }
    }
  }, [details.orderId])

  /* ==================== REFRESH ORDER ==================== */

  useEffect(() => {
    if (!order?.id) {
      return
    }

    const interval =
      window.setInterval(() => {
        loadOrder()
      }, 3000)

    return () => {
      window.clearInterval(interval)
    }
  }, [
    order?.id,
    details.orderId,
    details.email,
  ])

  /* ==================== FIVE MINUTE TIMER ==================== */

  useEffect(() => {
    if (!paymentVisible) {
      return
    }

    if (timeLeft <= 0) {
      window.location.href =
        CHECK_ORDER_URL

      return
    }

    const timer =
      window.setInterval(() => {
        setTimeLeft(
          (previous) => {
            if (previous <= 1) {
              window.clearInterval(
                timer
              )

              return 0
            }

            return previous - 1
          }
        )
      }, 1000)

    return () => {
      window.clearInterval(timer)
    }
  }, [
    paymentVisible,
    timeLeft,
  ])

  /* ==================== FORMAT TIMER ==================== */

  const minutes =
    Math.floor(timeLeft / 60)

  const seconds =
    timeLeft % 60

  const timerText =
    `${String(minutes).padStart(
      2,
      "0"
    )}:${String(seconds).padStart(
      2,
      "0"
    )}`

  /* ==================== TOTAL ==================== */

  const orderTotal =
    Number(
      order?.total ??
        details.total ??
        0
    )

  /* ==================== ITEMS ==================== */

  const items =
    Array.isArray(order?.items)
      ? order.items
      : []

  /* ==================== COPY WALLET ==================== */

  async function copyInfo() {
    const wallet =
      paymentMethod?.wallet_address ||
      paymentMethod?.address ||
      ""

    if (!wallet) {
      setUploadError(
        "Payment wallet address is not available."
      )

      return
    }

    try {
      await navigator.clipboard.writeText(
        wallet
      )

      setCopied(true)
      setPaymentVisible(true)
      setTimeLeft(300)
      setUploadError("")

      await fetch(
        "/api/payment-status",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            orderId:
              String(order?.id),
            email:
              order?.email ||
              details.email ||
              "",
            wallet_copied: true,
          }),
        }
      )

      window.setTimeout(() => {
        setCopied(false)
      }, 2500)
    } catch (err) {
      console.error(
        "Copy wallet error:",
        err
      )

      setUploadError(
        "Unable to copy the wallet address."
      )
    }
  }

  /* ==================== SELECT SCREENSHOT ==================== */

  async function selectTransactionImage(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0]

    if (!file) {
      return
    }

    setUploadError("")
    setSubmissionMessage("")

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ]

    if (
      !allowedTypes.includes(
        file.type
      )
    ) {
      setUploadError(
        "Only JPG, PNG, and WEBP images are allowed."
      )

      event.target.value = ""

      return
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      setUploadError(
        "Image must be smaller than 5 MB."
      )

      event.target.value = ""

      return
    }

    if (
      transactionPreview &&
      transactionPreview.startsWith(
        "blob:"
      )
    ) {
      URL.revokeObjectURL(
        transactionPreview
      )
    }

    const preview =
      URL.createObjectURL(file)

    setTransactionFile(file)
    setTransactionPreview(
      preview
    )
    setTransactionUploaded(false)

    /*
     * Upload immediately after selection.
     */
    await uploadTransactionImage(
      file
    )
  }

  /* ==================== UPLOAD SCREENSHOT ==================== */

  async function uploadTransactionImage(
    file: File
  ) {
    if (!order?.id) {
      setUploadError(
        "Order information is not available."
      )

      return
    }

    setUploading(true)
    setUploadError("")
    setSubmissionMessage("")

    try {
      const formData =
        new FormData()

      formData.append(
        "file",
        file
      )

      formData.append(
        "orderId",
        String(order.id)
      )

      if (
        order.email ||
        details.email
      ) {
        formData.append(
          "email",
          order.email ||
            details.email
        )
      }

      const response =
        await fetch(
          "/api/transaction-upload",
          {
            method: "POST",
            body: formData,
          }
        )

      const text =
        await response.text()

      let data: any = {}

      try {
        data = JSON.parse(text)
      } catch {
        throw new Error(
          "Server returned an invalid upload response."
        )
      }

      if (
        !response.ok ||
        !data?.success
      ) {
        throw new Error(
          data?.error ||
            "Upload failed."
        )
      }

      setTransactionUploaded(
        true
      )

      setOrder(
        (previous) =>
          previous
            ? {
                ...previous,
                transaction_image:
                  data.transaction_image ||
                  data.image ||
                  previous.transaction_image,
                transaction_submitted:
                  false,
              }
            : previous
      )

      setSubmissionMessage(
        "Screenshot uploaded and confirmed. Tap CONFIRM PAYMENT to send it to admin."
      )
    } catch (err) {
      console.error(
        "Transaction upload error:",
        err
      )

      setTransactionUploaded(
        false
      )

      setUploadError(
        err instanceof Error
          ? err.message
          : "Upload failed."
      )
    } finally {
      setUploading(false)
    }
  }

  /* ==================== CONFIRM PAYMENT ==================== */

  async function completePaymentSubmission() {
    if (submitting) {
      return
    }

    if (!order?.id) {
      setUploadError(
        "Order information is not available."
      )

      return
    }

    if (!transactionUploaded) {
      setUploadError(
        "Upload your transaction screenshot first."
      )

      return
    }

    setSubmitting(true)
    setUploadError("")
    setSubmissionMessage("")

    try {
      const response =
        await fetch(
          "/api/payment-submission",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              orderId:
                String(order.id),
              email:
                order.email ||
                details.email ||
                "",
            }),
          }
        )

      const text =
        await response.text()

      let data: any = {}

      try {
        data = JSON.parse(text)
      } catch {
        throw new Error(
          "Server returned an invalid response."
        )
      }

      if (
        !response.ok ||
        !data?.success
      ) {
        throw new Error(
          data?.error ||
            "Unable to submit payment."
        )
      }

      setOrder(
        (previous) =>
          previous
            ? {
                ...previous,
                transaction_submitted:
                  true,
                transaction_submitted_at:
                  data?.order
                    ?.transaction_submitted_at ||
                  new Date().toISOString(),
              }
            : previous
      )

      setSubmissionMessage(
        "Payment submitted successfully. Your screenshot has been sent to the admin for review."
      )

      setPaymentVisible(false)

      setTransactionFile(null)

      if (
        transactionPreview &&
        transactionPreview.startsWith(
          "blob:"
        )
      ) {
        URL.revokeObjectURL(
          transactionPreview
        )
      }

      setTransactionPreview("")
      setTransactionUploaded(false)

      await loadOrder()
    } catch (err) {
      console.error(
        "Payment submission error:",
        err
      )

      setUploadError(
        err instanceof Error
          ? err.message
          : "Unable to submit payment."
      )
    } finally {
      setSubmitting(false)
    }
  }

  /* ==================== PAYMENT METHOD DISPLAY ==================== */

  const methodId =
    details.method ||
    order?.payment_method ||
    "bitcoin"

  const currentMethod =
    methods.find(
      (item) =>
        item.id ===
        String(
          methodId
        ).toLowerCase()
    ) || methods[0]

  const walletAddress =
    paymentMethod?.wallet_address ||
    paymentMethod?.address ||
    ""

  const qrImage =
    paymentMethod?.qr_image ||
    paymentMethod?.qr_image_url ||
    ""

  /* ==================== CLEANUP ==================== */

  useEffect(() => {
    return () => {
      if (
        transactionPreview &&
        transactionPreview.startsWith(
          "blob:"
        )
      ) {
        URL.revokeObjectURL(
          transactionPreview
        )
      }
    }
  }, [transactionPreview])

  /* ==================== LOADING ==================== */

  if (loading) {
    return (
      <main className="payment-page">
        <div className="payment-container">
          <div className="loading-card">
            <h2>
              LOADING ORDER...
            </h2>

            <p>
              Please wait while we load
              your order.
            </p>
          </div>
        </div>
      </main>
    )
  }

  /* ==================== ERROR ==================== */

  if (error || !order) {
    return (
      <main className="payment-page">
        <div className="payment-container">
          <div className="error-card">
            <h2>
              WE COULDN'T LOAD THIS ORDER
            </h2>

            <p>
              {error ||
                "The order could not be found."}
            </p>

            <button
              type="button"
              onClick={() =>
                window.location.reload()
              }
            >
              TRY AGAIN
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="payment-page">
      <div className="payment-container">

        {/* ==================== HEADER ==================== */}

        <header className="payment-header">
          <div>
            <h1>
              {paymentMethod?.hero_heading ||
                paymentMethod?.hero_title ||
                "PAY WITH CRYPTO"}
            </h1>

            <p>
              {paymentMethod?.hero_subtitle ||
                "Secure and simple crypto payment"}
            </p>
          </div>

          <div className="method-badge">
            {currentMethod.symbol}{" "}
            {currentMethod.name}
          </div>
        </header>

        {/* ==================== ORDER SUMMARY ==================== */}

        <section className="order-card">
          <div className="order-card-header">
            <div>
              <span>
                ORDER ID
              </span>

              <strong>
                #{String(order.id)}
              </strong>
            </div>

            <div className="order-total">
              <span>
                TOTAL PAYMENT
              </span>

              <strong>
                {orderTotal.toFixed(2)}
              </strong>
            </div>
          </div>

          <div className="buyer-name">
            {order.full_name ||
              "Customer"}
          </div>

          {/* ==================== ITEMS ==================== */}

          <div className="items-section">
            <p className="section-label">
              ITEMS YOU ARE BUYING
            </p>

            {items.length === 0 ? (
              <div className="no-items">
                No item details available.
              </div>
            ) : (
              <div className="items-list">
                {items.map(
                  (
                    item,
                    index
                  ) => {
                    const quantity =
                      Number(
                        item.quantity ||
                          1
                      )

                    const unitPrice =
                      Number(
                        item.unitPrice ||
                          0
                      )

                    return (
                      <div
                        className="item-row"
                        key={`${item.productId || "item"}-${index}`}
                      >
                        <div className="item-main">
                          <strong>
                            {item.productName ||
                              item.name ||
                              "Product"}
                          </strong>

                          <div className="item-options">
                            {item.size && (
                              <span>
                                Size:{" "}
                                {
                                  item.size
                                }
                              </span>
                            )}

                            {item.style && (
                              <span>
                                Style:{" "}
                                {
                                  item.style
                                }
                              </span>
                            )}

                            {item.color && (
                              <span>
                                Color:{" "}
                                {
                                  item.color
                                }
                              </span>
                            )}

                            <span>
                              Qty:{" "}
                              {
                                quantity
                              }
                            </span>
                          </div>
                        </div>

                        <div className="item-price">
                          {(
                            unitPrice *
                            quantity
                          ).toFixed(2)}
                        </div>
                      </div>
                    )
                  }
                )}
              </div>
            )}
          </div>
        </section>

        {/* ==================== PAYMENT INFORMATION ==================== */}

        {paymentMethodLoading ? (
          <section className="payment-card">
            <p>
              Loading payment details...
            </p>
          </section>
        ) : (
          <section className="payment-card">
            <div className="payment-card-title">
              <span>
                {
                  currentMethod.symbol
                }
              </span>

              <div>
                <h2>
                  {
                    currentMethod.name
                  }
                </h2>

                <p>
                  {paymentMethod?.information ||
                    "Send the exact amount to the wallet below."}
                </p>
              </div>
            </div>

            {qrImage && (
              <div className="qr-wrapper">
                <img
                  src={qrImage}
                  alt={`${currentMethod.name} QR code`}
                />
              </div>
            )}

            <div className="wallet-box">
              <span>
                WALLET ADDRESS
              </span>

              <div className="wallet-row">
                <code>
                  {walletAddress ||
                    "Wallet address unavailable"}
                </code>

                <button
                  type="button"
                  onClick={
                    copyInfo
                  }
                  disabled={
                    !walletAddress
                  }
                >
                  {copied
                    ? "COPIED ✓"
                    : "COPY"}
                </button>
              </div>
            </div>

            <div className="amount-box">
              <span>
                SEND EXACTLY
              </span>

              <strong>
                {orderTotal.toFixed(
                  2
                )}
              </strong>
            </div>

            {!paymentVisible &&
              !order.transaction_submitted && (
                <button
                  type="button"
                  className="pay-button"
                  onClick={
                    copyInfo
                  }
                  disabled={
                    !walletAddress
                  }
                >
                  COPY WALLET & START PAYMENT
                </button>
              )}
          </section>
        )}

        {/* ==================== TIMER ==================== */}

        {paymentVisible &&
          !order.transaction_submitted && (
            <section className="timer-card">
              <span>
                PAYMENT WINDOW
              </span>

              <strong>
                {timerText}
              </strong>

              <p>
                Complete your payment before
                the timer reaches zero.
              </p>
            </section>
          )}

        {/* ==================== SCREENSHOT ==================== */}

        {!order.transaction_submitted && (
          <section className="upload-card">
            <p className="section-label">
              PAYMENT SCREENSHOT
            </p>

            <h2>
              Upload your transaction
              screenshot
            </h2>

            <p className="upload-help">
              After sending your payment,
              upload the screenshot here.
            </p>

            {transactionPreview && (
              <div className="transaction-preview">
                <img
                  src={
                    transactionPreview
                  }
                  alt="Transaction preview"
                />
              </div>
            )}

            <label className="upload-button">
              {uploading
                ? "UPLOADING..."
                : transactionUploaded
                ? "CONFIRMED ✓"
                : "UPLOAD IMAGE"}

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={
                  selectTransactionImage
                }
                disabled={
                  uploading ||
                  submitting
                }
              />
            </label>

            {uploadError && (
              <div className="upload-error">
                {uploadError}
              </div>
            )}

            {submissionMessage && (
              <div className="upload-success">
                {submissionMessage}
              </div>
            )}

            <button
              type="button"
              className="confirm-button"
              onClick={
                completePaymentSubmission
              }
              disabled={
                submitting ||
                uploading ||
                !transactionUploaded
              }
            >
              {submitting
                ? "SENDING TO ADMIN..."
                : transactionUploaded
                ? "CONFIRM PAYMENT"
                : "UPLOAD IMAGE FIRST"}
            </button>
          </section>
        )}

        {/* ==================== SUBMITTED ==================== */}

        {order.transaction_submitted && (
          <section className="submitted-card">
            <div className="submitted-icon">
              ✓
            </div>

            <h2>
              PAYMENT SUBMITTED
            </h2>

            <p>
              Your transaction screenshot
              has been sent to the Kakobuy
              admin for review.
            </p>

            <div className="submitted-order">
              Order #
              {String(order.id)}
            </div>
          </section>
        )}

        {/* ==================== FOOTER ==================== */}

        <footer>
          {paymentMethod?.footer_text ||
            "KAKOBUY"}
        </footer>
      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .payment-page {
          min-height: 100vh;
          background: #080808;
          color: #fff;
          padding: 20px 14px 45px;
          font-family:
            Inter,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        .payment-container {
          width: 100%;
          max-width: 680px;
          margin: 0 auto;
        }

        .payment-header {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          align-items: flex-start;
          margin-bottom: 15px;
        }

        .payment-header h1 {
          margin: 0;
          font-size: 25px;
          line-height: 1.1;
        }

        .payment-header p {
          margin: 6px 0 0;
          color: #777;
          font-size: 11px;
        }

        .method-badge {
          padding: 8px 10px;
          border: 1px solid #292929;
          border-radius: 9px;
          background: #111;
          color: #aaa;
          font-size: 10px;
          font-weight: 800;
          white-space: nowrap;
        }

        .order-card,
        .payment-card,
        .timer-card,
        .upload-card,
        .submitted-card,
        .loading-card,
        .error-card {
          background: #101010;
          border: 1px solid #292929;
          border-radius: 17px;
          padding: 18px;
          margin-bottom: 14px;
        }

        .order-card-header {
          display: flex;
          justify-content: space-between;
          gap: 15px;
        }

        .order-card-header span,
        .amount-box span,
        .wallet-box > span,
        .timer-card > span,
        .section-label {
          display: block;
          color: #666;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .12em;
        }

        .order-card-header strong {
          display: block;
          margin-top: 5px;
          font-size: 17px;
        }

        .order-total {
          text-align: right;
        }

        .order-total strong {
          color: #fff;
        }

        .buyer-name {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #242424;
          color: #aaa;
          font-size: 12px;
        }

        .items-section {
          margin-top: 17px;
        }

        .section-label {
          margin: 0 0 9px;
        }

        .items-list {
          display: grid;
          gap: 8px;
        }

        .item-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 12px;
          border: 1px solid #242424;
          border-radius: 11px;
          background: #151515;
        }

        .item-main {
          min-width: 0;
        }

        .item-main strong {
          display: block;
          font-size: 12px;
          word-break: break-word;
        }

        .item-options {
          display: flex;
          flex-wrap: wrap;
          gap: 5px 10px;
          margin-top: 6px;
          color: #777;
          font-size: 9px;
        }

        .item-price {
          flex: 0 0 auto;
          font-size: 12px;
          font-weight: 800;
        }

        .no-items {
          color: #666;
          font-size: 11px;
        }

        .payment-card-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .payment-card-title > span {
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #181818;
          font-size: 20px;
        }

        .payment-card-title h2,
        .upload-card h2,
        .submitted-card h2 {
          margin: 0;
          font-size: 17px;
        }

        .payment-card-title p {
          margin: 4px 0 0;
          color: #777;
          font-size: 10px;
          line-height: 1.5;
        }

        .qr-wrapper {
          margin: 17px auto;
          width: 220px;
          max-width: 100%;
          padding: 10px;
          background: #fff;
          border-radius: 12px;
        }

        .qr-wrapper img {
          display: block;
          width: 100%;
          height: auto;
        }

        .wallet-box,
        .amount-box {
          margin-top: 12px;
          padding: 12px;
          border-radius: 11px;
          background: #080808;
          border: 1px solid #292929;
        }

        .wallet-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
        }

        .wallet-row code {
          min-width: 0;
          flex: 1;
          color: #bbb;
          font-size: 10px;
          word-break: break-all;
        }

        .wallet-row button {
          border: 1px solid #444;
          background: #181818;
          color: #fff;
          border-radius: 8px;
          padding: 8px 10px;
          font-size: 9px;
          font-weight: 800;
        }

        .amount-box strong {
          display: block;
          margin-top: 5px;
          font-size: 20px;
        }

        .pay-button,
        .confirm-button {
          width: 100%;
          min-height: 47px;
          margin-top: 14px;
          border: 0;
          border-radius: 11px;
          background: #ff3030;
          color: #fff;
          font-weight: 900;
          cursor: pointer;
        }

        .pay-button:disabled,
        .confirm-button:disabled {
          opacity: .45;
          cursor: not-allowed;
        }

        .timer-card {
          text-align: center;
          border-color: rgba(255, 48, 48, .35);
        }

        .timer-card strong {
          display: block;
          margin-top: 4px;
          color: #ff5050;
          font-size: 31px;
        }

        .timer-card p {
          margin: 5px 0 0;
          color: #666;
          font-size: 10px;
        }

        .upload-card h2 {
          margin-top: 3px;
        }

        .upload-help {
          color: #777;
          font-size: 10px;
          line-height: 1.5;
        }

        .transaction-preview {
          margin: 12px 0;
          padding: 8px;
          border-radius: 11px;
          background: #080808;
          border: 1px solid #292929;
        }

        .transaction-preview img {
          display: block;
          width: 100%;
          max-height: 400px;
          object-fit: contain;
          border-radius: 7px;
        }

        .upload-button {
          display: grid;
          place-items: center;
          min-height: 46px;
          border: 1px dashed #444;
          border-radius: 10px;
          background: #151515;
          color: #fff;
          font-size: 11px;
          font-weight: 900;
          cursor: pointer;
        }

        .upload-button input {
          display: none;
        }

        .upload-error,
        .upload-success {
          margin-top: 10px;
          padding: 10px;
          border-radius: 9px;
          font-size: 10px;
          line-height: 1.5;
        }

        .upload-error {
          background: rgba(255, 48, 48, .08);
          border: 1px solid rgba(255, 48, 48, .3);
          color: #ff7777;
        }

        .upload-success {
          background: rgba(32, 182, 107, .08);
          border: 1px solid rgba(32, 182, 107, .3);
          color: #58d995;
        }

        .submitted-card {
          text-align: center;
        }

        .submitted-icon {
          width: 52px;
          height: 52px;
          margin: 0 auto 10px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: rgba(32, 182, 107, .12);
          color: #35c87d;
          font-size: 25px;
          font-weight: 900;
        }

        .submitted-card p {
          color: #777;
          font-size: 11px;
          line-height: 1.6;
        }

        .submitted-order {
          display: inline-block;
          margin-top: 6px;
          padding: 8px 10px;
          border-radius: 8px;
          background: #181818;
          color: #aaa;
          font-size: 10px;
        }

        .loading-card,
        .error-card {
          text-align: center;
          margin-top: 30px;
        }

        .loading-card h2,
        .error-card h2 {
          font-size: 15px;
        }

        .loading-card p,
        .error-card p {
          color: #777;
          font-size: 11px;
        }

        .error-card button {
          min-height: 44px;
          padding: 0 18px;
          border: 0;
          border-radius: 9px;
          background: #ff3030;
          color: #fff;
          font-weight: 800;
        }

        footer {
          text-align: center;
          color: #555;
          font-size: 10px;
          padding-top: 8px;
        }

        @media (max-width: 520px) {
          .payment-page {
            padding: 15px 11px 35px;
          }

          .payment-header {
            flex-direction: column;
          }

          .method-badge {
            align-self: flex-start;
          }

          .order-card-header {
            flex-direction: column;
          }

          .order-total {
            text-align: left;
          }

          .wallet-row {
            align-items: stretch;
            flex-direction: column;
          }

          .wallet-row button {
            min-height: 40px;
          }
        }
      `}</style>
    </main>
  )
}
