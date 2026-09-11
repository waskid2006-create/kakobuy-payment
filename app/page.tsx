"use client"

import { useEffect, useState } from "react"

const methods = [
  { id: "bitcoin", name: "Bitcoin", symbol: "₿" },
  { id: "ethereum", name: "Ethereum", symbol: "Ξ" },
  { id: "tron", name: "TRON", symbol: "TRX" },
  { id: "binance", name: "Binance", symbol: "BNB" },
]

const CHECK_ORDER_URL =
  "https://kakobuy-check-order.vercel.app/"

type OrderItem = {
  productId?: number | string
  productName?: string
  product_name?: string
  name?: string
  size?: string
  style?: string
  color?: string
  quantity?: number | string
  unitPrice?: number | string
  unit_price?: number | string
  total?: number | string
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
  payment_status?: string
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

type PaymentStatus =
  | "pending"
  | "confirmed"
  | "failed"

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
    useState(false)

  const [selectedMethod, setSelectedMethod] =
    useState("")

  const [paymentVisible, setPaymentVisible] =
    useState(false)

  const [timeLeft, setTimeLeft] =
    useState(60)

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

  const [statusOpen, setStatusOpen] =
    useState(false)

  const [paymentStatus, setPaymentStatus] =
    useState<PaymentStatus>("pending")

  const [statusLoading, setStatusLoading] =
    useState(false)

  const [details, setDetails] =
    useState<PageDetails>({
      orderId: "",
      email: "",
      total: "",
      method: "",
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
      params.get("method")?.trim().toLowerCase() ||
      ""

    setDetails({
      orderId,
      email,
      total,
      method,
    })

    if (
      method &&
      methods.some(
        (item) => item.id === method
      )
    ) {
      setSelectedMethod(method)
    }
  }, [])

  /* ==================== LOAD ORDER ==================== */

  async function loadOrder() {
    if (!details.orderId) {
      return
    }

    try {
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

  async function loadPaymentMethod(
    methodId: string
  ) {
    if (!methodId) {
      return
    }

    try {
      setPaymentMethodLoading(true)
      setPaymentMethod(null)
      setUploadError("")

      const response =
        await fetch(
          `/api/payment-methods?id=${encodeURIComponent(
            methodId
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

      setPaymentMethod(null)

      setUploadError(
        err instanceof Error
          ? err.message
          : "Unable to load payment method."
      )
    } finally {
      setPaymentMethodLoading(false)
    }
  }

  useEffect(() => {
    if (!details.orderId) {
      return
    }

    loadOrder()
  }, [
    details.orderId,
    details.email,
  ])

  useEffect(() => {
    if (!selectedMethod) {
      setPaymentMethod(null)
      setPaymentMethodLoading(false)
      return
    }

    loadPaymentMethod(selectedMethod)
  }, [selectedMethod])

  useEffect(() => {
    if (
      details.orderId === "" &&
      typeof window !== "undefined"
    ) {
      const hasQuery =
        window.location.search.length > 0

      const params =
        new URLSearchParams(
          window.location.search
        )

      if (
        hasQuery &&
        !params.get("orderId") &&
        !params.get("id")
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

  /* ==================== 60 SECOND PAYMENT TIMER ==================== */

  useEffect(() => {
    if (!paymentVisible) {
      return
    }

    if (timeLeft <= 0) {
      setPaymentVisible(false)
      setCopied(false)

      window.location.href =
        CHECK_ORDER_URL

      return
    }

    const timer =
      window.setInterval(() => {
        setTimeLeft((previous) => {
          if (previous <= 1) {
            window.clearInterval(timer)
            return 0
          }

          return previous - 1
        })
      }, 1000)

    return () => {
      window.clearInterval(timer)
    }
  }, [
    paymentVisible,
    timeLeft,
  ])

  /* ==================== PAYMENT STATUS ==================== */

  function normalizeStatus(
    status?: string
  ): PaymentStatus {
    const normalized =
      String(status || "")
        .trim()
        .toLowerCase()

    if (normalized === "confirmed") {
      return "confirmed"
    }

    if (normalized === "failed") {
      return "failed"
    }

    return "pending"
  }

  async function loadPaymentStatus(
    showLoading = true
  ) {
    if (!details.orderId) {
      return
    }

    if (showLoading) {
      setStatusLoading(true)
    }

    try {
      const params =
        new URLSearchParams()

      params.set(
        "orderId",
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
          `/api/payment-status?${params.toString()}`,
          {
            method: "GET",
            cache: "no-store",
          }
        )

      const data =
        await response.json()

      if (
        !response.ok ||
        !data?.success
      ) {
        throw new Error(
          data?.error ||
            "Unable to check payment status."
        )
      }

      const status =
        normalizeStatus(
          data?.order?.payment_status
        )

      setPaymentStatus(status)

      setOrder(
        (previous) =>
          previous
            ? {
                ...previous,
                payment_status:
                  status,
              }
            : previous
      )
    } catch (err) {
      console.error(
        "Payment status error:",
        err
      )
    } finally {
      if (showLoading) {
        setStatusLoading(false)
      }
    }
  }

  /* ==================== STATUS POPUP POLLING ==================== */

  useEffect(() => {
    if (!statusOpen) {
      return
    }

    loadPaymentStatus(false)

    const interval =
      window.setInterval(() => {
        loadPaymentStatus(false)
      }, 3000)

    return () => {
      window.clearInterval(interval)
    }
  }, [
    statusOpen,
    details.orderId,
    details.email,
  ])

  /* ==================== TIMER DISPLAY ==================== */

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

  /* ==================== CURRENT METHOD ==================== */

  const currentMethod =
    methods.find(
      (item) =>
        item.id === selectedMethod
    )

  const walletAddress =
    paymentMethod?.wallet_address ||
    paymentMethod?.address ||
    ""

  const qrImage =
    paymentMethod?.qr_image ||
    paymentMethod?.qr_image_url ||
    ""

  /* ==================== SELECT METHOD ==================== */

  function chooseMethod(
    methodId: string
  ) {
    setSelectedMethod(methodId)

    setPaymentVisible(false)
    setTimeLeft(60)
    setCopied(false)
    setUploadError("")
    setSubmissionMessage("")
    setTransactionUploaded(false)
    setStatusOpen(false)

    if (
      transactionPreview &&
      transactionPreview.startsWith("blob:")
    ) {
      URL.revokeObjectURL(
        transactionPreview
      )
    }

    setTransactionFile(null)
    setTransactionPreview("")
  }

  /* ==================== COPY WALLET ==================== */

  async function copyInfo() {
    if (!selectedMethod) {
      setUploadError(
        "Please select a payment method first."
      )
      return
    }

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

      /*
       * IMPORTANT:
       * The 60-second timer starts ONLY here,
       * after the buyer successfully copies
       * the wallet address.
       */
      setTimeLeft(60)
      setPaymentVisible(true)

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
            paymentMethod:
              selectedMethod,
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
      transactionPreview.startsWith("blob:")
    ) {
      URL.revokeObjectURL(
        transactionPreview
      )
    }

    const preview =
      URL.createObjectURL(file)

    setTransactionFile(file)
    setTransactionPreview(preview)
    setTransactionUploaded(false)

    await uploadTransactionImage(file)
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

      setTransactionUploaded(true)

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
        "Screenshot uploaded successfully. Tap CONFIRM PAYMENT to send it to admin."
      )
    } catch (err) {
      console.error(
        "Transaction upload error:",
        err
      )

      setTransactionUploaded(false)

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

    if (!selectedMethod) {
      setUploadError(
        "Please select a payment method first."
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
              paymentMethod:
                selectedMethod,
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
                payment_method:
                  selectedMethod,
                payment_status:
                  "pending",
                transaction_submitted:
                  true,
                transaction_submitted_at:
                  data?.order
                    ?.transaction_submitted_at ||
                  new Date().toISOString(),
              }
            : previous
      )

      setPaymentStatus("pending")

      setSubmissionMessage(
        "Payment submitted successfully. Your screenshot has been sent to the admin for review."
      )

      setPaymentVisible(false)

      setTransactionFile(null)

      if (
        transactionPreview &&
        transactionPreview.startsWith("blob:")
      ) {
        URL.revokeObjectURL(
          transactionPreview
        )
      }

      setTransactionPreview("")
      setTransactionUploaded(false)

      await loadOrder()
      await loadPaymentStatus(false)
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

  /* ==================== CLEANUP ==================== */

  useEffect(() => {
    return () => {
      if (
        transactionPreview &&
        transactionPreview.startsWith("blob:")
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
            <div className="loading-orb">
              K
            </div>

            <h2>
              LOADING ORDER...
            </h2>

            <p>
              Please wait while we load
              your order.
            </p>
          </div>
        </div>

        <style jsx>{`
          .payment-page {
            min-height: 100vh;
            background: #070707;
            color: #fff;
            display: grid;
            place-items: center;
            padding: 20px;
            font-family: system-ui, sans-serif;
          }

          .payment-container {
            width: 100%;
            max-width: 680px;
          }

          .loading-card {
            text-align: center;
            padding: 45px 20px;
            border: 1px solid #292929;
            border-radius: 20px;
            background: #101010;
            box-shadow: 0 0 55px rgba(255, 48, 48, .08);
          }

          .loading-orb {
            width: 58px;
            height: 58px;
            margin: 0 auto 18px;
            display: grid;
            place-items: center;
            border-radius: 50%;
            background: #ff3030;
            box-shadow: 0 0 45px rgba(255, 48, 48, .35);
            font-size: 24px;
            font-weight: 950;
            animation: pulse 1.4s infinite;
          }

          h2 {
            font-size: 15px;
          }

          p {
            color: #777;
            font-size: 11px;
          }

          @keyframes pulse {
            50% {
              transform: scale(.85);
              opacity: .65;
            }
          }
        `}</style>
      </main>
    )
  }

  /* ==================== ERROR ==================== */

  if (error || !order) {
    return (
      <main className="payment-page">
        <div className="payment-container">
          <div className="error-card">
            <div className="error-icon">
              !
            </div>

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

        <style jsx>{`
          .payment-page {
            min-height: 100vh;
            background: #070707;
            color: #fff;
            display: grid;
            place-items: center;
            padding: 20px;
            font-family: system-ui, sans-serif;
          }

          .payment-container {
            width: 100%;
            max-width: 680px;
          }

          .error-card {
            text-align: center;
            padding: 35px 20px;
            border: 1px solid #292929;
            border-radius: 20px;
            background: #101010;
          }

          .error-icon {
            width: 50px;
            height: 50px;
            margin: 0 auto 15px;
            display: grid;
            place-items: center;
            border-radius: 50%;
            background: rgba(255, 48, 48, .1);
            color: #ff4444;
            font-size: 22px;
            font-weight: 900;
          }

          h2 {
            font-size: 15px;
          }

          p {
            color: #777;
            font-size: 11px;
            line-height: 1.5;
          }

          button {
            margin-top: 10px;
            min-height: 44px;
            padding: 0 20px;
            border: 0;
            border-radius: 9px;
            background: #ff3030;
            color: #fff;
            font-weight: 900;
          }
        `}</style>
      </main>
    )
  }

  return (
    <main className="payment-page">
      <div className="background-orb orb-one" />
      <div className="background-orb orb-two" />
      <div className="background-orb orb-three" />

      <div className="payment-container">

        {/* ==================== HEADER ==================== */}

        <header className="payment-header">
          <div>
            <div className="brand">
              KAKO<span>BUY</span>
            </div>

            <h1>
              {selectedMethod &&
              paymentMethod?.hero_heading
                ? paymentMethod.hero_heading
                : "PAY WITH CRYPTO"}
            </h1>

            <p>
              {selectedMethod &&
              paymentMethod?.hero_subtitle
                ? paymentMethod.hero_subtitle
                : "Secure and simple crypto payment"}
            </p>
          </div>

          {currentMethod && (
            <div className="method-badge">
              {currentMethod.symbol}{" "}
              {currentMethod.name}
            </div>
          )}
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
                        item.unitPrice ??
                          item.unit_price ??
                          item.total ??
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
                              item.product_name ||
                              item.name ||
                              "Product"}
                          </strong>

                          <div className="item-options">
                            {item.size && (
                              <span>
                                Size:{" "}
                                {item.size}
                              </span>
                            )}

                            {item.style && (
                              <span>
                                Style:{" "}
                                {item.style}
                              </span>
                            )}

                            {item.color && (
                              <span>
                                Color:{" "}
                                {item.color}
                              </span>
                            )}

                            <span>
                              Qty:{" "}
                              {quantity}
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

        {/* ==================== PAYMENT METHOD SELECTOR ==================== */}

        {!order.transaction_submitted && (
          <section className="payment-card">
            <p className="section-label">
              PAYMENT METHOD
            </p>

            <h2 className="select-title">
              Select your payment method
            </h2>

            <div className="method-grid">
              {methods.map(
                (method) => (
                  <button
                    type="button"
                    key={method.id}
                    className={`method-option ${
                      selectedMethod ===
                      method.id
                        ? "selected"
                        : ""
                    }`}
                    onClick={() =>
                      chooseMethod(
                        method.id
                      )
                    }
                  >
                    <span className="method-symbol">
                      {method.symbol}
                    </span>

                    <span>
                      {method.name}
                    </span>
                  </button>
                )
              )}
            </div>

            <div className="warning-box">
              <span>!</span>

              <p>
                Please make sure you select
                the correct payment method
                before continuing.
              </p>
            </div>
          </section>
        )}

        {/* ==================== PAYMENT INFORMATION ==================== */}

        {selectedMethod &&
          !order.transaction_submitted && (
            <>
              {paymentMethodLoading ? (
                <section className="payment-card loading-payment">
                  <div className="loading-small">
                    <span />
                    Loading payment details...
                  </div>
                </section>
              ) : (
                <section className="payment-card payment-details-card">

                  <div className="payment-card-title">
                    <span>
                      {currentMethod?.symbol}
                    </span>

                    <div>
                      <p className="mini-label">
                        PAYMENT METHOD
                      </p>

                      <h2>
                        {currentMethod?.name}
                      </h2>

                      <p className="payment-info">
                        {paymentMethod?.information ||
                          "Send the exact amount to the wallet below."}
                      </p>
                    </div>
                  </div>

                  {qrImage && (
                    <div className="qr-area">
                      <div className="qr-title">
                        QR CODE
                      </div>

                      <div className="qr-wrapper">
                        <img
                          src={qrImage}
                          alt={`${currentMethod?.name} QR code`}
                        />
                      </div>

                      <p>
                        Scan to make payment
                      </p>
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
                        onClick={copyInfo}
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
                      {orderTotal.toFixed(2)}
                    </strong>
                  </div>

                  {!paymentVisible && (
                    <button
                      type="button"
                      className="pay-button"
                      onClick={copyInfo}
                      disabled={
                        !walletAddress
                      }
                    >
                      COPY WALLET & START PAYMENT
                    </button>
                  )}
                </section>
              )}
            </>
          )}

        {/* ==================== TIMER ==================== */}

        {paymentVisible &&
          !order.transaction_submitted && (
            <section
              className={`timer-card ${
                timeLeft <= 10
                  ? "danger"
                  : ""
              }`}
            >
              <div className="timer-glow" />

              <div className="timer-top">
                <span>
                  60 SECOND PAYMENT WINDOW
                </span>

                <span>
                  {timeLeft > 0
                    ? "ACTIVE"
                    : "EXPIRED"}
                </span>
              </div>

              <strong>
                {timerText}
              </strong>

              <p>
                The countdown started when
                you copied the wallet address.
                When it reaches zero, you will
                return to the order page.
              </p>

              <div className="timer-bar">
                <div
                  style={{
                    width: `${Math.max(
                      0,
                      Math.min(
                        100,
                        (timeLeft /
                          60) *
                          100
                      )
                    )}%`,
                  }}
                />
              </div>
            </section>
          )}

        {/* ==================== SCREENSHOT ==================== */}

        {selectedMethod &&
          !order.transaction_submitted && (
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
                <span>
                  {uploading
                    ? "UPLOADING..."
                    : transactionUploaded
                    ? "CONFIRMED ✓"
                    : "UPLOAD IMAGE"}
                </span>

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

            <p className="section-label">
              PAYMENT SUBMISSION
            </p>

            <h2>
              PAYMENT SENT TO ADMIN
            </h2>

            <p>
              Your transaction screenshot
              has been sent to Kakobuy for
              payment verification.
            </p>

            <div className="submitted-order">
              ORDER #
              {String(order.id)}
            </div>

            <button
              type="button"
              className="status-button"
              onClick={async () => {
                setStatusOpen(true)
                await loadPaymentStatus(true)
              }}
            >
              {statusLoading
                ? "CHECKING STATUS..."
                : "PAYMENT STATUS"}
            </button>
          </section>
        )}

        {/* ==================== STATUS POPUP ==================== */}

        {statusOpen && (
          <div
            className="status-overlay"
            onClick={() =>
              setStatusOpen(false)
            }
          >
            <div
              className="status-popup"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <div className="popup-orb orb-a" />
              <div className="popup-orb orb-b" />

              <button
                type="button"
                className="status-close"
                onClick={() =>
                  setStatusOpen(false)
                }
              >
                ×
              </button>

              <div
                className={`status-avatar ${paymentStatus}`}
              >
                {paymentStatus ===
                "confirmed"
                  ? "✓"
                  : paymentStatus ===
                    "failed"
                  ? "!"
                  : "…"}
              </div>

              <p className="status-small">
                KAKOBUY PAYMENT
              </p>

              <h2>
                {paymentStatus ===
                "confirmed"
                  ? "Payment Confirmed"
                  : paymentStatus ===
                    "failed"
                  ? "Payment Failed"
                  : "Payment Pending"}
              </h2>

              <div
                className={`status-pill ${paymentStatus}`}
              >
                <span />
                {paymentStatus.toUpperCase()}
              </div>

              <p className="status-message">
                {paymentStatus ===
                "confirmed"
                  ? "Your payment has been verified and confirmed by the Kakobuy admin."
                  : paymentStatus ===
                    "failed"
                  ? "The Kakobuy admin could not confirm this payment. Please contact Kakobuy for assistance."
                  : "Your payment screenshot has been received. The Kakobuy admin is reviewing your payment."}
              </p>

              <div className="status-order">
                ORDER #
                {String(order.id)}
              </div>

              <button
                type="button"
                className="check-again"
                onClick={() =>
                  loadPaymentStatus(true)
                }
                disabled={statusLoading}
              >
                {statusLoading
                  ? "CHECKING..."
                  : "CHECK AGAIN"}
              </button>

              <p className="controlled-text">
                Status is controlled by Kakobuy
                Admin.
              </p>
            </div>
          </div>
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
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(
              circle at 10% 10%,
              rgba(255, 25, 25, .18),
              transparent 30%
            ),
            radial-gradient(
              circle at 90% 35%,
              rgba(255, 25, 25, .14),
              transparent 32%
            ),
            #070707;
          color: #fff;
          padding: 18px 13px 45px;
          font-family:
            Inter,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        .background-orb {
          position: fixed;
          width: 280px;
          height: 280px;
          border-radius: 50%;
          background: rgba(255, 30, 30, .07);
          filter: blur(75px);
          pointer-events: none;
          animation: floatOrb 7s ease-in-out infinite;
        }

        .orb-one {
          top: -110px;
          left: -130px;
        }

        .orb-two {
          right: -130px;
          bottom: 10%;
          animation-delay: -3s;
        }

        .orb-three {
          width: 180px;
          height: 180px;
          left: 40%;
          top: 48%;
          opacity: .5;
          animation-delay: -5s;
        }

        .payment-container {
          width: 100%;
          max-width: 680px;
          margin: 0 auto;
          position: relative;
          z-index: 2;
        }

        .payment-header {
          position: relative;
          display: flex;
          justify-content: space-between;
          gap: 15px;
          align-items: flex-start;
          margin-bottom: 20px;
          animation: slideDown .7s ease both;
        }

        .brand {
          color: #fff;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: .12em;
          margin-bottom: 13px;
        }

        .brand span {
          color: #ff3030;
        }

        .payment-header h1 {
          margin: 0;
          font-size: clamp(27px, 8vw, 42px);
          line-height: .98;
          letter-spacing: -.055em;
          animation: slideUp .7s .08s ease both;
        }

        .payment-header p {
          margin: 8px 0 0;
          color: #777;
          font-size: 11px;
          animation: slideUp .7s .16s ease both;
        }

        .method-badge {
          padding: 8px 10px;
          border: 1px solid rgba(255, 48, 48, .3);
          border-radius: 9px;
          background: rgba(255, 48, 48, .06);
          color: #ff7070;
          font-size: 9px;
          font-weight: 900;
          white-space: nowrap;
          box-shadow: 0 0 22px rgba(255, 48, 48, .07);
          animation: badgeFloat 2.5s ease-in-out infinite;
        }

        .order-card,
        .payment-card,
        .timer-card,
        .upload-card,
        .submitted-card {
          position: relative;
          background: rgba(15, 15, 15, .94);
          border: 1px solid #292929;
          border-radius: 18px;
          padding: 18px;
          margin-bottom: 14px;
          box-shadow: 0 15px 45px rgba(0,0,0,.18);
          animation: cardEnter .55s ease both;
        }

        .order-card::before,
        .payment-details-card::before,
        .upload-card::before,
        .submitted-card::before {
          content: "";
          position: absolute;
          left: 20px;
          right: 20px;
          top: -1px;
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255,48,48,.8),
            transparent
          );
        }

        .order-card-header {
          display: flex;
          justify-content: space-between;
          gap: 15px;
        }

        .order-card-header span,
        .amount-box span,
        .wallet-box > span,
        .section-label,
        .mini-label {
          display: block;
          color: #666;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: .13em;
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
          color: #ff5555;
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
          background: #121212;
          transition: .2s ease;
        }

        .item-row:hover {
          border-color: rgba(255,48,48,.3);
          transform: translateY(-1px);
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

        .select-title {
          margin: 0 0 13px;
          font-size: 17px;
        }

        .method-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }

        .method-option {
          min-height: 80px;
          border: 1px solid #292929;
          border-radius: 12px;
          background: #111;
          color: #888;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 9px;
          font-weight: 900;
          cursor: pointer;
          transition: .22s ease;
        }

        .method-option:hover {
          transform: translateY(-2px);
          border-color: #555;
        }

        .method-option.selected {
          border-color: #ff3030;
          background: rgba(255, 48, 48, .09);
          color: #fff;
          box-shadow:
            0 0 28px rgba(255, 48, 48, .13),
            inset 0 0 20px rgba(255, 48, 48, .04);
          animation: selectedPulse 1.8s infinite;
        }

        .method-symbol {
          color: #aaa;
          font-size: 21px;
          font-weight: 950;
        }

        .method-option.selected .method-symbol {
          color: #ff4444;
        }

        .warning-box {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          margin-top: 15px;
          padding: 10px;
          border-radius: 10px;
          background: rgba(255, 48, 48, .06);
          border: 1px solid rgba(255, 48, 48, .18);
        }

        .warning-box > span {
          color: #ff3030;
          font-size: 17px;
          font-weight: 950;
        }

        .warning-box p {
          margin: 2px 0 0;
          color: #ff7777;
          font-size: 9px;
          line-height: 1.5;
        }

        .payment-card-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .payment-card-title > span {
          width: 44px;
          height: 44px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: rgba(255, 48, 48, .08);
          border: 1px solid rgba(255, 48, 48, .2);
          color: #ff4444;
          font-size: 21px;
          font-weight: 950;
          box-shadow: 0 0 25px rgba(255,48,48,.08);
          animation: iconGlow 2s infinite;
        }

        .payment-card-title h2 {
          margin: 3px 0 0;
          font-size: 18px;
        }

        .payment-info {
          margin: 5px 0 0;
          color: #777;
          font-size: 10px;
          line-height: 1.5;
        }

        .loading-payment {
          color: #666;
          text-align: center;
        }

        .loading-small {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
        }

        .loading-small span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #ff3030;
          box-shadow: 0 0 15px #ff3030;
          animation: pulse 1s infinite;
        }

        .qr-area {
          margin: 19px auto 5px;
          text-align: center;
        }

        .qr-title {
          color: #888;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: .13em;
          margin-bottom: 9px;
        }

        .qr-wrapper {
          width: 215px;
          max-width: 100%;
          margin: auto;
          padding: 10px;
          background: #fff;
          border-radius: 13px;
          box-shadow: 0 0 35px rgba(255,255,255,.04);
        }

        .qr-wrapper img {
          display: block;
          width: 100%;
          height: auto;
        }

        .qr-area p {
          margin: 8px 0 0;
          color: #666;
          font-size: 9px;
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
          flex: 0 0 auto;
          border: 1px solid #444;
          background: #181818;
          color: #fff;
          border-radius: 8px;
          padding: 9px 11px;
          font-size: 8px;
          font-weight: 900;
          cursor: pointer;
          transition: .2s ease;
        }

        .wallet-row button:hover {
          border-color: #ff3030;
          box-shadow: 0 0 18px rgba(255,48,48,.12);
        }

        .amount-box strong {
          display: block;
          margin-top: 5px;
          color: #fff;
          font-size: 21px;
        }

        .pay-button,
        .confirm-button,
        .status-button {
          width: 100%;
          min-height: 48px;
          margin-top: 14px;
          border: 0;
          border-radius: 11px;
          background: #ff3030;
          color: #fff;
          font-weight: 950;
          font-size: 10px;
          cursor: pointer;
          box-shadow: 0 10px 28px rgba(255,48,48,.12);
          transition: .2s ease;
        }

        .pay-button:hover,
        .confirm-button:hover,
        .status-button:hover {
          background: #ff4545;
          transform: translateY(-1px);
          box-shadow:
            0 0 25px rgba(255,48,48,.18),
            0 10px 28px rgba(255,48,48,.14);
        }

        .pay-button:disabled,
        .confirm-button:disabled,
        .status-button:disabled {
          opacity: .45;
          cursor: not-allowed;
          transform: none;
        }

        .timer-card {
          text-align: center;
          overflow: hidden;
          border-color: rgba(255, 48, 48, .35);
          background:
            radial-gradient(
              circle at 50% 0,
              rgba(255,48,48,.12),
              transparent 50%
            ),
            #101010;
          box-shadow: 0 0 35px rgba(255,48,48,.08);
        }

        .timer-glow {
          position: absolute;
          width: 130px;
          height: 130px;
          left: calc(50% - 65px);
          top: 20px;
          border-radius: 50%;
          background: rgba(255,48,48,.08);
          filter: blur(30px);
          animation: timerGlow 2s infinite;
          pointer-events: none;
        }

        .timer-top {
          position: relative;
          z-index: 1;
          display: flex;
          justify-content: space-between;
          color: #666;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: .1em;
        }

        .timer-card strong {
          position: relative;
          z-index: 1;
          display: block;
          margin-top: 5px;
          color: #ff4b4b;
          font-size: 37px;
          letter-spacing: .05em;
          text-shadow: 0 0 25px rgba(255,48,48,.25);
        }

        .timer-card p {
          position: relative;
          z-index: 1;
          margin: 5px 0 12px;
          color: #666;
          font-size: 9px;
          line-height: 1.5;
        }

        .timer-bar {
          position: relative;
          z-index: 1;
          height: 4px;
          overflow: hidden;
          border-radius: 99px;
          background: #292929;
        }

        .timer-bar div {
          height: 100%;
          border-radius: inherit;
          background: #ff3030;
          box-shadow: 0 0 10px #ff3030;
          transition: width 1s linear;
        }

        .timer-card.danger strong {
          animation: dangerPulse .55s infinite;
        }

        .upload-card h2 {
          margin: 3px 0 0;
          font-size: 17px;
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
          animation: slideUp .3s ease both;
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
          min-height: 47px;
          border: 1px dashed #444;
          border-radius: 10px;
          background: #151515;
          color: #fff;
          font-size: 10px;
          font-weight: 900;
          cursor: pointer;
          transition: .2s ease;
        }

        .upload-button:hover {
          border-color: #ff3030;
          background: #181010;
          box-shadow: 0 0 25px rgba(255,48,48,.06);
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
          background: rgba(255,48,48,.08);
          border: 1px solid rgba(255,48,48,.3);
          color: #ff7777;
        }

        .upload-success {
          background: rgba(32,182,107,.08);
          border: 1px solid rgba(32,182,107,.3);
          color: #58d995;
        }

        .submitted-card {
          text-align: center;
          animation: slideUp .45s ease both;
        }

        .submitted-icon {
          width: 58px;
          height: 58px;
          margin: 0 auto 12px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: rgba(32,182,107,.1);
          border: 1px solid rgba(32,182,107,.22);
          color: #35c87d;
          font-size: 26px;
          font-weight: 900;
          box-shadow: 0 0 30px rgba(32,182,107,.08);
          animation: successPulse 2s infinite;
        }

        .submitted-card h2 {
          margin: 0;
          font-size: 18px;
        }

        .submitted-card p:not(.section-label) {
          color: #777;
          font-size: 10px;
          line-height: 1.6;
        }

        .submitted-order {
          display: inline-block;
          margin-top: 5px;
          padding: 8px 11px;
          border-radius: 8px;
          background: #181818;
          color: #aaa;
          font-size: 9px;
        }

        .status-button {
          background: linear-gradient(
            135deg,
            #ff3030,
            #b90000
          );
          box-shadow:
            0 0 25px rgba(255,48,48,.16),
            0 10px 30px rgba(0,0,0,.2);
        }

        /* ================= STATUS POPUP ================= */

        .status-overlay {
          position: fixed;
          inset: 0;
          z-index: 999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
          background: rgba(0,0,0,.78);
          backdrop-filter: blur(10px);
          animation: fadeIn .2s ease;
        }

        .status-popup {
          width: 100%;
          max-width: 370px;
          position: relative;
          overflow: hidden;
          padding: 30px 22px 22px;
          text-align: center;
          border: 1px solid #303030;
          border-radius: 22px;
          background:
            radial-gradient(
              circle at 50% -20%,
              rgba(255,48,48,.17),
              transparent 48%
            ),
            #111;
          box-shadow:
            0 0 80px rgba(255,48,48,.12),
            0 25px 70px rgba(0,0,0,.5);
          animation: profilePop .35s cubic-bezier(.2,.8,.2,1);
        }

        .status-popup::before {
          content: "";
          position: absolute;
          left: 15%;
          right: 15%;
          top: 0;
          height: 2px;
          background: #ff3030;
          box-shadow: 0 0 18px #ff3030;
        }

        .popup-orb {
          position: absolute;
          width: 110px;
          height: 110px;
          border-radius: 50%;
          background: rgba(255,48,48,.07);
          filter: blur(30px);
          pointer-events: none;
        }

        .orb-a {
          top: -45px;
          left: -40px;
          animation: popupOrb 4s infinite;
        }

        .orb-b {
          right: -40px;
          bottom: -45px;
          animation: popupOrb 4s -2s infinite;
        }

        .status-close {
          position: absolute;
          right: 12px;
          top: 12px;
          width: 31px;
          height: 31px;
          border: 1px solid #292929;
          border-radius: 50%;
          background: #181818;
          color: #aaa;
          font-size: 20px;
          cursor: pointer;
          z-index: 3;
        }

        .status-close:hover {
          color: #fff;
          border-color: #ff3030;
        }

        .status-avatar {
          position: relative;
          z-index: 2;
          width: 76px;
          height: 76px;
          margin: 0 auto 13px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          font-size: 31px;
          font-weight: 950;
          border: 3px solid #555;
          animation: avatarPulse 1.8s infinite;
        }

        .status-avatar.pending {
          color: #ffc04d;
          border-color: #ffc04d;
          background: rgba(255,174,0,.08);
          box-shadow: 0 0 35px rgba(255,174,0,.12);
        }

        .status-avatar.confirmed {
          color: #55e59a;
          border-color: #55e59a;
          background: rgba(30,220,120,.08);
          box-shadow: 0 0 35px rgba(30,220,120,.12);
        }

        .status-avatar.failed {
          color: #ff5b5b;
          border-color: #ff3030;
          background: rgba(255,48,48,.08);
          box-shadow: 0 0 35px rgba(255,48,48,.15);
        }

        .status-small {
          position: relative;
          z-index: 2;
          color: #666;
          font-size: 8px;
          font-weight: 950;
          letter-spacing: .18em;
          margin: 0 0 7px;
        }

        .status-popup h2 {
          position: relative;
          z-index: 2;
          margin: 0;
          font-size: 24px;
          letter-spacing: -.04em;
        }

        .status-pill {
          position: relative;
          z-index: 2;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          margin-top: 13px;
          padding: 7px 11px;
          border-radius: 99px;
          font-size: 8px;
          font-weight: 950;
          letter-spacing: .1em;
        }

        .status-pill span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .status-pill.pending {
          color: #ffc04d;
          background: rgba(255,174,0,.08);
          border: 1px solid rgba(255,174,0,.25);
        }

        .status-pill.pending span {
          background: #ffc04d;
          box-shadow: 0 0 8px #ffc04d;
        }

        .status-pill.confirmed {
          color: #55e59a;
          background: rgba(30,220,120,.08);
          border: 1px solid rgba(30,220,120,.25);
        }

        .status-pill.confirmed span {
          background: #55e59a;
          box-shadow: 0 0 8px #55e59a;
        }

        .status-pill.failed {
          color: #ff6969;
          background: rgba(255,48,48,.08);
          border: 1px solid rgba(255,48,48,.25);
        }

        .status-pill.failed span {
          background: #ff3030;
          box-shadow: 0 0 8px #ff3030;
        }

        .status-message {
          position: relative;
          z-index: 2;
          margin: 17px auto;
          max-width: 310px;
          color: #777;
          font-size: 10px;
          line-height: 1.65;
        }

        .status-order {
          position: relative;
          z-index: 2;
          display: inline-block;
          padding: 8px 11px;
          border-radius: 8px;
          background: #090909;
          border: 1px solid #242424;
          color: #999;
          font-size: 9px;
          font-weight: 900;
        }

        .check-again {
          position: relative;
          z-index: 2;
          width: 100%;
          min-height: 44px;
          margin-top: 15px;
          border: 1px solid #393939;
          border-radius: 10px;
          background: #181818;
          color: #fff;
          font-size: 9px;
          font-weight: 900;
          cursor: pointer;
          transition: .2s ease;
        }

        .check-again:hover {
          border-color: #ff3030;
          box-shadow: 0 0 20px rgba(255,48,48,.08);
        }

        .check-again:disabled {
          opacity: .5;
        }

        .controlled-text {
          position: relative;
          z-index: 2;
          margin: 13px 0 0;
          color: #444;
          font-size: 8px;
        }

        footer {
          text-align: center;
          color: #555;
          font-size: 9px;
          padding-top: 8px;
          letter-spacing: .1em;
          font-weight: 900;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(18px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-15px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes cardEnter {
          from {
            opacity: 0;
            transform: translateY(12px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes selectedPulse {
          0%, 100% {
            box-shadow:
              0 0 20px rgba(255,48,48,.08);
          }

          50% {
            box-shadow:
              0 0 32px rgba(255,48,48,.18);
          }
        }

        @keyframes dangerPulse {
          50% {
            transform: scale(1.04);
            text-shadow:
              0 0 30px rgba(255,48,48,.7);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }

          to {
            opacity: 1;
          }
        }

        @keyframes profilePop {
          from {
            opacity: 0;
            transform:
              translateY(25px)
              scale(.9);
          }

          to {
            opacity: 1;
            transform:
              translateY(0)
              scale(1);
          }
        }

        @keyframes avatarPulse {
          0%, 100% {
            transform: scale(1);
          }

          50% {
            transform: scale(1.045);
          }
        }

        @keyframes floatOrb {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }

          50% {
            transform: translate(25px, 18px) scale(1.08);
          }
        }

        @keyframes badgeFloat {
          0%, 100% {
            transform: translateY(0);
          }

          50% {
            transform: translateY(-3px);
          }
        }

        @keyframes iconGlow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(255,48,48,.06);
          }

          50% {
            box-shadow: 0 0 30px rgba(255,48,48,.16);
          }
        }

        @keyframes timerGlow {
          0%, 100% {
            opacity: .5;
            transform: scale(.9);
          }

          50% {
            opacity: 1;
            transform: scale(1.15);
          }
        }

        @keyframes successPulse {
          0%, 100% {
            box-shadow: 0 0 25px rgba(32,182,107,.06);
          }

          50% {
            box-shadow: 0 0 38px rgba(32,182,107,.16);
          }
        }

        @keyframes popupOrb {
          0%, 100% {
            transform: translate(0, 0);
          }

          50% {
            transform: translate(15px, -12px);
          }
        }

        @keyframes pulse {
          50% {
            transform: scale(.85);
            opacity: .65;
          }
        }

        @media (max-width: 520px) {
          .payment-page {
            padding: 15px 10px 35px;
          }

          .payment-header {
            flex-direction: column;
          }

          .method-badge {
            align-self: flex-start;
          }

          .method-grid {
            grid-template-columns: repeat(2, 1fr);
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

          .status-popup {
            max-width: 355px;
          }
        }
      `}</style>
    </main>
  )
}
