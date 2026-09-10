"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"

type PaymentStatus =
  | "pending"
  | "confirmed"
  | "failed"

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
  transaction_image?: string | null
  transaction_submitted?: boolean
  transaction_submitted_at?: string | null
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

  const params = new URLSearchParams(
    window.location.search
  )

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

function formatMoney(
  value: number | string | undefined
) {
  const amount = Number(value || 0)

  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function safeText(value: unknown) {
  if (
    value === null ||
    value === undefined
  ) {
    return ""
  }

  return String(value)
}

export default function PaymentPage() {
  const [selected, setSelected] =
    useState("bitcoin")

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

  const [checkingStatus, setCheckingStatus] =
    useState(false)

  const [copied, setCopied] =
    useState(false)

  const [statusVisible, setStatusVisible] =
    useState(false)

  const [error, setError] =
    useState("")

  /* TIMER */
  const [timeLeft, setTimeLeft] =
    useState(60)

  const [timerStarted, setTimerStarted] =
    useState(false)

  /* PAYMENT SUBMISSION */
  const [
    paymentPanelVisible,
    setPaymentPanelVisible,
  ] = useState(false)

  const [
    transactionFile,
    setTransactionFile,
  ] = useState<File | null>(null)

  const [
    transactionPreview,
    setTransactionPreview,
  ] = useState("")

  const [
    uploadingTransaction,
    setUploadingTransaction,
  ] = useState(false)

  const [
    transactionUploaded,
    setTransactionUploaded,
  ] = useState(false)

  const [
    submittingTransaction,
    setSubmittingTransaction,
  ] = useState(false)

  const orderDetails = useMemo(
    () => getOrderDetails(),
    []
  )

  /*
   * LOAD PAYMENT METHOD
   */
  const loadPaymentMethod =
    useCallback(async () => {
      setLoadingMethod(true)

      try {
        const response =
          await fetch(
            `/api/payment-methods?id=${encodeURIComponent(
              selected
            )}`,
            {
              cache: "no-store",
            }
          )

        const data =
          await response.json()

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

        setMethod(
          paymentMethod || null
        )
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
   * LOAD ORDER
   */
  const loadOrder =
    useCallback(async () => {
      const details =
        getOrderDetails()

      if (
        !details ||
        !details.orderId
      ) {
        setLoadingOrder(false)
        return
      }

      setLoadingOrder(true)

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
            data?.error ||
              "Unable to load order."
          )
        }

        const loadedOrder =
          data?.order || data

        if (loadedOrder) {
          setOrder(
            loadedOrder
          )

          setPaymentStatus(
            loadedOrder.payment_status ||
              "pending"
          )
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

  useEffect(() => {
    loadPaymentMethod()
  }, [loadPaymentMethod])

  useEffect(() => {
    loadOrder()
  }, [loadOrder])

  /*
   * FIXED TIMER
   *
   * This effect watches timerStarted.
   *
   * Therefore when COPY is pressed:
   *
   * setTimerStarted(true)
   *
   * causes this effect to immediately
   * create the countdown interval.
   */
  useEffect(() => {
    const details =
      getOrderDetails()

    if (!details?.orderId) {
      return
    }

    if (!timerStarted) {
      return
    }

    const storageKey =
      `kakobuy-payment-timer-${details.orderId}`

    const stored =
      sessionStorage.getItem(
        storageKey
      )

    if (!stored) {
      return
    }

    const expiresAt =
      Number(stored)

    if (
      !Number.isFinite(
        expiresAt
      )
    ) {
      sessionStorage.removeItem(
        storageKey
      )
      return
    }

    const updateTimer = () => {
      const next =
        Math.max(
          0,
          Math.ceil(
            (expiresAt -
              Date.now()) /
              1000
          )
        )

      setTimeLeft(next)

      if (next <= 0) {
        sessionStorage.removeItem(
          storageKey
        )
      }
    }

    updateTimer()

    const interval =
      window.setInterval(
        updateTimer,
        250
      )

    return () => {
      window.clearInterval(
        interval
      )
    }
  }, [
    timerStarted,
    orderDetails?.orderId,
  ])

  /*
   * BACKGROUND PAYMENT STATUS
   */
  useEffect(() => {
    const details =
      getOrderDetails()

    if (!details?.orderId) {
      return
    }

    let active = true

    const checkStatus =
      async () => {
        try {
          const query =
            new URLSearchParams()

          query.set(
            "orderId",
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
              `/api/payment-status?${query.toString()}`,
              {
                cache: "no-store",
              }
            )

          const data =
            await response.json()

          if (
            !response.ok ||
            !data.order ||
            !active
          ) {
            return
          }

          const newStatus =
            (data.order
              .payment_status ||
              "pending") as PaymentStatus

          setPaymentStatus(
            newStatus
          )

          setOrder(
            (previous) => ({
              ...(previous || {}),
              ...data.order,
            })
          )
        } catch (err) {
          console.error(
            "Background status error:",
            err
          )
        }
      }

    checkStatus()

    const interval =
      window.setInterval(
        checkStatus,
        3000
      )

    return () => {
      active = false
      window.clearInterval(
        interval
      )
    }
  }, [])

  /*
   * CHECK PAYMENT STATUS
   */
  async function checkPaymentStatus() {
    const details =
      getOrderDetails()

    if (!details?.orderId) {
      setError(
        "No order was found."
      )
      return
    }

    setCheckingStatus(true)
    setError("")

    try {
      const query =
        new URLSearchParams()

      query.set(
        "orderId",
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
          `/api/payment-status?${query.toString()}`,
          {
            cache: "no-store",
          }
        )

      const data =
        await response.json()

      if (
        !response.ok ||
        !data.order
      ) {
        throw new Error(
          data?.error ||
            "Unable to check payment status."
        )
      }

      const newStatus =
        (data.order
          .payment_status ||
          "pending") as PaymentStatus

      setPaymentStatus(
        newStatus
      )

      setOrder(
        (previous) => ({
          ...(previous || {}),
          ...data.order,
        })
      )

      setStatusVisible(true)
    } catch (err) {
      console.error(
        "Check status error:",
        err
      )

      setError(
        err instanceof Error
          ? err.message
          : "Unable to check payment status."
      )
    } finally {
      setCheckingStatus(false)
    }
  }

  /*
   * COPY WALLET
   *
   * COPY starts the timer immediately.
   */
  async function copyInfo() {
    const wallet =
      method?.wallet_address ||
      method?.address ||
      ""

    if (!wallet) {
      setError(
        "Wallet address is not available."
      )
      return
    }

    const details =
      getOrderDetails()

    if (!details?.orderId) {
      setError(
        "Order could not be identified."
      )
      return
    }

    const storageKey =
      `kakobuy-payment-timer-${details.orderId}`

    const expiresAt =
      Date.now() + 60 * 1000

    sessionStorage.setItem(
      storageKey,
      String(expiresAt)
    )

    /*
     * IMPORTANT:
     * These states are set BEFORE
     * clipboard work.
     */
    setTimerStarted(true)
    setTimeLeft(60)
    setPaymentPanelVisible(true)
    setError("")

    /*
     * COPY WALLET
     */
    try {
      if (
        navigator.clipboard &&
        window.isSecureContext
      ) {
        await navigator.clipboard.writeText(
          wallet
        )
      } else {
        const textArea =
          document.createElement(
            "textarea"
          )

        textArea.value = wallet
        textArea.style.position =
          "fixed"
        textArea.style.opacity =
          "0"
        textArea.style.pointerEvents =
          "none"

        document.body.appendChild(
          textArea
        )

        textArea.focus()
        textArea.select()

        document.execCommand("copy")

        document.body.removeChild(
          textArea
        )
      }

      setCopied(true)

      window.setTimeout(() => {
        setCopied(false)
      }, 2000)
    } catch (err) {
      console.error(
        "Copy wallet error:",
        err
      )

      setError(
        "Copy was not available, but the payment timer has started."
      )
    }

    /*
     * SAVE WALLET-COPIED STATUS
     */
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
                details.email ||
                undefined,
              wallet_copied: true,
              paymentMethod:
                selected,
            }),
          }
        )

      if (!response.ok) {
        console.error(
          "Could not save wallet copied status."
        )
      }
    } catch (err) {
      console.error(
        "Wallet copied API error:",
        err
      )
    }
  }

  /*
   * SELECT + UPLOAD TRANSACTION SCREENSHOT
   */
  async function selectTransactionImage(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0]

    if (!file) {
      return
    }

    if (
      ![
        "image/jpeg",
        "image/png",
        "image/webp",
      ].includes(file.type)
    ) {
      setError(
        "Only JPG, PNG, and WEBP images are allowed."
      )

      event.target.value = ""
      return
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      setError(
        "Image must be smaller than 5 MB."
      )

      event.target.value = ""
      return
    }

    const details =
      getOrderDetails()

    if (!details?.orderId) {
      setError(
        "Order could not be identified."
      )
      return
    }

    setError("")
    setTransactionFile(file)
    setTransactionUploaded(false)

    if (transactionPreview) {
      URL.revokeObjectURL(
        transactionPreview
      )
    }

    const previewUrl =
      URL.createObjectURL(file)

    setTransactionPreview(
      previewUrl
    )

    /*
     * UPLOAD IMMEDIATELY
     */
    setUploadingTransaction(
      true
    )

    try {
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

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to upload screenshot."
        )
      }

      /*
       * Upload is now confirmed.
       *
       * This enables CONFIRM.
       */
      setTransactionUploaded(
        true
      )

      setOrder((previous) =>
        previous
          ? {
              ...previous,
              transaction_image:
                data?.image ||
                data?.transaction_image ||
                previous.transaction_image ||
                null,
            }
          : previous
      )
    } catch (err) {
      console.error(
        "Transaction upload error:",
        err
      )

      setTransactionUploaded(
        false
      )

      setError(
        err instanceof Error
          ? err.message
          : "Unable to upload screenshot."
      )
    } finally {
      setUploadingTransaction(
        false
      )
    }
  }

  /*
   * CONFIRM PAYMENT SUBMISSION
   *
   * This is the button that sends the
   * completed submission to the server.
   */
  async function completePaymentSubmission() {
    const details =
      getOrderDetails()

    if (!details?.orderId) {
      setError(
        "Order could not be identified."
      )
      return
    }

    /*
     * Do not allow CONFIRM until the
     * screenshot has actually uploaded.
     */
    if (
      !transactionUploaded
    ) {
      setError(
        "Upload your transaction screenshot first."
      )
      return
    }

    if (
      uploadingTransaction ||
      submittingTransaction
    ) {
      return
    }

    setSubmittingTransaction(
      true
    )
    setError("")

    try {
      /*
       * Tell the server that the
       * transaction has been submitted.
       */
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
                details.email ||
                undefined,
              transaction_submitted:
                true,
              transaction_image:
                order?.transaction_image ||
                null,
            }),
          }
        )

      let data: any = null

      try {
        data =
          await response.json()
      } catch {
        data = null
      }

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to submit payment."
        )
      }

      /*
       * Update buyer screen immediately.
       */
      setOrder((previous) =>
        previous
          ? {
              ...previous,
              transaction_submitted:
                true,
              transaction_submitted_at:
                new Date().toISOString(),
              payment_status:
                "pending",
            }
          : previous
      )

      setPaymentStatus(
        "pending"
      )

      /*
       * Close submission panel.
       */
      setPaymentPanelVisible(
        false
      )

      setTransactionFile(
        null
      )

      if (transactionPreview) {
        URL.revokeObjectURL(
          transactionPreview
        )
      }

      setTransactionPreview(
        ""
      )

      setTransactionUploaded(
        false
      )

      setStatusVisible(
        false
      )

      /*
       * Refresh the order from the
       * server so the admin/buyer state
       * is synchronised.
       */
      await loadOrder()
    } catch (err) {
      console.error(
        "Payment submission error:",
        err
      )

      setError(
        err instanceof Error
          ? err.message
          : "Unable to submit payment."
      )
    } finally {
      setSubmittingTransaction(
        false
      )
    }
  }

  /*
   * DOWNLOAD INVOICE
   */
  function downloadInvoice() {
    if (!order) {
      return
    }

    if (
      paymentStatus !==
        "confirmed" &&
      paymentStatus !==
        "failed"
    ) {
      return
    }

    const status =
      paymentStatus ===
      "confirmed"
        ? "Payment Confirmed"
        : "Payment Failed"

    const statusColor =
      paymentStatus ===
      "confirmed"
        ? "#16854b"
        : "#d62828"

    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>KAKOBUY Invoice</title>
<style>
body {
  font-family: Arial, sans-serif;
  background: #f5f5f5;
  padding: 30px;
  color: #111;
}
.invoice {
  max-width: 600px;
  margin: auto;
  background: white;
  padding: 30px;
  border-radius: 16px;
}
.logo {
  color: #e50914;
  font-size: 28px;
  font-weight: 900;
}
.title {
  font-size: 22px;
  font-weight: 800;
  margin: 20px 0;
}
.row {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  border-bottom: 1px solid #eee;
  padding: 12px 0;
}
.status {
  font-weight: 800;
  color: ${statusColor};
}
.total {
  font-size: 20px;
  font-weight: 900;
}
.footer {
  margin-top: 25px;
  color: #777;
  font-size: 12px;
}
</style>
</head>
<body>
<div class="invoice">
  <div class="logo">KAKOBUY</div>

  <div class="title">
    PAYMENT INVOICE
  </div>

  <div class="row">
    <span>Order ID</span>
    <strong>#${safeText(
      order.id
    )}</strong>
  </div>

  <div class="row">
    <span>Name</span>
    <strong>${safeText(
      order.full_name
    )}</strong>
  </div>

  <div class="row">
    <span>Email</span>
    <strong>${safeText(
      order.email
    )}</strong>
  </div>

  <div class="row">
    <span>Payment Method</span>
    <strong>${safeText(
      order.payment_method ||
        method?.name
    )}</strong>
  </div>

  <div class="row">
    <span>Total</span>
    <strong class="total">
      ${formatMoney(
        order.total
      )}
    </strong>
  </div>

  <div class="row">
    <span>Status</span>
    <strong class="status">
      ${status}
    </strong>
  </div>

  <div class="row">
    <span>Created</span>
    <strong>${safeText(
      order.created_at
    )}</strong>
  </div>

  <div class="footer">
    Thank you for using KAKOBUY.
  </div>
