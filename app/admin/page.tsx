"use client"

import {
  useEffect,
  useState,
} from "react"

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

type PaymentStatus =
  | "pending"
  | "confirmed"
  | "failed"

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

type WaitingOrder = {
  id: string
  full_name?: string
  email?: string
  total?: number | string
  payment_method?: string
  payment_status?: PaymentStatus
  wallet_copied?: boolean
  wallet_copied_at?: string
  transaction_image?: string | null
  transaction_submitted?: boolean
  transaction_submitted_at?: string
  created_at?: string
  updated_at?: string
}

export default function AdminPage() {
  /* ==================== 1. BASIC ADMIN STATE ==================== */

  const [selected, setSelected] =
    useState("bitcoin")

  const [loading, setLoading] =
    useState(true)

  const [saving, setSaving] =
    useState(false)

  const [saved, setSaved] =
    useState(false)

  const [error, setError] =
    useState("")

  /* ==================== 2. PAGE 3 EDITABLE CONTENT ==================== */

  const [information, setInformation] =
    useState("")

  const [walletAddress, setWalletAddress] =
    useState("")

  const [heroHeading, setHeroHeading] =
    useState("PAY WITH CRYPTO")

  const [heroSubtitle, setHeroSubtitle] =
    useState(
      "Secure and simple crypto payment"
    )

  const [footerText, setFooterText] =
    useState("KAKOBUY")

  /* ==================== 3. QR IMAGE STATE ==================== */

  const [qrPreview, setQrPreview] =
    useState("")

  const [qrFile, setQrFile] =
    useState<File | null>(null)

  /* ==================== 4. PAYMENT STATUS STATE ==================== */

  const [orderId, setOrderId] =
    useState("")

  const [paymentStatus, setPaymentStatus] =
    useState<PaymentStatus>("pending")

  const [statusSaving, setStatusSaving] =
    useState(false)

  const [statusSaved, setStatusSaved] =
    useState(false)

  /* ==================== 5. BUYER WAITING QUEUE ==================== */

  const [waitingOrders, setWaitingOrders] =
    useState<WaitingOrder[]>([])

  const [queueLoading, setQueueLoading] =
    useState(false)

  const [queueError, setQueueError] =
    useState("")

  const [selectedWaitingOrder, setSelectedWaitingOrder] =
    useState<WaitingOrder | null>(null)

  const current = methods.find(
    (item) => item.id === selected
  )

  /* ==================== 6. LOAD PAGE 3 SETTINGS ==================== */

  useEffect(() => {
    let cancelled = false

    async function loadInformation() {
      setLoading(true)
      setSaved(false)
      setError("")
      setQrFile(null)

      setInformation("")
      setWalletAddress("")
      setHeroHeading("PAY WITH CRYPTO")
      setHeroSubtitle(
        "Secure and simple crypto payment"
      )
      setFooterText("KAKOBUY")
      setQrPreview("")

      try {
        const response = await fetch(
          `/api/payment-methods?id=${encodeURIComponent(
            selected
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
            "Server returned an invalid response."
          )
        }

        if (!response.ok) {
          throw new Error(
            data?.error ||
              "Unable to load payment method."
          )
        }

        const paymentMethod: PaymentMethod =
          data?.paymentMethod ||
          data?.method ||
          data

        if (cancelled) {
          return
        }

        setInformation(
          paymentMethod?.information || ""
        )

        setWalletAddress(
          paymentMethod?.wallet_address ||
            paymentMethod?.address ||
            ""
        )

        setHeroHeading(
          paymentMethod?.hero_title ||
            paymentMethod?.hero_heading ||
            "PAY WITH CRYPTO"
        )

        setHeroSubtitle(
          paymentMethod?.hero_subtitle ||
            "Secure and simple crypto payment"
        )

        setFooterText(
          paymentMethod?.footer_text ||
            "KAKOBUY"
        )

        setQrPreview(
          paymentMethod?.qr_image ||
            paymentMethod?.qr_image_url ||
            ""
        )
      } catch (err) {
        console.error(
          "Load payment method error:",
          err
        )

        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load payment method."
          )

          setInformation("")
          setWalletAddress("")
          setHeroHeading("PAY WITH CRYPTO")
          setHeroSubtitle(
            "Secure and simple crypto payment"
          )
          setFooterText("KAKOBUY")
          setQrPreview("")
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadInformation()

    return () => {
      cancelled = true
    }
  }, [selected])

  /* ==================== 7. QR PREVIEW CLEANUP ==================== */

  useEffect(() => {
    return () => {
      if (
        qrPreview &&
        qrPreview.startsWith("blob:")
      ) {
        URL.revokeObjectURL(qrPreview)
      }
    }
  }, [qrPreview])

  /* ==================== 8. LOAD WAITING BUYERS ==================== */

  async function loadWaitingOrders(
    silent = false
  ) {
    if (!silent) {
      setQueueLoading(true)
    }

    try {
      const response = await fetch(
        "/api/payment-status",
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
          "Server returned an invalid response."
        )
      }

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to load waiting payments."
        )
      }

      const orders: WaitingOrder[] =
        Array.isArray(data?.orders)
          ? data.orders
          : []

      setWaitingOrders(orders)

      setQueueError("")

      /*
       * If the currently selected order has
       * already been handled, update/remove it.
       */
      if (selectedWaitingOrder) {
        const updated =
          orders.find(
            (item) =>
              String(item.id) ===
              String(
                selectedWaitingOrder.id
              )
          )

        if (!updated) {
          setSelectedWaitingOrder(null)
        }
      }
    } catch (err) {
      console.error(
        "Waiting orders error:",
        err
      )

      if (!silent) {
        setQueueError(
          err instanceof Error
            ? err.message
            : "Unable to load waiting payments."
        )
      }
    } finally {
      if (!silent) {
        setQueueLoading(false)
      }
    }
  }

  /* ==================== 9. LIVE ADMIN NOTIFICATION POLLING ==================== */

  useEffect(() => {
    loadWaitingOrders()

    const interval =
      window.setInterval(() => {
        loadWaitingOrders(true)
      }, 3000)

    return () => {
      window.clearInterval(interval)
    }
  }, [])

  /* ==================== 10. SELECT WAITING ORDER ==================== */

  function openWaitingOrder(
    order: WaitingOrder
  ) {
    setSelectedWaitingOrder(order)
    setOrderId(String(order.id))

    const status =
      order.payment_status || "pending"

    if (
      status === "confirmed" ||
      status === "failed" ||
      status === "pending"
    ) {
      setPaymentStatus(status)
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })
  }

  /* ==================== 11. LOAD INDIVIDUAL ORDER STATUS ==================== */

  async function loadOrderStatus() {
    if (!orderId.trim()) {
      alert("Enter an Order ID first.")
      return
    }

    try {
      const response = await fetch(
        `/api/payment-status?orderId=${encodeURIComponent(
          orderId.trim()
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
          "Server returned an invalid response."
        )
      }

      if (!response.ok || !data.order) {
        throw new Error(
          data?.error ||
            "Unable to load order status."
        )
      }

      const status =
        data.order.payment_status ||
        "pending"

      if (
        status === "confirmed" ||
        status === "failed" ||
        status === "pending"
      ) {
        setPaymentStatus(status)
      }

      setSelectedWaitingOrder(
        data.order
      )

      setStatusSaved(false)

      await loadWaitingOrders(true)
    } catch (err) {
      console.error(
        "Order status error:",
        err
      )

      alert(
        err instanceof Error
          ? err.message
          : "Unable to load order status."
      )
    }
  }

  /* ==================== 12. SAVE ORDER PAYMENT STATUS ==================== */

  async function savePaymentStatus() {
    if (statusSaving) return

    if (!orderId.trim()) {
      alert("Enter an Order ID first.")
      return
    }

    setStatusSaving(true)
    setStatusSaved(false)

    try {
      const response = await fetch(
        "/api/payment-status",
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            orderId: orderId.trim(),
            status: paymentStatus,
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

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to save payment status."
        )
      }

      const updatedOrder =
        data?.order

      setPaymentStatus(
        updatedOrder?.payment_status ||
          paymentStatus
      )

      if (updatedOrder) {
        setSelectedWaitingOrder(
          updatedOrder
        )
      }

      setStatusSaved(true)

      /*
       * Refresh the waiting queue.
       *
       * The order disappears from the
       * waiting list after it has been
       * changed from pending to confirmed
       * or failed.
       */
      await loadWaitingOrders(true)

      window.setTimeout(() => {
        setStatusSaved(false)
      }, 3000)
    } catch (err) {
      console.error(
        "Save payment status error:",
        err
      )

      alert(
        err instanceof Error
          ? err.message
          : "Unable to save payment status."
      )
    } finally {
      setStatusSaving(false)
    }
  }

  /* ==================== 13. HANDLE QR IMAGE ==================== */

  function handleQrChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0]

    if (!file) {
      return
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ]

    if (
      !allowedTypes.includes(file.type)
    ) {
      alert(
        "QR image must be JPG, PNG, or WEBP."
      )

      event.target.value = ""
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert(
        "QR image must be smaller than 5 MB."
      )

      event.target.value = ""
      return
    }

    if (
      qrPreview &&
      qrPreview.startsWith("blob:")
    ) {
      URL.revokeObjectURL(qrPreview)
    }

    const previewUrl =
      URL.createObjectURL(file)

    setQrFile(file)
    setQrPreview(previewUrl)
    setSaved(false)
    setError("")
  }

  /* ==================== 14. SAVE PAGE 3 CHANGES ==================== */

  async function saveChanges() {
    if (saving) {
      return
    }

    setSaving(true)
    setSaved(false)
    setError("")

    try {
      const formData =
        new FormData()

      formData.append(
        "id",
        selected
      )

      formData.append(
        "information",
        information
      )

      formData.append(
        "wallet_address",
        walletAddress.trim()
      )

      formData.append(
        "hero_heading",
        heroHeading
      )

      formData.append(
        "hero_subtitle",
        heroSubtitle
      )

      formData.append(
        "footer_text",
        footerText
      )

      if (qrFile) {
        formData.append(
          "qr",
          qrFile
        )
      }

      const response = await fetch(
        "/api/payment-methods",
        {
          method: "PUT",
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
          text ||
            "Server returned an invalid response."
        )
      }

      if (!response.ok) {
        throw new Error(
          data?.error ||
            `Save failed with status ${response.status}`
        )
      }

      if (
        data?.wallet_address !==
        undefined
      ) {
        setWalletAddress(
          data.wallet_address || ""
        )
      }

      if (
        data?.hero_heading !==
        undefined
      ) {
        setHeroHeading(
          data.hero_heading || ""
        )
      }

      if (
        data?.hero_title !==
        undefined
      ) {
        setHeroHeading(
          data.hero_title || ""
        )
      }

      if (
        data?.hero_subtitle !==
        undefined
      ) {
        setHeroSubtitle(
          data.hero_subtitle || ""
        )
      }

      if (
        data?.footer_text !==
        undefined
      ) {
        setFooterText(
          data.footer_text || ""
        )
      }

      if (
        data?.information !==
        undefined
      ) {
        setInformation(
          data.information || ""
        )
      }

      const newQrUrl =
        data?.qr_image_url ||
        data?.qr_image

      if (newQrUrl) {
        if (
          qrPreview &&
          qrPreview.startsWith("blob:")
        ) {
          URL.revokeObjectURL(qrPreview)
        }

        setQrPreview(newQrUrl)
      }

      setQrFile(null)
      setSaved(true)

      window.setTimeout(() => {
        setSaved(false)
      }, 3000)
    } catch (err) {
      console.error(
        "Save payment settings error:",
        err
      )

      const message =
        err instanceof Error
          ? err.message
          : "Unable to save changes."

      setError(message)

      alert(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="admin-page">
      <div className="admin-container">

        {/* ==================== 15. ADMIN HEADER ==================== */}

        <header className="admin-header">
          <div>
            <h1>
              <span>KAKO</span>BUY
            </h1>

            <p>
              Payment Admin — Page 3
            </p>
          </div>

          <a
            href="/"
            className="back-button"
          >
            VIEW PAGE
          </a>
        </header>

        {/* ==================== 16. ADMIN NAVIGATION ==================== */}

        <nav className="admin-navigation">
          <a
            href="https://kakobuy-mini.vercel.app/admin"
            className="admin-nav-link"
          >
            PAGE 1 ADMIN
          </a>

          <a
            href="https://kakobuy-check-order.vercel.app/admin"
            className="admin-nav-link"
          >
            PAGE 2 ADMIN
          </a>

          <a
            href="https://kakobuy-payment-page.vercel.app/admin"
            className="admin-nav-link active"
          >
            PAGE 3 ADMIN
          </a>
        </nav>

        {/* ==================== 17. ERROR MESSAGE ==================== */}

        {error && (
          <div className="error-box">
            <strong>
              ERROR
            </strong>

            <span>
              {error}
            </span>
          </div>
        )}

        {/* ==================== 18. LIVE BUYER NOTIFICATION ==================== */}

        {waitingOrders.length > 0 && (
          <section className="waiting-alert">
            <div className="waiting-alert-icon">
              !
            </div>

            <div className="waiting-alert-content">
              <strong>
                BUYER WAITING FOR CONFIRMATION
              </strong>

              <span>
                {waitingOrders.length} payment
                {waitingOrders.length === 1
                  ? ""
                  : "s"} submitted for review.
              </span>
            </div>

            <div className="waiting-pulse" />
          </section>
        )}

        {/* ==================== 19. WAITING PAYMENTS ==================== */}

        <section className="admin-card waiting-card">
          <div className="admin-title">
            <div>
              <p className="admin-label">
                LIVE PAYMENT QUEUE
              </p>

              <h2>
                Buyer Submissions
              </h2>
            </div>

            <button
              type="button"
              className="refresh-button"
              onClick={() =>
                loadWaitingOrders()
              }
              disabled={queueLoading}
            >
              {queueLoading
                ? "LOADING..."
                : "↻ REFRESH"}
            </button>
          </div>

          <p className="admin-description">
            When a buyer uploads a
            transaction screenshot and
            confirms it, the order appears
            here automatically.
          </p>

          {queueError && (
            <div className="queue-error">
              {queueError}
            </div>
          )}

          {waitingOrders.length === 0 ? (
            <div className="empty-queue">
              <div className="empty-icon">
                ✓
              </div>

              <strong>
                NO PAYMENTS WAITING
              </strong>

              <span>
                New buyer submissions will
                appear here automatically.
              </span>
            </div>
          ) : (
            <div className="waiting-list">
              {waitingOrders.map(
                (order) => (
                  <button
                    type="button"
                    key={String(
                      order.id
                    )}
                    className={`waiting-order ${
                      selectedWaitingOrder &&
                      String(
                        selectedWaitingOrder.id
                      ) ===
                        String(
                          order.id
                        )
                        ? "waiting-order-selected"
                        : ""
                    }`}
                    onClick={() =>
                      openWaitingOrder(
                        order
                      )
                    }
                  >
                    <div className="waiting-order-left">
                      <div className="waiting-order-icon">
                        !
                      </div>

                      <div>
                        <strong>
                          {order.full_name ||
                            "Customer"}
                        </strong>

                        <span>
                          Order #
                          {String(
                            order.id
                          )}
                        </span>

                        <small>
                          {order.email ||
                            "No email"}
                        </small>
                      </div>
                    </div>

                    <div className="waiting-order-right">
                      <strong>
                        {order.payment_method ||
                          "Crypto"}
                      </strong>

                      <span>
                        {order.transaction_submitted_at
                          ? new Date(
                              order.transaction_submitted_at
                            ).toLocaleString()
                          : "Recently submitted"}
                      </span>
                    </div>
                  </button>
                )
              )}
            </div>
          )}
        </section>

        {/* ==================== 20. SELECTED BUYER REVIEW ==================== */}

        {selectedWaitingOrder && (
          <section className="admin-card review-card">
            <div className="admin-title">
              <div>
                <p className="admin-label">
                  PAYMENT REVIEW
                </p>

                <h2>
                  Buyer Submission
                </h2>
              </div>

              <span className="review-badge">
                WAITING
              </span>
            </div>

            <div className="buyer-details">
              <div>
                <span>
                  CUSTOMER
                </span>

                <strong>
                  {selectedWaitingOrder.full_name ||
                    "Not provided"}
                </strong>
              </div>

              <div>
                <span>
                  EMAIL
                </span>

                <strong>
                  {selectedWaitingOrder.email ||
                    "Not provided"}
                </strong>
              </div>

              <div>
                <span>
                  ORDER ID
                </span>

                <strong>
                  {String(
                    selectedWaitingOrder.id
                  )}
                </strong>
              </div>

              <div>
                <span>
                  PAYMENT METHOD
                </span>

                <strong>
                  {selectedWaitingOrder.payment_method ||
                    "Not provided"}
                </strong>
              </div>

              <div>
                <span>
                  TOTAL
                </span>

                <strong>
                  {selectedWaitingOrder.total ??
                    "Not provided"}
                </strong>
              </div>
            </div>

            {selectedWaitingOrder.transaction_image && (
              <div className="transaction-review">
                <p>
                  TRANSACTION SCREENSHOT
                </p>

                <a
                  href={
                    selectedWaitingOrder.transaction_image
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                    src={
                      selectedWaitingOrder.transaction_image
                    }
                    alt="Buyer transaction screenshot"
                  />
                </a>

                <span>
                  Tap the image to view it
                  larger.
                </span>
              </div>
            )}

            <button
              type="button"
              className="review-load-button"
              onClick={() => {
                setOrderId(
                  String(
                    selectedWaitingOrder.id
                  )
                )

                window.scrollTo({
                  top: 0,
                  behavior: "smooth",
                })
              }}
            >
              REVIEW THIS ORDER
            </button>
          </section>
        )}

        {/* ==================== 21. PAYMENT STATUS ==================== */}

        <section className="admin-card">
          <div className="admin-title">
            <div>
              <p className="admin-label">
                ORDER CONTROL
              </p>

              <h2>
                Payment Status
              </h2>
            </div>
          </div>

          <p className="admin-description">
            Change the payment status for
            a customer's order. The buyer
            will receive the update on
            Page 3 automatically.
          </p>

          <label className="field-label">
            Order ID
          </label>

          <div className="order-status-row">
            <input
              value={orderId}
              onChange={(event) =>
                setOrderId(
                  event.target.value
                )
              }
              className="admin-input"
              placeholder="Enter order ID"
              disabled={statusSaving}
            />

            <button
              type="button"
              className="load-status-button"
              onClick={
                loadOrderStatus
              }
              disabled={statusSaving}
            >
              LOAD
            </button>
          </div>

          <label className="field-label">
            Set payment status
          </label>

          <div className="status-options">
            <button
              type="button"
              className={`status-option pending ${
                paymentStatus ===
                "pending"
                  ? "selected"
                  : ""
              }`}
              onClick={() =>
                setPaymentStatus(
                  "pending"
                )
              }
              disabled={statusSaving}
            >
              <span className="status-icon">
                •
              </span>

              <span>
                <strong>
                  Payment Pending
                </strong>

                <small>
                  Waiting for payment
                </small>
              </span>
            </button>

            <button
              type="button"
              className={`status-option confirmed ${
                paymentStatus ===
                "confirmed"
                  ? "selected"
                  : ""
              }`}
              onClick={() =>
                setPaymentStatus(
                  "confirmed"
                )
              }
              disabled={statusSaving}
            >
              <span className="status-icon">
                ✓
              </span>

              <span>
                <strong>
                  Payment Confirmed
                </strong>

                <small>
                  Payment received
                </small>
              </span>
            </button>

            <button
              type="button"
              className={`status-option failed ${
                paymentStatus ===
                "failed"
                  ? "selected"
                  : ""
              }`}
              onClick={() =>
                setPaymentStatus(
                  "failed"
                )
              }
              disabled={statusSaving}
            >
              <span className="status-icon">
                !
              </span>

              <span>
                <strong>
                  Payment Failed
                </strong>

                <small>
                  Payment not confirmed
                </small>
              </span>
            </button>
          </div>

          <button
            type="button"
            className="save-status-button"
            onClick={
              savePaymentStatus
            }
            disabled={
              statusSaving ||
              !orderId.trim()
            }
          >
            {statusSaving
              ? "SAVING..."
              : statusSaved
              ? "✓ STATUS SAVED"
              : "SAVE PAYMENT STATUS"}
          </button>
        </section>

        {/* ==================== 22. CRYPTOCURRENCY SELECTOR ==================== */}

        <section className="admin-card">
          <p className="admin-label">
            CRYPTO SETTINGS
          </p>

          <h2>
            Payment Methods
          </h2>

          <p className="admin-description">
            Select Bitcoin, Ethereum, TRON
            or Binance to edit exactly
            what appears on Page 3.
          </p>

          <div className="admin-methods">
            {methods.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  setSelected(
                    item.id
                  )
                }
                className={`admin-method ${
                  selected === item.id
                    ? "admin-selected"
                    : ""
                }`}
                disabled={
                  loading || saving
                }
              >
                <strong>
                  {item.symbol}
                </strong>

                <span>
                  {item.name}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* ==================== 23. PAGE 3 EDITOR ==================== */}

        <section className="admin-card">
          <div className="admin-title">
            <div>
              <p className="admin-label">
                EDITING PAGE 3
              </p>

              <h2>
                {current?.name}
              </h2>
            </div>

            {loading && (
              <span className="loading-text">
                LOADING...
              </span>
            )}
          </div>

          <label className="field-label">
            Wallet Address
          </label>

          <div className="wallet-editor">
            <input
              value={walletAddress}
              onChange={(event) =>
                setWalletAddress(
                  event.target.value
                )
              }
              className="admin-input wallet-input"
              placeholder={`Enter ${current?.name} wallet address`}
              disabled={
                loading || saving
              }
              autoComplete="off"
              spellCheck={false}
            />

            <p className="wallet-help">
              This is the wallet address
              the customer will see and
              copy on Page 3 for{" "}
              {current?.name}.
            </p>
          </div>

          <label className="field-label">
            Hero Heading
          </label>

          <input
            value={heroHeading}
            onChange={(event) =>
              setHeroHeading(
                event.target.value
              )
            }
            className="admin-input"
            placeholder="PAY WITH CRYPTO"
            disabled={
              loading || saving
            }
          />

          <label className="field-label">
            Hero Subtitle
          </label>

          <input
            value={heroSubtitle}
            onChange={(event) =>
              setHeroSubtitle(
                event.target.value
              )
            }
            className="admin-input"
            placeholder="Secure and simple crypto payment"
            disabled={
              loading || saving
            }
          />

          <label className="field-label">
            Footer Text
          </label>

          <input
            value={footerText}
            onChange={(event) =>
              setFooterText(
                event.target.value
              )
            }
            className="admin-input"
            placeholder="KAKOBUY"
            disabled={
              loading || saving
            }
          />

          <label className="field-label">
            Payment Information
          </label>

          <textarea
            value={information}
            onChange={(event) =>
              setInformation(
                event.target.value
              )
            }
            className="admin-textarea"
            placeholder="Enter payment information"
            disabled={
              loading || saving
            }
          />

          <p className="field-help">
            This information will be
            displayed on Page 3 for{" "}
            {current?.name}.
          </p>

          <label className="field-label">
            QR Code Image
          </label>

          <div className="upload-box">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={
                handleQrChange
              }
              disabled={
                loading || saving
              }
            />

            <p>
              Choose QR image
            </p>

            <span>
              PNG, JPG or WEBP — max 5 MB
            </span>
          </div>

          {qrPreview && (
            <div className="qr-preview">
              <p>
                QR PREVIEW —{" "}
                {current?.name}
              </p>

              <img
                src={qrPreview}
                alt={`${current?.name} QR Code`}
              />
            </div>
          )}

          <button
            onClick={saveChanges}
            className="save-button"
            disabled={
              loading || saving
            }
            type="button"
          >
            {saving
              ? "SAVING..."
              : saved
              ? "✓ SAVED SUCCESSFULLY"
              : "SAVE PAGE 3 CHANGES"}
          </button>
        </section>

        {/* ==================== 24. ADMIN FOOTER ==================== */}

        <p className="admin-footer">
          KAKO<span>BUY</span>{" "}
          Admin Page 3
        </p>
      </div>

      {/* ==================== 25. ADMIN STYLES ==================== */}

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .admin-page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at top left,
              rgba(255, 48, 48, 0.12),
              transparent 35%
            ),
            #080808;
          color: #fff;
          padding: 25px 15px 50px;
          font-family:
            Inter,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        .admin-container {
          width: 100%;
          max-width: 720px;
          margin: 0 auto;
        }

        .admin-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          margin-bottom: 15px;
        }

        .admin-header h1 {
          margin: 0;
          font-size: 27px;
          letter-spacing: -0.04em;
        }

        .admin-header h1 span {
          color: #ff3030;
        }

        .admin-header p {
          margin: 3px 0 0;
          color: #777;
          font-size: 12px;
        }

        .back-button {
          color: #fff;
          text-decoration: none;
          border: 1px solid #292929;
          padding: 9px 13px;
          border-radius: 9px;
          font-size: 12px;
          white-space: nowrap;
        }

        .back-button:hover {
          border-color: #ff3030;
          background: #180909;
        }

        .admin-navigation {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 7px;
          margin-bottom: 15px;
        }

        .admin-nav-link {
          text-decoration: none;
          text-align: center;
          padding: 12px 5px;
          border-radius: 9px;
          border: 1px solid #292929;
          background: #111;
          color: #999;
          font-size: 10px;
          font-weight: 900;
        }

        .admin-nav-link:hover {
          border-color: #ff3030;
          color: #fff;
        }

        .admin-nav-link.active {
          background: #ff3030;
          border-color: #ff3030;
          color: #fff;
        }

        /* ==================== 26. LIVE ALERT ==================== */

        .waiting-alert {
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          gap: 13px;
          margin-bottom: 15px;
          padding: 15px;
          border-radius: 15px;
          border: 1px solid rgba(
            255,
            48,
            48,
            0.55
          );
          background:
            linear-gradient(
              135deg,
              rgba(255, 48, 48, 0.18),
              rgba(255, 48, 48, 0.04)
            ),
            #111;
          box-shadow:
            0 0 30px rgba(
              255,
              48,
              48,
              0.08
            );
          animation: alertEnter 0.45s ease;
        }

        .waiting-alert-icon {
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #ff3030;
          color: #fff;
          font-size: 22px;
          font-weight: 900;
          animation: alertPulse 1.4s infinite;
        }

        .waiting-alert-content {
          min-width: 0;
        }

        .waiting-alert-content strong {
          display: block;
          color: #fff;
          font-size: 13px;
          letter-spacing: 0.03em;
        }

        .waiting-alert-content span {
          display: block;
          color: #aaa;
          font-size: 11px;
          margin-top: 4px;
        }

        .waiting-pulse {
          position: absolute;
          width: 120px;
          height: 120px;
          right: -55px;
          top: -50px;
          border-radius: 50%;
          border: 1px solid rgba(
            255,
            48,
            48,
            0.3
          );
          animation: ringPulse 2s infinite;
        }

        @keyframes alertEnter {
          from {
            opacity: 0;
            transform: translateY(-12px)
              scale(0.98);
          }

          to {
            opacity: 1;
            transform: translateY(0)
              scale(1);
          }
        }

        @keyframes alertPulse {
          0%,
          100% {
            transform: scale(1);
            box-shadow:
              0 0 0 0
              rgba(
                255,
                48,
                48,
                0.4
              );
          }

          50% {
            transform: scale(1.06);
            box-shadow:
              0 0 0 9px
              rgba(
                255,
                48,
                48,
                0
              );
          }
        }

        @keyframes ringPulse {
          0% {
            transform: scale(0.7);
            opacity: 0.8;
          }

          100% {
            transform: scale(1.4);
            opacity: 0;
          }
        }

        /* ==================== 27. GENERAL CARDS ==================== */

        .admin-card {
          background: #101010;
          border: 1px solid #292929;
          border-radius: 18px;
          padding: 20px;
          margin-bottom: 15px;
        }

        .admin-card h2 {
          margin: 0;
          font-size: 20px;
        }

        .admin-description {
          color: #777;
          font-size: 12px;
          line-height: 1.6;
          margin: 8px 0 18px;
        }

        .admin-title {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 15px;
          margin-bottom: 18px;
        }

        .admin-label,
        .field-label {
          display: block;
          color: #777;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.13em;
        }

        .admin-label {
          margin: 0 0 6px;
        }

        .field-label {
          margin: 17px 0 8px;
        }

        .field-help,
        .wallet-help {
          color: #666;
          font-size: 10px;
          line-height: 1.5;
          margin: 7px 2px 0;
        }

        .loading-text {
          color: #666;
          font-size: 10px;
          font-weight: 800;
        }

        /* ==================== 28. WAITING LIST ==================== */

        .refresh-button {
          border: 1px solid #292929;
          background: #181818;
          color: #aaa;
          border-radius: 9px;
          padding: 9px 11px;
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
        }

        .refresh-button:hover {
          border-color: #ff3030;
          color: #fff;
        }

        .refresh-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .queue-error {
          border: 1px solid rgba(
            255,
            48,
            48,
            0.3
          );
          background: rgba(
            255,
            48,
            48,
            0.06
          );
          color: #ff7777;
          border-radius: 10px;
          padding: 11px;
          font-size: 11px;
          margin-bottom: 12px;
        }

        .empty-queue {
          padding: 30px 15px;
          border: 1px dashed #292929;
          border-radius: 13px;
          text-align: center;
        }

        .empty-icon {
          width: 45px;
          height: 45px;
          margin: 0 auto 10px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #181818;
          color: #555;
          font-size: 19px;
          font-weight: 900;
        }

        .empty-queue strong {
          display: block;
          font-size: 11px;
        }

        .empty-queue span {
          display: block;
          margin-top: 5px;
          color: #666;
          font-size: 10px;
        }

        .waiting-list {
          display: grid;
          gap: 8px;
        }

        .waiting-order {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          text-align: left;
          padding: 13px;
          border: 1px solid #292929;
          background: #151515;
          color: #fff;
          border-radius: 12px;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .waiting-order:hover {
          border-color: #ff3030;
          transform: translateY(-1px);
        }

        .waiting-order-selected {
          border-color: #ff3030;
          background: rgba(
            255,
            48,
            48,
            0.07
          );
        }

        .waiting-order-left {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .waiting-order-icon {
          width: 34px;
          height: 34px;
          flex: 0 0 34px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: rgba(
            255,
            48,
            48,
            0.12
          );
          color: #ff3030;
          font-weight: 900;
        }

        .waiting-order-left strong {
          display: block;
          font-size: 12px;
        }

        .waiting-order-left span,
        .waiting-order-left small {
          display: block;
          margin-top: 3px;
          color: #777;
          font-size: 10px;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .waiting-order-right {
          text-align: right;
          flex: 0 0 auto;
        }

        .waiting-order-right strong {
          display: block;
          color: #ff7777;
          font-size: 11px;
        }

        .waiting-order-right span {
          display: block;
          margin-top: 4px;
          color: #666;
          font-size: 9px;
        }

        /* ==================== 29. BUYER REVIEW ==================== */

        .review-card {
          animation: reviewEnter 0.35s ease;
        }

        @keyframes reviewEnter {
          from {
            opacity: 0;
            transform: translateY(8px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .review-badge {
          padding: 7px 9px;
          border-radius: 8px;
          background: rgba(
            215,
            168,
            44,
            0.1
          );
          color: #d7a82c;
          border: 1px solid rgba(
            215,
            168,
            44,
            0.25
          );
          font-size: 9px;
          font-weight: 900;
        }

        .buyer-details {
          display: grid;
          grid-template-columns: repeat(
            2,
            1fr
          );
          gap: 9px;
        }

        .buyer-details > div {
          padding: 11px;
          background: #151515;
          border: 1px solid #242424;
          border-radius: 10px;
          min-width: 0;
        }

        .buyer-details span {
          display: block;
          color: #666;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.08em;
        }

        .buyer-details strong {
          display: block;
          color: #ddd;
          font-size: 11px;
          margin-top: 4px;
          word-break: break-word;
        }

        .transaction-review {
          margin-top: 15px;
          padding: 15px;
          border-radius: 13px;
          background: #080808;
          border: 1px solid #242424;
          text-align: center;
        }

        .transaction-review p {
          margin: 0 0 11px;
          color: #777;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.12em;
        }

        .transaction-review img {
          display: block;
          width: 100%;
          max-height: 500px;
          object-fit: contain;
          background: #fff;
          border-radius: 10px;
          cursor: pointer;
        }

        .transaction-review span {
          display: block;
          margin-top: 8px;
          color: #555;
          font-size: 9px;
        }

        .review-load-button {
          width: 100%;
          min-height: 44px;
          margin-top: 12px;
          border: 1px solid #292929;
          border-radius: 10px;
          background: #181818;
          color: #fff;
          font-weight: 800;
          cursor: pointer;
        }

        .review-load-button:hover {
          border-color: #ff3030;
        }

        /* ==================== 30. INPUTS ==================== */

        .error-box {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          background: rgba(
            255,
            48,
            48,
            0.08
          );
          border: 1px solid rgba(
            255,
            48,
            48,
            0.35
          );
          color: #ff7777;
          border-radius: 12px;
          padding: 13px;
          margin-bottom: 15px;
          font-size: 12px;
          line-height: 1.5;
        }

        .error-box strong {
          color: #ff3030;
          font-size: 10px;
        }

        .admin-input,
        .admin-textarea {
          width: 100%;
          border: 1px solid #292929;
          background: #080808;
          color: #fff;
          border-radius: 10px;
          outline: none;
          padding: 13px;
          font: inherit;
          font-size: 13px;
        }

        .admin-input::placeholder,
        .admin-textarea::placeholder {
          color: #555;
        }

        .admin-input:focus,
        .admin-textarea:focus {
          border-color: #ff3030;
          box-shadow:
            0 0 0 2px
            rgba(
              255,
              48,
              48,
              0.08
            );
        }

        .admin-input:disabled,
        .admin-textarea:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .wallet-input {
          font-family: monospace;
          font-size: 12px;
        }

        .admin-textarea {
          min-height: 110px;
          resize: vertical;
          line-height: 1.5;
        }

        .order-status-row {
          display: flex;
          gap: 8px;
        }

        .order-status-row .admin-input {
          flex: 1;
        }

        .load-status-button {
          border: 1px solid #3a3a3a;
          background: #181818;
          color: #fff;
          border-radius: 10px;
          padding: 0 17px;
          cursor: pointer;
          font-weight: 700;
        }

        .load-status-button:hover {
          border-color: #ff3030;
        }

        .load-status-button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        /* ==================== 31. STATUS OPTIONS ==================== */

        .status-options {
          display: grid;
          gap: 9px;
        }

        .status-option {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          text-align: left;
          padding: 13px;
          border-radius: 12px;
          border: 1px solid #292929;
          background: #151515;
          color: #fff;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .status-option:hover {
          border-color: #555;
        }

        .status-option:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .status-option.selected.pending {
          border-color: #d7a82c;
          background: rgba(
            215,
            168,
            44,
            0.08
          );
        }

        .status-option.selected.confirmed {
          border-color: #20b66b;
          background: rgba(
            32,
            182,
            107,
            0.08
          );
        }

        .status-option.selected.failed {
          border-color: #ff3030;
          background: rgba(
            255,
            48,
            48,
            0.08
          );
        }

        .status-icon {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: #242424;
          font-weight: 900;
          font-size: 17px;
          flex: 0 0 34px;
        }

        .status-option.pending .status-icon {
          color: #d7a82c;
        }

        .status-option.confirmed .status-icon {
          color: #20b66b;
        }

        .status-option.failed .status-icon {
          color: #ff3030;
        }

        .status-option strong {
          display: block;
          font-size: 13px;
        }

        .status-option small {
          display: block;
          margin-top: 3px;
          color: #777;
          font-size: 11px;
        }

        .save-status-button {
          width: 100%;
          min-height: 48px;
          margin-top: 15px;
          border: 0;
          border-radius: 11px;
          background: #ff3030;
          color: #fff;
          font-weight: 800;
          cursor: pointer;
        }

        .save-status-button:hover {
          background: #ff4545;
        }

        .save-status-button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        /* ==================== 32. CRYPTO SETTINGS ==================== */

        .admin-methods {
          display: grid;
          grid-template-columns: repeat(
            4,
            1fr
          );
          gap: 8px;
        }

        .admin-method {
          min-height: 70px;
          border-radius: 11px;
          border: 1px solid #292929;
          background: #151515;
          color: #aaa;
          cursor: pointer;
        }

        .admin-method:hover {
          border-color: #555;
        }

        .admin-method:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .admin-method strong {
          display: block;
          color: #fff;
          font-size: 20px;
          margin-bottom: 5px;
        }

        .admin-method span {
          font-size: 11px;
        }

        .admin-selected {
          border-color: #ff3030;
          background: rgba(
            255,
            48,
            48,
            0.08
          );
          color: #fff;
        }

        /* ==================== 33. QR UPLOAD ==================== */

        .upload-box {
          border: 1px dashed #353535;
          border-radius: 12px;
          padding: 18px;
          text-align: center;
        }

        .upload-box input {
          width: 100%;
          color: #aaa;
        }

        .upload-box p {
          margin: 12px 0 3px;
          font-size: 12px;
          font-weight: 700;
        }

        .upload-box span {
          color: #666;
          font-size: 10px;
        }

        .qr-preview {
          margin-top: 15px;
          padding: 15px;
          background: #181818;
          border-radius: 13px;
          text-align: center;
        }

        .qr-preview p {
          margin: 0 0 10px;
          color: #999;
          font-size: 11px;
          font-weight: 700;
        }

        .qr-preview img {
          display: block;
          width: 220px;
          height: 220px;
          max-width: 100%;
          object-fit: contain;
          margin: 0 auto;
          background: #fff;
          border-radius: 10px;
        }

        .save-button {
          width: 100%;
          min-height: 48px;
          margin-top: 18px;
          border: 0;
          border-radius: 11px;
          background: #ff3030;
          color: #fff;
          font-weight: 800;
          cursor: pointer;
        }

        .save-button:hover {
          background: #ff4545;
        }

        .save-button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .admin-footer {
          text-align: center;
          color: #555;
          font-size: 11px;
          margin-top: 25px;
        }

        .admin-footer span {
          color: #ff3030;
        }

        /* ==================== 34. MOBILE ==================== */

        @media (max-width: 520px) {
          .admin-page {
            padding: 15px 12px 40px;
          }

          .admin-card {
            padding: 15px;
          }

          .admin-navigation {
            grid-template-columns: 1fr;
          }

          .admin-methods {
            grid-template-columns: repeat(
              2,
              1fr
            );
          }

          .order-status-row {
            flex-direction: column;
          }

          .load-status-button {
            min-height: 44px;
          }

          .admin-header {
            align-items: flex-start;
          }

          .waiting-order {
            align-items: flex-start;
          }

          .waiting-order-right {
            display: none;
          }

          .buyer-details {
            grid-template-columns: 1fr;
          }

          .waiting-alert {
            padding: 13px;
          }
        }
      `}</style>
    </main>
  )
}
