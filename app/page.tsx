"use client"

import { useEffect, useState } from "react"

const paymentMethods = [
  { id: "bitcoin", name: "Bitcoin", symbol: "₿" },
  { id: "ethereum", name: "Ethereum", symbol: "Ξ" },
  { id: "tron", name: "TRON", symbol: "TRX" },
  { id: "binance", name: "Binance", symbol: "BNB" },
]

const CHECK_ORDER_URL =
  "https://kakobuy-check-order.vercel.app/"

const HOME_URL =
  "https://kakobuy-mini.vercel.app/"

type PaymentStatus =
  | "pending"
  | "confirmed"
  | "failed"

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
  const [selected, setSelected] =
    useState("bitcoin")

  const [copied, setCopied] =
    useState(false)

  const [information, setInformation] =
    useState("")

  const [qrImage, setQrImage] =
    useState("")

  const [loading, setLoading] =
    useState(true)

  const [heroHeading, setHeroHeading] =
    useState("PAY WITH CRYPTO")

  const [heroSubtitle, setHeroSubtitle] =
    useState(
      "Secure and simple crypto payment"
    )

  const [footerText, setFooterText] =
    useState("KAKOBUY")

  const [order, setOrder] =
    useState<Order | null>(null)

  const [orderLoading, setOrderLoading] =
    useState(false)

  const [paymentStatus, setPaymentStatus] =
    useState<PaymentStatus>("pending")

  const [statusVisible, setStatusVisible] =
    useState(false)

  const [secondsLeft, setSecondsLeft] =
    useState(60)

  const [timerExpired, setTimerExpired] =
    useState(false)

  const selectedMethod =
    paymentMethods.find(
      (item) => item.id === selected
    )

  /*
   * Get order details from the URL.
   */
  function getOrderDetails() {
    if (typeof window === "undefined") {
      return null
    }

    const params =
      new URLSearchParams(
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
   * Create a unique timer key for this order.
   */
  function getTimerKey(orderId: string) {
    return `kakobuy-payment-expiry-${orderId}`
  }

  /*
   * Start / restore the fixed 60-second timer.
   *
   * The expiry timestamp is saved instead of simply
   * decrementing a number. Therefore refreshing the
   * page does not give the buyer another minute.
   */
  useEffect(() => {
    const details = getOrderDetails()

    if (!details?.orderId) {
      return
    }

    const timerKey =
      getTimerKey(details.orderId)

    let expiry =
      Number(
        sessionStorage.getItem(timerKey)
      )

    if (
      !Number.isFinite(expiry) ||
      expiry <= 0
    ) {
      expiry =
        Date.now() + 60 * 1000

      sessionStorage.setItem(
        timerKey,
        String(expiry)
      )
    }

    function updateTimer() {
      const remaining = Math.max(
        0,
        Math.ceil(
          (expiry - Date.now()) / 1000
        )
      )

      setSecondsLeft(remaining)

      if (remaining <= 0) {
        setTimerExpired(true)
      } else {
        setTimerExpired(false)
      }
    }

    updateTimer()

    const interval =
      window.setInterval(
        updateTimer,
        250
      )

    return () => {
      window.clearInterval(interval)
    }
  }, [])

  /*
   * Load payment method.
   */
  useEffect(() => {
    async function loadPaymentMethod() {
      setLoading(true)
      setInformation("")
      setQrImage("")

      try {
        const response =
          await fetch(
            `/api/payment-methods?id=${selected}`,
            {
              cache: "no-store",
            }
          )

        const data =
          await response.json()

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Unable to load payment information"
          )
        }

        setInformation(
          data.information || ""
        )

        setQrImage(
          data.qr_image_url || ""
        )

        setHeroHeading(
          data.hero_heading ||
            "PAY WITH CRYPTO"
        )

        setHeroSubtitle(
          data.hero_subtitle ||
            "Secure and simple crypto payment"
        )

        setFooterText(
          data.footer_text ||
            "KAKOBUY"
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
   * Load order.
   */
  useEffect(() => {
    async function loadOrder() {
      const details =
        getOrderDetails()

      if (!details?.orderId) {
        return
      }

      setOrderLoading(true)

      try {
        const query =
          new URLSearchParams()

        query.set(
          "id",
          details.orderId
        )

        if (details.email) {
          query.set(
            "email",
            details.email
          )
        }

        const response =
          await fetch(
            `/api/orders?${query.toString()}`,
            {
              cache: "no-store",
            }
          )

        const data =
          await response.json()

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Unable to load order."
          )
        }

        if (data.order) {
          setOrder(data.order)

          setPaymentStatus(
            data.order.payment_status ||
              "pending"
          )
        }
      } catch (error) {
        console.error(
          "Order loading error:",
          error
        )

        /*
         * Still display the order total if
         * the order request temporarily fails.
         */
        setOrder({
          id: Number(
            details.orderId
          ),
          email:
            details.email || "",
          full_name:
            details.fullName || "",
          total:
            details.total || 0,
          payment_status:
            "pending",
        })
      } finally {
        setOrderLoading(false)
      }
    }

    loadOrder()
  }, [])
  /*
   * Poll payment status.
   *
   * Admin changes are picked up automatically.
   */
  useEffect(() => {
    const details = getOrderDetails()

    if (!details || !details.orderId) {
      return
    }

    const orderId = details.orderId
    const email = details.email

    let active = true

    async function checkStatus() {
      try {
        const query = new URLSearchParams()

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
          data.order.payment_status || "pending"

        setPaymentStatus(newStatus)

        setOrder((previous) => ({
          ...(previous || {}),
          ...data.order,
        }))

        /*
         * Automatically open the status animation
         * when the admin confirms or fails payment.
         */
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
         * Automatically open the status animation
         * when the admin confirms or fails payment.
         */
        if (
          newStatus ===
            "confirmed" ||
          newStatus ===
            "failed"
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
      window.clearInterval(
        interval
      )
    }
  }, [])

  /*
   * Copy wallet/payment information.
   */
  async function copyInfo() {
    if (!information) {
      return
    }

    /*
     * Do not allow copying after the
     * one-minute payment window expires.
     */
    if (timerExpired) {
      setStatusVisible(true)
      return
    }

    try {
      await navigator.clipboard.writeText(
        information
      )

      setCopied(true)

      setStatusVisible(true)

      const details =
        getOrderDetails()

      if (details?.orderId) {
        try {
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
                    details.email || "",
                  paymentMethod:
                    selected,
                }),
              }
            )

          const data =
            await response.json()

          if (
            response.ok &&
            data.order
          ) {
            setOrder(
              (previous) => ({
                ...(previous || {}),
                ...data.order,
              })
            )

            setPaymentStatus(
              data.order
                .payment_status ||
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
   * Download invoice.
   */
  function downloadInvoice() {
    const details =
      getOrderDetails()

    const orderId =
      order?.id ||
      Number(
        details?.orderId || 0
      )

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

    const createdAt =
      order?.created_at
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

    const blob =
      new Blob(
        [invoice.trim()],
        {
          type:
            "text/plain;charset=utf-8",
        }
      )

    const url =
      URL.createObjectURL(blob)

    const link =
      document.createElement("a")

    link.href = url

    link.download =
      `KAKOBUY-Invoice-${orderId}.txt`

    document.body.appendChild(
      link
    )

    link.click()

    document.body.removeChild(
      link
    )

    URL.revokeObjectURL(url)
  }

  /*
   * Status title.
   */
  function getStatusTitle() {
    if (
      paymentStatus ===
      "confirmed"
    ) {
      return "Payment Confirmed"
    }

    if (
      paymentStatus ===
      "failed"
    ) {
      return "Payment Failed"
    }

    if (timerExpired) {
      return "Payment window expired"
    }

    return "Payment waiting for confirmation"
  }

  /*
   * Status message.
   */
  function getStatusMessage() {
    if (
      paymentStatus ===
      "confirmed"
    ) {
      return "Your payment has been confirmed successfully."
    }

    if (
      paymentStatus ===
      "failed"
    ) {
      return "Your payment could not be confirmed. Please check your order or contact support."
    }

    if (timerExpired) {
      return "The 1-minute payment window has ended. Please return to your order and try again."
    }

    return "Complete your payment before the countdown reaches zero."
  }

  /*
   * Format timer.
   */
  function formatTimer(
    seconds: number
  ) {
    const minutes =
      Math.floor(
        seconds / 60
      )

    const remainingSeconds =
      seconds % 60

    return `${String(
      minutes
    ).padStart(2, "0")}:${String(
      remainingSeconds
    ).padStart(2, "0")}`
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

          <p>
            {heroSubtitle}
          </p>
        </header>

        {/* ORDER TOTAL */}
        {(order ||
          getOrderDetails()
            ?.total) && (
          <section className="order-summary">
            <div>
              <span className="summary-label">
                ORDER TOTAL
              </span>

              <strong>
                $
                {Number(
                  order?.total ??
                    getOrderDetails()
                      ?.total ??
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
          {paymentMethods.map(
            (method) => (
              <button
                key={method.id}
                onClick={() =>
                  setSelected(
                    method.id
                  )
                }
                className={`method ${
                  selected ===
                  method.id
                    ? "selected"
                    : ""
                }`}
                type="button"
                disabled={
                  timerExpired ||
                  paymentStatus ===
                    "confirmed"
                }
              >
                <span className="symbol">
                  {method.symbol}
                </span>

                <span className="name">
                  {method.name}
                </span>
              </button>
            )
          )}
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

          {/* COUNTDOWN */}
          <div
            className={`payment-countdown ${
              timerExpired
                ? "expired"
                : secondsLeft <=
                    10
                  ? "urgent"
                  : ""
            }`}
          >
            <span>
              PAYMENT WINDOW
            </span>

            <strong>
              {formatTimer(
                secondsLeft
              )}
            </strong>

            <small>
              {timerExpired
                ? "TIME EXPIRED"
                : "Complete payment within 1 minute"}
            </small>
          </div>

          {/* COPY */}
          <button
            className="copy-button"
            onClick={copyInfo}
            disabled={
              loading ||
              !information ||
              timerExpired ||
              paymentStatus ===
                "confirmed"
            }
            type="button"
          >
            {copied
              ? "✓ Copy successful"
              : timerExpired
                ? "Payment window expired"
                : "Copy wallet address"}
          </button>

          {/* QR */}
          <div className="qr-box">
            {loading ? (
              <>
                <div className="qr-icon">
                  ▦
                </div>

                <p>
                  QR CODE
                </p>

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
                    objectFit:
                      "contain",
                    margin:
                      "0 auto 15px",
                    background:
                      "#fff",
                    borderRadius:
                      "10px",
                  }}
                />

                <p>
                  QR CODE
                </p>

                <span>
                  Scan to make payment
                </span>
              </>
            ) : (
              <>
                <div className="qr-icon">
                  ▦
                </div>

                <p>
                  QR CODE
                </p>

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
            Please make sure you
            select the correct
            payment method before
            copying the wallet address.
          </p>
        </div>

        {/* ACTIONS */}
        <div className="actions">

          <button
            type="button"
            className="invoice-button"
            onClick={
              downloadInvoice
            }
            disabled={
              orderLoading
            }
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

      {/* NITRO STYLE PAYMENT STATUS */}
      {statusVisible && (
        <div
          className={`status-overlay ${paymentStatus} ${
            timerExpired
              ? "timer-expired"
              : ""
          }`}
          onClick={() =>
            setStatusVisible(
              false
            )
          }
        >
          <div
            className="nitro-status-card"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            {/* MOVING GLOWS */}
            <div className="nitro-glow glow-one" />
            <div className="nitro-glow glow-two" />
            <div className="nitro-glow glow-three" />

            {/* PARTICLES */}
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

            {/* TOP */}
            <div className="nitro-status-top">
              <span className="nitro-brand">
                KAKOBUY
              </span>

              <span className="nitro-live">
                {timerExpired
                  ? "EXPIRED"
                  : paymentStatus ===
                      "confirmed"
                    ? "PAID"
                    : "LIVE"}
              </span>
            </div>

            {/* ICON */}
            <div className="nitro-icon-wrap">

              <div className="nitro-ring ring-one" />
              <div className="nitro-ring ring-two" />

              <div className="nitro-icon">
                {paymentStatus ===
                "confirmed"
                  ? "✓"
                  : paymentStatus ===
                    "failed"
                    ? "!"
                    : timerExpired
                      ? "!"
                      : "◌"}
              </div>

            </div>

            {/* CONTENT */}
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

            {/* BIG COUNTDOWN */}
            {paymentStatus ===
                "pending" &&
              !timerExpired && (
                <div className="nitro-countdown">
                  <span>
                    TIME REMAINING
                  </span>

                  <strong>
                    {formatTimer(
                      secondsLeft
                    )}
                  </strong>

                  <div className="nitro-countdown-line">
                    <div
                      style={{
                        width: `${Math.max(
                          0,
                          Math.min(
                            100,
                            (secondsLeft /
                              60) *
                              100
                          )
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}

            {/* EXPIRED COUNTDOWN */}
            {timerExpired &&
              paymentStatus ===
                "pending" && (
                <div className="nitro-expired-box">
                  <span>
                    PAYMENT WINDOW
                  </span>

                  <strong>
                    00:00
                  </strong>
                </div>
              )}

            {/* BOTTOM */}
            <div className="nitro-status-bottom">

              <span>
                ORDER #
                {order?.id || "—"}
              </span>

              <button
                type="button"
                onClick={() =>
                  setStatusVisible(
                    false
                  )
                }
              >
                CLOSE
              </button>

            </div>
          </div>
        </div>
      )}

      {/* COPY CONFIRMATION */}
      {copied &&
        !statusVisible && (
          <div className="copy-floating">
            ✓ Payment information
            copied
          </div>
        )}

      {/* LIVE STATUS BUTTON */}
      {order?.id && (
        <button
          type="button"
          className={`live-status ${paymentStatus} ${
            timerExpired
              ? "expired"
              : ""
          }`}
          onClick={() =>
            setStatusVisible(
              true
            )
          }
        >
          <span className="live-dot" />

          {paymentStatus ===
          "confirmed"
            ? "Payment Confirmed"
            : paymentStatus ===
              "failed"
              ? "Payment Failed"
              : timerExpired
                ? "Payment window expired"
                : "Payment waiting for confirmation"}
        </button>
      )}

      <style jsx>{`
        /* ================================
           HERO
        ================================= */

        .hero-slide {
          animation:
            heroSlideIn
            0.8s
            ease-out both;
        }

        @keyframes heroSlideIn {
          from {
            opacity: 0;
            transform:
              translateY(-35px);
          }

          to {
            opacity: 1;
            transform:
              translateY(0);
          }
        }

        /* ================================
           ORDER SUMMARY
        ================================= */

        .order-summary {
          width: 100%;
          max-width: 520px;
          margin: 0 auto 22px;
          padding: 17px 18px;

          border: 1px solid
            rgba(
              255,
              255,
              255,
              0.1
            );

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

        /* ================================
           COUNTDOWN ON PAYMENT CARD
        ================================= */

        .payment-countdown {
          width: 100%;
          margin: 18px 0;

          padding: 16px;

          box-sizing: border-box;

          text-align: center;

          border-radius: 15px;

          background:
            radial-gradient(
              circle at center,
              rgba(
                255,
                0,
                38,
                0.12
              ),
              #111
            );

          border: 1px solid
            rgba(
              255,
              0,
              38,
              0.2
            );
        }

        .payment-countdown span {
          display: block;

          color: #ff3150;

          font-size: 8px;
          font-weight: 900;

          letter-spacing: 2px;
        }

        .payment-countdown strong {
          display: block;

          margin-top: 5px;

          color: #fff;

          font-size: 28px;
          font-weight: 900;

          letter-spacing: 2px;
        }

        .payment-countdown small {
          display: block;

          margin-top: 3px;

          color: #777;

          font-size: 9px;
          font-weight: 700;
        }

        .payment-countdown.urgent {
          border-color:
            rgba(
              255,
              0,
              38,
              0.7
            );

          animation:
            countdownUrgent
            0.8s
            ease-in-out
            infinite alternate;
        }

        .payment-countdown.urgent strong {
          color: #ff3150;
        }

        .payment-countdown.expired {
          border-color:
            rgba(
              255,
              0,
              38,
              0.4
            );
        }

        .payment-countdown.expired strong {
          color: #ff3150;
        }

        @keyframes countdownUrgent {
          from {
            box-shadow:
              0 0 0
                rgba(
                  255,
                  0,
                  38,
                  0.1
                );
          }

          to {
            box-shadow:
              0 0 25px
                rgba(
                  255,
                  0,
                  38,
                  0.3
                );
          }
        }

        /* ================================
           ACTIONS
        ================================= */

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
            rgba(
              255,
              255,
              255,
              0.12
            );

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

        /* ================================
           NITRO OVERLAY
        ================================= */

        .status-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;

          display: flex;
          align-items: center;
          justify-content: center;

          padding: 20px;

          background:
            radial-gradient(
              circle at center,
              rgba(
                255,
                0,
                30,
                0.13
              ),
              rgba(
                0,
                0,
                0,
                0.92
              ) 55%
            );

          backdrop-filter:
            blur(12px);

          animation:
            nitroOverlayIn
            0.35s
            ease-out;
        }

        @keyframes nitroOverlayIn {
          from {
            opacity: 0;
          }

          to {
            opacity: 1;
          }
        }

        /* ================================
           NITRO CARD
        ================================= */

        .nitro-status-card {
          position: relative;

          width: 100%;
          max-width: 390px;

          overflow: hidden;

          padding:
            25px
            22px
            20px;

          border-radius: 24px;

          background:
            radial-gradient(
              circle at 50% -20%,
              rgba(
                255,
                0,
                30,
                0.2
              ),
              transparent 42%
            ),
            #0b0b0d;

          border: 1px solid
            rgba(
              255,
              25,
              50,
              0.45
            );

          box-shadow:
            0 0 0 1px
              rgba(
                255,
                0,
                30,
                0.08
              ),
            0 0 30px
              rgba(
                255,
                0,
                30,
                0.18
              ),
            0 25px 90px
              rgba(
                0,
                0,
                0,
                0.75
              );

          animation:
            nitroCardIn
            0.55s
            cubic-bezier(
              0.175,
              0.885,
              0.32,
              1.275
            );

          isolation: isolate;
        }

        @keyframes nitroCardIn {
          from {
            opacity: 0;

            transform:
              translateY(35px)
              scale(0.82)
              rotateX(8deg);
          }

          to {
            opacity: 1;

            transform:
              translateY(0)
              scale(1)
              rotateX(0);
          }
        }

        /* ================================
           ANIMATED BORDER
        ================================= */

        .nitro-status-card::before {
          content: "";

          position: absolute;

          inset: -2px;

          border-radius: 25px;

          background:
            conic-gradient(
              from 0deg,
              transparent,
              #ff0026,
              transparent,
              #ff1838,
              transparent
            );

          animation:
            nitroBorderSpin
            3s
            linear
            infinite;

          z-index: -2;
        }

        .nitro-status-card::after {
          content: "";

          position: absolute;

          inset: 1px;

          border-radius: 23px;

          background: #0b0b0d;

          z-index: -1;
        }

        @keyframes nitroBorderSpin {
          to {
            transform:
              rotate(360deg);
          }
        }

        /* ================================
           MOVING GLOWS
        ================================= */

        .nitro-glow {
          position: absolute;

          width: 120px;
          height: 120px;

          border-radius: 50%;

          filter: blur(35px);

          opacity: 0.25;

          pointer-events: none;
        }

        .glow-one {
          background: #ff0026;

          top: -70px;
          left: -50px;

          animation:
            glowMoveOne
            5s
            ease-in-out
            infinite
            alternate;
        }

        .glow-two {
          background: #ff1744;

          right: -60px;
          top: 40%;

          animation:
            glowMoveTwo
            6s
            ease-in-out
            infinite
            alternate;
        }

        .glow-three {
          background: #ff0033;

          bottom: -70px;
          left: 40%;

          animation:
            glowMoveThree
            4s
            ease-in-out
            infinite
            alternate;
        }

        @keyframes glowMoveOne {
          from {
            transform:
              translate(0, 0);
          }

          to {
            transform:
              translate(
                80px,
                70px
              );
          }
        }

        @keyframes glowMoveTwo {
          from {
            transform:
              translate(0, 0);
          }

          to {
            transform:
              translate(
                -70px,
                -30px
              );
          }
        }

        @keyframes glowMoveThree {
          from {
            transform:
              translate(0, 0);
          }

          to {
            transform:
              translate(
                -40px,
                -50px
              );
          }
        }

        /* ================================
           PARTICLES
        ================================= */

        .nitro-particles {
          position: absolute;

          inset: 0;

          pointer-events: none;

          overflow: hidden;

          z-index: 0;
        }

        .nitro-particles span {
          position: absolute;

          width: 4px;
          height: 4px;

          border-radius: 50%;

          background: #ff1744;

          box-shadow:
            0 0 8px
              rgba(
                255,
                23,
                68,
                0.9
              );

          animation:
            particleFloat
            4s
            ease-in-out
            infinite;
        }

        .nitro-particles
          span:nth-child(1) {
          left: 8%;
          top: 70%;
        }

        .nitro-particles
          span:nth-child(2) {
          left: 18%;
          top: 30%;
          animation-delay:
            0.7s;
        }

        .nitro-particles
          span:nth-child(3) {
          left: 32%;
          top: 82%;
          animation-delay:
            1.1s;
        }

        .nitro-particles
          span:nth-child(4) {
          left: 74%;
          top: 25%;
          animation-delay:
            1.5s;
        }

        .nitro-particles
          span:nth-child(5) {
          left: 88%;
          top: 65%;
          animation-delay:
            0.4s;
        }

        .nitro-particles
          span:nth-child(6) {
          left: 65%;
          top: 82%;
          animation-delay:
            2s;
        }

        .nitro-particles
          span:nth-child(7) {
          left: 48%;
          top: 15%;
          animation-delay:
            1.7s;
        }

        .nitro-particles
          span:nth-child(8) {
          left: 93%;
          top: 15%;
          animation-delay:
            2.4s;
        }

        @keyframes particleFloat {
          0%,
          100% {
            opacity: 0.15;

            transform:
              translateY(10px)
              scale(0.7);
          }

          50% {
            opacity: 1;

            transform:
              translateY(-18px)
              scale(1.3);
          }
        }

        /* ================================
           TOP
        ================================= */

        .nitro-status-top {
          position: relative;

          z-index: 2;

          display: flex;

          align-items: center;

          justify-content: space-between;

          margin-bottom: 24px;
        }

        .nitro-brand {
          color: #fff;

          font-size: 11px;

          font-weight: 900;

          letter-spacing: 2px;
        }

        .nitro-live {
          padding:
            5px
            9px;

          border-radius: 20px;

          color: #ff3150;

          background:
            rgba(
              255,
              0,
              38,
              0.1
            );

          border: 1px solid
            rgba(
              255,
              0,
              38,
              0.25
            );

          font-size: 8px;

          font-weight: 900;

          letter-spacing: 1.5px;
        }

        /* ================================
           ICON
        ================================= */

        .nitro-icon-wrap {
          position: relative;

          z-index: 2;

          width: 105px;
          height: 105px;

          margin:
            0
            auto
            22px;

          display: flex;

          align-items: center;

          justify-content: center;
        }

        .nitro-ring {
          position: absolute;

          inset: 0;

          border-radius: 50%;

          border: 1px solid
            rgba(
              255,
              0,
              38,
              0.4
            );
        }

        .ring-one {
          animation:
            nitroRingOne
            2.5s
            ease-out
            infinite;
        }

        .ring-two {
          inset: 9px;

          border-color:
            rgba(
              255,
              40,
              65,
              0.65
            );

          animation:
            nitroRingTwo
            2.5s
            ease-out
            infinite;
        }

        @keyframes nitroRingOne {
          0% {
            transform:
              scale(0.75);

            opacity: 0.9;
          }

          100% {
            transform:
              scale(1.25);

            opacity: 0;
          }
        }

        @keyframes nitroRingTwo {
          0% {
            transform:
              scale(0.8);

            opacity: 0.8;
          }

          100% {
            transform:
              scale(1.15);

            opacity: 0;
          }
        }

        .nitro-icon {
          width: 65px;
          height: 65px;

          border-radius: 50%;

          display: flex;

          align-items: center;

          justify-content: center;

          color: #fff;

          font-size: 30px;

          font-weight: 900;

          background:
            radial-gradient(
              circle at 35% 25%,
              #ff435d,
              #b9001d 60%,
              #58000e
            );

          border: 1px solid
            rgba(
              255,
              100,
              115,
              0.55
            );

          box-shadow:
            0 0 20px
              rgba(
                255,
                0,
                38,
                0.55
              ),
            inset 0 0 20px
              rgba(
                255,
                255,
                255,
                0.08
              );

          animation:
            nitroIconPulse
            1.8s
            ease-in-out
            infinite;
        }

        @keyframes nitroIconPulse {
          0%,
          100% {
            transform:
              scale(1);

            box-shadow:
              0 0 20px
                rgba(
                  255,
                  0,
                  38,
                  0.45
                ),
              inset 0 0 20px
                rgba(
                  255,
                  255,
                  255,
                  0.08
                );
          }

          50% {
            transform:
              scale(1.08);

            box-shadow:
              0 0 38px
                rgba(
                  255,
                  0,
                  38,
                  0.75
                ),
              inset 0 0 20px
                rgba(
                  255,
                  255,
                  255,
                  0.12
                );
          }
        }

        /* ================================
           STATUS CONTENT
        ================================= */

        .nitro-status-content {
          position: relative;

          z-index: 2;

          text-align: center;
        }

        .nitro-status-label {
          color: #ff3150;

          font-size: 9px;

          font-weight: 900;

          letter-spacing: 2px;
        }

        .nitro-status-content h2 {
          margin:
            8px
            0
            10px;

          color: #fff;

          font-size: 22px;

          font-weight: 900;

          letter-spacing:
            -0.5px;
        }

        .nitro-status-content p {
          margin: 0 auto;

          max-width: 315px;

          color: #999;

          font-size: 12px;

          line-height: 1.65;
        }

        /* ================================
           BIG COUNTDOWN
        ================================= */

        .nitro-countdown {
          position: relative;

          z-index: 2;

          margin:
            22px
            0
            18px;

          text-align: center;

          padding:
            15px
            14px;

          border-radius: 15px;

          background:
            rgba(
              255,
              0,
              38,
              0.06
            );

          border:
            1px solid
            rgba(
              255,
              0,
              38,
              0.2
            );
        }

        .nitro-countdown span {
          display: block;

          color: #ff3150;

          font-size: 8px;

          font-weight: 900;

          letter-spacing: 2px;
        }

        .nitro-countdown strong {
          display: block;

          margin-top: 5px;

          color: #fff;

          font-size: 35px;

          font-weight: 900;

          letter-spacing: 3px;

          text-shadow:
            0 0 20px
              rgba(
                255,
                0,
                38,
                0.4
              );
        }

        .nitro-countdown-line {
          width: 100%;

          height: 3px;

          margin-top: 10px;

          overflow: hidden;

          border-radius: 10px;

          background:
            rgba(
              255,
              255,
              255,
              0.08
            );
        }

        .nitro-countdown-line div {
          height: 100%;

          border-radius: 10px;

          background:
            linear-gradient(
              90deg,
              #8b0016,
              #ff0026,
              #ff6178
            );

          transition:
            width
            0.25s
            linear;
        }

        /* ================================
           EXPIRED
        ================================= */

        .nitro-expired-box {
          position: relative;

          z-index: 2;

          margin:
            22px
            0
            18px;

          padding:
            15px;

          text-align: center;

          border-radius: 15px;

          background:
            rgba(
              255,
              0,
              38,
              0.08
            );

          border:
            1px solid
            rgba(
              255,
              0,
              38,
              0.35
            );
        }

        .nitro-expired-box span {
          display: block;

          color: #ff3150;

          font-size: 8px;

          font-weight: 900;

          letter-spacing: 2px;
        }

        .nitro-expired-box strong {
          display: block;

          margin-top: 5px;

          color: #ff3150;

          font-size: 32px;

          font-weight: 900;

          letter-spacing: 3px;
        }

        /* ================================
           BOTTOM
        ================================= */

        .nitro-status-bottom {
          position: relative;

          z-index: 2;

          display: flex;

          align-items: center;

          justify-content: space-between;

          padding-top: 16px;

          border-top:
            1px solid
            rgba(
              255,
              255,
              255,
              0.07
            );
        }

        .nitro-status-bottom span {
          color: #666;

          font-size: 9px;

          font-weight: 800;

          letter-spacing: 1px;
        }

        .nitro-status-bottom button {
          border: 0;

          background: transparent;

          color: #ff3150;

          font-size: 9px;

          font-weight: 900;

          letter-spacing: 1.2px;

          cursor: pointer;
        }

        /* ================================
           CONFIRMED
        ================================= */

        .status-overlay.confirmed
          .nitro-icon {
          background:
            radial-gradient(
              circle at 35% 25%,
              #ff5c73,
              #d40028 60%,
              #65000f
            );

          animation:
            confirmedPop
            0.5s
            ease-out;
        }

        @keyframes confirmedPop {
          0% {
            transform:
              scale(0.5);
          }

          70% {
            transform:
              scale(1.15);
          }

          100% {
            transform:
              scale(1);
          }
        }

        /* ================================
           FAILED
        ================================= */

        .status-overlay.failed
          .nitro-icon {
          background:
            radial-gradient(
              circle at 35% 25%,
              #8d1b2e,
              #4d0713 65%,
              #220107
            );
        }

        /* ================================
           EXPIRED
        ================================= */

        .status-overlay.timer-expired
          .nitro-icon {
          background:
            radial-gradient(
              circle at 35% 25%,
              #8d1b2e,
              #4d0713 65%,
              #220107
            );

          animation:
            expiredPulse
            1s
            ease-in-out
            infinite
            alternate;
        }

        @keyframes expiredPulse {
          from {
            box-shadow:
              0 0 15px
                rgba(
                  255,
                  0,
                  38,
                  0.3
                );
          }

          to {
            box-shadow:
              0 0 35px
                rgba(
                  255,
                  0,
                  38,
                  0.7
                );
          }
        }

        /* ================================
           COPY FLOATING
        ================================= */

        .copy-floating {
          position: fixed;

          left: 50%;

          bottom: 25px;

          z-index: 9000;

          transform:
            translateX(-50%);

          padding:
            12px
            18px;

          border-radius: 30px;

          background: #fff;

          color: #000;

          font-size: 12px;

          font-weight: 900;

          box-shadow:
            0 10px 35px
              rgba(
                0,
                0,
                0,
                0.35
              );

          animation:
            floatingIn
            0.3s
            ease-out;
        }

        @keyframes floatingIn {
          from {
            opacity: 0;

            transform:
              translateX(-50%)
              translateY(15px);
          }

          to {
            opacity: 1;

            transform:
              translateX(-50%)
              translateY(0);
          }
        }

        /* ================================
           LIVE STATUS
        ================================= */

        .live-status {
          position: fixed;

          right: 16px;
          bottom: 16px;

          z-index: 8000;

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.12
            );

          border-radius: 30px;

          padding:
            11px
            15px;

          background: #111;

          color: #fff;

          font-size: 11px;

          font-weight: 800;

          display: flex;

          align-items: center;

          gap: 8px;

          box-shadow:
            0 10px 30px
              rgba(
                0,
                0,
                0,
                0.4
              );

          cursor: pointer;
        }

        .live-dot {
          width: 7px;
          height: 7px;

          border-radius: 50%;

          background: #ff1744;

          box-shadow:
            0 0 8px
              rgba(
                255,
                23,
                68,
                0.8
              );

          animation:
            livePulse
            1.5s
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

        /* ================================
           MOBILE
        ================================= */

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

          .status-overlay {
            padding: 16px;
          }

          .nitro-status-card {
            max-width: 360px;

            padding:
              22px
              18px
              18px;
          }

          .nitro-status-content h2 {
            font-size: 20px;
          }

          .nitro-icon-wrap {
            width: 95px;
            height: 95px;
          }

          .nitro-countdown strong {
            font-size: 31px;
          }

          .live-status {
            left: 50%;
            right: auto;

            transform:
              translateX(-50%);

            bottom: 12px;

            white-space: nowrap;
          }
        }
      `}</style>
    </main>
  )
}