</div>
</body>
</html>
`

    const blob =
      new Blob(
        [html],
        {
          type: "text/html",
        }
      )

    const url =
      URL.createObjectURL(blob)

    const link =
      document.createElement("a")

    link.href = url

    link.download =
      `kakobuy-invoice-${order.id}.html`

    document.body.appendChild(
      link
    )

    link.click()

    document.body.removeChild(
      link
    )

    window.setTimeout(() => {
      URL.revokeObjectURL(
        url
      )
    }, 1000)
  }

  /*
   * STATUS TEXT
   */
  function statusTitle() {
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

    return "Payment Pending"
  }

  function statusDescription() {
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
      return "Your payment could not be confirmed."
    }

    return "Your payment is still being checked."
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
    "Secure and simple crypto payment"

  const footerText =
    method?.footer_text ||
    "KAKOBUY secure crypto payment"

  const isLoading =
    loadingMethod ||
    loadingOrder

  const invoiceAvailable =
    paymentStatus ===
      "confirmed" ||
    paymentStatus ===
      "failed"

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
          className="backButton"
        >
          ← BACK
        </a>
      </header>

      <section className="container">
        <div className="hero">
          <div className="eyebrow animatedText">
            SECURE PAYMENT
          </div>

          <h1 className="heroTitle">
            {heroTitle}
          </h1>

          <p className="heroSubtitle">
            {heroSubtitle}
          </p>
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
                AMOUNT TO PAY
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

              <strong
                className={
                  timerStarted &&
                  timeLeft <= 10
                    ? "timerDanger"
                    : ""
                }
              >
                {timerStarted
                  ? `${timeLeft}s`
                  : "60s"}
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
                      alt="Payment QR"
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
                      disabled={
                        !wallet
                      }
                    >
                      {copied
                        ? "COPIED"
                        : "COPY"}
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

              <div
                className={`statusSection ${paymentStatus}`}
              >
                <div
                  className={`statusDot ${paymentStatus}`}
                />

                <div>
                  <strong>
                    {statusTitle()}
                  </strong>

                  <span>
                    Status updates
                    automatically.
                  </span>
                </div>

                <span className="statusBadge">
                  {paymentStatus.toUpperCase()}
                </span>
              </div>
            </>
          )}
        </div>

        <div className="actions">
          <button
            type="button"
            className="checkStatusButton"
            onClick={
              checkPaymentStatus
            }
            disabled={
              checkingStatus ||
              !orderDetails?.orderId
            }
          >
            {checkingStatus
              ? "CHECKING..."
              : "CHECK PAYMENT STATUS"}
          </button>

          {invoiceAvailable && (
            <button
              type="button"
              className="invoiceButton"
              onClick={
                downloadInvoice
              }
            >
              DOWNLOAD INVOICE
            </button>
          )}
        </div>

        <p className="footer">
          {footerText}
        </p>
      </section>

      {/* PAYMENT SUBMISSION FLOATING PANEL */}
      {paymentPanelVisible && (
        <div className="paymentFloat">
          {/* X — TOP RIGHT */}
          <button
            type="button"
            className="floatCancel"
            onClick={() =>
              setPaymentPanelVisible(
                false
              )
            }
            aria-label="Cancel payment submission"
          >
            ✕
          </button>

          <div className="floatTitle">
            PAYMENT SUBMISSION
          </div>

          <p className="floatText">
            Upload your transaction
            screenshot and confirm
            your payment submission.
          </p>

          {transactionPreview && (
            <img
              src={
                transactionPreview
              }
              alt="Transaction screenshot"
              className="transactionPreview"
            />
          )}

          <input
            id="transaction-image"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            onChange={
              selectTransactionImage
            }
            disabled={
              uploadingTransaction ||
              submittingTransaction
            }
          />

          {/* UPLOAD IMAGE */}
          <label
            htmlFor="transaction-image"
            className={`uploadImageButton ${
              uploadingTransaction
                ? "uploading"
                : transactionUploaded
                ? "uploaded"
                : ""
            }`}
          >
            {uploadingTransaction
              ? "UPLOADING..."
              : transactionUploaded
              ? "IMAGE UPLOADED ✓"
              : transactionFile
              ? "CHANGE IMAGE"
              : "UPLOAD IMAGE"}
          </label>

          {/* CONFIRM */}
          <button
            type="button"
            className="completedButton"
            onClick={
              completePaymentSubmission
            }
            disabled={
              !transactionUploaded ||
              uploadingTransaction ||
              submittingTransaction
            }
          >
            {submittingTransaction
              ? "SUBMITTING..."
              : transactionUploaded
              ? "CONFIRM"
              : "UPLOAD IMAGE FIRST"}
          </button>
        </div>
      )}

      {/* PAYMENT STATUS POPUP */}
      {statusVisible && (
        <div
          className="overlay"
          onClick={() =>
            setStatusVisible(
              false
            )
          }
        >
          <div
            className={`statusModal ${paymentStatus}`}
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="floatingIcon">
              {paymentStatus ===
              "confirmed"
                ? "👍"
                : paymentStatus ===
                  "failed"
                ? "🚫"
                : "⏳"}
            </div>

            <span className="smallLabel">
              PAYMENT STATUS
            </span>

            <h2>
              {statusTitle()}
            </h2>

            <p>
              {statusDescription()}
            </p>

            <div className="modalStatus">
              <span
                className={`modalDot ${paymentStatus}`}
              />

              <span>
                {paymentStatus ===
                "pending"
                  ? "Waiting for confirmation"
                  : paymentStatus ===
                    "confirmed"
                  ? "Payment successfully confirmed"
                  : "Payment marked as failed"}
              </span>
            </div>

            <div className="modalActions">
              {invoiceAvailable && (
                <button
                  type="button"
                  className="modalInvoice"
                  onClick={
                    downloadInvoice
                  }
                >
                  DOWNLOAD INVOICE
                </button>
              )}

              <button
                type="button"
                className="closeButton"
                onClick={() =>
                  setStatusVisible(
                    false
                  )
                }
              >
                CONTINUE
              </button>
            </div>
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
              rgba(229, 9, 20, 0.16),
              transparent 35%
            ),
            radial-gradient(
              circle at bottom right,
              rgba(180, 0, 0, 0.1),
              transparent 30%
            ),
            #080808;
          color: #fff;
          padding: 0 18px 55px;
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
          filter: blur(110px);
          opacity: 0.18;
          pointer-events: none;
        }

        .glowOne {
          background: #e50914;
          top: -180px;
          left: -140px;
        }

        .glowTwo {
          background: #9b0000;
          bottom: -190px;
          right: -130px;
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
          font-weight: 900;
          letter-spacing: 0.08em;
        }

        .logoMark {
          width: 37px;
          height: 37px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          background: #e50914;
          color: #fff;
          font-weight: 900;
          box-shadow:
            0 0 25px rgba(
              229,
              9,
              20,
              0.35
            );
        }

        .logoText {
          font-size: 15px;
        }

        .backButton {
          color: #fff;
          text-decoration: none;
          font-size: 12px;
          font-weight: 800;
          padding: 10px 15px;
          border: 1px solid #4a1c1f;
          border-radius: 9px;
          background: #16090a;
          transition: 0.2s ease;
        }

        .backButton:hover {
          background: #e50914;
          border-color: #e50914;
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
          padding: 55px 0 30px;
        }

        .eyebrow,
        .smallLabel {
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.16em;
          color: #999;
        }

        .animatedText {
          color: #ff3b46;
          animation:
            textPulse 1.8s
            ease-in-out infinite;
        }

        @keyframes textPulse {
          0%,
          100% {
            opacity: 0.55;
            transform: translateY(0);
          }

          50% {
            opacity: 1;
            transform: translateY(-3px);
          }
        }

        .heroTitle {
          font-size: clamp(
            34px,
            8vw,
            58px
          );
          line-height: 1;
          letter-spacing: -0.055em;
          margin: 12px 0;
        }

        .heroSubtitle {
          color: #aaa;
          max-width: 480px;
          margin: 0 auto;
          line-height: 1.6;
          font-size: 14px;
        }

        .errorBox {
          background: #251012;
          border: 1px solid #6d2228;
          color: #ffb2b7;
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
          border: 1px solid #351719;
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
          border: 1px solid #3a191b;
          border-radius: 22px;
          padding: 20px;
          box-shadow:
            0 25px 80px rgba(
              0,
              0,
              0,
              0.45
            ),
            0 0 45px rgba(
              229,
              9,
              20,
              0.04
            );
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
        }

        .timer {
          text-align: right;
        }

        .timer strong {
          display: block;
          margin-top: 5px;
          color: #ff3844;
          font-size: 18px;
        }

        .timerDanger {
          animation:
            timerPulse 0.8s
            ease-in-out infinite;
          color: #ff7078 !important;
        }

        @keyframes timerPulse {
          0%,
          100% {
            opacity: 1;
          }

          50% {
            opacity: 0.45;
          }
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
          border: 1px solid #332022;
          background: #151515;
          color: #aaa;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 7px;
          font-size: 11px;
        }

        .methodButton.active {
          background: #e50914;
          border-color: #ff3945;
          color: #fff;
        }

        .methodSymbol {
          font-size: 20px;
          font-weight: 900;
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
          border: 3px solid #331619;
          border-top-color: #e50914;
          border-radius: 50%;
          animation:
            spin 0.8s linear
            infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .paymentInfo {
          border-top: 1px solid #301619;
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
          background: #e50914;
          color: #fff;
          font-weight: 900;
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
          border: 1px solid #332022;
          color: #ddd;
          font-family: monospace;
          font-size: 12px;
          line-height: 1.5;
          overflow-wrap: anywhere;
        }

        .copyButton {
          border: 0;
          background: #e50914;
          color: #fff;
          padding: 0 16px;
          border-radius: 10px;
          font-weight: 900;
          cursor: pointer;
        }

        .copyButton:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .copyButton.copied {
          background: #1c8c55;
        }

        .information {
          margin-top: 16px;
          padding: 14px;
          border-radius: 10px;
          background: #161616;
          border: 1px solid #281719;
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
          background: #181010;
          border: 1px solid #3c1b1e;
        }

        .warningIcon {
          width: 20px;
          height: 20px;
          flex: 0 0 20px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #e50914;
          color: #fff;
          font-size: 12px;
          font-weight: 900;
        }

        .warning p {
          margin: 0;
          color: #aaa;
          font-size: 12px;
          line-height: 1.5;
        }

        .statusSection {
          margin-top: 18px;
          padding: 14px;
          border: 1px solid #352022;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 11px;
          background: #120b0c;
        }

        .statusSection.confirmed {
          border-color: #194b36;
          background: #0c1712;
        }

        .statusSection.failed {
          border-color: #592024;
          background: #190b0d;
        }

        .statusDot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #d7a82c;
        }

        .statusDot.confirmed {
          background: #2bb673;
        }

        .statusDot.failed {
          background: #e44;
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

        .statusBadge {
          margin-left: auto;
          color: #ff5260 !important;
          font-size: 9px !important;
          font-weight: 900;
        }

        .actions {
          display: grid;
          gap: 10px;
          margin-top: 14px;
        }

        .checkStatusButton,
        .invoiceButton {
          min-height: 50px;
          border-radius: 11px;
          display: grid;
          place-items: center;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
        }

        .checkStatusButton {
          border: 1px solid #ff303c;
          background: #e50914;
          color: #fff;
        }

        .checkStatusButton:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .invoiceButton {
          border: 1px solid #383838;
          background: #171717;
          color: #fff;
        }

        .footer {
          text-align: center;
          color: #555;
          font-size: 11px;
          margin: 25px 0 0;
        }

        /*
         * FLOATING PAYMENT PANEL
         */
        .paymentFloat {
          position: fixed;
          right: 18px;
          bottom: 18px;
          width: min(
            340px,
            calc(100vw - 36px)
          );
          padding: 18px;
          background: #111;
          border: 1px solid #e50914;
          border-radius: 18px;
          box-shadow:
            0 20px 70px rgba(
              0,
              0,
              0,
              0.7
            ),
            0 0 35px rgba(
              229,
              9,
              20,
              0.2
            );
          z-index: 40;
        }

        /*
         * X IS NOW TOP-RIGHT
         */
        .floatCancel {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 28px;
          height: 28px;
          border: 0;
          border-radius: 50%;
          background: #222;
          color: #fff;
          cursor: pointer;
        }

        .floatCancel:hover {
          background: #e50914;
        }

        .floatTitle {
          text-align: center;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.12em;
          color: #ff3b46;
          margin-bottom: 8px;
        }

        .floatText {
          margin: 0 0 12px;
          text-align: center;
          color: #888;
          font-size: 11px;
          line-height: 1.5;
        }

        .transactionPreview {
          display: block;
          width: 100%;
          max-height: 180px;
          object-fit: contain;
          border-radius: 10px;
          background: #080808;
          margin-bottom: 10px;
          border: 1px solid #292929;
        }

        .uploadImageButton,
        .completedButton {
          width: 100%;
          min-height: 44px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          font-size: 11px;
          font-weight: 900;
          cursor: pointer;
          margin-top: 8px;
        }

        .uploadImageButton {
          background: #1a1a1a;
          border: 1px solid #444;
          color: #fff;
        }

        .uploadImageButton.uploading {
          opacity: 0.6;
          cursor: wait;
        }

        .uploadImageButton.uploaded {
          background: #143b29;
          border-color: #2bb673;
          color: #6ee7a8;
        }

        .completedButton {
          background: #e50914;
          border: 1px solid #ff3541;
          color: #fff;
        }

        .completedButton:hover:not(:disabled) {
          background: #ff2633;
          transform: translateY(-1px);
        }

        .completedButton:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        /*
         * STATUS MODAL
         */
        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(
            0,
            0,
            0,
            0.86
          );
          backdrop-filter: blur(12px);
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
          border: 1px solid #472024;
          border-radius: 24px;
          padding: 30px;
          text-align: center;
        }

        .statusModal.confirmed {
          border-color: #236c4a;
        }

        .statusModal.failed {
          border-color: #7a252d;
        }

        .floatingIcon {
          width: 82px;
          height: 82px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          margin: 0 auto 20px;
          background:
            radial-gradient(
              circle,
              #e50914,
              #780006
            );
          font-size: 37px;
        }

        .statusModal.confirmed
          .floatingIcon {
          background:
            radial-gradient(
              circle,
              #2bb673,
              #105c38
            );
        }

        .statusModal.failed
          .floatingIcon {
          background:
            radial-gradient(
              circle,
              #e44,
              #79151b
            );
        }

        .statusModal h2 {
          margin: 10px 0;
          font-size: 25px;
        }

        .statusModal p {
          color: #888;
          line-height: 1.6;
          font-size: 13px;
          margin: 0 0 20px;
        }

        .modalStatus {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 11px;
          border-radius: 10px;
          background: #181818;
          border: 1px solid #292929;
          color: #aaa;
          font-size: 11px;
        }

        .modalDot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #d7a82c;
        }

        .modalDot.confirmed {
          background: #2bb673;
        }

        .modalDot.failed {
          background: #e44;
        }

        .modalActions {
          display: grid;
          gap: 9px;
          margin-top: 18px;
        }

        .modalInvoice,
        .closeButton {
          width: 100%;
          min-height: 46px;
          border-radius: 10px;
          font-weight: 900;
          cursor: pointer;
        }

        .modalInvoice {
          border: 1px solid #e50914;
          background: #e50914;
          color: #fff;
        }

        .closeButton {
          border: 1px solid #333;
          background: #1b1b1b;
          color: #fff;
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
            grid-template-columns:
              repeat(2, 1fr);
          }

          .walletRow {
            flex-direction: column;
          }

          .copyButton {
            min-height: 44px;
          }

          .statusBadge {
            display: none !important;
          }

          .paymentFloat {
            right: 12px;
            bottom: 12px;
            width: calc(
              100vw - 24px
            );
          }

          .statusModal {
            padding: 25px 20px;
          }
        }
      `}</style>
    </main>
  )
}
