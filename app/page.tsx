"use client"

import { useEffect, useState } from "react"

const CHECK_ORDER_URL =
  "https://kakobuy-check-order.vercel.app/"

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

type OrderItem = {
  id: number
  product_id: number
  product_name: string
  size: string | null
  style: string | null
  color: string | null
  quantity: number
  unit_price: number
  total: number
}

type Order = {
  id: number
  product_name: string
  size: string | null
  color: string | null
  style: string | null
  quantity: number
  unit_price: number
  subtotal: number
  shipping: number
  discount: number
  total: number
  full_name: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  country: string
  delivery_date: string | null
  payment_status: string | null
  payment_method: string | null
  created_at: string
  items?: OrderItem[]
  transaction_image?: string | null
  transaction_submitted?: boolean
  transaction_submitted_at?: string | null
  wallet_copied?: boolean
  wallet_copied_at?: string | null
  updated_at?: string | null
}

type PaymentMethod = {
  id: string
  name: string
  information: string | null
  wallet_address: string | null
  qr_image: string | null
  hero_title?: string | null
  hero_heading?: string | null
  hero_subtitle?: string | null
  footer_text?: string | null
}

type PaymentStatus =
  | "pending"
  | "confirmed"
  | "failed"

function normalizeStatus(
  value: unknown
): PaymentStatus {
  const status = String(
    value || ""
  ).toLowerCase()

  if (status === "confirmed") {
    return "confirmed"
  }

  if (status === "failed") {
    return "failed"
  }

  return "pending"
}

function formatMoney(
  value: number | string | null | undefined
) {
  const amount = Number(value || 0)

  return `$${amount.toFixed(2)}`
}

function formatTime(seconds: number) {
  const safeSeconds = Math.max(
    0,
    seconds
  )

  const minutes = Math.floor(
    safeSeconds / 60
  )

  const remainingSeconds =
    safeSeconds % 60

  return `${String(minutes).padStart(
    2,
    "0"
  )}:${String(
    remainingSeconds
  ).padStart(2, "0")}`
}

