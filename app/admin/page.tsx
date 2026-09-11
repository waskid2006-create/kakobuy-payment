"use client"

import { useEffect, useState } from "react"

const METHODS = [
  { id: "bitcoin", name: "Bitcoin", symbol: "₿" },
  { id: "ethereum", name: "Ethereum", symbol: "Ξ" },
  { id: "tron", name: "TRON", symbol: "TRX" },
  { id: "binance", name: "Binance", symbol: "BNB" },
]

type WaitingOrder = {
  id: number | string
  full_name: string
  email: string
  total: number | string
  payment_method: string
  payment_status: string
  wallet_copied: boolean
  wallet_copied_at?: string | null
  transaction_image?: string | null
  transaction_submitted: boolean
  transaction_submitted_at?: string | null
  created_at?: string
  updated_at?: string
}

type PaymentMethod = {
  id: string
  name: string
  information: string
  wallet_address: string
  qr_image_url?: string | null
  hero_heading?: string
  hero_subtitle?: string
  footer_text?: string
}

export default function AdminPage() {
  const [selectedMethod, setSelectedMethod] = useState("bitcoin")

  const [information, setInformation] = useState("")
  const [walletAddress, setWalletAddress] = useState("")
  const [heroHeading, setHeroHeading] = useState("PAY WITH CRYPTO")
  const [heroSubtitle, setHeroSubtitle] = useState(
    "Secure and simple crypto payment"
  )
  const [footerText, setFooterText] = useState("KAKOBUY")

  const [qrPreview, setQrPreview] = useState("")
  const [qrFile, setQrFile] = useState<File | null>(null)

  const [loadingSettings, setLoadingSettings] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsMessage, setSettingsMessage] = useState("")

  const [waitingOrders, setWaitingOrders] = useState<WaitingOrder[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)

  const [selectedOrder, setSelectedOrder] =
    useState<WaitingOrder | null>(null)

  const [changingStatus, setChangingStatus] = useState(false)
  const [statusMessage, setStatusMessage] = useState("")

  async function loadPaymentMethod(methodId: string) {
    setLoadingSettings(true)
    setSettingsMessage("")

    try {
      const response = await fetch(
        `/api/payment-methods?id=${encodeURIComponent(methodId)}`,
        {
          cache: "no-store",
        }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(
          data?.error || "Unable to load payment settings."
        )
      }

      const method: PaymentMethod = data.paymentMethod

      setInformation(method.information || "")
      setWalletAddress(method.wallet_address || "")
      setHeroHeading(
        method.hero_heading ||
          method.hero_heading ||
          "PAY WITH CRYPTO"
      )
      setHeroSubtitle(
        method.hero_subtitle ||
          "Secure and simple crypto payment"
      )
      setFooterText(method.footer_text || "KAKOBUY")

      setQrPreview(
        method.qr_image_url ||
          ""
      )
      setQrFile(null)
    } catch (error) {
      setSettingsMessage(
        error instanceof Error
          ? error.message
          : "Unable to load settings."
      )
    } finally {
      setLoadingSettings(false)
    }
  }

  async function loadWaitingOrders() {
    setLoadingOrders(true)

    try {
      const response = await fetch(
        "/api/payment-status",
        {
          cache: "no-store",
        }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(
          data?.error || "Unable to load payment submissions."
        )
      }

      setWaitingOrders(data.orders || [])
    } catch (error) {
      console.error(error)
    } finally {
      setLoadingOrders(false)
    }
  }

  useEffect(() => {
    loadPaymentMethod(selectedMethod)
  }, [selectedMethod])

  useEffect(() => {
    loadWaitingOrders()

    const interval = setInterval(
      loadWaitingOrders,
      3000
    )

    return () => clearInterval(interval)
  }, [])

  function handleQrChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0]

    if (!file) return

    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ]

    if (!allowed.includes(file.type)) {
      setSettingsMessage(
        "QR code must be JPG, PNG, or WEBP."
      )
      event.target.value = ""
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setSettingsMessage(
        "QR code must be smaller than 5MB."
      )
      event.target.value = ""
      return
    }

    setQrFile(file)

    const reader = new FileReader()

    reader.onload = () => {
      setQrPreview(
        typeof reader.result === "string"
          ? reader.result
          : ""
      )
    }

    reader.readAsDataURL(file)
  }

  async function saveSettings() {
    setSavingSettings(true)
    setSettingsMessage("")

    try {
      const formData = new FormData()

      formData.append(
        "id",
        selectedMethod
      )

      formData.append(
        "information",
        information
      )

      formData.append(
        "wallet_address",
        walletAddress
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

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(
          data?.error ||
            "Unable to save payment settings."
        )
      }

      if (data.paymentMethod?.qr_image_url) {
        setQrPreview(
          data.paymentMethod.qr_image_url
        )
      }

      setQrFile(null)

      setSettingsMessage(
        "Payment settings saved successfully."
      )

      await loadPaymentMethod(
        selectedMethod
      )
    } catch (error) {
      setSettingsMessage(
        error instanceof Error
          ? error.message
          : "Unable to save settings."
      )
    } finally {
      setSavingSettings(false)
    }
  }

  async function changeOrderStatus(
    status: "pending" | "confirmed" | "failed"
  ) {
    if (!selectedOrder) return

    setChangingStatus(true)
    setStatusMessage("")

    try {
      const response = await fetch(
        "/api/payment-status",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderId: selectedOrder.id,
            status,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(
          data?.error ||
            "Unable to update payment status."
        )
      }

      const updatedOrder =
        data.order || {
          ...selectedOrder,
          payment_status: status,
        }

      setSelectedOrder(
        updatedOrder
      )

      setWaitingOrders((current) =>
        current.map((order) =>
          String(order.id) ===
          String(selectedOrder.id)
            ? {
                ...order,
                payment_status: status,
              }
            : order
        )
      )

      setStatusMessage(
        `Payment status changed to ${status.toUpperCase()}.`
      )
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Unable to change status."
      )
    } finally {
      setChangingStatus(false)
    }
  }

  function statusLabel(
    status?: string
  ) {
    const value =
      (status || "pending").toLowerCase()

    if (value === "confirmed") {
      return "CONFIRMED"
    }

    if (value === "failed") {
      return "FAILED"
    }

    return "PENDING"
  }

  function statusClass(
    status?: string
  ) {
    const value =
      (status || "pending").toLowerCase()

    if (value === "confirmed") {
      return "confirmed"
    }

    if (value === "failed") {
      return "failed"
    }

    return "pending"
  }

  function formatDate(
    value?: string | null
  ) {
    if (!value) return "Not available"

    try {
      return new Date(value).toLocaleString()
    } catch {
      return value
    }
  }

  return (
    <main className="admin-page">
      <div className="glow glow-one" />
      <div className="glow glow-two" />

      <header className="topbar">
        <div>
          <div className="brand">
            <span>KAKO</span>BUY
          </div>

          <p className="admin-label">
            PAYMENT ADMIN DASHBOARD
          </p>
        </div>

        <div className="top-actions">
          <a
            href="https://kakobuy-mini.vercel.app/"
            target="_blank"
            rel="noreferrer"
          >
            PAGE 2
          </a>

          <a
            href="https://kakobuy-payment-page.vercel.app/"
            target="_blank"
            rel="noreferrer"
          >
            PAGE 3
          </a>

          <button
            onClick={loadWaitingOrders}
            className="refresh-button"
          >
            ↻ REFRESH
          </button>
        </div>
      </header>

      <section className="dashboard-heading">
        <div>
          <p className="eyebrow">
            KAKOBUY CONTROL CENTER
          </p>

          <h1>
            Payment
            <span> Dashboard</span>
          </h1>

          <p className="heading-text">
            Manage crypto payment settings and
            manually confirm customer payments.
          </p>
        </div>

        <div className="live-badge">
          <span />
          LIVE
        </div>
      </section>

      <section className="submission-section">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">
              CUSTOMER PAYMENTS
            </p>

            <h2>
              Payment submissions
            </h2>
          </div>

          <div className="submission-count">
            {waitingOrders.length} SUBMITTED
          </div>
        </div>

        {loadingOrders &&
        waitingOrders.length === 0 ? (
          <div className="empty-card">
            Loading payment submissions...
          </div>
        ) : waitingOrders.length === 0 ? (
          <div className="empty-card">
            <div className="empty-icon">
              ✓
            </div>

            <strong>
              No pending submissions
            </strong>

            <p>
              When a buyer uploads a screenshot
              and confirms the payment, the
              submission will appear here.
            </p>
          </div>
        ) : (
          <div className="orders-grid">
            {waitingOrders.map((order) => (
              <button
                key={String(order.id)}
                className="order-card"
                onClick={() =>
                  setSelectedOrder(order)
                }
              >
                <div className="order-card-top">
                  <span className="order-id">
                    #{order.id}
                  </span>

                  <span
                    className={`status ${statusClass(
                      order.payment_status
                    )}`}
                  >
                    {statusLabel(
                      order.payment_status
                    )}
                  </span>
                </div>

                <h3>
                  {order.full_name ||
                    "Customer"}
                </h3>

                <p className="customer-email">
                  {order.email ||
                    "No email"}
                </p>

                <div className="order-info">
                  <div>
                    <span>
                      AMOUNT
                    </span>
                    <strong>
                      {order.total}
                    </strong>
                  </div>

                  <div>
                    <span>
                      METHOD
                    </span>
                    <strong>
                      {(
                        order.payment_method ||
                        "Not selected"
                      ).toUpperCase()}
                    </strong>
                  </div>
                </div>

                <div className="submitted">
                  Submitted{" "}
                  {formatDate(
                    order.transaction_submitted_at
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {selectedOrder && (
        <div
          className="modal-backdrop"
          onClick={() =>
            setSelectedOrder(null)
          }
        >
          <div
            className="order-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              className="close-button"
              onClick={() =>
                setSelectedOrder(null)
              }
            >
              ×
            </button>

            <p className="eyebrow">
              PAYMENT REVIEW
            </p>

            <h2>
              Order #{selectedOrder.id}
            </h2>

            <div className="review-status">
              <span
                className={`status large ${statusClass(
                  selectedOrder.payment_status
                )}`}
              >
                {statusLabel(
                  selectedOrder.payment_status
                )}
              </span>
            </div>

            <div className="customer-box">
              <div>
                <span>
                  CUSTOMER
                </span>

                <strong>
                  {selectedOrder.full_name ||
                    "Not available"}
                </strong>
              </div>

              <div>
                <span>
                  EMAIL
                </span>

                <strong>
                  {selectedOrder.email ||
                    "Not available"}
                </strong>
              </div>

              <div>
                <span>
                  AMOUNT
                </span>

                <strong>
                  {selectedOrder.total}
                </strong>
              </div>

              <div>
                <span>
                  PAYMENT METHOD
                </span>

                <strong>
                  {(
                    selectedOrder.payment_method ||
                    "Not selected"
                  ).toUpperCase()}
                </strong>
              </div>
            </div>

            <div className="screenshot-box">
              <div className="box-heading">
                <div>
                  <p>
                    TRANSACTION SCREENSHOT
                  </p>

                  <span>
                    Uploaded by the buyer
                  </span>
                </div>
              </div>

              {selectedOrder.transaction_image ? (
                <a
                  href={
                    selectedOrder.transaction_image
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="image-link"
                >
                  <img
                    src={
                      selectedOrder.transaction_image
                    }
                    alt="Buyer transaction screenshot"
                  />

                  <span>
                    OPEN FULL IMAGE
                  </span>
                </a>
              ) : (
                <div className="no-image">
                  No transaction screenshot
                  available.
                </div>
              )}
            </div>

            <div className="review-details">
              <div>
                <span>
                  WALLET COPIED
                </span>

                <strong>
                  {selectedOrder.wallet_copied
                    ? "YES"
                    : "NO"}
                </strong>
              </div>

              <div>
                <span>
                  SUBMITTED
                </span>

                <strong>
                  {formatDate(
                    selectedOrder.transaction_submitted_at
                  )}
                </strong>
              </div>
            </div>

            <div className="status-control">
              <p className="eyebrow">
                ADMIN STATUS CONTROL
              </p>

              <h3>
                Choose the payment result
              </h3>

              <p>
                The buyer cannot change this
                status. Only this admin control
                changes what the buyer sees.
              </p>

              <div className="status-buttons">
                <button
                  disabled={changingStatus}
                  className="pending-button"
                  onClick={() =>
                    changeOrderStatus(
                      "pending"
                    )
                  }
                >
                  PENDING
                </button>

                <button
                  disabled={changingStatus}
                  className="confirmed-button"
                  onClick={() =>
                    changeOrderStatus(
                      "confirmed"
                    )
                  }
                >
                  CONFIRMED
                </button>

                <button
                  disabled={changingStatus}
                  className="failed-button"
                  onClick={() =>
                    changeOrderStatus(
                      "failed"
                    )
                  }
                >
                  FAILED
                </button>
              </div>

              {statusMessage && (
                <div className="success-message">
                  {statusMessage}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <section className="settings-section">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">
              PAGE 3 CONTROL
            </p>

            <h2>
              Crypto payment settings
            </h2>
          </div>
        </div>

        <div className="method-tabs">
          {METHODS.map((method) => (
            <button
              key={method.id}
              onClick={() =>
                setSelectedMethod(
                  method.id
                )
              }
              className={
                selectedMethod ===
                method.id
                  ? "method-tab active"
                  : "method-tab"
              }
            >
              <strong>
                {method.symbol}
              </strong>

              <span>
                {method.name}
              </span>
            </button>
          ))}
        </div>

        <div className="settings-card">
          {loadingSettings ? (
            <div className="loading-settings">
              Loading payment settings...
            </div>
          ) : (
            <>
              <div className="selected-method">
                <span>
                  SELECTED PAYMENT METHOD
                </span>

                <strong>
                  {METHODS.find(
                    (method) =>
                      method.id ===
                      selectedMethod
                  )?.name ||
                    selectedMethod}
                </strong>
              </div>

              <div className="form-grid">
                <div className="field full">
                  <label>
                    HERO HEADING
                  </label>

                  <input
                    value={heroHeading}
                    onChange={(event) =>
                      setHeroHeading(
                        event.target.value
                      )
                    }
                    placeholder="PAY WITH CRYPTO"
                  />
                </div>

                <div className="field full">
                  <label>
                    HERO SUBTITLE
                  </label>

                  <input
                    value={heroSubtitle}
                    onChange={(event) =>
                      setHeroSubtitle(
                        event.target.value
                      )
                    }
                    placeholder="Secure and simple crypto payment"
                  />
                </div>

                <div className="field full">
                  <label>
                    PAYMENT INFORMATION
                  </label>

                  <textarea
                    value={information}
                    onChange={(event) =>
                      setInformation(
                        event.target.value
                      )
                    }
                    placeholder="Send the exact amount to the wallet below."
                  />
                </div>

                <div className="field full">
                  <label>
                    WALLET ADDRESS
                  </label>

                  <textarea
                    value={walletAddress}
                    onChange={(event) =>
                      setWalletAddress(
                        event.target.value
                      )
                    }
                    placeholder="Enter wallet address"
                  />
                </div>

                <div className="field full">
                  <label>
                    FOOTER TEXT
                  </label>

                  <input
                    value={footerText}
                    onChange={(event) =>
                      setFooterText(
                        event.target.value
                      )
                    }
                    placeholder="KAKOBUY"
                  />
                </div>
              </div>

              <div className="qr-section">
                <div>
                  <p className="qr-title">
                    QR CODE
                  </p>

                  <p className="qr-description">
                    Upload a JPG, PNG, or WEBP
                    QR image. Maximum 5MB.
                  </p>
                </div>

                <div className="qr-content">
                  {qrPreview ? (
                    <div className="qr-preview">
                      <img
                        src={qrPreview}
                        alt="Payment QR code"
                      />
                    </div>
                  ) : (
                    <div className="qr-empty">
                      NO QR CODE
                    </div>
                  )}

                  <label className="upload-qr">
                    CHOOSE QR IMAGE

                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={
                        handleQrChange
                      }
                    />
                  </label>
                </div>
              </div>

              {settingsMessage && (
                <div
                  className={
                    settingsMessage.includes(
                      "successfully"
                    )
                      ? "settings-success"
                      : "settings-error"
                  }
                >
                  {settingsMessage}
                </div>
              )}

              <button
                className="save-button"
                onClick={saveSettings}
                disabled={savingSettings}
              >
                {savingSettings
                  ? "SAVING..."
                  : "SAVE PAYMENT SETTINGS"}
              </button>
            </>
          )}
        </div>
      </section>

      <footer>
        <strong>
          KAKO<span>BUY</span>
        </strong>

        <p>
          PAYMENT ADMIN CONTROL CENTER
        </p>
      </footer>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .admin-page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at 10% 10%,
              rgba(255, 30, 30, 0.13),
              transparent 30%
            ),
            radial-gradient(
              circle at 90% 30%,
              rgba(255, 30, 30, 0.09),
              transparent 28%
            ),
            #070707;
          color: #fff;
          padding: 18px;
          font-family:
            Inter,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
          position: relative;
          overflow-x: hidden;
        }

        .glow {
          position: fixed;
          width: 280px;
          height: 280px;
          border-radius: 50%;
          background: rgba(255, 25, 25, 0.07);
          filter: blur(70px);
          pointer-events: none;
          z-index: 0;
        }

        .glow-one {
          top: 10%;
          left: -150px;
        }

        .glow-two {
          right: -150px;
          top: 55%;
        }

        .topbar,
        .dashboard-heading,
        .submission-section,
        .settings-section,
        footer {
          position: relative;
          z-index: 1;
          max-width: 1100px;
          margin-left: auto;
          margin-right: auto;
        }

        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 8px 0 25px;
          border-bottom: 1px solid #191919;
        }

        .brand {
          font-size: 27px;
          font-weight: 950;
          letter-spacing: -0.05em;
        }

        .brand span,
        footer span {
          color: #ff3030;
        }

        .admin-label {
          margin: 3px 0 0;
          color: #666;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.15em;
        }

        .top-actions {
          display: flex;
          gap: 7px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .top-actions a,
        .refresh-button {
          border: 1px solid #292929;
          background: #111;
          color: #aaa;
          padding: 9px 11px;
          border-radius: 9px;
          font-size: 9px;
          font-weight: 900;
          text-decoration: none;
          cursor: pointer;
        }

        .top-actions a:hover,
        .refresh-button:hover {
          color: #fff;
          border-color: #ff3030;
        }

        .dashboard-heading {
          padding: 42px 0 35px;
          display: flex;
          justify-content: space-between;
          gap: 20px;
          align-items: flex-start;
        }

        .eyebrow {
          color: #ff4444;
          font-size: 9px;
          font-weight: 950;
          letter-spacing: 0.16em;
          margin: 0 0 8px;
        }

        h1 {
          font-size: clamp(35px, 8vw, 62px);
          line-height: 0.95;
          letter-spacing: -0.06em;
          margin: 0;
          animation: slideUp 0.7s ease both;
        }

        h1 span {
          color: #ff3030;
        }

        .heading-text {
          max-width: 550px;
          color: #777;
          line-height: 1.6;
          font-size: 12px;
          margin: 14px 0 0;
        }

        .live-badge {
          border: 1px solid rgba(255, 48, 48, 0.25);
          background: rgba(255, 48, 48, 0.07);
          color: #ff5555;
          padding: 9px 12px;
          border-radius: 99px;
          font-size: 9px;
          font-weight: 900;
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .live-badge span {
          width: 7px;
          height: 7px;
          background: #ff3030;
          border-radius: 50%;
          box-shadow: 0 0 12px #ff3030;
          animation: pulse 1.4s infinite;
        }

        .section-title-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 15px;
          margin-bottom: 17px;
        }

        h2 {
          font-size: 25px;
          letter-spacing: -0.04em;
          margin: 0;
        }

        .submission-count {
          color: #ff5555;
          font-size: 9px;
          font-weight: 900;
          border: 1px solid #352020;
          background: #130909;
          padding: 8px 10px;
          border-radius: 8px;
        }

        .orders-grid {
          display: grid;
          grid-template-columns: repeat(
            auto-fit,
            minmax(250px, 1fr)
          );
          gap: 12px;
        }

        .order-card {
          text-align: left;
          border: 1px solid #252525;
          border-radius: 15px;
          padding: 17px;
          background: rgba(15, 15, 15, 0.9);
          color: #fff;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .order-card:hover {
          transform: translateY(-3px);
          border-color: rgba(255, 48, 48, 0.5);
          box-shadow:
            0 12px 35px
            rgba(255, 30, 30, 0.09);
        }

        .order-card-top {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 18px;
        }

        .order-id {
          color: #ff4444;
          font-size: 11px;
          font-weight: 950;
        }

        .status {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 99px;
          padding: 5px 8px;
          font-size: 8px;
          font-weight: 950;
        }

        .status.pending {
          background: rgba(255, 174, 0, 0.1);
          border: 1px solid rgba(255, 174, 0, 0.3);
          color: #ffc04d;
        }

        .status.confirmed {
          background: rgba(30, 220, 120, 0.1);
          border: 1px solid rgba(30, 220, 120, 0.3);
          color: #55e59a;
        }

        .status.failed {
          background: rgba(255, 48, 48, 0.1);
          border: 1px solid rgba(255, 48, 48, 0.35);
          color: #ff6969;
        }

        .order-card h3 {
          margin: 0 0 5px;
          font-size: 15px;
        }

        .customer-email {
          color: #666;
          font-size: 10px;
          margin: 0 0 17px;
          word-break: break-word;
        }

        .order-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .order-info div {
          background: #0a0a0a;
          border: 1px solid #1d1d1d;
          border-radius: 9px;
          padding: 9px;
        }

        .order-info span,
        .customer-box span,
        .review-details span {
          display: block;
          color: #555;
          font-size: 7px;
          font-weight: 900;
          letter-spacing: 0.1em;
          margin-bottom: 4px;
        }

        .order-info strong {
          font-size: 10px;
        }

        .submitted {
          color: #555;
          font-size: 8px;
          margin-top: 13px;
        }

        .empty-card,
        .settings-card {
          background: rgba(14, 14, 14, 0.92);
          border: 1px solid #222;
          border-radius: 17px;
          padding: 25px;
        }

        .empty-card {
          text-align: center;
          color: #666;
        }

        .empty-icon {
          margin: 0 auto 10px;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          color: #55e59a;
          background: rgba(30, 220, 120, 0.08);
          border: 1px solid rgba(30, 220, 120, 0.2);
        }

        .empty-card strong {
          display: block;
          color: #ddd;
          font-size: 13px;
        }

        .empty-card p {
          max-width: 450px;
          margin: 8px auto 0;
          line-height: 1.6;
          font-size: 10px;
        }

        .settings-section {
          margin-top: 55px;
        }

        .method-tabs {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          margin-bottom: 12px;
        }

        .method-tab {
          border: 1px solid #242424;
          background: #101010;
          color: #777;
          border-radius: 12px;
          padding: 13px 8px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          gap: 4px;
          align-items: center;
          transition: 0.2s ease;
        }

        .method-tab strong {
          color: #aaa;
          font-size: 18px;
        }

        .method-tab span {
          font-size: 8px;
          font-weight: 900;
        }

        .method-tab.active {
          color: #fff;
          border-color: #ff3030;
          background: rgba(255, 48, 48, 0.09);
          box-shadow:
            0 0 25px
            rgba(255, 48, 48, 0.1);
        }

        .method-tab.active strong {
          color: #ff4040;
        }

        .selected-method {
          border-bottom: 1px solid #202020;
          padding-bottom: 17px;
          margin-bottom: 20px;
        }

        .selected-method span {
          display: block;
          color: #555;
          font-size: 8px;
          font-weight: 900;
          margin-bottom: 5px;
        }

        .selected-method strong {
          font-size: 18px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }

        .field.full {
          grid-column: 1 / -1;
        }

        .field label {
          display: block;
          color: #888;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.1em;
          margin-bottom: 7px;
        }

        input,
        textarea {
          width: 100%;
          border: 1px solid #292929;
          background: #080808;
          color: #fff;
          border-radius: 10px;
          outline: none;
          padding: 13px;
          font: inherit;
          font-size: 12px;
        }

        textarea {
          min-height: 100px;
          resize: vertical;
          line-height: 1.5;
        }

        input:focus,
        textarea:focus {
          border-color: #ff3030;
          box-shadow:
            0 0 0 2px
            rgba(255, 48, 48, 0.08);
        }

        .qr-section {
          margin-top: 22px;
          border-top: 1px solid #202020;
          padding-top: 22px;
        }

        .qr-title {
          margin: 0;
          font-size: 11px;
          font-weight: 950;
        }

        .qr-description {
          margin: 5px 0 15px;
          color: #666;
          font-size: 9px;
        }

        .qr-content {
          display: flex;
          align-items: center;
          gap: 15px;
          flex-wrap: wrap;
        }

        .qr-preview,
        .qr-empty {
          width: 130px;
          height: 130px;
          border-radius: 12px;
          background: #080808;
          border: 1px solid #292929;
          display: grid;
          place-items: center;
          overflow: hidden;
        }

        .qr-preview img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .qr-empty {
          color: #444;
          font-size: 8px;
          font-weight: 900;
        }

        .upload-qr {
          border: 1px solid #333;
          background: #161616;
          color: #ddd;
          padding: 12px 15px;
          border-radius: 10px;
          font-size: 9px;
          font-weight: 900;
          cursor: pointer;
        }

        .upload-qr:hover {
          border-color: #ff3030;
        }

        .upload-qr input {
          display: none;
        }

        .settings-success,
        .settings-error,
        .success-message {
          margin-top: 15px;
          padding: 11px;
          border-radius: 9px;
          font-size: 10px;
        }

        .settings-success,
        .success-message {
          color: #65e9a0;
          background: rgba(30, 220, 120, 0.07);
          border: 1px solid rgba(30, 220, 120, 0.2);
        }

        .settings-error {
          color: #ff7777;
          background: rgba(255, 48, 48, 0.07);
          border: 1px solid rgba(255, 48, 48, 0.2);
        }

        .save-button {
          width: 100%;
          margin-top: 18px;
          border: 0;
          border-radius: 11px;
          min-height: 50px;
          background: #ff3030;
          color: #fff;
          font-size: 10px;
          font-weight: 950;
          cursor: pointer;
          box-shadow:
            0 10px 30px
            rgba(255, 48, 48, 0.14);
        }

        .save-button:hover {
          background: #ff4545;
        }

        .save-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .loading-settings {
          color: #666;
          text-align: center;
          padding: 30px;
          font-size: 11px;
        }

        .modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 100;
          background: rgba(0, 0, 0, 0.82);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          animation: fadeIn 0.2s ease;
        }

        .order-modal {
          width: 100%;
          max-width: 650px;
          max-height: 92vh;
          overflow-y: auto;
          position: relative;
          background: #0e0e0e;
          border: 1px solid #2d2d2d;
          border-radius: 19px;
          padding: 22px;
          box-shadow:
            0 0 70px
            rgba(255, 30, 30, 0.13);
          animation: popup 0.25s ease;
        }

        .close-button {
          position: absolute;
          right: 15px;
          top: 15px;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          border: 1px solid #292929;
          background: #151515;
          color: #aaa;
          font-size: 21px;
          cursor: pointer;
        }

        .close-button:hover {
          color: #fff;
          border-color: #ff3030;
        }

        .order-modal h2 {
          margin-right: 45px;
          margin-bottom: 13px;
        }

        .review-status {
          margin-bottom: 18px;
        }

        .status.large {
          padding: 8px 12px;
          font-size: 9px;
        }

        .customer-box {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .customer-box > div,
        .review-details > div {
          background: #090909;
          border: 1px solid #202020;
          border-radius: 10px;
          padding: 11px;
        }

        .customer-box strong,
        .review-details strong {
          display: block;
          font-size: 10px;
          word-break: break-word;
        }

        .screenshot-box {
          margin-top: 15px;
          background: #090909;
          border: 1px solid #202020;
          border-radius: 12px;
          padding: 13px;
        }

        .box-heading p {
          margin: 0;
          font-size: 9px;
          font-weight: 950;
        }

        .box-heading span {
          color: #555;
          font-size: 8px;
        }

        .image-link {
          display: block;
          margin-top: 12px;
          position: relative;
          border-radius: 10px;
          overflow: hidden;
          background: #000;
          text-decoration: none;
        }

        .image-link img {
          display: block;
          width: 100%;
          max-height: 360px;
          object-fit: contain;
        }

        .image-link span {
          position: absolute;
          bottom: 9px;
          right: 9px;
          background: rgba(0, 0, 0, 0.85);
          color: #fff;
          padding: 7px 9px;
          border-radius: 7px;
          font-size: 7px;
          font-weight: 900;
        }

        .no-image {
          margin-top: 12px;
          padding: 25px;
          text-align: center;
          color: #555;
          font-size: 9px;
          border: 1px dashed #292929;
          border-radius: 9px;
        }

        .review-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-top: 8px;
        }

        .status-control {
          margin-top: 18px;
          border-top: 1px solid #222;
          padding-top: 18px;
        }

        .status-control h3 {
          margin: 0 0 5px;
          font-size: 14px;
        }

        .status-control > p:not(.eyebrow) {
          color: #666;
          font-size: 9px;
          line-height: 1.5;
          margin: 0;
        }

        .status-buttons {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-top: 13px;
        }

        .status-buttons button {
          min-height: 45px;
          border-radius: 9px;
          cursor: pointer;
          font-size: 8px;
          font-weight: 950;
        }

        .status-buttons button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .pending-button {
          border: 1px solid #705b20;
          background: rgba(255, 174, 0, 0.08);
          color: #ffc04d;
        }

        .confirmed-button {
          border: 1px solid #237047;
          background: rgba(30, 220, 120, 0.08);
          color: #55e59a;
        }

        .failed-button {
          border: 1px solid #702323;
          background: rgba(255, 48, 48, 0.08);
          color: #ff6969;
        }

        footer {
          text-align: center;
          padding: 55px 0 25px;
          color: #444;
        }

        footer strong {
          font-size: 20px;
          font-weight: 950;
        }

        footer p {
          font-size: 7px;
          font-weight: 900;
          letter-spacing: 0.14em;
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

        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.45;
            transform: scale(0.75);
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

        @keyframes popup {
          from {
            opacity: 0;
            transform: translateY(18px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @media (max-width: 650px) {
          .admin-page {
            padding: 13px;
          }

          .topbar {
            align-items: flex-start;
            flex-direction: column;
          }

          .top-actions {
            width: 100%;
            justify-content: flex-start;
          }

          .dashboard-heading {
            padding-top: 32px;
          }

          .dashboard-heading {
            flex-direction: column;
          }

          .method-tabs {
            grid-template-columns: 1fr 1fr;
          }

          .form-grid {
            grid-template-columns: 1fr;
          }

          .field.full {
            grid-column: auto;
          }

          .customer-box,
          .review-details {
            grid-template-columns: 1fr;
          }

          .status-buttons {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  )
}
