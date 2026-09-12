"use client"

import {
  useEffect,
  useState,
  type ChangeEvent,
} from "react"

const CHECK_ORDER_URL =
  "https://kakobuy-check-order.vercel.app/"

const METHODS = [
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
  id?: number
  order_id?: number
  product_id?: number
  product_name?: string
  size?: string
  style?: string
  color?: string
  quantity?: number
  unit_price?: number | string
  total?: number | string
}

type Order = {
  id: number
  product_name?: string
  size?: string
  color?: string
  style?: string
  quantity?: number
  unit_price?: number | string
  subtotal?: number | string
  shipping?: number | string
  discount?: number | string
  total?: number | string
  full_name?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  country?: string
  delivery_date?: string
  payment_status?: string
  payment_method?: string
  transaction_image?: string
  transaction_submitted?: boolean
  transaction_submitted_at?: string
  wallet_copied?: boolean
  wallet_copied_at?: string
  created_at?: string
  updated_at?: string
  items?: OrderItem[]
}

type PaymentMethod = {
  id: number | string
  name?: string
  information?: string
  wallet_address?: string
  qr_image?: string
  qr_image_url?: string
  hero_heading?: string
  hero_subtitle?: string
  footer_text?: string
}

function formatMoney(value: number | string | undefined) {
  const amount = Number(value || 0)

  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function getMethodName(id: string) {
  return (
    METHODS.find((method) => method.id === id)?.name ||
    id
  )
}

export default function PaymentPage() {
  const [queryReady, setQueryReady] = useState(false)

  const [orderId, setOrderId] = useState("")
  const [email, setEmail] = useState("")

  const [order, setOrder] = useState<Order | null>(null)
  const [items, setItems] = useState<OrderItem[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [logoUrl, setLogoUrl] = useState("")

  const [selectedMethod, setSelectedMethod] =
    useState("bitcoin")

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod | null>(null)

  const [loadingMethod, setLoadingMethod] =
    useState(false)

  const [paymentVisible, setPaymentVisible] =
    useState(false)

  const [timeLeft, setTimeLeft] = useState(300)

  const [copied, setCopied] = useState(false)
  const [copying, setCopying] = useState(false)

  const [transactionFile, setTransactionFile] =
    useState<File | null>(null)

  const [uploading, setUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState("")

  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const [paymentStatus, setPaymentStatus] =
    useState("pending")

  const [showStatus, setShowStatus] = useState(false)

  const [statusLoading, setStatusLoading] =
    useState(false)

  const [statusMessage, setStatusMessage] =
    useState("")

  const [orderRefresh, setOrderRefresh] =
    useState(false)

  /*
   * --------------------------------------------------
   * READ URL
   * --------------------------------------------------
   */

  useEffect(() => {
    try {
      const params = new URLSearchParams(
        window.location.search
      )

      const urlOrderId =
        params.get("orderId") ||
        params.get("id") ||
        ""

      const urlEmail =
        params.get("email") ||
        ""

      const urlMethod =
        params.get("method") ||
        ""

      setOrderId(urlOrderId.trim())
      setEmail(urlEmail.trim())

      if (
        METHODS.some(
          (method) => method.id === urlMethod
        )
      ) {
        setSelectedMethod(urlMethod)
      }

      setQueryReady(true)
    } catch (error) {
      console.error("URL reading error:", error)

      setError(
        "Unable to read the order information."
      )

      setLoading(false)
      setQueryReady(true)
    }
  }, [])

  /*
   * --------------------------------------------------
   * LOAD SHARED LOGO
   * --------------------------------------------------
   */

  useEffect(() => {
    async function loadLogo() {
      try {
        const response = await fetch(
          "/api/site-settings",
          {
            cache: "no-store",
          }
        )

        const data = await response.json()

        if (
          response.ok &&
          data?.success &&
          data?.logo_url
        ) {
          setLogoUrl(data.logo_url)
        }
      } catch (error) {
        console.error(
          "Unable to load shared logo:",
          error
        )
      }
    }

    loadLogo()
  }, [])

  /*
   * --------------------------------------------------
   * LOAD ORDER
   * --------------------------------------------------
   */

  async function loadOrder(showLoading = true) {
    if (!orderId) {
      setLoading(false)
      setError(
        "This payment page was opened without a valid order ID."
      )
      return
    }

    try {
      if (showLoading) {
        setLoading(true)
      }

      setError("")

      const params = new URLSearchParams()

      params.set("id", orderId)

      if (email) {
        params.set("email", email)
      }

      const response = await fetch(
        `/api/orders?${params.toString()}`,
        {
          cache: "no-store",
        }
      )

      const data = await response.json().catch(() => null)

      /*
       * IMPORTANT FIX:
       *
       * Your API can return either:
       *
       * { success: true, order: ... }
       *
       * OR
       *
       * { ok: true, order: ... }
       *
       * We accept both.
       */

      const apiSucceeded =
        data?.success === true ||
        data?.ok === true

      if (
        !response.ok ||
        !apiSucceeded ||
        !data?.order
      ) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Unable to load order."
        )
      }

      const loadedOrder = data.order as Order

      setOrder(loadedOrder)

      setItems(
        Array.isArray(loadedOrder.items)
          ? loadedOrder.items
          : []
      )

      if (loadedOrder.payment_method) {
        const methodExists = METHODS.some(
          (method) =>
            method.id ===
            loadedOrder.payment_method
        )

        if (methodExists) {
          setSelectedMethod(
            loadedOrder.payment_method
          )
        }
      }

      if (loadedOrder.payment_status) {
        setPaymentStatus(
          String(
            loadedOrder.payment_status
          ).toLowerCase()
        )
      }

      if (
        loadedOrder.transaction_submitted
      ) {
        setSubmitted(true)
      }

      setError("")
    } catch (error) {
      console.error(
        "Order loading error:",
        error
      )

      setOrder(null)
      setItems([])

      setError(
        error instanceof Error
          ? error.message
          : "Unable to load order."
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!queryReady) return

    loadOrder(true)
  }, [queryReady, orderId, email])

  /*
   * --------------------------------------------------
   * REFRESH ORDER STATUS
   * --------------------------------------------------
   */

  useEffect(() => {
    if (!orderId || !order) return

    const interval = setInterval(() => {
      loadOrder(false)
    }, 5000)

    return () => clearInterval(interval)
  }, [orderId, order])

  /*
   * --------------------------------------------------
   * LOAD PAYMENT METHOD
   * --------------------------------------------------
   */

  async function loadPaymentMethod(
    methodId: string
  ) {
    try {
      setLoadingMethod(true)

      const response = await fetch(
        `/api/payment-methods?id=${encodeURIComponent(
          methodId
        )}`,
        {
          cache: "no-store",
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to load payment information."
        )
      }

      /*
       * Support the different possible response shapes.
       */

      const rawMethod =
        data?.paymentMethod ||
        data?.method ||
        data?.data ||
        null

      if (!rawMethod) {
        throw new Error(
          "Payment information was not found."
        )
      }

      const normalized: PaymentMethod = {
        ...rawMethod,

        qr_image:
          rawMethod.qr_image ||
          rawMethod.qr_image_url ||
          "",
      }

      setPaymentMethod(normalized)
    } catch (error) {
      console.error(
        "Payment method loading error:",
        error
      )

      setPaymentMethod(null)
    } finally {
      setLoadingMethod(false)
    }
  }

  useEffect(() => {
    if (!selectedMethod) return

    loadPaymentMethod(selectedMethod)
  }, [selectedMethod])

  /*
   * --------------------------------------------------
   * 5 MINUTE COUNTDOWN
   *
   * Timer only runs after COPY.
   * --------------------------------------------------
   */

  useEffect(() => {
  if (!paymentVisible) return

  const timer = setInterval(() => {
    setTimeLeft((current) => {
      if (current <= 1) {
        clearInterval(timer)

        window.location.href =
          CHECK_ORDER_URL

        return 0
      }

      return current - 1
    })
  }, 1000)

  return () => clearInterval(timer)
}, [paymentVisible])

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60

  return `${String(minutes).padStart(
    2,
    "0"
  )}:${String(secs).padStart(2, "0")}`
}

  /*
   * --------------------------------------------------
   * SELECT PAYMENT METHOD
   * --------------------------------------------------
   */

  function selectMethod(methodId: string) {
    if (submitted) return

    setSelectedMethod(methodId)

    setPaymentVisible(false)
    setCopied(false)

    /*
     * Always reset to 5 minutes.
     * It will NOT start until COPY is pressed.
     */

    setTimeLeft(300)

    setTransactionFile(null)
    setUploadMessage("")
  }

  /*
   * --------------------------------------------------
   * COPY WALLET INFORMATION
   * --------------------------------------------------
   */

  async function copyInfo() {
    if (!paymentMethod?.wallet_address) {
      setStatusMessage(
        "Wallet address is not available."
      )
      return
    }

    if (!orderId) {
      setStatusMessage(
        "Order ID is missing."
      )
      return
    }

    try {
      setCopying(true)

      await navigator.clipboard.writeText(
        paymentMethod.wallet_address
      )

      setCopied(true)

      /*
       * START PAYMENT SESSION
       */

      setPaymentVisible(true)

      /*
       * ALWAYS START AT 5 MINUTES
       */

      setTimeLeft(300)

      /*
       * Tell server wallet was copied.
       */

      try {
        await fetch("/api/payment-status", {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            orderId,
            email,
            paymentMethod:
              selectedMethod,
          }),
        })
      } catch (error) {
        console.error(
          "Wallet copy status error:",
          error
        )
      }

      setStatusMessage(
        "Wallet address copied. Your 5-minute payment timer has started."
      )

      setTimeout(() => {
        setStatusMessage("")
      }, 3000)
    } catch (error) {
      console.error(
        "Copy error:",
        error
      )

      /*
       * Fallback for browsers that block
       * navigator.clipboard.
       */

      try {
        const textarea =
          document.createElement("textarea")

        textarea.value =
          paymentMethod.wallet_address

        textarea.style.position = "fixed"
        textarea.style.opacity = "0"

        document.body.appendChild(
          textarea
        )

        textarea.focus()
        textarea.select()

        document.execCommand("copy")

        document.body.removeChild(
          textarea
        )

        setCopied(true)
        setPaymentVisible(true)
        setTimeLeft(300)

        try {
          await fetch(
            "/api/payment-status",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                orderId,
                email,
                paymentMethod:
                  selectedMethod,
              }),
            }
          )
        } catch (serverError) {
          console.error(
            "Wallet status error:",
            serverError
          )
        }

        setStatusMessage(
          "Wallet address copied. Your 5-minute payment timer has started."
        )

        setTimeout(() => {
          setStatusMessage("")
        }, 3000)
      } catch (fallbackError) {
        console.error(
          "Copy fallback error:",
          fallbackError
        )

        setStatusMessage(
          "Unable to copy automatically. Please copy the wallet address manually."
        )
      }
    } finally {
      setCopying(false)
    }
  }

  /*
   * --------------------------------------------------
   * FILE SELECTION
   * --------------------------------------------------
   */

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0]

    setUploadMessage("")

    if (!file) {
      setTransactionFile(null)
      return
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ]

    if (!allowedTypes.includes(file.type)) {
      setTransactionFile(null)

      setUploadMessage(
        "Please upload a JPG, PNG, or WEBP image."
      )

      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setTransactionFile(null)

      setUploadMessage(
        "Image must be smaller than 5MB."
      )

      return
    }

    setTransactionFile(file)

    setUploadMessage(
      "Screenshot selected successfully."
    )
  }

  /*
   * --------------------------------------------------
   * UPLOAD TRANSACTION SCREENSHOT
   * --------------------------------------------------
   */

  async function uploadTransaction() {
    if (!orderId) {
      setUploadMessage(
        "Order ID is missing."
      )
      return
    }

    if (!transactionFile) {
      setUploadMessage(
        "Please select your payment screenshot first."
      )
      return
    }

    try {
      setUploading(true)
      setUploadMessage("")

      const formData = new FormData()

      formData.append(
        "orderId",
        orderId
      )

      if (email) {
        formData.append(
          "email",
          email
        )
      }

      formData.append(
        "image",
        transactionFile
      )

      const response = await fetch(
        "/api/transaction-upload",
        {
          method: "POST",
          body: formData,
        }
      )

      const data =
        await response.json().catch(
          () => null
        )

      if (
        !response.ok ||
        data?.success === false
      ) {
        throw new Error(
          data?.error ||
            "Unable to upload screenshot."
        )
      }

      /*
       * User requested this wording:
       * CONFIRMED
       */

      setUploadMessage(
        "CONFIRMED — payment screenshot uploaded successfully."
      )
    } catch (error) {
      console.error(
        "Transaction upload error:",
        error
      )

      setUploadMessage(
        error instanceof Error
          ? error.message
          : "Unable to upload screenshot."
      )
    } finally {
      setUploading(false)
    }
  }

  /*
   * --------------------------------------------------
   * SUBMIT PAYMENT TO ADMIN
   * --------------------------------------------------
   */

  async function completePaymentSubmission() {
    if (!orderId) {
      setUploadMessage(
        "Order ID is missing."
      )
      return
    }

    if (!transactionFile) {
      setUploadMessage(
        "Please upload your payment screenshot first."
      )
      return
    }

    try {
      setSubmitting(true)

      const formData = new FormData()

      formData.append(
        "orderId",
        orderId
      )

      if (email) {
        formData.append(
          "email",
          email
        )
      }

      formData.append(
        "image",
        transactionFile
      )

      const response = await fetch(
        "/api/payment-submission",
        {
          method: "POST",
          body: formData,
        }
      )

      const data =
        await response.json().catch(
          () => null
        )

      if (
        !response.ok ||
        data?.success === false
      ) {
        throw new Error(
          data?.error ||
            "Unable to submit payment."
        )
      }

      setSubmitted(true)
      setPaymentStatus("pending")

      setPaymentVisible(false)

      setUploadMessage(
        "CONFIRMED — payment submitted successfully. Waiting for admin confirmation."
      )

      await loadOrder(false)
    } catch (error) {
      console.error(
        "Payment submission error:",
        error
      )

      setUploadMessage(
        error instanceof Error
          ? error.message
          : "Unable to submit payment."
      )
    } finally {
      setSubmitting(false)
    }
  }

  /*
   * --------------------------------------------------
   * CHECK PAYMENT STATUS
   * --------------------------------------------------
   */

  async function checkPaymentStatus() {
    if (!orderId) return

    try {
      setStatusLoading(true)

      const params = new URLSearchParams()

      params.set(
        "orderId",
        orderId
      )

      if (email) {
        params.set(
          "email",
          email
        )
      }

      const response = await fetch(
        `/api/payment-status?${params.toString()}`,
        {
          cache: "no-store",
        }
      )

      const data =
        await response.json().catch(
          () => null
        )

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to check payment status."
        )
      }

      const status = String(
        data?.payment_status ||
          data?.status ||
          data?.order?.payment_status ||
          "pending"
      ).toLowerCase()

      setPaymentStatus(status)
      setShowStatus(true)

      setTimeout(() => {
        setShowStatus(false)
      }, 5000)
    } catch (error) {
      console.error(
        "Payment status error:",
        error
      )

      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Unable to check payment status."
      )

      setTimeout(() => {
        setStatusMessage("")
      }, 3000)
    } finally {
      setStatusLoading(false)
    }
  }

  /*
   * --------------------------------------------------
   * LOADING SCREEN
   * --------------------------------------------------
   */

  if (loading) {
    return (
      <>
        <div className="loading-screen">
          <div className="loading-orb orb-one" />
          <div className="loading-orb orb-two" />

          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Kakobuy"
              className="loading-logo"
            />
          ) : (
            <div className="loading-brand">
              KAKO
              <span>BUY</span>
            </div>
          )}

          <div className="loader" />

          <p>
            Loading your secure payment...
          </p>
        </div>

        <style jsx>{`
          .loading-screen {
            min-height: 100vh;
            background:
              radial-gradient(
                circle at 50% 20%,
                rgba(255, 0, 50, 0.2),
                transparent 35%
              ),
              #050505;
            color: white;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            position: relative;
            overflow: hidden;
          }

          .loading-brand {
            font-size: 42px;
            font-weight: 1000;
            letter-spacing: -3px;
            margin-bottom: 30px;
          }

          .loading-brand span {
            color: #ff163d;
          }

          .loading-logo {
            width: 150px;
            max-width: 55vw;
            max-height: 100px;
            object-fit: contain;
            margin-bottom: 30px;
            filter: drop-shadow(
              0 0 25px rgba(255, 20, 60, 0.5)
            );
          }

          .loader {
            width: 42px;
            height: 42px;
            border: 3px solid rgba(
              255,
              255,
              255,
              0.12
            );
            border-top-color: #ff1744;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }

          p {
            color: #999;
            margin-top: 18px;
            font-size: 14px;
          }

          .loading-orb {
            position: absolute;
            width: 250px;
            height: 250px;
            border-radius: 50%;
            background: #ff003d;
            filter: blur(130px);
            opacity: 0.12;
            pointer-events: none;
          }

          .orb-one {
            top: -100px;
            left: -80px;
          }

          .orb-two {
            right: -100px;
            bottom: -100px;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </>
    )
  }

  /*
   * --------------------------------------------------
   * ERROR / ORDER NOT FOUND
   * --------------------------------------------------
   */

  if (error || !order) {
    return (
      <>
        <div className="error-screen">
          <div className="error-orb" />

          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Kakobuy"
              className="error-logo"
            />
          ) : (
            <div className="error-brand">
              KAKO<span>BUY</span>
            </div>
          )}

          <div className="error-icon">
            !
          </div>

          <h1>ORDER NOT FOUND</h1>

          <p>
            {error ||
              "Unable to load order."}
          </p>

          {!orderId && (
            <small>
              This payment page needs to be
              opened from your order page.
            </small>
          )}

          <button
            onClick={() => {
              window.location.href =
                CHECK_ORDER_URL
            }}
          >
            BACK TO ORDER PAGE
          </button>
        </div>

        <style jsx>{`
          .error-screen {
            min-height: 100vh;
            background:
              radial-gradient(
                circle at 50% 0%,
                rgba(255, 0, 55, 0.18),
                transparent 40%
              ),
              #050505;
            color: white;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 24px;
            position: relative;
            overflow: hidden;
          }

          .error-orb {
            position: absolute;
            width: 280px;
            height: 280px;
            background: #ff003d;
            border-radius: 50%;
            filter: blur(150px);
            opacity: 0.12;
          }

          .error-logo {
            width: 145px;
            max-width: 55vw;
            max-height: 90px;
            object-fit: contain;
            margin-bottom: 25px;
            filter: drop-shadow(
              0 0 22px rgba(255, 20, 60, 0.45)
            );
          }

          .error-brand {
            font-size: 32px;
            font-weight: 1000;
            margin-bottom: 25px;
          }

          .error-brand span {
            color: #ff1744;
          }

          .error-icon {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: rgba(
              255,
              23,
              68,
              0.12
            );
            border: 1px solid
              rgba(255, 23, 68, 0.5);
            color: #ff1744;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            font-weight: 900;
            margin-bottom: 20px;
            box-shadow:
              0 0 35px
              rgba(255, 0, 55, 0.2);
          }

          h1 {
            font-size: 28px;
            margin: 0 0 10px;
            font-weight: 1000;
            letter-spacing: -1px;
          }

          p {
            max-width: 450px;
            color: #999;
            line-height: 1.6;
            margin: 0 0 10px;
          }

          small {
            color: #666;
            max-width: 400px;
            line-height: 1.5;
            margin-bottom: 22px;
          }

          button {
            border: 0;
            background: #ff1744;
            color: white;
            padding: 14px 24px;
            border-radius: 12px;
            font-weight: 900;
            cursor: pointer;
            box-shadow:
              0 0 25px
              rgba(255, 23, 68, 0.25);
          }

          button:hover {
            transform: translateY(-2px);
          }
        `}</style>
      </>
    )
  }

  const wallet =
    paymentMethod?.wallet_address || ""

  const qrImage =
    paymentMethod?.qr_image ||
    paymentMethod?.qr_image_url ||
    ""

  const heading =
    paymentMethod?.hero_heading ||
    "COMPLETE YOUR PAYMENT"

  const subtitle =
    paymentMethod?.hero_subtitle ||
    "Send your payment using the selected cryptocurrency."

  const footerText =
    paymentMethod?.footer_text ||
    "Secure payment powered by Kakobuy."

  const paymentInfo =
    paymentMethod?.information ||
    ""

  const statusClass =
    paymentStatus === "confirmed"
      ? "confirmed"
      : paymentStatus === "failed"
      ? "failed"
      : "pending"

  return (
    <>
      <main className="page">
        <div className="background-orb orb-a" />
        <div className="background-orb orb-b" />
        <div className="background-orb orb-c" />

        <header className="topbar">
          <a
            href="https://kakobuy-mini.vercel.app/"
            className="brand"
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Kakobuy"
                className="brand-logo"
              />
            ) : (
              <>
                <span>KAKO</span>
                <b>BUY</b>
              </>
            )}
          </a>

          <div className="top-actions">
  <a
    href={
      orderId && email
        ? `${CHECK_ORDER_URL}my-order?orderId=${encodeURIComponent(
            orderId,
          )}&email=${encodeURIComponent(
            email,
          )}`
        : CHECK_ORDER_URL
    }
    className="order-link"
  >
    MY ORDER
  </a>

            <button
              className="status-button"
              onClick={
                checkPaymentStatus
              }
              disabled={statusLoading}
            >
              {statusLoading
                ? "CHECKING..."
                : "PAYMENT STATUS"}
            </button>
          </div>
        </header>

        <section className="hero">
          <div className="hero-tag">
            SECURE CRYPTO PAYMENT
          </div>

          <h1>{heading}</h1>

          <p>{subtitle}</p>

          <div className="order-pill">
            ORDER #{order.id}
          </div>
        </section>

        <section className="content">
          <div className="order-card card">
            <div className="card-title">
              <span>ORDER DETAILS</span>
              <span className="live-dot">
                ● LIVE
              </span>
            </div>

            <div className="order-main">
              <div>
                <h2>
                  {order.product_name ||
                    "Kakobuy Order"}
                </h2>

                {order.style && (
                  <p>
                    Style:{" "}
                    <strong>
                      {order.style}
                    </strong>
                  </p>
                )}

                {order.color && (
                  <p>
                    Color:{" "}
                    <strong>
                      {order.color}
                    </strong>
                  </p>
                )}

                {order.size && (
                  <p>
                    Size:{" "}
                    <strong>
                      {order.size}
                    </strong>
                  </p>
                )}

                <p>
                  Quantity:{" "}
                  <strong>
                    {order.quantity ||
                      1}
                  </strong>
                </p>
              </div>

              <div className="total-box">
                <span>TOTAL</span>
                <strong>
                  {formatMoney(
                    order.total
                  )}
                </strong>
              </div>
            </div>

            {items.length > 0 && (
              <div className="items">
                {items.map(
                  (item, index) => (
                    <div
                      className="item"
                      key={
                        item.id ||
                        index
                      }
                    >
                      <div>
                        <strong>
                          {item.product_name ||
                            "Product"}
                        </strong>

                        <small>
                          {item.quantity ||
                            1}{" "}
                          ×{" "}
                          {formatMoney(
                            item.unit_price
                          )}
                        </small>
                      </div>

                      <strong>
                        {formatMoney(
                          item.total
                        )}
                      </strong>
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          <div className="payment-card card">
            <div className="card-title">
              <span>
                01 — SELECT PAYMENT
              </span>

              {submitted && (
                <span className="submitted-badge">
                  SUBMITTED
                </span>
              )}
            </div>

            <div className="methods">
              {METHODS.map(
                (method) => {
                  const selected =
                    selectedMethod ===
                    method.id

                  return (
                    <button
                      key={
                        method.id
                      }
                      className={`method ${
                        selected
                          ? "selected"
                          : ""
                      }`}
                      onClick={() =>
                        selectMethod(
                          method.id
                        )
                      }
                      disabled={
                        submitted
                      }
                    >
                      <span className="method-symbol">
                        {
                          method.symbol
                        }
                      </span>

                      <span>
                        {
                          method.name
                        }
                      </span>

                      {selected && (
                        <span className="check">
                          ✓
                        </span>
                      )}
                    </button>
                  )
                }
              )}
            </div>
          </div>

          <div className="payment-card card">
            <div className="card-title">
              <span>
                02 — PAYMENT INFORMATION
              </span>
            </div>

            {loadingMethod ? (
              <div className="method-loading">
                Loading payment
                information...
              </div>
            ) : (
              <>
                <div className="selected-coin">
                  <div>
                    <span>
                      SELECTED METHOD
                    </span>

                    <strong>
                      {getMethodName(
                        selectedMethod
                      )}
                    </strong>
                  </div>

                  <div className="coin-glow">
                    {
                      METHODS.find(
                        (method) =>
                          method.id ===
                          selectedMethod
                      )?.symbol
                    }
                  </div>
                </div>

                {paymentInfo && (
                  <div className="info-box">
                    {paymentInfo}
                  </div>
                )}

                {wallet && (
                  <div className="wallet-section">
                    <label>
                      WALLET ADDRESS
                    </label>

                    <div className="wallet-box">
                      <span>
                        {wallet}
                      </span>

                      <button
                        onClick={
                          copyInfo
                        }
                        disabled={
                          copying ||
                          submitted
                        }
                      >
                        {copying
                          ? "COPYING..."
                          : copied
                          ? "COPIED ✓"
                          : "COPY"}
                      </button>
                    </div>
                  </div>
                )}

                {qrImage && (
                  <div className="qr-section">
                    <h3>
                      SCAN TO PAY
                    </h3>

                    <p>
                      Scan the QR code with
                      your selected crypto
                      wallet.
                    </p>

                    <div className="qr-wrap">
                      <img
                        src={qrImage}
                        alt={`${getMethodName(
                          selectedMethod
                        )} payment QR code`}
                      />
                    </div>
                  </div>
                )}

                {!wallet &&
                  !qrImage && (
                    <div className="empty-payment">
                      Payment information
                      has not been configured
                      for this method yet.
                    </div>
                  )}
              </>
            )}
          </div>

          {statusMessage && (
            <div className="toast">
              {statusMessage}
            </div>
          )}

          {paymentVisible &&
            !submitted && (
              <div className="timer-card">
                <div>
                  <span>
                    PAYMENT WINDOW
                  </span>

                  <strong>
                    {formatTime(
                      timeLeft
                    )}
                  </strong>
                </div>

                <div className="timer-line">
                  <div
                    style={{
                      width: `${Math.max(
                        0,
                        Math.min(
                          100,
                          (timeLeft /
                            300) *
                            100
                        )
                      )}%`,
                    }}
                  />
                </div>

                <p>
                  Complete your payment
                  before the timer reaches
                  zero.
                </p>
              </div>
            )}

          <div className="payment-card card">
            <div className="card-title">
              <span>
                03 — PAYMENT CONFIRMATION
              </span>
            </div>

            <div className="instruction">
              <div className="number">
                1
              </div>

              <div>
                <strong>
                  Send your payment
                </strong>

                <p>
                  Copy the wallet address
                  above and complete your
                  payment.
                </p>
              </div>
            </div>

            <div className="instruction">
              <div className="number">
                2
              </div>

              <div>
                <strong>
                  Upload payment
                  screenshot
                </strong>

                <p>
                  Upload a clear screenshot
                  showing your transaction.
                </p>
              </div>
            </div>

            <div className="upload-box">
              <label
                htmlFor="transaction"
                className="file-label"
              >
                <span className="upload-icon">
                  ↑
                </span>

                <span>
                  {transactionFile
                    ? transactionFile.name
                    : "SELECT SCREENSHOT"}
                </span>

                <small>
                  JPG, PNG or WEBP · MAX
                  5MB
                </small>
              </label>

              <input
                id="transaction"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={
                  handleFileChange
                }
                disabled={
                  submitted ||
                  uploading ||
                  submitting
                }
              />
            </div>

            {uploadMessage && (
              <div
                className={`upload-message ${
                  uploadMessage
                    .includes(
                      "CONFIRMED"
                    )
                    ? "success"
                    : ""
                }`}
              >
                {uploadMessage}
              </div>
            )}

            <div className="submit-actions">
              <button
                className="upload-button"
                onClick={
                  uploadTransaction
                }
                disabled={
                  uploading ||
                  submitting ||
                  submitted ||
                  !transactionFile
                }
              >
                {uploading
                  ? "UPLOADING..."
                  : "UPLOAD SCREENSHOT"}
              </button>

              <button
                className="submit-button"
                onClick={
                  completePaymentSubmission
                }
                disabled={
                  submitting ||
                  submitted ||
                  !transactionFile
                }
              >
                {submitted
                  ? "PAYMENT SUBMITTED ✓"
                  : submitting
                  ? "SUBMITTING..."
                  : "CONFIRM PAYMENT"}
              </button>
            </div>

            {submitted && (
              <div className="submitted-box">
                <div className="success-circle">
                  ✓
                </div>

                <div>
                  <strong>
                    PAYMENT SUBMITTED
                  </strong>

                  <p>
                    Your payment screenshot
                    has been sent to the
                    administrator for
                    confirmation.
                  </p>
                </div>
              </div>
            )}
          </div>

          <button
            className="floating-status"
            onClick={
              checkPaymentStatus
            }
          >
            <span className="status-pulse" />
            CHECK PAYMENT STATUS
          </button>

          {showStatus && (
            <div className="status-popup">
              <div
                className={`status-circle ${statusClass}`}
              >
                {paymentStatus ===
                "confirmed"
                  ? "✓"
                  : paymentStatus ===
                    "failed"
                  ? "!"
                  : "…"}
              </div>

              <div>
                <span>
                  PAYMENT STATUS
                </span>

                <strong>
                  {paymentStatus.toUpperCase()}
                </strong>
              </div>

              <button
                onClick={() =>
                  setShowStatus(false)
                }
              >
                ×
              </button>
            </div>
          )}
        </section>

        <footer>
          <div className="footer-brand">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Kakobuy"
                className="footer-logo"
              />
            ) : (
              <strong>
                KAKO<span>BUY</span>
              </strong>
            )}
          </div>

          <p>{footerText}</p>

          <a
            href="https://kakobuy-mini.vercel.app/"
          >
            BACK TO KAKOBUY
          </a>
        </footer>
      </main>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at 50% -10%,
              rgba(255, 0, 55, 0.2),
              transparent 35%
            ),
            #050505;
          color: white;
          overflow-x: hidden;
          position: relative;
          padding-bottom: 70px;
        }

        .background-orb {
          position: fixed;
          width: 330px;
          height: 330px;
          border-radius: 50%;
          background: #ff003d;
          filter: blur(150px);
          opacity: 0.08;
          pointer-events: none;
          z-index: 0;
        }

        .orb-a {
          top: 10%;
          left: -160px;
        }

        .orb-b {
          top: 45%;
          right: -180px;
        }

        .orb-c {
          bottom: -150px;
          left: 35%;
        }

        .topbar {
          position: relative;
          z-index: 5;
          width: min(1100px, calc(100% - 30px));
          margin: auto;
          padding: 22px 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          border-bottom: 1px solid
            rgba(255, 255, 255, 0.08);
        }

        .brand {
          color: white;
          text-decoration: none;
          display: flex;
          align-items: center;
          font-size: 24px;
          font-weight: 1000;
          letter-spacing: -1.5px;
        }

        .brand b {
          color: #ff1744;
        }

        .brand-logo {
          width: 105px;
          max-width: 30vw;
          max-height: 55px;
          object-fit: contain;
          filter: drop-shadow(
            0 0 14px rgba(255, 20, 60, 0.35)
          );
        }

        .top-actions {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .order-link,
        .status-button {
          border: 1px solid
            rgba(255, 255, 255, 0.12);
          background: rgba(
            255,
            255,
            255,
            0.04
          );
          color: #ddd;
          padding: 10px 13px;
          border-radius: 10px;
          font-size: 10px;
          font-weight: 900;
          text-decoration: none;
          cursor: pointer;
        }

        .status-button {
          border-color: rgba(
            255,
            23,
            68,
            0.35
          );
          color: #ff5473;
        }

        .hero {
          width: min(900px, calc(100% - 30px));
          margin: auto;
          padding: 70px 0 45px;
          text-align: center;
          position: relative;
          z-index: 1;
          animation: heroIn 0.8s ease both;
        }

        .hero-tag {
          display: inline-block;
          padding: 7px 12px;
          border: 1px solid
            rgba(255, 23, 68, 0.35);
          border-radius: 999px;
          color: #ff4265;
          background: rgba(
            255,
            23,
            68,
            0.06
          );
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1.5px;
          margin-bottom: 18px;
        }

        .hero h1 {
          font-size: clamp(
            34px,
            7vw,
            68px
          );
          line-height: 0.95;
          margin: 0;
          font-weight: 1000;
          letter-spacing: -3px;
          background: linear-gradient(
            180deg,
            #fff,
            #aaa
          );
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .hero p {
          max-width: 650px;
          margin: 20px auto;
          color: #929292;
          line-height: 1.7;
          font-size: 14px;
        }

        .order-pill {
          display: inline-block;
          color: white;
          background: #111;
          border: 1px solid
            rgba(255, 255, 255, 0.12);
          padding: 9px 14px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 900;
          box-shadow:
            0 0 25px
            rgba(255, 0, 55, 0.1);
        }

        .content {
          width: min(850px, calc(100% - 30px));
          margin: auto;
          position: relative;
          z-index: 1;
        }

        .card {
          background: linear-gradient(
            145deg,
            rgba(20, 20, 20, 0.95),
            rgba(9, 9, 9, 0.95)
          );
          border: 1px solid
            rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 22px;
          margin-bottom: 16px;
          box-shadow:
            0 25px 70px
            rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(12px);
          animation: cardIn 0.7s ease both;
        }

        .card-title {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          color: #777;
          font-size: 10px;
          font-weight: 1000;
          letter-spacing: 1.2px;
          margin-bottom: 20px;
        }

        .live-dot {
          color: #ff1744;
        }

        .order-main {
          display: flex;
          justify-content: space-between;
          gap: 25px;
        }

        .order-main h2 {
          margin: 0 0 12px;
          font-size: 20px;
        }

        .order-main p {
          color: #777;
          font-size: 12px;
          margin: 7px 0;
        }

        .order-main strong {
          color: #ddd;
        }

        .total-box {
          text-align: right;
          min-width: 130px;
        }

        .total-box span {
          display: block;
          color: #777;
          font-size: 9px;
          font-weight: 900;
          margin-bottom: 5px;
        }

        .total-box strong {
          color: #ff3159;
          font-size: 25px;
        }

        .items {
          border-top: 1px solid
            rgba(255, 255, 255, 0.07);
          margin-top: 20px;
          padding-top: 10px;
        }

        .item {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          padding: 12px 0;
          border-bottom: 1px solid
            rgba(255, 255, 255, 0.05);
        }

        .item:last-child {
          border-bottom: 0;
        }

        .item strong {
          display: block;
          font-size: 12px;
        }

        .item small {
          color: #666;
          display: block;
          margin-top: 4px;
        }

        .methods {
          display: grid;
          grid-template-columns: repeat(
            4,
            1fr
          );
          gap: 10px;
        }

        .method {
          min-height: 100px;
          background: #0d0d0d;
          border: 1px solid
            rgba(255, 255, 255, 0.08);
          border-radius: 15px;
          color: #aaa;
          cursor: pointer;
          position: relative;
          transition: 0.25s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 11px;
          font-weight: 900;
        }

        .method:hover {
          transform: translateY(-3px);
          border-color: rgba(
            255,
            23,
            68,
            0.5
          );
        }

        .method.selected {
          color: white;
          border-color: #ff1744;
          background: rgba(
            255,
            23,
            68,
            0.07
          );
          box-shadow:
            0 0 30px
            rgba(255, 23, 68, 0.12);
          animation: selectedPulse 1.8s
            ease-in-out infinite;
        }

        .method-symbol {
          font-size: 28px;
          color: #eee;
        }

        .method.selected
          .method-symbol {
          color: #ff3159;
        }

        .check {
          position: absolute;
          top: 7px;
          right: 8px;
          color: #ff1744;
          font-size: 13px;
        }

        .submitted-badge {
          color: #5cffaa;
          font-size: 9px;
        }

        .method-loading {
          padding: 40px 10px;
          text-align: center;
          color: #777;
        }

        .selected-coin {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #090909;
          border: 1px solid
            rgba(255, 255, 255, 0.07);
          border-radius: 15px;
          padding: 16px;
        }

        .selected-coin span {
          display: block;
          color: #666;
          font-size: 9px;
          font-weight: 900;
          margin-bottom: 6px;
        }

        .selected-coin strong {
          font-size: 16px;
        }

        .coin-glow {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ff1744;
          font-size: 22px;
          font-weight: 1000;
          border: 1px solid
            rgba(255, 23, 68, 0.4);
          box-shadow:
            0 0 25px
            rgba(255, 23, 68, 0.18);
        }

        .info-box {
          white-space: pre-wrap;
          margin-top: 15px;
          padding: 15px;
          color: #aaa;
          background: #080808;
          border-radius: 12px;
          border: 1px solid
            rgba(255, 255, 255, 0.06);
          font-size: 12px;
          line-height: 1.7;
        }

        .wallet-section {
          margin-top: 18px;
        }

        .wallet-section label {
          display: block;
          color: #666;
          font-size: 9px;
          font-weight: 900;
          margin-bottom: 8px;
        }

        .wallet-box {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #050505;
          border: 1px solid
            rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 7px 7px 7px 13px;
        }

        .wallet-box span {
          min-width: 0;
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #bbb;
          font-family: monospace;
          font-size: 11px;
        }

        .wallet-box button {
          flex-shrink: 0;
          border: 0;
          background: #ff1744;
          color: white;
          border-radius: 9px;
          padding: 11px 13px;
          font-size: 9px;
          font-weight: 1000;
          cursor: pointer;
        }

        .wallet-box button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .qr-section {
          text-align: center;
          margin-top: 25px;
          padding-top: 22px;
          border-top: 1px solid
            rgba(255, 255, 255, 0.06);
        }

        .qr-section h3 {
          font-size: 14px;
          margin: 0 0 7px;
        }

        .qr-section p {
          color: #666;
          font-size: 11px;
          margin: 0 0 18px;
        }

        .qr-wrap {
          width: 220px;
          height: 220px;
          padding: 10px;
          background: white;
          border-radius: 15px;
          margin: auto;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow:
            0 0 45px
            rgba(255, 23, 68, 0.12);
        }

        .qr-wrap img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .empty-payment {
          margin-top: 15px;
          padding: 20px;
          text-align: center;
          color: #777;
          background: #090909;
          border-radius: 12px;
        }

        .timer-card {
          background:
            linear-gradient(
              135deg,
              rgba(255, 23, 68, 0.12),
              rgba(255, 23, 68, 0.02)
            );
          border: 1px solid
            rgba(255, 23, 68, 0.25);
          border-radius: 20px;
          padding: 22px;
          margin-bottom: 16px;
          text-align: center;
          animation: timerIn 0.5s ease both;
        }

        .timer-card > div:first-child
          span {
          display: block;
          color: #777;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 1px;
          margin-bottom: 5px;
        }

        .timer-card > div:first-child
          strong {
          display: block;
          color: #ff3159;
          font-family: monospace;
          font-size: 44px;
          letter-spacing: 2px;
          text-shadow:
            0 0 25px
            rgba(255, 23, 68, 0.3);
        }

        .timer-line {
          height: 4px;
          background: rgba(
            255,
            255,
            255,
            0.07
          );
          border-radius: 99px;
          overflow: hidden;
          margin: 15px 0 10px;
        }

        .timer-line div {
          height: 100%;
          background: #ff1744;
          transition: width 1s linear;
        }

        .timer-card p {
          color: #666;
          font-size: 11px;
          margin: 0;
        }

        .instruction {
          display: flex;
          gap: 14px;
          padding: 14px 0;
          border-bottom: 1px solid
            rgba(255, 255, 255, 0.06);
        }

        .instruction:last-of-type {
          border-bottom: 0;
        }

        .number {
          flex-shrink: 0;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(
            255,
            23,
            68,
            0.1
          );
          border: 1px solid
            rgba(255, 23, 68, 0.25);
          color: #ff3159;
          font-size: 11px;
          font-weight: 1000;
        }

        .instruction strong {
          font-size: 13px;
        }

        .instruction p {
          color: #666;
          font-size: 11px;
          line-height: 1.5;
          margin: 5px 0 0;
        }

        .upload-box {
          margin-top: 20px;
        }

        .upload-box input {
          display: none;
        }

        .file-label {
          min-height: 125px;
          border: 1px dashed
            rgba(255, 23, 68, 0.35);
          background: rgba(
            255,
            23,
            68,
            0.025
          );
          border-radius: 15px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          text-align: center;
          padding: 15px;
          cursor: pointer;
        }

        .file-label:hover {
          background: rgba(
            255,
            23,
            68,
            0.06
          );
        }

        .upload-icon {
          font-size: 25px;
          color: #ff3159;
        }

        .file-label span:not(.upload-icon) {
          color: #ddd;
          font-size: 11px;
          font-weight: 900;
          max-width: 90%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .file-label small {
          color: #555;
          font-size: 9px;
        }

        .upload-message {
          margin-top: 12px;
          padding: 12px;
          border-radius: 10px;
          background: rgba(
            255,
            255,
            255,
            0.04
          );
          color: #aaa;
          font-size: 11px;
          line-height: 1.5;
          text-align: center;
        }

        .upload-message.success {
          color: #5cffaa;
          background: rgba(
            0,
            255,
            130,
            0.06
          );
          border: 1px solid
            rgba(0, 255, 130, 0.12);
        }

        .submit-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 15px;
        }

        .upload-button,
        .submit-button {
          min-height: 50px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: 1000;
          cursor: pointer;
        }

        .upload-button {
          background: #111;
          border: 1px solid
            rgba(255, 255, 255, 0.1);
          color: white;
        }

        .submit-button {
          border: 0;
          background: #ff1744;
          color: white;
          box-shadow:
            0 0 25px
            rgba(255, 23, 68, 0.16);
        }

        .upload-button:disabled,
        .submit-button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .submitted-box {
          margin-top: 18px;
          padding: 15px;
          display: flex;
          align-items: center;
          gap: 13px;
          border-radius: 13px;
          background: rgba(
            0,
            255,
            130,
            0.05
          );
          border: 1px solid
            rgba(0, 255, 130, 0.13);
        }

        .success-circle {
          width: 40px;
          height: 40px;
          flex-shrink: 0;
          border-radius: 50%;
          background: rgba(
            0,
            255,
            130,
            0.12
          );
          color: #5cffaa;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 1000;
        }

        .submitted-box strong {
          color: #5cffaa;
          font-size: 11px;
        }

        .submitted-box p {
          color: #777;
          font-size: 10px;
          line-height: 1.5;
          margin: 4px 0 0;
        }

        .toast {
          position: fixed;
          left: 50%;
          bottom: 25px;
          transform: translateX(-50%);
          z-index: 50;
          width: min(
            500px,
            calc(100% - 30px)
          );
          background: #171717;
          border: 1px solid
            rgba(255, 23, 68, 0.3);
          padding: 13px 15px;
          border-radius: 12px;
          text-align: center;
          color: #ddd;
          font-size: 11px;
          box-shadow:
            0 20px 60px
            rgba(0, 0, 0, 0.5);
        }

        .floating-status {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          margin: 10px 0 25px;
          padding: 15px;
          background: rgba(
            255,
            23,
            68,
            0.07
          );
          border: 1px solid
            rgba(255, 23, 68, 0.2);
          color: #ff5473;
          border-radius: 13px;
          font-size: 10px;
          font-weight: 1000;
          cursor: pointer;
        }

        .status-pulse {
          width: 7px;
          height: 7px;
          background: #ff1744;
          border-radius: 50%;
          box-shadow:
            0 0 0 0
            rgba(255, 23, 68, 0.6);
          animation: pulse 1.6s infinite;
        }

        .status-popup {
          position: fixed;
          right: 20px;
          bottom: 20px;
          z-index: 100;
          width: min(
            360px,
            calc(100% - 40px)
          );
          padding: 15px;
          display: flex;
          align-items: center;
          gap: 12px;
          background: #111;
          border: 1px solid
            rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          box-shadow:
            0 20px 70px
            rgba(0, 0, 0, 0.55);
          animation: popupIn 0.35s ease both;
        }

        .status-circle {
          width: 42px;
          height: 42px;
          flex-shrink: 0;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 19px;
          font-weight: 1000;
        }

        .status-circle.pending {
          background: rgba(
            255,
            170,
            0,
            0.1
          );
          color: #ffc247;
        }

        .status-circle.confirmed {
          background: rgba(
            0,
            255,
            130,
            0.1
          );
          color: #5cffaa;
        }

        .status-circle.failed {
          background: rgba(
            255,
            23,
            68,
            0.1
          );
          color: #ff5473;
        }

        .status-popup span {
          display: block;
          color: #666;
          font-size: 8px;
          font-weight: 900;
        }

        .status-popup strong {
          display: block;
          margin-top: 4px;
          font-size: 12px;
        }

        .status-popup button {
          margin-left: auto;
          align-self: flex-start;
          border: 0;
          background: transparent;
          color: #666;
          font-size: 20px;
          cursor: pointer;
        }

        footer {
          width: min(
            850px,
            calc(100% - 30px)
          );
          margin: 30px auto 0;
          padding-top: 30px;
          border-top: 1px solid
            rgba(255, 255, 255, 0.07);
          text-align: center;
          position: relative;
          z-index: 1;
        }

        .footer-logo {
          width: 90px;
          max-width: 30vw;
          max-height: 50px;
          object-fit: contain;
          margin-bottom: 8px;
          opacity: 0.85;
        }

        .footer-brand strong {
          font-size: 20px;
          font-weight: 1000;
        }

        .footer-brand span {
          color: #ff1744;
        }

        footer p {
          color: #555;
          font-size: 10px;
          margin: 10px 0;
        }

        footer a {
          color: #777;
          font-size: 9px;
          font-weight: 900;
          text-decoration: none;
        }

        @keyframes heroIn {
          from {
            opacity: 0;
            transform: translateY(25px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes cardIn {
          from {
            opacity: 0;
            transform: translateY(15px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes selectedPulse {
          0%,
          100% {
            box-shadow:
              0 0 20px
              rgba(255, 23, 68, 0.08);
          }

          50% {
            box-shadow:
              0 0 35px
              rgba(255, 23, 68, 0.2);
          }
        }

        @keyframes timerIn {
          from {
            opacity: 0;
            transform: scale(0.98);
          }

          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes popupIn {
          from {
            opacity: 0;
            transform: translateY(15px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse {
          0% {
            box-shadow:
              0 0 0 0
              rgba(255, 23, 68, 0.5);
          }

          70% {
            box-shadow:
              0 0 0 8px
              rgba(255, 23, 68, 0);
          }

          100% {
            box-shadow:
              0 0 0 0
              rgba(255, 23, 68, 0);
          }
        }

        @media (max-width: 650px) {
          .topbar {
            padding: 16px 0;
          }

          .top-actions {
            gap: 5px;
          }

          .order-link,
          .status-button {
            padding: 8px 9px;
            font-size: 8px;
          }

          .hero {
            padding-top: 55px;
          }

          .hero h1 {
            letter-spacing: -2px;
          }

          .methods {
            grid-template-columns: repeat(
              2,
              1fr
            );
          }

          .order-main {
            flex-direction: column;
            gap: 15px;
          }

          .total-box {
            text-align: left;
          }

          .submit-actions {
            grid-template-columns: 1fr;
          }

          .wallet-box {
            align-items: stretch;
          }

          .wallet-box span {
            padding-top: 10px;
          }

          .qr-wrap {
            width: 190px;
            height: 190px;
          }

          .timer-card
            > div:first-child
            strong {
            font-size: 38px;
          }
        }
      `}</style>
    </>
  )
}
