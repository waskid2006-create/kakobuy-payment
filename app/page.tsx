"use client"

import { useEffect, useState } from "react"

const paymentMethods = [
  { id: "bitcoin", name: "Bitcoin", symbol: "₿" },
  { id: "ethereum", name: "Ethereum", symbol: "Ξ" },
  { id: "tron", name: "TRON", symbol: "TRX" },
  { id: "binance", name: "Binance", symbol: "BNB" },
]

const CHECK_ORDER_URL = "https://kakobuy-check-order.vercel.app/"
const HOME_URL = "https://kakobuy-mini.vercel.app/"

type PaymentStatus = "pending" | "confirmed" | "failed"

type Order = {
  id: number
  full_name?: string
  email?: string
  phone?: string
  country?: string
  address?: string
  city?: string
  state?: string
  items?: any[]
  total?: number | string
  payment_method?: string
  payment_status?: PaymentStatus
  wallet_copied?: boolean
  wallet_copied_at?: string | null
  created_at?: string
}

export default function Home() {
  const [selected, setSelected] = useState("bitcoin")
  const [copied, setCopied] = useState(false)

  const [information, setInformation] = useState("")
  const [qrImage, setQrImage] = useState("")
  const [loading, setLoading] = useState(true)

  const [heroHeading, setHeroHeading] =
    useState("PAY WITH CRYPTO")

  const [heroSubtitle, setHeroSubtitle] =
    useState("Secure and simple crypto payment")

  const [footerText, setFooterText] =
    useState("KAKOBUY")

  const [order, setOrder] = useState<Order | null>(null)
  const [orderLoading, setOrderLoading] = useState(false)

  const [paymentStatus, setPaymentStatus] =
    useState<PaymentStatus>("pending")

  const [statusVisible, setStatusVisible] = useState(false)

  const selectedMethod = paymentMethods.find(
    (item) => item.id === selected
  )

  /*
   * Get order information from the URL.
   *
   * Page 2 sends:
   * ?orderId=123&total=50.00&email=...
   */
  const getOrderDetails = () => {
    if (typeof window === "undefined") return null

    const params = new URLSearchParams(
      window.location.search
    )

    return {
      orderId: params.get("orderId"),
      email: params.get("email"),
      total: params.get("total"),
      fullName: params.get("fullName"),
    }
  }

  /*
   * Load payment method information.
   */
  useEffect(() => {
    async function loadPaymentMethod() {
      setLoading(true)
      setInformation("")
      setQrImage("")

      try {
        const response = await fetch(
          `/api/payment-methods?id=${selected}`,
          {
            cache: "no-store",
          }
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Unable to load payment information"
          )
        }

        setInformation(data.information || "")
        setQrImage(data.qr_image_url || "")

        setHeroHeading(
          data.hero_heading || "PAY WITH CRYPTO"
        )

        setHeroSubtitle(
          data.hero_subtitle ||
            "Secure and simple crypto payment"
        )

        setFooterText(
          data.footer_text || "KAKOBUY"
        )
      } catch (error) {
        console.error(
          "Payment method loading error:",
          error
        )

        setInformation("")
        setQrImage("")
      } finally {
        setLoading(false)
      }
    }

    loadPaymentMethod()
  }, [selected])

  /*
   * Load the current order.
   */
  useEffect(() => {
    async function loadOrder() {
      const details = getOrderDetails()

      if (!details?.orderId) {
        return
      }

      setOrderLoading(true)

      try {
        const query = new URLSearchParams()

        query.set("id", details.orderId)

        if (details.email) {
          query.set("email", details.email)
        }

        const response = await fetch(
          `/api/orders?${query.toString()}`,
          {
            cache: "no-store",
          }
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data.error || "Unable to load order."
          )
        }

        if (data.order) {
          setOrder(data.order)

          setPaymentStatus(
            data.order.payment_status || "pending"
          )
        }
      } catch (error) {
        console.error(
          "Order loading error:",
          error
        )

        /*
         * If the order endpoint cannot be reached,
         * still use the total passed from Page 2.
         */
        setOrder({
          id: Number(details.orderId),
          email: details.email || "",
          full_name: details.fullName || "",
          total: details.total || 0,
          payment_status: "pending",
        })
      } finally {
        setOrderLoading(false)
      }
    }

    loadOrder()
  }, [])

  /*
   * Continuously check payment status.
   *
   * This lets the buyer see:
   * Pending → Confirmed
   * Pending → Failed
   */
  useEffect(() => {
    const details = getOrderDetails()

    if (!details?.orderId) {
      return
    }

    let active = true

    async function checkStatus() {
      try {
        const query = new URLSearchParams()

        query.set("orderId", details.orderId!)

        if (details.email) {
          query.set("email", details.email)
        }

        const response = await fetch(
          `/api/payment-status?${query.toString()}`,
          {
            cache: "no-store",
          }
        )

        const data = await response.json()

        if (!response.ok || !data.order) {
          return
        }

        if (!active) return

        const newStatus =
          data.order.payment_status || "pending"

        setPaymentStatus(newStatus)
        setOrder((previous) => ({
          ...(previous || {}),
          ...data.order,
        }))
      } catch (error) {
        console.error(
          "Payment status error:",
          error
        )
      }
    }

    checkStatus()

    const interval = window.setInterval(
      checkStatus,
      2000
    )

    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [])

  /*
   * Copy wallet/payment information.
   *
   * After copying, notify the server so the admin
   * can immediately see that the buyer copied it.
   */
  async function copyInfo() {
    if (!information) return

    try {
      await navigator.clipboard.writeText(
        information
      )

      setCopied(true)
      setStatusVisible(true)

      const details = getOrderDetails()

      if (details?.orderId) {
        try {
          const response = await fetch(
            "/api/payment-status",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                orderId: details.orderId,
                email: details.email || "",
                paymentMethod: selected,
              }),
            }
          )

          const data = await response.json()

          if (response.ok && data.order) {
            setOrder((previous) => ({
              ...(previous || {}),
              ...data.order,
            }))

            setPaymentStatus(
              data.order.payment_status ||
                "pending"
            )
          }
        } catch (error) {
          console.error(
            "Wallet copied update error:",
            error
          )
        }
      }

      window.setTimeout(() => {
        setCopied(false)
      }, 2500)
    } catch (error) {
      console.error(
        "Clipboard error:",
        error
      )

      alert(
        "Unable to copy automatically. Please copy the payment information manually."
      )
    }
  }

  /*
   * Download a simple customer invoice.
   */
  function downloadInvoice() {
    const details = getOrderDetails()

    const orderId =
      order?.id ||
      Number(details?.orderId || 0)

    const buyerName =
      order?.full_name ||
      details?.fullName ||
      "Customer"

    const buyerEmail =
      order?.email ||
      details?.email ||
      ""

    const orderTotal =
      Number(
        order?.total ??
          details?.total ??
          0
      ).toFixed(2)

    const method =
      order?.payment_method ||
      selectedMethod?.name ||
      "Crypto"

    const status =
      paymentStatus.toUpperCase()

    const createdAt = order?.created_at
      ? new Date(
          order.created_at
        ).toLocaleString()
      : new Date().toLocaleString()

    const invoice = `
KAKOBUY
${footerText}

PAYMENT INVOICE
==============================

Order ID: ${orderId}
Customer: ${buyerName}
Email: ${buyerEmail}

Payment Method: ${method}
Payment Status: ${status}

Order Total: $${orderTotal}

Created: ${createdAt}

==============================

Thank you for your order.
Please keep this invoice for your records.
`

    const blob = new Blob(
      [invoice.trim()],
      {
        type: "text/plain;charset=utf-8",
      }
    )

    const url = URL.createObjectURL(blob)

    const link =
      document.createElement("a")

    link.href = url
    link.download =
      `KAKOBUY-Invoice-${orderId}.txt`

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)
  }

  /*
   * Status display.
   */
  function getStatusTitle() {
    if (paymentStatus === "confirmed") {
      return "Payment Confirmed"
    }

    if (paymentStatus === "failed") {
      return "Payment Failed"
    }

    return "Payment waiting for confirmation"
  }

  function getStatusMessage() {
    if (paymentStatus === "confirmed") {
      return "Your payment has been confirmed successfully."
    }

    if (paymentStatus === "failed") {
      return "Your payment could not be confirmed. Please check your order or contact support."
    }

    return "Your payment details have been received. Please wait while your payment is being confirmed."
  }

  return (
    <main className="page">
      <div className="container">

        {/* HERO */}
        <header className="header hero-slide">
          <h1>
            <span className="kako">
              {heroHeading}
            </span>
          </h1>

          <p>{heroSubtitle}</p>
        </header>

        {/* ORDER TOTAL */}
        {(order || getOrderDetails()?.total) && (
          <section className="order-summary">
            <div>
              <span className="summary-label">
                ORDER TOTAL
              </span>

              <strong>
                $
                {Number(
                  order?.total ??
                    getOrderDetails()?.total ??
                    0
                ).toFixed(2)}
              </strong>
            </div>

            {order?.id && (
              <span className="order-number">
                Order #{order.id}
              </span>
            )}
          </section>
        )}

        {/* PAYMENT METHODS */}
        <div className="methods">
          {paymentMethods.map((method) => (
            <button
              key={method.id}
              onClick={() =>
                setSelected(method.id)
              }
              className={`method ${
                selected === method.id
                  ? "selected"
                  : ""
              }`}
              type="button"
            >
              <span className="symbol">
                {method.symbol}
              </span>

              <span className="name">
                {method.name}
              </span>
            </button>
          ))}
        </div>

        {/* PAYMENT CARD */}
        <section className="payment-card">

          <div className="card-title">
            <div>
              <span className="small-title">
                PAYMENT METHOD
              </span>

              <h2>
                {selectedMethod?.name}
              </h2>
            </div>

            <div className="active-dot" />
          </div>

          {/* PAYMENT INFORMATION */}
          <div className="info-box">
            <p className="label">
              Payment information
            </p>

            <p className="info">
              {loading
                ? "Loading..."
                : information ||
                  "No payment information available."}
            </p>
          </div>

          {/* COPY */}
          <button
            className="copy-button"
            onClick={copyInfo}
            disabled={
              loading || !information
            }
            type="button"
          >
            {copied
              ? "✓ Copy successful"
              : "Copy wallet address"}
          </button>

          {/* QR */}
          <div className="qr-box">
            {loading ? (
              <>
                <div className="qr-icon">
                  ▦
                </div>

                <p>QR CODE</p>

                <span>
                  Loading QR image...
                </span>
              </>
            ) : qrImage ? (
              <>
                <img
                  src={qrImage}
                  alt={`${selectedMethod?.name} QR Code`}
                  style={{
                    display: "block",
                    width: "220px",
                    height: "220px",
                    maxWidth: "100%",
                    objectFit: "contain",
                    margin:
                      "0 auto 15px",
                    background: "#fff",
                    borderRadius: "10px",
                  }}
                />

                <p>QR CODE</p>

                <span>
                  Scan to make payment
                </span>
              </>
            ) : (
              <>
                <div className="qr-icon">
                  ▦
                </div>

                <p>QR CODE</p>

                <span>
                  QR image not available
                </span>
              </>
            )}
          </div>
        </section>

        {/* WARNING */}
        <div className="notice">
          <span>!</span>

          <p>
            Please make sure you select the
            correct payment method before
            copying the wallet address.
          </p>
        </div>

        {/* ACTIONS */}
        <div className="actions">

          <button
            type="button"
            className="invoice-button"
            onClick={downloadInvoice}
            disabled={orderLoading}
          >
            📄 Download invoice
          </button>

          <a
            href={CHECK_ORDER_URL}
            className="navigation-button"
          >
            ← Back to check order
          </a>

          <a
            href={HOME_URL}
            className="navigation-button"
          >
            HOME
          </a>

        </div>

        {/* FOOTER */}
        <p className="footer">
          {footerText}
        </p>

      </div>

      {/* FLOATING PAYMENT STATUS */}
      {statusVisible && (
  <div
    className={`status-overlay ${paymentStatus}`}
    onClick={() => setStatusVisible(false)}
  >
    <div
      className="nitro-status-card"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="nitro-glow glow-one" />
      <div className="nitro-glow glow-two" />
      <div className="nitro-glow glow-three" />

      <div className="nitro-particles">
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>

      <div className="nitro-status-top">
        <span className="nitro-brand">
          KAKOBUY
        </span>

        <span className="nitro-live">
          LIVE
        </span>
      </div>

      <div className="nitro-icon-wrap">
        <div className="nitro-ring ring-one" />
        <div className="nitro-ring ring-two" />

        <div className="nitro-icon">
          {paymentStatus === "confirmed"
            ? "✓"
            : paymentStatus === "failed"
              ? "!"
              : "◌"}
        </div>
      </div>

      <div className="nitro-status-content">
        <span className="nitro-status-label">
          PAYMENT STATUS
        </span>

        <h2>
          {getStatusTitle()}
        </h2>

        <p>
          {getStatusMessage()}
        </p>
      </div>

      {paymentStatus === "pending" && (
        <div className="nitro-progress">
          <div className="nitro-progress-bar" />
        </div>
      )}

      <div className="nitro-status-bottom">
        <span>
          ORDER #{order?.id || "—"}
        </span>

        <button
          type="button"
          onClick={() =>
            setStatusVisible(false)
          }
        >
          CLOSE
        </button>
      </div>
    </div>
  </div>
)}

      {/* SHOW STATUS AFTER COPY */}
      {copied && !statusVisible && (
        <div className="copy-floating">
          ✓ Payment information copied
        </div>
      )}

      {/* LIVE STATUS BAR */}
      {order?.id && (
        <button
          type="button"
          className={`live-status ${
            paymentStatus
          }`}
          onClick={() =>
            setStatusVisible(true)
          }
        >
          <span className="live-dot" />

          {paymentStatus ===
            "confirmed"
            ? "Payment Confirmed"
            : paymentStatus ===
              "failed"
            ? "Payment Failed"
            : "Payment waiting for confirmation"}
        </button>
      )}

      <style jsx>{`
        .hero-slide {
          animation: heroSlideIn 0.8s
            ease-out both;
        }

        @keyframes heroSlideIn {
          from {
            opacity: 0;
            transform: translateY(-35px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .order-summary {
          width: 100%;
          max-width: 520px;
          margin: 0 auto 22px;
          padding: 17px 18px;
          border: 1px solid
            rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          background: #111;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          box-sizing: border-box;
        }

        .order-summary > div {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .summary-label {
          color: #888;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.5px;
        }

        .order-summary strong {
          color: #fff;
          font-size: 24px;
          font-weight: 900;
        }

        .order-number {
          color: #999;
          font-size: 11px;
          font-weight: 700;
        }

        .actions {
          width: 100%;
          max-width: 520px;
          margin: 20px auto 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .invoice-button,
        .navigation-button {
          width: 100%;
          min-height: 48px;
          border-radius: 12px;
          border: 1px solid
            rgba(255, 255, 255, 0.12);
          background: #171717;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          text-decoration: none;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          box-sizing: border-box;
        }

        .invoice-button:hover,
        .navigation-button:hover {
          background: #202020;
        }

        .invoice-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .status-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: rgba(0, 0, 0, 0.78);
          backdrop-filter: blur(8px);
          animation: overlayIn 0.25s
            ease-out;
        }

        @keyframes overlayIn {
          from {
            opacity: 0;
          }

          to {
            opacity: 1;
          }
        }

        .status-card {
          width: 100%;
          max-width: 390px;
          padding: 30px 22px;
          border-radius: 22px;
          background: #111;
          border: 1px solid
            rgba(255, 255, 255, 0.12);
          box-shadow:
            0 25px 80px
              rgba(0, 0, 0, 0.55);
          text-align: center;
          animation: statusPop 0.35s
            cubic-bezier(
              0.175,
              0.885,
              0.32,
              1.275
            );
        }

        @keyframes statusPop {
          from {
            opacity: 0;
            transform: scale(0.8)
              translateY(20px);
          }

          to {
            opacity: 1;
            transform: scale(1)
              translateY(0);
          }
        }

        .status-icon {
          width: 64px;
          height: 64px;
          margin: 0 auto 16px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 30px;
          font-weight: 900;
          background: #1d1d1d;
          color: #fff;
          border: 1px solid
            rgba(255, 255, 255, 0.12);
        }

        .status-card h2 {
          margin: 0 0 10px;
          color: #fff;
          font-size: 20px;
          font-weight: 900;
        }

        .status-card p {
          margin: 0 auto;
          max-width: 320px;
          color: #aaa;
          font-size: 13px;
          line-height: 1.6;
        }

        .status-card.pending
          .status-icon {
          animation: pulse 1.5s
            infinite;
        }

        @keyframes pulse {
          0%,
          100% {
            transform: scale(1);
          }

          50% {
            transform: scale(1.08);
          }
        }

        .status-loader {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          margin: 18px 0;
        }

        .status-loader span {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #fff;
          animation: loader 1s
            infinite ease-in-out;
        }

        .status-loader span:nth-child(
            2
          ) {
          animation-delay: 0.15s;
        }

        .status-loader span:nth-child(
            3
          ) {
          animation-delay: 0.3s;
        }

        @keyframes loader {
          0%,
          80%,
          100% {
            opacity: 0.25;
            transform: scale(0.8);
          }

          40% {
            opacity: 1;
            transform: scale(1);
          }
        }

        .status-close {
          margin-top: 18px;
          width: 100%;
          min-height: 44px;
          border: 0;
          border-radius: 11px;
          background: #fff;
          color: #000;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
        }

        .status-overlay.confirmed
          .status-icon {
          background: #fff;
          color: #000;
        }

        .status-overlay.failed
          .status-icon {
          background: #2a2a2a;
          color: #fff;
        }

        .copy-floating {
          position: fixed;
          left: 50%;
          bottom: 25px;
          z-index: 9000;
          transform: translateX(-50%);
          padding: 12px 18px;
          border-radius: 30px;
          background: #fff;
          color: #000;
          font-size: 12px;
          font-weight: 900;
          box-shadow:
            0 10px 35px
              rgba(0, 0, 0, 0.35);
          animation: floatingIn
            0.3s ease-out;
        }

        @keyframes floatingIn {
          from {
            opacity: 0;
            transform: translateX(-50%)
              translateY(15px);
          }

          to {
            opacity: 1;
            transform: translateX(-50%)
              translateY(0);
          }
        }

        .live-status {
          position: fixed;
          right: 16px;
          bottom: 16px;
          z-index: 8000;
          border: 1px solid
            rgba(255, 255, 255, 0.12);
          border-radius: 30px;
          padding: 11px 15px;
          background: #111;
          color: #fff;
          font-size: 11px;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow:
            0 10px 30px
              rgba(0, 0, 0, 0.4);
          cursor: pointer;
        }

        .live-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #fff;
          animation: livePulse 1.5s
            infinite;
        }

        @keyframes livePulse {
          0%,
          100% {
            opacity: 1;
          }

          50% {
            opacity: 0.35;
          }
        }

        @media (max-width: 480px) {
          .order-summary {
            margin-bottom: 16px;
          }

          .order-summary strong {
            font-size: 21px;
          }

          .order-number {
            font-size: 10px;
          }

          .status-card {
            padding: 27px 18px;
          }

          .live-status {
            left: 50%;
            right: auto;
            transform: translateX(-50%);
            bottom: 12px;
            white-space: nowrap;
          }
        }
      `}</style>
    </main>
  )
}
