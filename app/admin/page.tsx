"use client"

import {
  useEffect,
  useState,
  type ChangeEvent,
} from "react"

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

type WaitingOrder = {
  id: number
  full_name: string
  email: string
  phone?: string
  total: number | string
  payment_status: string
  payment_method?: string
  transaction_image?: string
  transaction_submitted?: boolean
  transaction_submitted_at?: string
  wallet_copied?: boolean
  wallet_copied_at?: string
  created_at?: string
}

type PaymentMethod = {
  id: string
  name: string
  information: string
  wallet_address: string
  qr_image_url: string
  hero_heading: string
  hero_subtitle: string
  footer_text: string
}

export default function AdminPage() {
  const [authorized, setAuthorized] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)

  const [selectedMethod, setSelectedMethod] =
    useState("bitcoin")

  const [methods, setMethods] =
    useState<Record<string, PaymentMethod>>({})

  const [waitingOrders, setWaitingOrders] =
    useState<WaitingOrder[]>([])

  const [loadingOrders, setLoadingOrders] =
    useState(false)

  const [savingMethod, setSavingMethod] =
    useState(false)

  const [message, setMessage] =
    useState("")

  const [qrFile, setQrFile] =
    useState<File | null>(null)

  /* =========================
     GLOBAL LOGO
  ========================= */

  const [logoPreview, setLogoPreview] =
    useState("")

  const [logoFile, setLogoFile] =
    useState<File | null>(null)

  const [loadingLogo, setLoadingLogo] =
    useState(false)

  const [savingLogo, setSavingLogo] =
    useState(false)

  const [logoMessage, setLogoMessage] =
    useState("")

  /* =========================
     AUTH
  ========================= */

  useEffect(() => {
    async function checkAdmin() {
      try {
        const response =
          await fetch("/api/admin-check", {
            cache: "no-store",
          })

        if (!response.ok) {
          setAuthorized(false)
          setCheckingAuth(false)
          return
        }

        const data = await response.json()

        if (!data.authenticated) {
          setAuthorized(false)
          setCheckingAuth(false)
          return
        }

        setAuthorized(true)

        // Load the shared Kakobuy logo
        await loadLogo()

        setCheckingAuth(false)
      } catch (error) {
        console.error(
          "Authentication check failed:",
          error
        )

        setAuthorized(false)
        setCheckingAuth(false)
      }
    }

    checkAdmin()
  }, [])

  /* =========================
     LOAD GLOBAL LOGO
  ========================= */

  async function loadLogo() {
    try {
      setLoadingLogo(true)

      const response =
        await fetch("/api/site-settings", {
          cache: "no-store",
        })

      const data = await response.json()

      if (data.success) {
        setLogoPreview(data.logo_url || "")
      }
    } catch (error) {
      console.error(
        "Unable to load logo:",
        error
      )
    } finally {
      setLoadingLogo(false)
    }
  }

  /* =========================
     LOGO FILE CHANGE
  ========================= */

  function handleLogoChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0]

    if (!file) return

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ]

    if (!allowedTypes.includes(file.type)) {
      setLogoMessage(
        "Logo must be JPG, PNG, or WEBP."
      )
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setLogoMessage(
        "Logo must be smaller than 5MB."
      )
      return
    }

    setLogoFile(file)
    setLogoMessage("")

    const previewUrl =
      URL.createObjectURL(file)

    setLogoPreview(previewUrl)
  }

  /* =========================
     SAVE GLOBAL LOGO
  ========================= */

  async function saveLogo() {
    if (!logoFile) {
      setLogoMessage(
        "Please select a new logo first."
      )
      return
    }

    try {
      setSavingLogo(true)
      setLogoMessage("")

      const formData = new FormData()

      formData.append("logo", logoFile)

      const response =
        await fetch("/api/site-settings", {
          method: "PUT",
          body: formData,
        })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Unable to save logo."
        )
      }

      setLogoPreview(data.logo_url || "")
      setLogoFile(null)

      setLogoMessage(
        "Kakobuy logo saved successfully."
      )
    } catch (error) {
      console.error(
        "Save logo error:",
        error
      )

      setLogoMessage(
        error instanceof Error
          ? error.message
          : "Unable to save logo."
      )
    } finally {
      setSavingLogo(false)
    }
  }

  /* =========================
     LOAD PAYMENT SETTINGS
  ========================= */

  async function loadPaymentMethod(
    methodId: string
  ) {
    try {
      const response =
        await fetch(
          `/api/payment-methods?id=${encodeURIComponent(
            methodId
          )}`,
          {
            cache: "no-store",
          }
        )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Unable to load payment settings."
        )
      }

      const paymentMethod =
        data.method || data.paymentMethod

      if (paymentMethod) {
        setMethods((previous) => ({
          ...previous,
          [methodId]: paymentMethod,
        }))
      }
    } catch (error) {
      console.error(
        "Load payment method error:",
        error
      )
    }
  }

  useEffect(() => {
    if (!authorized) return

    METHODS.forEach((method) => {
      loadPaymentMethod(method.id)
    })
  }, [authorized])

  /* =========================
     CURRENT METHOD
  ========================= */

  const currentMethod =
    methods[selectedMethod] || {
      id: selectedMethod,
      name:
        METHODS.find(
          (method) =>
            method.id === selectedMethod
        )?.name || selectedMethod,
      information: "",
      wallet_address: "",
      qr_image_url: "",
      hero_heading: "",
      hero_subtitle: "",
      footer_text: "",
    }

  function updateCurrentMethod(
    field: keyof PaymentMethod,
    value: string
  ) {
    setMethods((previous) => ({
      ...previous,
      [selectedMethod]: {
        ...currentMethod,
        [field]: value,
      },
    }))
  }

  /* =========================
     QR CHANGE
  ========================= */

  function handleQrChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0]

    if (!file) return

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ]

    if (!allowedTypes.includes(file.type)) {
      setMessage(
        "QR code must be JPG, PNG, or WEBP."
      )
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage(
        "QR code must be smaller than 5MB."
      )
      return
    }

    setQrFile(file)
    setMessage("")
  }

  /* =========================
     SAVE PAYMENT SETTINGS
  ========================= */

  async function savePaymentMethod() {
    try {
      setSavingMethod(true)
      setMessage("")

      const formData = new FormData()

      formData.append(
        "id",
        selectedMethod
      )

      formData.append(
        "information",
        currentMethod.information || ""
      )

      formData.append(
        "wallet_address",
        currentMethod.wallet_address || ""
      )

      formData.append(
        "hero_heading",
        currentMethod.hero_heading || ""
      )

      formData.append(
        "hero_subtitle",
        currentMethod.hero_subtitle || ""
      )

      formData.append(
        "footer_text",
        currentMethod.footer_text || ""
      )

      if (qrFile) {
        formData.append(
          "qr",
          qrFile
        )
      }

      const response =
        await fetch("/api/payment-methods", {
          method: "PUT",
          body: formData,
        })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Unable to save changes."
        )
      }

      setQrFile(null)

      await loadPaymentMethod(
        selectedMethod
      )

      setMessage(
        `${currentMethod.name} settings saved successfully.`
      )
    } catch (error) {
      console.error(
        "Save payment method error:",
        error
      )

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to save changes."
      )
    } finally {
      setSavingMethod(false)
    }
  }

  /* =========================
     LOAD WAITING ORDERS
  ========================= */

  async function loadWaitingOrders() {
    try {
      setLoadingOrders(true)

      const response =
        await fetch("/api/payment-status", {
          cache: "no-store",
        })

      if (!response.ok) return

      const data = await response.json()

      if (data.success) {
        setWaitingOrders(
          data.orders || []
        )
      }
    } catch (error) {
      console.error(
        "Load waiting orders error:",
        error
      )
    } finally {
      setLoadingOrders(false)
    }
  }

  useEffect(() => {
    if (!authorized) return

    loadWaitingOrders()

    const interval =
      setInterval(
        loadWaitingOrders,
        3000
      )

    return () =>
      clearInterval(interval)
  }, [authorized])

  /* =========================
     UPDATE ORDER STATUS
  ========================= */

  async function updateOrderStatus(
    orderId: number,
    status:
      | "pending"
      | "confirmed"
      | "failed"
  ) {
    try {
      const response =
        await fetch("/api/payment-status", {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            orderId,
            status,
          }),
        })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Unable to update payment status."
        )
      }

      await loadWaitingOrders()
    } catch (error) {
      console.error(
        "Update status error:",
        error
      )

      alert(
        error instanceof Error
          ? error.message
          : "Unable to update payment status."
      )
    }
  }

  /* =========================
     LOGOUT
  ========================= */

  async function logout() {
    try {
      await fetch(
        "/api/admin-logout",
        {
          method: "POST",
        }
      )
    } catch {
      // Continue with redirect
    }

    window.location.href = "/"
  }

  /* =========================
     LOADING SCREEN
  ========================= */

  if (checkingAuth) {
    return (
      <main className="loading-screen">
        <div className="loading-glow" />

        {logoPreview ? (
          <img
            src={logoPreview}
            alt="Kakobuy"
            className="loading-logo"
          />
        ) : (
          <div className="loading-brand">
            KAKO<span>BUY</span>
          </div>
        )}

        <div className="loading-spinner" />

        <p>Checking administrator access...</p>

        <style jsx>{`
          .loading-screen {
            min-height: 100vh;
            background:
              radial-gradient(
                circle at 50% 40%,
                rgba(255, 0, 0, 0.18),
                transparent 35%
              ),
              #050505;
            color: white;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            position: relative;
            overflow: hidden;
          }

          .loading-glow {
            position: absolute;
            width: 280px;
            height: 280px;
            background: rgba(255, 0, 0, 0.12);
            filter: blur(80px);
            border-radius: 50%;
            animation: pulse 2s infinite;
          }

          .loading-logo {
            width: 130px;
            height: 130px;
            object-fit: contain;
            border-radius: 24px;
            position: relative;
            z-index: 2;
            animation: logoFloat 2s ease-in-out infinite;
          }

          .loading-brand {
            font-size: 42px;
            font-weight: 900;
            letter-spacing: -3px;
            position: relative;
            z-index: 2;
          }

          .loading-brand span {
            color: #ff2020;
          }

          .loading-spinner {
            width: 34px;
            height: 34px;
            border: 3px solid rgba(255, 255, 255, 0.15);
            border-top-color: #ff2020;
            border-radius: 50%;
            margin-top: 28px;
            animation: spin 0.8s linear infinite;
            position: relative;
            z-index: 2;
          }

          p {
            color: #999;
            margin-top: 14px;
            font-size: 13px;
            position: relative;
            z-index: 2;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }

          @keyframes pulse {
            50% {
              transform: scale(1.2);
              opacity: 0.6;
            }
          }

          @keyframes logoFloat {
            50% {
              transform: translateY(-7px);
            }
          }
        `}</style>
      </main>
    )
  }

  if (!authorized) {
    return (
      <main className="unauthorized">
        <div className="unauthorized-card">
          <div className="unauthorized-brand">
            {logoPreview ? (
              <img
                src={logoPreview}
                alt="Kakobuy"
              />
            ) : (
              <>
                KAKO<span>BUY</span>
              </>
            )}
          </div>

          <h1>Administrator Access</h1>

          <p>
            You are not authorized to view
            this page.
          </p>

          <button
            onClick={() =>
              (window.location.href = "/")
            }
          >
            Go Back
          </button>
        </div>

        <style jsx>{`
          .unauthorized {
            min-height: 100vh;
            background: #050505;
            color: white;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
          }

          .unauthorized-card {
            width: 100%;
            max-width: 420px;
            background: #111;
            border: 1px solid #292929;
            border-radius: 24px;
            padding: 35px;
            text-align: center;
            box-shadow: 0 0 60px rgba(255, 0, 0, 0.1);
          }

          .unauthorized-brand {
            margin-bottom: 25px;
            font-size: 30px;
            font-weight: 900;
          }

          .unauthorized-brand img {
            width: 90px;
            height: 90px;
            object-fit: contain;
          }

          .unauthorized-brand span {
            color: #ff2020;
          }

          h1 {
            margin: 0 0 10px;
          }

          p {
            color: #999;
          }

          button {
            margin-top: 20px;
            border: 0;
            border-radius: 12px;
            padding: 13px 20px;
            background: #ff2020;
            color: white;
            font-weight: 800;
            cursor: pointer;
          }
        `}</style>
      </main>
    )
  }

  return (
    <main className="page">
      <div className="background-orb orb-one" />
      <div className="background-orb orb-two" />

      {/* =========================
          TOP BAR
      ========================= */}

      <header className="topbar">
        <div className="brand">
          {logoPreview ? (
            <img
              src={logoPreview}
              alt="Kakobuy"
              className="brand-logo"
            />
          ) : (
            <div className="brand-text">
              KAKO<span>BUY</span>
            </div>
          )}

          <div className="admin-label">
            ADMIN
          </div>
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

          <button onClick={logout}>
            LOGOUT
          </button>
        </div>
      </header>

      <div className="container">
        {/* =========================
            GLOBAL BRAND CONTROL
        ========================= */}

        <section className="card brand-card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">
                GLOBAL BRAND CONTROL
              </span>

              <h1>Kakobuy Logo</h1>

              <p>
                Change the logo used across
                the Kakobuy pages.
              </p>
            </div>
          </div>

          <div className="logo-editor">
            <div className="logo-preview-box">
              {loadingLogo ? (
                <div className="preview-loading">
                  Loading...
                </div>
              ) : logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Kakobuy logo preview"
                  className="logo-preview"
                />
              ) : (
                <div className="preview-placeholder">
                  KAKO<span>BUY</span>
                </div>
              )}
            </div>

            <div className="logo-controls">
              <label className="file-button">
                Choose New Logo
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleLogoChange}
                />
              </label>

              <button
                className="save-button"
                onClick={saveLogo}
                disabled={
                  savingLogo || !logoFile
                }
              >
                {savingLogo
                  ? "SAVING..."
                  : "SAVE LOGO"}
              </button>

              <p className="hint">
                JPG, PNG or WEBP. Maximum
                size: 5MB.
              </p>

              {logoMessage && (
                <div className="success-message">
                  {logoMessage}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* =========================
            PAYMENT SETTINGS
        ========================= */}

        <section className="card">
          <div className="section-heading">
            <div>
              <span className="eyebrow">
                PAGE 3 CONTROL
              </span>

              <h1>Payment Settings</h1>

              <p>
                Manage the information buyers
                see for each cryptocurrency.
              </p>
            </div>
          </div>

          <div className="method-tabs">
            {METHODS.map((method) => (
              <button
                key={method.id}
                className={
                  selectedMethod ===
                  method.id
                    ? "method-tab active"
                    : "method-tab"
                }
                onClick={() => {
                  setSelectedMethod(
                    method.id
                  )
                  setQrFile(null)
                  setMessage("")
                }}
              >
                <span>
                  {method.symbol}
                </span>

                {method.name}
              </button>
            ))}
          </div>

          <div className="settings-grid">
            <div className="field full">
              <label>
                Hero Heading
              </label>

              <input
                value={
                  currentMethod.hero_heading
                }
                onChange={(event) =>
                  updateCurrentMethod(
                    "hero_heading",
                    event.target.value
                  )
                }
                placeholder="Complete Your Payment"
              />
            </div>

            <div className="field full">
              <label>
                Hero Subtitle
              </label>

              <textarea
                value={
                  currentMethod.hero_subtitle
                }
                onChange={(event) =>
                  updateCurrentMethod(
                    "hero_subtitle",
                    event.target.value
                  )
                }
                placeholder="Send your payment using the selected cryptocurrency."
              />
            </div>

            <div className="field full">
              <label>
                Payment Information
              </label>

              <textarea
                value={
                  currentMethod.information
                }
                onChange={(event) =>
                  updateCurrentMethod(
                    "information",
                    event.target.value
                  )
                }
                placeholder="Payment instructions..."
              />
            </div>

            <div className="field full">
              <label>
                Wallet Address
              </label>

              <textarea
                value={
                  currentMethod.wallet_address
                }
                onChange={(event) =>
                  updateCurrentMethod(
                    "wallet_address",
                    event.target.value
                  )
                }
                placeholder="Enter wallet address"
              />
            </div>

            <div className="field full">
              <label>
                QR Code
              </label>

              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleQrChange}
              />

              <p className="hint">
                JPG, PNG or WEBP. Maximum
                size: 5MB.
              </p>

              {currentMethod.qr_image_url && (
                <div className="qr-preview">
                  <img
                    src={
                      currentMethod.qr_image_url
                    }
                    alt={`${currentMethod.name} QR code`}
                  />
                </div>
              )}
            </div>

            <div className="field full">
              <label>
                Footer Text
              </label>

              <textarea
                value={
                  currentMethod.footer_text
                }
                onChange={(event) =>
                  updateCurrentMethod(
                    "footer_text",
                    event.target.value
                  )
                }
                placeholder="Kakobuy"
              />
            </div>
          </div>

          {message && (
            <div className="save-message">
              {message}
            </div>
          )}

          <button
            className="main-save"
            onClick={savePaymentMethod}
            disabled={savingMethod}
          >
            {savingMethod
              ? "SAVING..."
              : `SAVE ${currentMethod.name.toUpperCase()} SETTINGS`}
          </button>
        </section>

        {/* =========================
            PAYMENT QUEUE
        ========================= */}

        <section className="card">
          <div className="section-heading queue-heading">
            <div>
              <span className="eyebrow">
                LIVE PAYMENT QUEUE
              </span>

              <h1>Waiting for Confirmation</h1>

              <p>
                Buyer payment submissions
                appear here automatically.
              </p>
            </div>

            <div className="queue-count">
              {waitingOrders.length}
            </div>
          </div>

          {loadingOrders &&
          waitingOrders.length === 0 ? (
            <div className="empty-state">
              Loading payment submissions...
            </div>
          ) : waitingOrders.length === 0 ? (
            <div className="empty-state">
              No payment submissions waiting
              for confirmation.
            </div>
          ) : (
            <div className="orders">
              {waitingOrders.map(
                (order) => (
                  <div
                    className="order-card"
                    key={order.id}
                  >
                    <div className="order-top">
                      <div>
                        <div className="order-id">
                          ORDER #{order.id}
                        </div>

                        <h2>
                          {order.full_name ||
                            "Customer"}
                        </h2>

                        <p>
                          {order.email}
                        </p>
                      </div>

                      <div className="amount">
                        $
                        {Number(
                          order.total || 0
                        ).toFixed(2)}
                      </div>
                    </div>

                    <div className="order-info">
                      <div>
                        <span>
                          METHOD
                        </span>

                        <strong>
                          {order.payment_method ||
                            "Not selected"}
                        </strong>
                      </div>

                      <div>
                        <span>
                          WALLET
                        </span>

                        <strong>
                          {order.wallet_copied
                            ? "COPIED"
                            : "NOT COPIED"}
                        </strong>
                      </div>

                      <div>
                        <span>
                          SUBMITTED
                        </span>

                        <strong>
                          {order.transaction_submitted
                            ? "YES"
                            : "NO"}
                        </strong>
                      </div>
                    </div>

                    {order.transaction_image && (
                      <div className="transaction-image">
                        <img
                          src={
                            order.transaction_image
                          }
                          alt="Payment transaction"
                        />

                        <a
                          href={
                            order.transaction_image
                          }
                          target="_blank"
                          rel="noreferrer"
                        >
                          VIEW FULL IMAGE
                        </a>
                      </div>
                    )}

                    <div className="status-actions">
                      <button
                        className="pending"
                        onClick={() =>
                          updateOrderStatus(
                            order.id,
                            "pending"
                          )
                        }
                      >
                        PENDING
                      </button>

                      <button
                        className="confirmed"
                        onClick={() =>
                          updateOrderStatus(
                            order.id,
                            "confirmed"
                          )
                        }
                      >
                        CONFIRMED
                      </button>

                      <button
                        className="failed"
                        onClick={() =>
                          updateOrderStatus(
                            order.id,
                            "failed"
                          )
                        }
                      >
                        FAILED
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </section>

        <footer>
          {logoPreview ? (
            <img
              src={logoPreview}
              alt="Kakobuy"
              className="footer-logo"
            />
          ) : (
            <div className="footer-brand">
              KAKO<span>BUY</span>
            </div>
          )}

          <p>
            Kakobuy Administrator Panel
          </p>
        </footer>
      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at 20% 10%,
              rgba(255, 0, 0, 0.11),
              transparent 30%
            ),
            radial-gradient(
              circle at 80% 40%,
              rgba(255, 0, 0, 0.08),
              transparent 32%
            ),
            #050505;
          color: white;
          padding-bottom: 50px;
          overflow: hidden;
          position: relative;
        }

        .background-orb {
          position: fixed;
          border-radius: 50%;
          filter: blur(90px);
          pointer-events: none;
          opacity: 0.2;
        }

        .orb-one {
          width: 300px;
          height: 300px;
          background: #ff0000;
          top: 5%;
          left: -150px;
          animation: orbMove 8s ease-in-out infinite;
        }

        .orb-two {
          width: 260px;
          height: 260px;
          background: #ff0000;
          right: -130px;
          top: 45%;
          animation: orbMove 10s ease-in-out infinite reverse;
        }

        .topbar {
          position: sticky;
          top: 0;
          z-index: 50;
          min-height: 72px;
          padding: 12px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          background: rgba(5, 5, 5, 0.88);
          backdrop-filter: blur(18px);
          border-bottom: 1px solid #222;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .brand-logo {
          width: 44px;
          height: 44px;
          object-fit: contain;
          border-radius: 10px;
        }

        .brand-text {
          font-size: 24px;
          font-weight: 950;
          letter-spacing: -2px;
        }

        .brand-text span,
        .footer-brand span {
          color: #ff2020;
        }

        .admin-label {
          font-size: 9px;
          font-weight: 900;
          color: #ff3030;
          border: 1px solid rgba(255, 32, 32, 0.4);
          padding: 4px 7px;
          border-radius: 5px;
        }

        .top-actions {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .top-actions a,
        .top-actions button {
          text-decoration: none;
          color: #ddd;
          background: #111;
          border: 1px solid #292929;
          border-radius: 8px;
          padding: 9px 10px;
          font-size: 9px;
          font-weight: 900;
          cursor: pointer;
        }

        .top-actions a:hover,
        .top-actions button:hover {
          border-color: #ff2020;
          color: white;
        }

        .container {
          width: min(100% - 28px, 1050px);
          margin: 0 auto;
          position: relative;
          z-index: 2;
        }

        .card {
          margin-top: 25px;
          background: rgba(15, 15, 15, 0.9);
          border: 1px solid #252525;
          border-radius: 22px;
          padding: 22px;
          box-shadow:
            0 25px 80px rgba(0, 0, 0, 0.35),
            inset 0 1px rgba(255, 255, 255, 0.025);
        }

        .brand-card {
          border-color: rgba(255, 32, 32, 0.25);
        }

        .section-heading {
          margin-bottom: 20px;
        }

        .section-heading h1 {
          font-size: clamp(25px, 5vw, 38px);
          margin: 5px 0;
          letter-spacing: -1.5px;
        }

        .section-heading p {
          color: #888;
          margin: 0;
          line-height: 1.5;
          font-size: 13px;
        }

        .eyebrow {
          color: #ff3030;
          font-size: 9px;
          font-weight: 950;
          letter-spacing: 1.8px;
        }

        .logo-editor {
          display: grid;
          grid-template-columns: 190px 1fr;
          gap: 22px;
          align-items: center;
        }

        .logo-preview-box {
          width: 190px;
          height: 190px;
          border-radius: 22px;
          border: 1px dashed #444;
          background: #090909;
          display: flex;
          justify-content: center;
          align-items: center;
          overflow: hidden;
        }

        .logo-preview {
          width: 100%;
          height: 100%;
          object-fit: contain;
          padding: 15px;
        }

        .preview-placeholder {
          font-size: 28px;
          font-weight: 950;
          letter-spacing: -2px;
        }

        .preview-placeholder span {
          color: #ff2020;
        }

        .preview-loading {
          color: #777;
          font-size: 12px;
        }

        .logo-controls {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 12px;
        }

        .file-button,
        .save-button {
          display: inline-flex;
          justify-content: center;
          align-items: center;
          min-height: 45px;
          padding: 0 17px;
          border-radius: 11px;
          font-weight: 900;
          font-size: 11px;
          cursor: pointer;
        }

        .file-button {
          background: #191919;
          border: 1px solid #383838;
          color: white;
        }

        .file-button input {
          display: none;
        }

        .save-button {
          border: 0;
          background: #ff2020;
          color: white;
          box-shadow: 0 8px 30px rgba(255, 0, 0, 0.2);
        }

        .save-button:disabled,
        .main-save:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .hint {
          color: #666;
          font-size: 11px;
          margin: 0;
        }

        .success-message,
        .save-message {
          background: rgba(0, 180, 90, 0.1);
          border: 1px solid rgba(0, 200, 100, 0.25);
          color: #70e0a0;
          border-radius: 10px;
          padding: 11px 13px;
          font-size: 11px;
        }

        .method-tabs {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          margin-bottom: 20px;
        }

        .method-tab {
          border: 1px solid #282828;
          background: #0b0b0b;
          color: #888;
          border-radius: 12px;
          padding: 14px 8px;
          font-size: 11px;
          font-weight: 900;
          cursor: pointer;
          transition: 0.2s;
        }

        .method-tab span {
          display: block;
          color: #666;
          margin-bottom: 4px;
          font-size: 16px;
        }

        .method-tab.active {
          color: white;
          border-color: #ff2020;
          background: rgba(255, 32, 32, 0.1);
          box-shadow: 0 0 25px rgba(255, 0, 0, 0.08);
        }

        .method-tab.active span {
          color: #ff2020;
        }

        .settings-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .field.full {
          grid-column: 1 / -1;
        }

        .field label {
          font-size: 10px;
          font-weight: 900;
          color: #aaa;
          text-transform: uppercase;
          letter-spacing: 0.8px;
        }

        input,
        textarea {
          width: 100%;
          border: 1px solid #292929;
          background: #090909;
          color: white;
          border-radius: 11px;
          padding: 13px;
          outline: none;
          font: inherit;
          font-size: 13px;
        }

        input:focus,
        textarea:focus {
          border-color: #ff2020;
          box-shadow: 0 0 0 3px rgba(255, 0, 0, 0.06);
        }

        textarea {
          min-height: 100px;
          resize: vertical;
        }

        .qr-preview {
          margin-top: 8px;
          width: 160px;
          height: 160px;
          border-radius: 15px;
          overflow: hidden;
          background: white;
          padding: 8px;
        }

        .qr-preview img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .main-save {
          width: 100%;
          border: 0;
          border-radius: 12px;
          min-height: 50px;
          margin-top: 18px;
          background: #ff2020;
          color: white;
          font-weight: 950;
          cursor: pointer;
          box-shadow: 0 12px 35px rgba(255, 0, 0, 0.18);
        }

        .queue-heading {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          align-items: flex-start;
        }

        .queue-count {
          min-width: 45px;
          height: 45px;
          display: flex;
          justify-content: center;
          align-items: center;
          border-radius: 13px;
          background: rgba(255, 32, 32, 0.12);
          border: 1px solid rgba(255, 32, 32, 0.35);
          color: #ff3030;
          font-weight: 950;
        }

        .empty-state {
          text-align: center;
          padding: 50px 15px;
          color: #666;
          border: 1px dashed #292929;
          border-radius: 15px;
          font-size: 13px;
        }

        .orders {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .order-card {
          border: 1px solid #292929;
          border-radius: 17px;
          background: #0a0a0a;
          padding: 17px;
        }

        .order-top {
          display: flex;
          justify-content: space-between;
          gap: 15px;
        }

        .order-id {
          color: #ff3030;
          font-size: 9px;
          font-weight: 950;
          letter-spacing: 1px;
        }

        .order-card h2 {
          margin: 5px 0 2px;
          font-size: 18px;
        }

        .order-card p {
          margin: 0;
          color: #777;
          font-size: 12px;
        }

        .amount {
          color: #fff;
          font-size: 20px;
          font-weight: 950;
          white-space: nowrap;
        }

        .order-info {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-top: 16px;
        }

        .order-info > div {
          background: #111;
          border: 1px solid #202020;
          border-radius: 10px;
          padding: 10px;
        }

        .order-info span {
          display: block;
          color: #555;
          font-size: 8px;
          font-weight: 900;
          margin-bottom: 5px;
        }

        .order-info strong {
          font-size: 10px;
          color: #ddd;
        }

        .transaction-image {
          margin-top: 15px;
          padding: 12px;
          background: #111;
          border-radius: 13px;
          border: 1px solid #222;
        }

        .transaction-image img {
          width: 100%;
          max-height: 400px;
          object-fit: contain;
          border-radius: 9px;
          background: #000;
        }

        .transaction-image a {
          display: inline-block;
          margin-top: 10px;
          color: #ff3030;
          font-size: 10px;
          font-weight: 900;
          text-decoration: none;
        }

        .status-actions {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-top: 14px;
        }

        .status-actions button {
          min-height: 42px;
          border-radius: 10px;
          cursor: pointer;
          font-size: 10px;
          font-weight: 950;
          border: 1px solid;
          background: transparent;
        }

        .status-actions .pending {
          color: #e8b84b;
          border-color: rgba(232, 184, 75, 0.3);
        }

        .status-actions .confirmed {
          color: #5be09a;
          border-color: rgba(91, 224, 154, 0.3);
        }

        .status-actions .failed {
          color: #ff4444;
          border-color: rgba(255, 68, 68, 0.3);
        }

        .status-actions button:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        footer {
          text-align: center;
          padding: 35px 10px;
          color: #555;
          font-size: 11px;
        }

        .footer-logo {
          width: 55px;
          height: 55px;
          object-fit: contain;
          margin-bottom: 8px;
        }

        .footer-brand {
          font-size: 20px;
          font-weight: 950;
          letter-spacing: -1px;
          color: white;
        }

        @keyframes orbMove {
          0%,
          100% {
            transform: translate(0, 0);
          }

          50% {
            transform: translate(30px, 25px);
          }
        }

        @media (max-width: 700px) {
          .topbar {
            padding: 10px 12px;
          }

          .admin-label {
            display: none;
          }

          .brand-logo {
            width: 38px;
            height: 38px;
          }

          .brand-text {
            font-size: 20px;
          }

          .top-actions a,
          .top-actions button {
            padding: 8px 7px;
            font-size: 8px;
          }

          .container {
            width: min(100% - 18px, 1050px);
          }

          .card {
            padding: 16px;
            border-radius: 18px;
          }

          .logo-editor {
            grid-template-columns: 1fr;
          }

          .logo-preview-box {
            width: 150px;
            height: 150px;
          }

          .settings-grid {
            grid-template-columns: 1fr;
          }

          .field.full {
            grid-column: auto;
          }

          .method-tabs {
            grid-template-columns: repeat(2, 1fr);
          }

          .order-info {
            grid-template-columns: 1fr;
          }

          .order-top {
            flex-direction: column;
          }

          .amount {
            font-size: 18px;
          }
        }
      `}</style>
    </main>
  )
}