export default function Page() {
  const [order, setOrder] =
    useState<Order | null>(null)

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState("")

  const [
    selectedMethod,
    setSelectedMethod,
  ] = useState("bitcoin")

  const [
    paymentMethod,
    setPaymentMethod,
  ] = useState<PaymentMethod | null>(
    null
  )

  const [
    paymentMethodLoading,
    setPaymentMethodLoading,
  ] = useState(false)

  const [
    paymentVisible,
    setPaymentVisible,
  ] = useState(false)

  /*
   * 5 MINUTES
   * 5 × 60 = 300 SECONDS
   */
  const [timeLeft, setTimeLeft] =
    useState(300)

  const [copied, setCopied] =
    useState(false)

  const [
    transactionFile,
    setTransactionFile,
  ] = useState<File | null>(null)

  const [
    transactionPreview,
    setTransactionPreview,
  ] = useState("")

  const [
    transactionUploaded,
    setTransactionUploaded,
  ] = useState(false)

  const [uploading, setUploading] =
    useState(false)

  const [
    submitting,
    setSubmitting,
  ] = useState(false)

  const [
    submissionMessage,
    setSubmissionMessage,
  ] = useState("")

  const [
    uploadError,
    setUploadError,
  ] = useState("")

  const [statusOpen, setStatusOpen] =
    useState(false)

  const [
    paymentStatus,
    setPaymentStatus,
  ] = useState<PaymentStatus>(
    "pending"
  )

  const [
    statusLoading,
    setStatusLoading,
  ] = useState(false)

  const [details, setDetails] =
    useState({
      orderId: "",
      email: "",
      total: "",
      method: "",
    })

  /*
   * GET URL INFORMATION
   */
  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search
      )

    const orderId =
      params.get("orderId") ||
      params.get("id") ||
      ""

    const email =
      params.get("email") || ""

    const total =
      params.get("total") || ""

    const method =
      params.get("method") || ""

    setDetails({
      orderId,
      email,
      total,
      method,
    })

    if (method) {
      const found = methods.find(
        (item) =>
          item.id.toLowerCase() ===
          method.toLowerCase()
      )

      if (found) {
        setSelectedMethod(
          found.id
        )
      }
    }
  }, [])

  /*
   * LOAD ORDER
   */
  const loadOrder = async () => {
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
            "Unable to load order."
        )
      }

      setOrder(data.order)

      if (
        data.order?.payment_method
      ) {
        const found = methods.find(
          (item) =>
            item.id.toLowerCase() ===
            String(
              data.order
                .payment_method
            ).toLowerCase()
        )

        if (found) {
          setSelectedMethod(
            found.id
          )
        }
      }

      setPaymentStatus(
        normalizeStatus(
          data.order
            ?.payment_status
        )
      )
    } catch (err) {
      console.error(err)

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load order."
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!details.orderId) {
      return
    }

    loadOrder()

    const interval =
      setInterval(
        loadOrder,
        5000
      )

    return () =>
      clearInterval(interval)
  }, [
    details.orderId,
    details.email,
  ])

  /*
   * LOAD PAYMENT METHOD
   */
  const loadPaymentMethod =
    async (
      methodId: string
    ) => {
      try {
        setPaymentMethodLoading(
          true
        )

        const response =
          await fetch(
            `/api/payment-methods?id=${encodeURIComponent(
              methodId
            )}`,
            {
              cache: "no-store",
            }
          )

        const data =
          await response.json()

        if (
          !response.ok ||
          !data?.paymentMethod
        ) {
          throw new Error(
            data?.error ||
              "Unable to load payment information."
          )
        }

        setPaymentMethod(
          data.paymentMethod
        )
      } catch (err) {
        console.error(err)
        setPaymentMethod(null)
      } finally {
        setPaymentMethodLoading(
          false
        )
      }
    }

  useEffect(() => {
    if (!selectedMethod) {
      return
    }

    loadPaymentMethod(
      selectedMethod
    )
  }, [selectedMethod])

  /*
   * =====================================================
   * 5-MINUTE COUNTDOWN
   * =====================================================
   *
   * The countdown ONLY starts after COPY.
   *
   * 300 → 299 → 298 ... → 2 → 1 → 0
   *
   * When it reaches 0:
   *
   *     AUTOMATICALLY GO TO PAGE 2
   *
   * window.location.replace() prevents
   * the expired payment page remaining
   * in browser history.
   */
  useEffect(() => {
    if (!paymentVisible) {
      return
    }

    if (timeLeft <= 0) {
      window.location.replace(
        CHECK_ORDER_URL
      )

      return
    }

    const timer =
      setTimeout(() => {
        setTimeLeft(
          (current) =>
            Math.max(
              0,
              current - 1
            )
        )
      }, 1000)

    return () =>
      clearTimeout(timer)
  }, [
    paymentVisible,
    timeLeft,
  ])

  /*
   * PAYMENT STATUS
   */
  const loadPaymentStatus =
    async (
      showLoading = false
    ) => {
      if (!details.orderId) {
        return
      }

      try {
        if (showLoading) {
          setStatusLoading(true)
        }

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
              cache: "no-store",
            }
          )

        const data =
          await response.json()

        if (
          !response.ok ||
          !data?.success
        ) {
          return
        }

        const currentStatus =
          normalizeStatus(
            data.order
              ?.payment_status
          )

        setPaymentStatus(
          currentStatus
        )

        setOrder(
          (current) => {
            if (!current) {
              return current
            }

            return {
              ...current,
              payment_status:
                currentStatus,
              transaction_image:
                data.order
                  ?.transaction_image ??
                current.transaction_image,
              transaction_submitted:
                data.order
                  ?.transaction_submitted ??
                current.transaction_submitted,
              transaction_submitted_at:
                data.order
                  ?.transaction_submitted_at ??
                current.transaction_submitted_at,
            }
          }
        )
      } catch (err) {
        console.error(
          "Payment status error:",
          err
        )
      } finally {
        if (showLoading) {
          setStatusLoading(
            false
          )
        }
      }
    }

  useEffect(() => {
    if (!statusOpen) {
      return
    }

    loadPaymentStatus(true)

    const interval =
      setInterval(() => {
        loadPaymentStatus(false)
      }, 3000)

    return () =>
      clearInterval(interval)
  }, [
    statusOpen,
    details.orderId,
    details.email,
  ])

  /*
   * COPY WALLET
   *
   * COPY = START 5 MINUTES
   */
  const copyInfo = async () => {
    if (
      !paymentMethod?.wallet_address
    ) {
      alert(
        "Wallet address is not available."
      )

      return
    }

    if (!details.orderId) {
      alert(
        "Order ID is missing."
      )

      return
    }

    try {
      await navigator.clipboard.writeText(
        paymentMethod.wallet_address
      )

      setCopied(true)

      /*
       * IMPORTANT:
       * Start exactly at 5 minutes.
       */
      setTimeLeft(300)

      setPaymentVisible(true)

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
              details.orderId,
            email:
              details.email,
            paymentMethod:
              selectedMethod,
          }),
        }
      )

      setTimeout(() => {
        setCopied(false)
      }, 2500)
    } catch (err) {
      console.error(err)

      alert(
        "Unable to copy wallet address."
      )
    }
  }

  /*
   * SELECT PAYMENT METHOD
   */
  const selectMethod = (
    methodId: string
  ) => {
    if (
      order?.transaction_submitted
    ) {
      return
    }

    setSelectedMethod(
      methodId
    )

    setPaymentVisible(
      false
    )

    setTimeLeft(300)

    setTransactionFile(
      null
    )

    setTransactionPreview(
      ""
    )

    setTransactionUploaded(
      false
    )

    setSubmissionMessage(
      ""
    )

    setUploadError("")
  }

  /*
   * UPLOAD SCREENSHOT
   */
  const handleFileChange =
    async (
      event: React.ChangeEvent<HTMLInputElement>
    ) => {
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
          "Only JPG, PNG or WEBP images are allowed."
        )

        return
      }

      if (
        file.size >
        5 * 1024 * 1024
      ) {
        setUploadError(
          "Image must be less than 5MB."
        )

        return
      }

      setTransactionFile(file)

      const previewUrl =
        URL.createObjectURL(
          file
        )

      setTransactionPreview(
        previewUrl
      )

      try {
        setUploading(true)

        const formData =
          new FormData()

        formData.append(
          "file",
          file
        )

        formData.append(
          "orderId",
          details.orderId
        )

        if (details.email) {
          formData.append(
            "email",
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

        const data =
          await response.json()

        if (
          !response.ok ||
          !data?.success
        ) {
          throw new Error(
            data?.error ||
              "Unable to upload screenshot."
          )
        }

        setTransactionUploaded(
          true
        )

        setSubmissionMessage(
          "Screenshot uploaded successfully. Tap CONFIRM PAYMENT to send it to admin."
        )

        setOrder(
          (current) => {
            if (!current) {
              return current
            }

            return {
              ...current,
              transaction_image:
                data.url ||
                data.transaction_image ||
                current.transaction_image,
            }
          }
        )
      } catch (err) {
        console.error(err)

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

  /*
   * SEND PAYMENT TO ADMIN
   */
  const completePaymentSubmission =
    async () => {
      if (!details.orderId) {
        setSubmissionMessage(
          "Order ID is missing."
        )

        return
      }

      if (
        !transactionUploaded
      ) {
        setSubmissionMessage(
          "Please upload your payment screenshot first."
        )

        return
      }

      try {
        setSubmitting(true)
        setSubmissionMessage("")

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
                  details.orderId,
                email:
                  details.email,
                paymentMethod:
                  selectedMethod,
              }),
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
              "Unable to submit payment."
          )
        }

        setOrder(
          (current) => {
            if (!current) {
              return current
            }

            return {
              ...current,
              payment_method:
                selectedMethod,
              payment_status:
                "pending",
              transaction_submitted:
                true,
              transaction_submitted_at:
                data.order
                  ?.transaction_submitted_at ||
                new Date().toISOString(),
            }
          }
        )

        setPaymentStatus(
          "pending"
        )

        setSubmissionMessage(
          "Payment submitted successfully. Your screenshot has been sent to the admin for review."
        )

        setPaymentVisible(
          false
        )

        setTransactionFile(
          null
        )

        setTransactionPreview(
          ""
        )

        setTransactionUploaded(
          false
        )

        await loadOrder()
        await loadPaymentStatus(
          false
        )
      } catch (err) {
        console.error(err)

        setSubmissionMessage(
          err instanceof Error
            ? err.message
            : "Unable to submit payment."
        )
      } finally {
        setSubmitting(false)
      }
    }

  /*
   * CLEAN PREVIEW
   */
  useEffect(() => {
    return () => {
      if (
        transactionPreview
      ) {
        URL.revokeObjectURL(
          transactionPreview
        )
      }
    }
  }, [transactionPreview])

  /*
   * LOADING
   */
  if (loading) {
    return (
      <main className="screen loading-screen">
        <div className="glow glow-one" />
        <div className="glow glow-two" />

        <div className="loader-box">
          <div className="spinner" />

          <h2>KAKOBUY</h2>

          <p>
            Loading your order...
          </p>
        </div>
      </main>
    )
  }

  /*
   * ERROR
   */
  if (error || !order) {
    return (
      <main className="screen error-screen">
        <div className="glow glow-one" />
        <div className="glow glow-two" />

        <div className="error-box">
          <div className="error-icon">
            !
          </div>

          <h1>
            ORDER NOT FOUND
          </h1>

          <p>
            {error ||
              "We could not find this order."}
          </p>

          <button
            className="primary-button"
            onClick={() => {
              window.location.replace(
                CHECK_ORDER_URL
              )
            }}
          >
            BACK TO ORDER PAGE
          </button>
        </div>
      </main>
    )
  }

  const currentMethod =
    methods.find(
      (method) =>
        method.id ===
        selectedMethod
    )

  const progress =
    Math.max(
      0,
      Math.min(
        100,
        (timeLeft / 300) * 100
      )
    )

  const isSubmitted =
    Boolean(
      order.transaction_submitted
    )

  return (
    <main className="screen">
      <div className="background-grid" />

      <div className="glow glow-one" />
      <div className="glow glow-two" />
      <div className="glow glow-three" />

      <header className="top-header">
        <div className="brand">
          <div className="brand-mark">
            K
          </div>

          <div>
            <div className="brand-name">
              KAKOBUY
            </div>

            <div className="brand-small">
              SECURE PAYMENT
            </div>
          </div>
        </div>

        <button
          className="back-button"
          onClick={() => {
            window.location.replace(
              CHECK_ORDER_URL
            )
          }}
        >
          ← ORDER
        </button>
      </header>

      <section className="hero">
        <div className="hero-tag">
          <span />
          SECURE CRYPTO CHECKOUT
        </div>

        <h1 className="hero-heading">
          {paymentMethod?.hero_heading ||
            "COMPLETE YOUR PAYMENT"}
        </h1>

        <p className="hero-subtitle">
          {paymentMethod?.hero_subtitle ||
            "Select your preferred payment method and complete your order securely."}
        </p>
      </section>

      <section className="content">
        <div className="order-card">
          <div className="section-label">
            ORDER INFORMATION
          </div>

          <div className="order-id-row">
            <span>
              ORDER ID
            </span>

            <strong>
              #{order.id}
            </strong>
          </div>

          <div className="order-product">
            <div>
              <span className="muted">
                PRODUCT
              </span>

              <strong>
                {order.product_name}
              </strong>
            </div>

            <div className="order-total">
              <span className="muted">
                TOTAL
              </span>

              <strong>
                {formatMoney(
                  order.total
                )}
              </strong>
            </div>
          </div>

          <div className="order-details">
            <div>
              <span>
                CUSTOMER
              </span>

              <strong>
                {order.full_name}
              </strong>
            </div>

            <div>
              <span>
                EMAIL
              </span>

              <strong>
                {order.email}
              </strong>
            </div>

            <div>
              <span>
                QUANTITY
              </span>

              <strong>
                {order.quantity}
              </strong>
            </div>
          </div>
        </div>

        {!isSubmitted && (
          <>
            <section className="payment-method-section">
              <div className="section-heading-row">
                <div>
                  <div className="section-label">
                    PAYMENT METHOD
                  </div>

                  <h2>
                    Choose your coin
                  </h2>
                </div>

                <div className="selected-method">
                  {currentMethod?.symbol}{" "}
                  {currentMethod?.name}
                </div>
              </div>

              <div className="methods-grid">
                {methods.map(
                  (method) => {
                    const selected =
                      selectedMethod ===
                      method.id

                    return (
                      <button
                        key={method.id}
                        className={`method-card ${
                          selected
                            ? "selected"
                            : ""
                        }`}
                        onClick={() =>
                          selectMethod(
                            method.id
                          )
                        }
                      >
                        <span className="method-symbol">
                          {method.symbol}
                        </span>

                        <span className="method-name">
                          {method.name}
                        </span>

                        {selected && (
                          <span className="selected-check">
                            ✓
                          </span>
                        )}
                      </button>
                    )
                  }
                )}
              </div>
            </section>

            <section className="payment-card">
              {paymentMethodLoading ? (
                <div className="payment-loading">
                  <div className="small-spinner" />
                  Loading payment information...
                </div>
              ) : (
                <>
                  <div className="payment-card-top">
                    <div>
                      <div className="section-label">
                        {currentMethod?.name ||
                          "PAYMENT"}
                      </div>

                      <h2>
                        Payment details
                      </h2>
                    </div>

                    <div className="coin-badge">
                      {currentMethod?.symbol}
                    </div>
                  </div>

                  {paymentMethod?.information && (
                    <div className="information-box">
                      {paymentMethod.information}
                    </div>
                  )}

                  {paymentMethod?.qr_image && (
                    <div className="qr-section">
                      <div className="qr-title">
                        SCAN QR CODE
                      </div>

                      <p>
                        Scan this QR code using your crypto wallet.
                      </p>

                      <div className="qr-box">
                        <img
                          src={
                            paymentMethod.qr_image
                          }
                          alt={`${currentMethod?.name} QR code`}
                        />
                      </div>
                    </div>
                  )}

                  <div className="wallet-section">
                    <div className="wallet-label">
                      WALLET ADDRESS
                    </div>

                    <div className="wallet-box">
                      <span>
                        {paymentMethod?.wallet_address ||
                          "Wallet address unavailable"}
                      </span>

                      <button
                        onClick={
                          copyInfo
                        }
                        disabled={
                          !paymentMethod?.wallet_address
                        }
                        className="copy-button"
                      >
                        {copied
                          ? "COPIED ✓"
                          : "COPY"}
                      </button>
                    </div>
                  </div>

                  <div className="amount-box">
                    <span>
                      AMOUNT TO PAY
                    </span>

                    <strong>
                      {formatMoney(
                        order.total
                      )}
                    </strong>
                  </div>

                  {!paymentVisible && (
                    <button
                      className="pay-button"
                      onClick={
                        copyInfo
                      }
                      disabled={
                        !paymentMethod?.wallet_address
                      }
                    >
                      COPY WALLET & START PAYMENT
                    </button>
                  )}

                  {paymentVisible && (
                    <div className="active-payment">
                      <div className="active-dot" />
                      PAYMENT SESSION ACTIVE
                    </div>
                  )}
                </>
              )}
            </section>

            {paymentVisible && (
              <>
                <section className="timer-card">
                  <div className="timer-top">
                    <div>
                      <div className="section-label">
                        5 MINUTE PAYMENT WINDOW
                      </div>

                      <h2>
                        Complete payment before time expires
                      </h2>
                    </div>

                    <div
                      className={`timer ${
                        timeLeft <= 30
                          ? "danger"
                          : ""
                      }`}
                    >
                      {formatTime(
                        timeLeft
                      )}
                    </div>
                  </div>

                  <div className="timer-bar">
                    <div
                      className="timer-progress"
                      style={{
                        width: `${progress}%`,
                      }}
                    />
                  </div>

                  <p className="timer-note">
                    The countdown started when
                    you copied the wallet address.
                    When it reaches 00:00, you
                    will automatically return to
                    the order page.
                  </p>
                </section>

                <section className="upload-card">
                  <div className="section-label">
                    PAYMENT PROOF
                  </div>

                  <h2>
                    Upload payment screenshot
                  </h2>

                  <p>
                    Upload a clear screenshot showing
                    your payment.
                  </p>

                  <label className="upload-area">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={
                        handleFileChange
                      }
                    />

                    <div className="upload-icon">
                      ↑
                    </div>

                    <strong>
                      {uploading
                        ? "UPLOADING..."
                        : "SELECT SCREENSHOT"}
                    </strong>

                    <span>
                      JPG, PNG or WEBP • MAX 5MB
                    </span>
                  </label>

                  {transactionPreview && (
                    <div className="preview-box">
                      <img
                        src={
                          transactionPreview
                        }
                        alt="Payment screenshot preview"
                      />
                    </div>
                  )}

                  {transactionUploaded && (
                    <div className="upload-success">
                      <span>
                        ✓
                      </span>

                      <div>
                        <strong>
                          CONFIRMED
                        </strong>

                        <p>
                          Screenshot uploaded successfully.
                        </p>
                      </div>
                    </div>
                  )}

                  {uploadError && (
                    <div className="upload-error">
                      {uploadError}
                    </div>
                  )}

                  {submissionMessage && (
                    <div className="submission-message">
                      {submissionMessage}
                    </div>
                  )}

                  <button
                    className="submit-button"
                    onClick={
                      completePaymentSubmission
                    }
                    disabled={
                      !transactionUploaded ||
                      submitting
                    }
                  >
                    {submitting
                      ? "SENDING TO ADMIN..."
                      : "CONFIRM PAYMENT / SEND TO ADMIN"}
                  </button>
                </section>
              </>
            )}
          </>
        )}

        {isSubmitted && (
          <section className="submitted-card">
            <div className="submitted-icon">
              ✓
            </div>

            <div>
              <div className="section-label">
                PAYMENT SUBMITTED
              </div>

              <h2>
                Your payment is under review
              </h2>

              <p>
                Your payment screenshot has been
                sent to the admin. The admin will
                review your payment and update your
                payment status.
              </p>
            </div>

            <button
              className="status-button"
              onClick={async () => {
                setStatusOpen(true)

                await loadPaymentStatus(
                  true
                )
              }}
            >
              PAYMENT STATUS
            </button>
          </section>
        )}
      </section>

      <footer>
        {paymentMethod?.footer_text ||
          "KAKOBUY • SECURE CRYPTO PAYMENT"}
      </footer>

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
            <button
              className="close-popup"
              onClick={() =>
                setStatusOpen(false)
              }
            >
              ×
            </button>

            <div
              className={`status-orb ${paymentStatus}`}
            >
              {paymentStatus ===
                "confirmed" &&
                "✓"}

              {paymentStatus ===
                "failed" &&
                "!"}

              {paymentStatus ===
                "pending" &&
                "…"}
            </div>

            <div className="section-label">
              PAYMENT STATUS
            </div>

            <h2>
              {paymentStatus ===
                "confirmed"
                ? "PAYMENT CONFIRMED"
                : paymentStatus ===
                  "failed"
                ? "PAYMENT FAILED"
                : "PAYMENT PENDING"}
            </h2>

            <p>
              {paymentStatus ===
                "confirmed"
                ? "Your payment has been confirmed by the admin."
                : paymentStatus ===
                  "failed"
                ? "The admin could not confirm this payment."
                : "Your payment is waiting for admin confirmation."}
            </p>

            <div
              className={`status-pill ${paymentStatus}`}
            >
              <span />
              {paymentStatus.toUpperCase()}
            </div>

            <div className="popup-order">
              ORDER #{order.id}
            </div>

            <button
              className="refresh-status"
              onClick={() =>
                loadPaymentStatus(
                  true
                )
              }
              disabled={
                statusLoading
              }
            >
              {statusLoading
                ? "CHECKING..."
                : "CHECK STATUS AGAIN"}
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .screen {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at 20% 10%,
              rgba(255, 0, 50, 0.18),
              transparent 30%
            ),
            radial-gradient(
              circle at 90% 35%,
              rgba(255, 0, 0, 0.12),
              transparent 32%
            ),
            #050505;
          color: #fff;
          position: relative;
          overflow-x: hidden;
          padding-bottom: 50px;
        }

        .background-grid {
          position: fixed;
          inset: 0;
          pointer-events: none;
          opacity: 0.15;
          background-image:
            linear-gradient(
              rgba(255, 255, 255, 0.04) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(255, 255, 255, 0.04) 1px,
              transparent 1px
            );
          background-size: 35px 35px;
        }

        .glow {
          position: fixed;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
          opacity: 0.35;
        }

        .glow-one {
          width: 280px;
          height: 280px;
          background: #ff003c;
          top: -100px;
          left: -100px;
          animation: floatGlow 6s ease-in-out infinite;
        }

        .glow-two {
          width: 250px;
          height: 250px;
          background: #b00020;
          right: -100px;
          top: 35%;
          animation: floatGlow 7s ease-in-out infinite reverse;
        }

        .glow-three {
          width: 200px;
          height: 200px;
          background: #ff003c;
          bottom: 5%;
          left: 25%;
          animation: floatGlow 8s ease-in-out infinite;
        }

        @keyframes floatGlow {
          0%,
          100% {
            transform: translateY(0)
              scale(1);
          }

          50% {
            transform: translateY(-25px)
              scale(1.1);
          }
        }

        .top-header {
          position: relative;
          z-index: 5;
          max-width: 1050px;
          margin: auto;
          padding: 22px 18px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .brand-mark {
          width: 42px;
          height: 42px;
          border-radius: 13px;
          display: grid;
          place-items: center;
          background: #e60032;
          box-shadow:
            0 0 25px rgba(
              255,
              0,
              50,
              0.55
            );
          font-weight: 900;
          font-size: 22px;
        }

        .brand-name {
          font-weight: 950;
          letter-spacing: 2px;
        }

        .brand-small {
          color: #888;
          font-size: 9px;
          letter-spacing: 1.5px;
          margin-top: 2px;
        }

        .back-button {
          border: 1px solid #292929;
          background: rgba(
            255,
            255,
            255,
            0.04
          );
          color: #fff;
          padding: 10px 15px;
          border-radius: 10px;
          cursor: pointer;
        }

        .hero {
          position: relative;
          z-index: 2;
          max-width: 1050px;
          margin: 40px auto 30px;
          padding: 0 18px;
          animation: slideDown 0.8s ease;
        }

        .hero-tag {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #ff3159;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.5px;
          margin-bottom: 15px;
        }

        .hero-tag span {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #ff1748;
          box-shadow:
            0 0 15px #ff1748;
          animation: pulse 1.5s infinite;
        }

        .hero-heading {
          max-width: 850px;
          font-size: clamp(
            35px,
            7vw,
            76px
          );
          line-height: 0.95;
          margin: 0;
          font-weight: 950;
          letter-spacing: -3px;
          text-transform: uppercase;
        }

        .hero-subtitle {
          max-width: 650px;
          color: #999;
          font-size: 15px;
          line-height: 1.7;
          margin-top: 18px;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-25px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .content {
          position: relative;
          z-index: 2;
          max-width: 1050px;
          margin: auto;
          padding: 0 18px;
        }

        .order-card,
        .payment-card,
        .timer-card,
        .upload-card,
        .submitted-card {
          border: 1px solid #242424;
          background: rgba(
            12,
            12,
            12,
            0.88
          );
          backdrop-filter: blur(15px);
          border-radius: 22px;
          margin-bottom: 18px;
          box-shadow:
            0 20px 70px rgba(
              0,
              0,
              0,
              0.25
            );
        }

        .order-card {
          padding: 22px;
        }

        .section-label {
          color: #ff3159;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 2px;
        }

        .order-id-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 12px;
          padding-bottom: 15px;
          border-bottom: 1px solid #222;
        }

        .order-id-row span {
          color: #777;
          font-size: 11px;
        }

        .order-id-row strong {
          color: #ff3159;
        }

        .order-product {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          padding: 18px 0;
        }

        .order-product > div {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .muted {
          color: #777;
          font-size: 10px;
          letter-spacing: 1px;
        }

        .order-total {
          text-align: right;
        }

        .order-total strong {
          font-size: 25px;
          color: #fff;
        }

        .order-details {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }

        .order-details > div {
          background: #101010;
          border-radius: 12px;
          padding: 13px;
        }

        .order-details span {
          display: block;
          color: #666;
          font-size: 9px;
          margin-bottom: 5px;
        }

        .order-details strong {
          font-size: 12px;
          word-break: break-word;
        }

        .payment-method-section {
          margin: 30px 0 18px;
        }

        .section-heading-row {
          display: flex;
          justify-content: space-between;
          align-items: end;
          gap: 20px;
          margin-bottom: 15px;
        }

        .section-heading-row h2 {
          margin: 7px 0 0;
          font-size: 25px;
        }

        .selected-method {
          background: rgba(
            255,
            0,
            50,
            0.12
          );
          border: 1px solid
            rgba(
              255,
              0,
              50,
              0.35
            );
          color: #ff4265;
          padding: 9px 12px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 800;
        }

        .methods-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }

        .method-card {
          position: relative;
          min-height: 105px;
          border-radius: 17px;
          border: 1px solid #272727;
          background: #0c0c0c;
          color: #fff;
          cursor: pointer;
          transition:
            transform 0.25s,
            border-color 0.25s,
            box-shadow 0.25s;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 7px;
        }

        .method-card:hover {
          transform: translateY(-3px);
          border-color: #555;
        }

        .method-card.selected {
          border-color: #ff1748;
          background: linear-gradient(
            145deg,
            rgba(
              255,
              0,
              55,
              0.18
            ),
            #0d0d0d
          );
          box-shadow:
            0 0 25px rgba(
              255,
              0,
              50,
              0.25
            ),
            inset 0 0 20px rgba(
              255,
              0,
              50,
              0.06
            );
          animation: selectedPulse 2s infinite;
        }

        @keyframes selectedPulse {
          0%,
          100% {
            box-shadow:
              0 0 20px
                rgba(
                  255,
                  0,
                  50,
                  0.18
                );
          }

          50% {
            box-shadow:
              0 0 35px
                rgba(
                  255,
                  0,
                  50,
                  0.38
                );
          }
        }

        .method-symbol {
          font-size: 27px;
          font-weight: 900;
        }

        .method-name {
          font-size: 12px;
          font-weight: 800;
        }

        .selected-check {
          position: absolute;
          top: 8px;
          right: 9px;
          color: #ff3159;
        }

        .payment-card {
          padding: 25px;
        }

        .payment-card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .payment-card-top h2 {
          margin: 7px 0 0;
          font-size: 27px;
        }

        .coin-badge {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          display: grid;
          place-items: center;
          background: #e90038;
          box-shadow:
            0 0 25px rgba(
              255,
              0,
              50,
              0.3
            );
          font-weight: 900;
          font-size: 20px;
        }

        .information-box {
          color: #aaa;
          line-height: 1.7;
          background: #101010;
          border: 1px solid #202020;
          border-radius: 14px;
          padding: 15px;
          margin-bottom: 20px;
          white-space: pre-wrap;
        }

        .qr-section {
          text-align: center;
          margin: 20px 0 25px;
        }

        .qr-title {
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .qr-section p {
          color: #777;
          font-size: 12px;
        }

        .qr-box {
          width: min(260px, 80vw);
          margin: 15px auto;
          padding: 14px;
          background: #fff;
          border-radius: 18px;
        }

        .qr-box img {
          display: block;
          width: 100%;
          aspect-ratio: 1;
          object-fit: contain;
        }

        .wallet-label {
          color: #777;
          font-size: 10px;
          letter-spacing: 1.5px;
          font-weight: 800;
          margin-bottom: 8px;
        }

        .wallet-box {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #080808;
          border: 1px solid #292929;
          border-radius: 13px;
          padding: 7px 7px 7px 13px;
        }

        .wallet-box span {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #bbb;
          font-size: 12px;
        }

        .copy-button {
          flex-shrink: 0;
          border: 0;
          background: #e90038;
          color: white;
          font-weight: 900;
          border-radius: 9px;
          padding: 11px 14px;
          cursor: pointer;
        }

        .copy-button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .amount-box {
          margin-top: 18px;
          border: 1px solid
            rgba(
              255,
              0,
              50,
              0.25
            );
          background: rgba(
            255,
            0,
            50,
            0.07
          );
          border-radius: 15px;
          padding: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .amount-box span {
          color: #888;
          font-size: 10px;
          font-weight: 800;
        }

        .amount-box strong {
          color: #ff3159;
          font-size: 25px;
        }

        .pay-button,
        .submit-button,
        .status-button,
        .refresh-status {
          width: 100%;
          border: 0;
          border-radius: 13px;
          padding: 16px;
          margin-top: 18px;
          background: #ed003b;
          color: #fff;
          font-weight: 950;
          letter-spacing: 0.5px;
          cursor: pointer;
          box-shadow:
            0 10px 30px rgba(
              237,
              0,
              59,
              0.2
            );
          transition:
            transform 0.2s,
            box-shadow 0.2s;
        }

        .pay-button:hover,
        .submit-button:hover,
        .status-button:hover,
        .refresh-status:hover {
          transform: translateY(-2px);
          box-shadow:
            0 15px 35px rgba(
              237,
              0,
              59,
              0.35
            );
        }

        .pay-button:disabled,
        .submit-button:disabled,
        .refresh-status:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          transform: none;
        }

        .active-payment {
          margin-top: 18px;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          color: #ff3159;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .active-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #ff1748;
          box-shadow:
            0 0 12px #ff1748;
          animation: pulse 1s infinite;
        }

        @keyframes pulse {
          50% {
            opacity: 0.35;
          }
        }

        .timer-card {
          padding: 23px;
          border-color:
            rgba(
              255,
              0,
              50,
              0.3
            );
          background:
            linear-gradient(
              145deg,
              rgba(
                255,
                0,
                50,
                0.08
              ),
              rgba(
                10,
                10,
                10,
                0.95
              )
            );
        }

        .timer-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .timer-top h2 {
          margin: 7px 0 0;
          font-size: 20px;
        }

        .timer {
          font-size: 39px;
          font-weight: 950;
          letter-spacing: 2px;
          color: #ff3159;
          min-width: 125px;
          text-align: right;
        }

        .timer.danger {
          animation: timerDanger 0.7s infinite;
        }

        @keyframes timerDanger {
          50% {
            opacity: 0.45;
          }
        }

        .timer-bar {
          height: 7px;
          border-radius: 99px;
          background: #202020;
          overflow: hidden;
          margin-top: 18px;
        }

        .timer-progress {
          height: 100%;
          background: #ed003b;
          border-radius: inherit;
          box-shadow:
            0 0 15px rgba(
              255,
              0,
              50,
              0.7
            );
          transition: width 1s linear;
        }

        .timer-note {
          color: #777;
          font-size: 11px;
          margin-bottom: 0;
          line-height: 1.6;
        }

        .upload-card {
          padding: 24px;
        }

        .upload-card h2 {
          margin: 8px 0;
          font-size: 25px;
        }

        .upload-card > p {
          color: #777;
          font-size: 13px;
        }

        .upload-area {
          min-height: 150px;
          border: 1px dashed #454545;
          border-radius: 17px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 7px;
          margin-top: 18px;
          cursor: pointer;
          background: #0a0a0a;
        }

        .upload-area input {
          display: none;
        }

        .upload-icon {
          font-size: 30px;
          color: #ff3159;
        }

        .upload-area strong {
          font-size: 12px;
        }

        .upload-area span {
          color: #666;
          font-size: 9px;
        }

        .preview-box {
          margin-top: 15px;
          padding: 10px;
          border-radius: 15px;
          background: #080808;
          border: 1px solid #222;
        }

        .preview-box img {
          display: block;
          width: 100%;
          max-height: 350px;
          object-fit: contain;
          border-radius: 10px;
        }

        .upload-success {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px;
          margin-top: 15px;
          border-radius: 13px;
          background: rgba(
            0,
            200,
            100,
            0.07
          );
          border: 1px solid
            rgba(
              0,
              200,
              100,
              0.2
            );
        }

        .upload-success > span {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: #0b8f51;
          font-weight: 900;
        }

        .upload-success strong {
          color: #48d890;
          font-size: 12px;
        }

        .upload-success p {
          margin: 3px 0 0;
          color: #777;
          font-size: 10px;
        }

        .upload-error {
          margin-top: 12px;
          padding: 12px;
          border-radius: 10px;
          background: rgba(
            255,
            0,
            50,
            0.08
          );
          color: #ff5575;
          font-size: 12px;
        }

        .submission-message {
          margin-top: 13px;
          padding: 13px;
          border-radius: 11px;
          background: #111;
          color: #aaa;
          font-size: 12px;
          line-height: 1.5;
        }

        .submitted-card {
          padding: 25px;
          display: flex;
          align-items: center;
          gap: 18px;
          flex-wrap: wrap;
        }

        .submitted-icon {
          width: 55px;
          height: 55px;
          flex-shrink: 0;
          border-radius: 17px;
          display: grid;
          place-items: center;
          background: #e90038;
          font-size: 25px;
          font-weight: 900;
        }

        .submitted-card h2 {
          margin: 7px 0;
        }

        .submitted-card p {
          color: #777;
          font-size: 12px;
          line-height: 1.6;
          margin: 0;
          max-width: 600px;
        }

        .submitted-card .status-button {
          width: auto;
          min-width: 190px;
          margin-left: auto;
          margin-top: 0;
        }

        footer {
          position: relative;
          z-index: 2;
          max-width: 1050px;
          margin: 35px auto 0;
          padding: 0 18px;
          text-align: center;
          color: #555;
          font-size: 10px;
          letter-spacing: 1.5px;
        }

        .status-overlay {
          position: fixed;
          z-index: 100;
          inset: 0;
          background: rgba(
            0,
            0,
            0,
            0.78
          );
          backdrop-filter: blur(12px);
          display: grid;
          place-items: center;
          padding: 20px;
        }

        .status-popup {
          position: relative;
          width: min(
            430px,
            100%
          );
          padding: 35px 25px 25px;
          border: 1px solid #292929;
          background: #0b0b0b;
          border-radius: 25px;
          text-align: center;
          box-shadow:
            0 30px 100px rgba(
              0,
              0,
              0,
              0.6
            );
        }

        .close-popup {
          position: absolute;
          right: 15px;
          top: 12px;
          width: 34px;
          height: 34px;
          border: 0;
          border-radius: 50%;
          background: #181818;
          color: #aaa;
          font-size: 21px;
          cursor: pointer;
        }

        .status-orb {
          width: 90px;
          height: 90px;
          margin: 0 auto 20px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          font-size: 38px;
          font-weight: 950;
          background: #151515;
          border: 2px solid #555;
        }

        .status-orb.pending {
          color: #ff3159;
          border-color: #ff3159;
        }

        .status-orb.confirmed {
          color: #48d890;
          border-color: #48d890;
        }

        .status-orb.failed {
          color: #ff3159;
          border-color: #ff3159;
        }

        .status-popup h2 {
          margin: 8px 0;
          font-size: 25px;
        }

        .status-popup > p {
          color: #777;
          font-size: 12px;
          line-height: 1.7;
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 8px 13px;
          border-radius: 99px;
          margin-top: 10px;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1px;
          background: #171717;
        }

        .status-pill span {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #ff3159;
        }

        .status-pill.confirmed {
          color: #48d890;
        }

        .status-pill.confirmed span {
          background: #48d890;
        }

        .popup-order {
          margin-top: 18px;
          color: #555;
          font-size: 10px;
          letter-spacing: 1px;
        }

        .refresh-status {
          margin-top: 20px;
        }

        .payment-loading {
          min-height: 250px;
          display: grid;
          place-items: center;
          color: #777;
          font-size: 13px;
        }

        .small-spinner,
        .spinner {
          border: 3px solid #282828;
          border-top-color: #ff1748;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .small-spinner {
          width: 25px;
          height: 25px;
          margin: auto auto 10px;
        }

        .spinner {
          width: 48px;
          height: 48px;
          margin: auto;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .loading-screen,
        .error-screen {
          display: grid;
          place-items: center;
          padding: 20px;
        }

        .loader-box,
        .error-box {
          position: relative;
          z-index: 2;
          width: min(
            450px,
            100%
          );
          text-align: center;
          padding: 35px 25px;
          border: 1px solid #242424;
          background: #0b0b0b;
          border-radius: 22px;
        }

        .loader-box h2 {
          margin-bottom: 5px;
        }

        .loader-box p,
        .error-box p {
          color: #777;
          font-size: 13px;
        }

        .error-icon {
          width: 60px;
          height: 60px;
          margin: 0 auto 15px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #e90038;
          font-size: 28px;
          font-weight: 900;
        }

        .error-box h1 {
          font-size: 25px;
        }

        .primary-button {
          border: 0;
          border-radius: 12px;
          padding: 13px 18px;
          background: #e90038;
          color: white;
          font-weight: 900;
          cursor: pointer;
        }

        @media (max-width: 700px) {
          .methods-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .order-details {
            grid-template-columns: 1fr;
          }

          .section-heading-row {
            align-items: flex-start;
            flex-direction: column;
          }

          .timer-top {
            align-items: flex-start;
          }

          .timer {
            font-size: 31px;
            min-width: auto;
          }

          .submitted-card {
            align-items: flex-start;
          }

          .submitted-card .status-button {
            width: 100%;
            margin-left: 0;
          }
        }

        @media (max-width: 480px) {
          .hero-heading {
            letter-spacing: -1.5px;
          }

          .wallet-box {
            align-items: stretch;
            flex-direction: column;
          }

          .wallet-box span {
            padding: 8px 5px;
          }

          .copy-button {
            width: 100%;
          }

          .order-product {
            flex-direction: column;
          }

          .order-total {
            text-align: left;
          }

          .timer-top {
            flex-direction: column;
          }

          .timer {
            width: 100%;
            text-align: left;
          }
        }
      `}</style>
    </main>
  )
}
