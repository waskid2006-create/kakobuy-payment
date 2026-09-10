"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

type PaymentStatus = "pending" | "confirmed" | "failed"

type PaymentMethod = {
  id?: string
  name?: string
  symbol?: string
  wallet_address?: string
  address?: string
  qr_image?: string | null
  information?: string
  description?: string
  hero_title?: string
  hero_subtitle?: string
  footer_text?: string
}

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

const CHECK_ORDER_URL =
  "https://kakobuy-check-order.vercel.app/"

const HOME_URL =
  "https://kakobuy-mini.vercel.app/"

const PAYMENT_METHODS = [
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

function getOrderDetails() {
  if (typeof window === "undefined") {
    return null
  }

  const params = new URLSearchParams(window.location.search)

  const orderId =
    params.get("orderId") ||
    params.get("id")

  const email =
    params.get("email") || ""

  if (!orderId) {
    return null
  }

  return {
    orderId,
    email,
  }
}

function formatMoney(value: number | string | undefined) {
  const amount = Number(value || 0)

  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function safeText(value: unknown) {
  if (value === null || value === undefined) {
    return ""
  }

  return String(value)
}

export default function PaymentPage() {
  const [selected, setSelected] = useState("bitcoin")

  const [method, setMethod] =
    useState<PaymentMethod | null>(null)

  const [order, setOrder] =
    useState<Order | null>(null)

  const [paymentStatus, setPaymentStatus] =
    useState<PaymentStatus>("pending")

  const [loadingMethod, setLoadingMethod] =
    useState(true)

  const [loadingOrder, setLoadingOrder] =
    useState(true)

  const [copied, setCopied] =
    useState(false)

  const [statusVisible, setStatusVisible] =
    useState(false)

  const [error, setError] =
    useState("")

  const [timeLeft, setTimeLeft] =
    useState(60)

  /*
   * Get the current order details from the URL.
   */
  const orderDetails = useMemo(
    () => getOrderDetails(),
    []
  )

  /*
   * Load payment method.
   */
  const loadPaymentMethod =
    useCallback(async () => {
      setLoadingMethod(true)

      try {
        const response = await fetch(
          `/api/payment-methods?id=${encodeURIComponent(
            selected
          )}`,
          {
            cache: "no-store",
          }
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data?.error ||
              "Unable to load payment method."
          )
        }

        const paymentMethod =
          data?.paymentMethod ||
          data?.method ||
          data

        setMethod(paymentMethod || null)
      } catch (err) {
        console.error(
          "Payment method error:",
          err
        )

        setMethod(null)
      } finally {
        setLoadingMethod(false)
      }
    }, [selected])

  /*
   * Load order.
   */
  const loadOrder =
    useCallback(async () => {
      const details = getOrderDetails()

      if (!details || !details.orderId) {
        setLoadingOrder(false)
        return
      }

      const orderId = details.orderId
      const email = details.email

      setLoadingOrder(true)

      try {
        const query =
          new URLSearchParams()

        query.set("id", orderId)

        if (email) {
          query.set("email", email)
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
            data?.error ||
              "Unable to load order."
          )
        }

        const loadedOrder =
          data?.order || data

        if (loadedOrder) {
          setOrder(loadedOrder)

          const status =
            loadedOrder.payment_status ||
            "pending"

          setPaymentStatus(status)
        }
      } catch (err) {
        console.error(
          "Order loading error:",
          err
        )

        setError(
          "We couldn't load this order."
        )
      } finally {
        setLoadingOrder(false)
      }
    }, [])

  /*
   * Load payment method whenever the
   * selected payment method changes.
   */
  useEffect(() => {
    loadPaymentMethod()
  }, [loadPaymentMethod])

  /*
   * Load order when the page opens.
   */
  useEffect(() => {
    loadOrder()
  }, [loadOrder])

  /*
   * Poll payment status.
   */
  useEffect(() => {
    const details = getOrderDetails()

    if (!details || !details.orderId) {
      return
    }

    const orderId = details.orderId
    const email = details.email

    let active = true

    const checkStatus = async () => {
      try {
        const query =
          new URLSearchParams()

        query.set("orderId", orderId)

        if (email) {
          query.set("email", email)
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

        if (!active) {
          return
        }

        const newStatus: PaymentStatus =
          data.order.payment_status ||
          "pending"

        setPaymentStatus(newStatus)

        setOrder((previous) => ({
          ...(previous || {}),
          ...data.order,
        }))

        if (
          newStatus === "confirmed" ||
          newStatus === "failed"
        ) {
          setStatusVisible(true)
        }
      } catch (error) {
        console.error(
          "Payment status error:",
          error
        )
      }
    }

    checkStatus()

    const interval =
      window.setInterval(
        checkStatus,
        2000
      )

    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [])

  /*
   * Fixed 60-second timer.
   */
  useEffect(() => {
    if (!orderDetails?.orderId) {
      return
    }

    const storageKey =
      `kakobuy-payment-timer-${orderDetails.orderId}`

    const now = Date.now()

    let expiresAt =
      Number(
        sessionStorage.getItem(storageKey)
      ) || 0

    if (
      !expiresAt ||
      expiresAt <= now
    ) {
      expiresAt = now + 60 * 1000

      sessionStorage.setItem(
        storageKey,
        String(expiresAt)
      )
    }

    const updateTimer = () => {
      const remaining = Math.max(
        0,
        Math.ceil(
          (expiresAt - Date.now()) /
            1000
        )
      )

      setTimeLeft(remaining)
    }

    updateTimer()

    const timer =
      window.setInterval(
        updateTimer,
        1000
      )

    return () => {
      window.clearInterval(timer)
    }
  }, [orderDetails?.orderId])

  /*
   * Copy wallet/payment information.
   */
  async function copyInfo() {
    const wallet =
      method?.wallet_address ||
      method?.address ||
      ""

    if (!wallet) {
      return
    }

    try {
      await navigator.clipboard.writeText(
        wallet
      )

      setCopied(true)

      window.setTimeout(() => {
        setCopied(false)
      }, 2000)

      const details =
        getOrderDetails()

      if (!details?.orderId) {
        return
      }

      const response =
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
                details.email || undefined,
              wallet_copied: true,
            }),
          }
        )

      if (!response.ok) {
        console.error(
          "Could not save wallet copied status."
        )
      }
    } catch (error) {
      console.error(
        "Copy wallet error:",
        error
      )
    }
  }

  /*
   * Download a simple invoice.
   */
  function downloadInvoice() {
    if (!order) {
      return
    }

    const lines = [
      "KAKOBUY",
      "PAYMENT INVOICE",
      "",
      `Order ID: ${safeText(
        order.id
      )}`,
      `Name: ${safeText(
        order.full_name
      )}`,
      `Email: ${safeText(
        order.email
      )}`,
      `Payment Method: ${safeText(
        order.payment_method ||
          method?.name
      )}`,
      `Total: ${formatMoney(
        order.total
      )}`,
      `Payment Status: ${safeText(
        order.payment_status ||
          paymentStatus
      )}`,
      "",
      `Created: ${safeText(
        order.created_at
      )}`,
    ]

    const blob =
      new Blob(
        [lines.join("\n")],
        {
          type: "text/plain",
        }
      )

    const url =
      URL.createObjectURL(blob)

    const link =
      document.createElement("a")

    link.href = url

    link.download =
      `kakobuy-invoice-${order.id}.txt`

    document.body.appendChild(link)

    link.click()

    document.body.removeChild(link)

    URL.revokeObjectURL(url)
  }

  function statusText() {
    if (
      paymentStatus ===
      "confirmed"
    ) {
      return "Payment confirmed"
    }

    if (
      paymentStatus ===
      "failed"
    ) {
      return "Payment failed"
    }

    return "Payment pending"
  }

  const wallet =
    method?.wallet_address ||
    method?.address ||
    ""

  const selectedName =
    PAYMENT_METHODS.find(
      (item) =>
        item.id === selected
    )?.name || selected

  const heroTitle =
    method?.hero_title ||
    `Pay with ${selectedName}`

  const heroSubtitle =
    method?.hero_subtitle ||
    "Send your payment to the wallet address below."

  const footerText =
    method?.footer_text ||
    "KAKOBUY secure crypto payment"

  const isLoading =
    loadingMethod ||
    loadingOrder

  return (
    <main className="page">
      <div className="backgroundGlow glowOne" />
      <div className="backgroundGlow glowTwo" />

      <header className="header">
        <a
          href={HOME_URL}
          className="logo"
        >
          <span className="logoMark">
            K
          </span>

          <span className="logoText">
            KAKOBUY
          </span>
        </a>

        <a
          href={CHECK_ORDER_URL}
          className="checkOrder"
        >
          Check order
        </a>
      </header>

      <section className="container">
        <div className="hero">
          <div className="eyebrow">
            SECURE PAYMENT
          </div>

          <h1>{heroTitle}</h1>

          <p>{heroSubtitle}</p>
        </div>

        {error && (
          <div className="errorBox">
            {error}
          </div>
        )}

        {order && (
          <div className="orderCard">
            <div>
              <span className="smallLabel">
                ORDER
              </span>

              <strong>
                #{order.id}
              </strong>
            </div>

            <div className="orderTotal">
              <span className="smallLabel">
                TOTAL
              </span>

              <strong>
                {formatMoney(
                  order.total
                )}
              </strong>
            </div>
          </div>
        )}

        <div className="paymentCard">
          <div className="cardHeader">
            <div>
              <span className="smallLabel">
                PAYMENT METHOD
              </span>

              <h2>
                Choose payment
              </h2>
            </div>

            <div className="timer">
              <span>
                TIME
              </span>

              <strong>
                {timeLeft}s
              </strong>
            </div>
          </div>

          <div className="methodGrid">
            {PAYMENT_METHODS.map(
              (item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`methodButton ${
                    selected ===
                    item.id
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    setSelected(
                      item.id
                    )
                  }
                >
                  <span className="methodSymbol">
                    {item.symbol}
                  </span>

                  <span>
                    {item.name}
                  </span>
                </button>
              )
            )}
          </div>

          {isLoading ? (
            <div className="loading">
              <div className="spinner" />
              <p>
                Loading payment
                details...
              </p>
            </div>
          ) : (
            <>
              <div className="paymentInfo">
                <div className="paymentTitle">
                  <div>
                    <span className="smallLabel">
                      SEND PAYMENT
                    </span>

                    <h3>
                      {method?.name ||
                        selectedName}
                    </h3>
                  </div>

                  <span className="coinBadge">
                    {method?.symbol ||
                      PAYMENT_METHODS.find(
                        (item) =>
                          item.id ===
                          selected
                      )?.symbol}
                  </span>
                </div>

                {method?.qr_image && (
                  <div className="qrBox">
                    <img
                      src={
                        method.qr_image
                      }
                      alt={`${selectedName} QR code`}
                    />
                  </div>
                )}

                <div className="walletBox">
                  <span className="smallLabel">
                    WALLET ADDRESS
                  </span>

                  <div className="walletRow">
                    <div className="walletAddress">
                      {wallet ||
                        "Wallet address not available"}
                    </div>

                    <button
                      type="button"
                      className={`copyButton ${
                        copied
                          ? "copied"
                          : ""
                      }`}
                      onClick={
                        copyInfo
                      }
                      disabled={!wallet}
                    >
                      {copied
                        ? "Copied"
                        : "Copy"}
                    </button>
                  </div>
                </div>

                {method?.information ||
                method?.description ? (
                  <div className="information">
                    {method.information ||
                      method.description}
                  </div>
                ) : null}

                <div className="warning">
                  <span className="warningIcon">
                    !
                  </span>

                  <p>
                    Make sure you send
                    the correct payment
                    to the wallet address
                    shown above.
                  </p>
                </div>
              </div>

              <div className="statusSection">
                <div
                  className={`statusDot ${
                    paymentStatus
                  }`}
                />

                <div>
                  <strong>
                    {statusText()}
                  </strong>

                  <span>
                    We check your
                    payment status
                    automatically.
                  </span>
                </div>

                <button
                  type="button"
                  className="liveButton"
                  onClick={() =>
                    loadOrder()
                  }
                >
                  Live
                </button>
              </div>
            </>
          )}
        </div>

        <div className="actions">
          <button
            type="button"
            className="invoiceButton"
            onClick={
              downloadInvoice
            }
            disabled={!order}
          >
            Download invoice
          </button>

          <a
            href={CHECK_ORDER_URL}
            className="secondaryButton"
          >
            Check order status
          </a>
        </div>

        <p className="footer">
          {footerText}
        </p>
      </section>

      {statusVisible && (
        <div className="overlay">
          <div className="statusModal">
            <div
              className={`statusAnimation ${
                paymentStatus
              }`}
            >
              {paymentStatus ===
              "confirmed"
                ? "✓"
                : paymentStatus ===
                  "failed"
                ? "!"
                : "•"}
            </div>

            <span className="smallLabel">
              PAYMENT STATUS
            </span>

            <h2>
              {statusText()}
            </h2>

            <p>
              {paymentStatus ===
              "confirmed"
                ? "Your payment has been confirmed successfully."
                : paymentStatus ===
                  "failed"
                ? "Your payment could not be confirmed."
                : "Your payment is still being checked."}
            </p>

            <button
              type="button"
              className="closeButton"
              onClick={() =>
                setStatusVisible(
                  false
                )
              }
            >
              Continue
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at top left,
              rgba(255, 255, 255, 0.08),
              transparent 32%
            ),
            #080808;
          color: #fff;
          padding: 0 18px 50px;
          position: relative;
          overflow: hidden;
          font-family:
            Inter,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        .backgroundGlow {
          position: fixed;
          width: 320px;
          height: 320px;
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.13;
          pointer-events: none;
        }

        .glowOne {
          background: #ffffff;
          top: -180px;
          left: -120px;
        }

        .glowTwo {
          background: #555;
          bottom: -180px;
          right: -120px;
        }

        .header {
          max-width: 920px;
          margin: 0 auto;
          padding: 22px 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: relative;
          z-index: 2;
        }

        .logo {
          color: #fff;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 800;
          letter-spacing: 0.08em;
        }

        .logoMark {
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          background: #fff;
          color: #000;
          font-weight: 900;
        }

        .logoText {
          font-size: 15px;
        }

        .checkOrder {
          color: #fff;
          text-decoration: none;
          font-size: 13px;
          padding: 9px 14px;
          border: 1px solid #292929;
          border-radius: 9px;
        }

        .container {
          width: 100%;
          max-width: 680px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        .hero {
          text-align: center;
          padding: 55px 0 28px;
        }

        .eyebrow,
        .smallLabel {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.16em;
          color: #858585;
        }

        .hero h1 {
          font-size: clamp(
            32px,
            8vw,
            58px
          );
          line-height: 1;
          letter-spacing: -0.055em;
          margin: 12px 0;
        }

        .hero p {
          color: #999;
          max-width: 480px;
          margin: 0 auto;
          line-height: 1.6;
          font-size: 14px;
        }

        .errorBox {
          background: #241313;
          border: 1px solid #572525;
          color: #ffb2b2;
          padding: 14px;
          border-radius: 12px;
          margin-bottom: 14px;
          font-size: 13px;
        }

        .orderCard {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          padding: 18px;
          background: #111;
          border: 1px solid #252525;
          border-radius: 16px;
          margin-bottom: 14px;
        }

        .orderCard strong {
          display: block;
          margin-top: 5px;
          font-size: 14px;
        }

        .orderTotal {
          text-align: right;
        }

        .paymentCard {
          background: #101010;
          border: 1px solid #292929;
          border-radius: 22px;
          padding: 20px;
          box-shadow:
            0 25px 80px
              rgba(0, 0, 0, 0.4);
        }

        .cardHeader {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          align-items: flex-start;
        }

        .cardHeader h2 {
          margin: 7px 0 0;
          font-size: 22px;
          letter-spacing: -0.03em;
        }

        .timer {
          text-align: right;
        }

        .timer strong {
          display: block;
          margin-top: 5px;
          font-size: 18px;
        }

        .methodGrid {
          display: grid;
          grid-template-columns: repeat(
            4,
            1fr
          );
          gap: 8px;
          margin: 22px 0;
        }

        .methodButton {
          min-height: 72px;
          border-radius: 12px;
          border: 1px solid #292929;
          background: #151515;
          color: #aaa;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 7px;
          font-size: 11px;
          transition: 0.2s ease;
        }

        .methodButton:hover {
          border-color: #555;
        }

        .methodButton.active {
          background: #fff;
          border-color: #fff;
          color: #000;
        }

        .methodSymbol {
          font-size: 20px;
          font-weight: 800;
        }

        .loading {
          min-height: 250px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          color: #777;
          gap: 15px;
        }

        .spinner {
          width: 34px;
          height: 34px;
          border: 3px solid #292929;
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.8s linear
            infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .paymentInfo {
          border-top: 1px solid #252525;
          padding-top: 22px;
        }

        .paymentTitle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
        }

        .paymentTitle h3 {
          margin: 6px 0 0;
          font-size: 18px;
        }

        .coinBadge {
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #fff;
          color: #000;
          font-weight: 800;
          font-size: 12px;
        }

        .qrBox {
          display: flex;
          justify-content: center;
          margin: 22px 0;
        }

        .qrBox img {
          width: 190px;
          height: 190px;
          object-fit: contain;
          background: #fff;
          border-radius: 12px;
          padding: 8px;
        }

        .walletBox {
          margin-top: 20px;
        }

        .walletRow {
          margin-top: 8px;
          display: flex;
          align-items: stretch;
          gap: 8px;
        }

        .walletAddress {
          flex: 1;
          min-width: 0;
          padding: 13px;
          border-radius: 10px;
          background: #080808;
          border: 1px solid #282828;
          color: #ddd;
          font-family: monospace;
          font-size: 12px;
          line-height: 1.5;
          overflow-wrap: anywhere;
        }

        .copyButton {
          border: 0;
          background: #fff;
          color: #000;
          padding: 0 16px;
          border-radius: 10px;
          font-weight: 800;
          cursor: pointer;
        }

        .copyButton:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .copyButton.copied {
          background: #1c8c55;
          color: #fff;
        }

        .information {
          margin-top: 16px;
          padding: 14px;
          border-radius: 10px;
          background: #161616;
          color: #aaa;
          font-size: 13px;
          line-height: 1.6;
          white-space: pre-wrap;
        }

        .warning {
          margin-top: 14px;
          padding: 13px;
          display: flex;
          gap: 10px;
          border-radius: 10px;
          background: #181818;
          border: 1px solid #282828;
        }

        .warningIcon {
          width: 20px;
          height: 20px;
          flex: 0 0 20px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #fff;
          color: #000;
          font-size: 12px;
          font-weight: 900;
        }

        .warning p {
          margin: 0;
          color: #999;
          font-size: 12px;
          line-height: 1.5;
        }

        .statusSection {
          margin-top: 18px;
          padding: 14px;
          border: 1px solid #252525;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .statusDot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #d7a82c;
          box-shadow:
            0 0 0 5px
              rgba(215, 168, 44, 0.1);
        }

        .statusDot.confirmed {
          background: #2bb673;
          box-shadow:
            0 0 0 5px
              rgba(43, 182, 115, 0.1);
        }

        .statusDot.failed {
          background: #e44;
          box-shadow:
            0 0 0 5px
              rgba(238, 68, 68, 0.1);
        }

        .statusSection strong {
          display: block;
          font-size: 13px;
        }

        .statusSection span {
          display: block;
          color: #777;
          font-size: 11px;
          margin-top: 3px;
        }

        .liveButton {
          margin-left: auto;
          border: 1px solid #292929;
          background: #151515;
          color: #fff;
          border-radius: 8px;
          padding: 7px 10px;
          font-size: 11px;
          cursor: pointer;
        }

        .actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 14px;
        }

        .invoiceButton,
        .secondaryButton {
          min-height: 48px;
          border-radius: 11px;
          display: grid;
          place-items: center;
          text-decoration: none;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }

        .invoiceButton {
          border: 1px solid #292929;
          background: #151515;
          color: #fff;
        }

        .invoiceButton:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .secondaryButton {
          background: #fff;
          color: #000;
        }

        .footer {
          text-align: center;
          color: #555;
          font-size: 11px;
          margin: 25px 0 0;
        }

        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(
            0,
            0,
            0,
            0.82
          );
          backdrop-filter: blur(10px);
          display: grid;
          place-items: center;
          padding: 20px;
          z-index: 50;
        }

        .statusModal {
          width: min(
            100%,
            390px
          );
          background: #111;
          border: 1px solid #303030;
          border-radius: 22px;
          padding: 30px;
          text-align: center;
          box-shadow:
            0 30px 100px
              rgba(0, 0, 0, 0.7);
          animation: modalIn 0.25s
            ease-out;
        }

        @keyframes modalIn {
          from {
            opacity: 0;
            transform: translateY(
              12px
            ) scale(0.97);
          }

          to {
            opacity: 1;
            transform: translateY(
              0
            ) scale(1);
          }
        }

        .statusAnimation {
          width: 76px;
          height: 76px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          margin: 0 auto 20px;
          background: #292929;
          color: #fff;
          font-size: 36px;
          font-weight: 900;
          animation: pulse 1.4s
            infinite;
        }

        .statusAnimation.confirmed {
          background: #1c8c55;
        }

        .statusAnimation.failed {
          background: #a52e2e;
        }

        @keyframes pulse {
          50% {
            transform: scale(1.05);
          }
        }

        .statusModal h2 {
          margin: 10px 0;
          font-size: 25px;
        }

        .statusModal p {
          color: #888;
          line-height: 1.6;
          font-size: 13px;
          margin: 0 0 22px;
        }

        .closeButton {
          width: 100%;
          min-height: 46px;
          border: 0;
          border-radius: 10px;
          background: #fff;
          color: #000;
          font-weight: 800;
          cursor: pointer;
        }

        @media (max-width: 520px) {
          .page {
            padding-left: 12px;
            padding-right: 12px;
          }

          .header {
            padding-top: 15px;
          }

          .hero {
            padding-top: 38px;
          }

          .paymentCard {
            padding: 15px;
            border-radius: 18px;
          }

          .methodGrid {
            grid-template-columns: repeat(
              2,
              1fr
            );
          }

          .walletRow {
            flex-direction: column;
          }

          .copyButton {
            min-height: 44px;
          }

          .actions {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  )
}
