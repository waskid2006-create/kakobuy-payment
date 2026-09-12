"use client"

import { ChangeEvent, useEffect, useState } from "react"

type PaymentMethod = {
  id: string
  name: string
  information: string
  wallet_address: string
  qr_image_url: string
}

type Order = {
  id: number | string
  product_name?: string
  full_name?: string
  email?: string
  total?: number | string
  payment_status?: string
  payment_method?: string
  transaction_image?: string
  created_at?: string
}

const COINS = [
  { id: "bitcoin", name: "Bitcoin", symbol: "₿" },
  { id: "ethereum", name: "Ethereum", symbol: "Ξ" },
  { id: "tron", name: "TRON", symbol: "TRX" },
  { id: "binance", name: "Binance", symbol: "BNB" },
]

const emptyMethod = (id: string, name: string): PaymentMethod => ({
  id,
  name,
  information: "",
  wallet_address: "",
  qr_image_url: "",
})

export default function AdminPage() {
  const [authorized, setAuthorized] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)

  const [logoUrl, setLogoUrl] = useState("")
  const [logoFile, setLogoFile] = useState<File | null>(null)

  const [selectedCoin, setSelectedCoin] = useState("bitcoin")

  const [methods, setMethods] = useState<Record<string, PaymentMethod>>({
    bitcoin: emptyMethod("bitcoin", "Bitcoin"),
    ethereum: emptyMethod("ethereum", "Ethereum"),
    tron: emptyMethod("tron", "TRON"),
    binance: emptyMethod("binance", "Binance"),
  })

  const [orders, setOrders] = useState<Order[]>([])

  const [loading, setLoading] = useState(true)
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingLogo, setSavingLogo] = useState(false)

  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const [previewImage, setPreviewImage] = useState("")
  const [updatingOrder, setUpdatingOrder] = useState<number | string | null>(null)

  const currentMethod =
    methods[selectedCoin] ||
    emptyMethod(
      selectedCoin,
      COINS.find((coin) => coin.id === selectedCoin)?.name || selectedCoin
    )

  useEffect(() => {
    checkAdmin()
  }, [])

  useEffect(() => {
    if (!authorized) return

    const timer = setInterval(() => {
      loadOrders()
    }, 5000)

    return () => clearInterval(timer)
  }, [authorized])

  async function checkAdmin() {
    try {
      const response = await fetch("/api/admin-check", {
        cache: "no-store",
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok || !data.authenticated) {
        setAuthorized(false)
        setCheckingAuth(false)
        return
      }

      setAuthorized(true)
      setCheckingAuth(false)

      await loadEverything()
    } catch {
      setAuthorized(false)
      setCheckingAuth(false)
    }
  }

  async function loadEverything() {
    setLoading(true)

    await Promise.all([
      loadLogo(),
      loadPaymentMethods(),
      loadOrders(),
    ])

    setLoading(false)
  }

  async function loadLogo() {
    try {
      const response = await fetch(
        "/api/site-settings",
        { cache: "no-store" }
      )

      if (!response.ok) return

      const data = await response.json()

      setLogoUrl(data?.logo_url || "")
    } catch (err) {
      console.error("Logo load error:", err)
    }
  }

  async function loadPaymentMethods() {
    const updated: Record<string, PaymentMethod> = {
      bitcoin: emptyMethod("bitcoin", "Bitcoin"),
      ethereum: emptyMethod("ethereum", "Ethereum"),
      tron: emptyMethod("tron", "TRON"),
      binance: emptyMethod("binance", "Binance"),
    }

    for (const coin of COINS) {
      try {
        const response = await fetch(
          `/api/payment-methods?id=${encodeURIComponent(coin.id)}`,
          { cache: "no-store" }
        )

        if (!response.ok) continue

        const data = await response.json()

        const source =
          data?.paymentMethod ||
          data?.method ||
          data?.data ||
          data

        if (!source) continue

        updated[coin.id] = {
          id: source.id || coin.id,
          name: source.name || coin.name,
          information: source.information || "",
          wallet_address:
            source.wallet_address ||
            source.walletAddress ||
            "",
          qr_image_url:
            source.qr_image_url ||
            source.qrImageUrl ||
            "",
        }
      } catch (err) {
        console.error(
          `Failed to load ${coin.id}:`,
          err
        )
      }
    }

    setMethods(updated)
  }

  async function loadOrders() {
    try {
      setLoadingOrders(true)

      const response = await fetch(
        "/api/payment-status",
        { cache: "no-store" }
      )

      if (!response.ok) {
        setOrders([])
        return
      }

      const data = await response.json()

      const list =
        data?.orders ||
        data?.data ||
        data?.payments ||
        []

      setOrders(
        Array.isArray(list) ? list : []
      )
    } catch (err) {
      console.error(
        "Orders load error:",
        err
      )
    } finally {
      setLoadingOrders(false)
    }
  }

  function updateMethod(
    field: keyof PaymentMethod,
    value: string
  ) {
    setMethods((previous) => ({
      ...previous,
      [selectedCoin]: {
        ...previous[selectedCoin],
        [field]: value,
      },
    }))

    setMessage("")
    setError("")
  }

  function handleLogoImage(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0]

    if (!file) return

    if (
      ![
        "image/jpeg",
        "image/png",
        "image/webp",
      ].includes(file.type)
    ) {
      setError(
        "Logo must be JPG, PNG or WEBP."
      )
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError(
        "Logo must be smaller than 5MB."
      )
      return
    }

    setLogoFile(file)

    const reader = new FileReader()

    reader.onload = () => {
      if (
        typeof reader.result === "string"
      ) {
        setLogoUrl(reader.result)
      }
    }

    reader.readAsDataURL(file)

    setMessage(
      "Logo selected. Click SAVE LOGO."
    )
    setError("")
  }

  function handleQrImage(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0]

    if (!file) return

    if (
      ![
        "image/jpeg",
        "image/png",
        "image/webp",
      ].includes(file.type)
    ) {
      setError(
        "QR image must be JPG, PNG or WEBP."
      )
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError(
        "QR image must be smaller than 5MB."
      )
      return
    }

    const reader = new FileReader()

    reader.onload = () => {
      if (
        typeof reader.result === "string"
      ) {
        updateMethod(
          "qr_image_url",
          reader.result
        )
      }
    }

    reader.readAsDataURL(file)

    setMessage(
      "QR selected. Click SAVE."
    )
  }

  async function saveLogo() {
    if (!logoFile) {
      setError(
        "Please select a logo image."
      )
      return
    }

    try {
      setSavingLogo(true)
      setError("")
      setMessage("")

      const formData = new FormData()

      formData.append(
        "logo",
        logoFile
      )

      const response = await fetch(
        "/api/site-settings",
        {
          method: "PUT",
          body: formData,
        }
      )

      const data =
        await response.json().catch(
          () => ({})
        )

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data?.error ||
            "Unable to save logo."
        )
      }

      setLogoUrl(
        data.logo_url || ""
      )

      setLogoFile(null)

      setMessage(
        "Logo saved successfully."
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save logo."
      )
    } finally {
      setSavingLogo(false)
    }
  }

  async function savePaymentMethod() {
    setSaving(true)
    setMessage("")
    setError("")

    try {
      const method =
        methods[selectedCoin]

      const response = await fetch(
        "/api/payment-methods",
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            id: selectedCoin,
            name: method.name,
            information:
              method.information,
            wallet_address:
              method.wallet_address,
            qr_image_url:
              method.qr_image_url,
          }),
        }
      )

      const data =
        await response.json().catch(
          () => ({})
        )

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to save changes."
        )
      }

      setMessage(
        `${method.name} settings saved successfully.`
      )

      await loadPaymentMethods()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save changes."
      )
    } finally {
      setSaving(false)
    }
  }

  async function updateOrderStatus(
    orderId: number | string,
    status:
      | "pending"
      | "confirmed"
      | "failed"
  ) {
    setUpdatingOrder(orderId)
    setMessage("")
    setError("")

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
  orderId: orderId,
  status,
}),
        }
      )

      const data =
        await response.json().catch(
          () => ({})
        )

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to update payment status."
        )
      }

      setMessage(
        `Order #${orderId} marked ${status}.`
      )

      await loadOrders()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update payment status."
      )
    } finally {
      setUpdatingOrder(null)
    }
  }

  async function logout() {
    try {
      await fetch(
        "/api/admin-logout",
        {
          method: "POST",
          credentials: "include",
        }
      )
    } finally {
      window.location.href =
        "/admin/login"
    }
  }

  if (checkingAuth) {
    return (
      <>
        <style>{styles}</style>

        <main className="admin-page center-page">
          <div className="loading-box">
            <div className="big-logo">
              K
            </div>

            <h1>KAKOBUY</h1>

            <div className="spinner" />

            <p>
              Checking admin access...
            </p>
          </div>
        </main>
      </>
    )
  }

  if (!authorized) {
    return (
      <>
        <style>{styles}</style>

        <main className="admin-page center-page">
          <div className="loading-box">
            <div className="big-logo">
              K
            </div>

            <h1>
              Admin Login Required
            </h1>

            <p>
              Please log in to open the
              Kakobuy admin dashboard.
            </p>

            <button
              className="red-button full"
              onClick={() =>
                (window.location.href =
                  "/admin/login")
              }
            >
              LOGIN
            </button>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <style>{styles}</style>

      <main className="admin-page">

        <div className="floating-orb orb-one" />
        <div className="floating-orb orb-two" />
        <div className="floating-orb orb-three" />

        {/* HEADER */}

        <header className="admin-header">

          <div className="header-inner">

            <div className="brand-area">

              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Kakobuy"
                  className="header-logo"
                />
              ) : (
                <div className="header-logo default-logo">
                  K
                </div>
              )}

              <div>
                <div className="brand-name">
                  KAKOBUY
                </div>

                <div className="brand-small">
                  ADMIN DASHBOARD
                </div>
              </div>

            </div>

            {/* MOBILE-VISIBLE NAV BUTTONS */}

            <div className="header-actions">

              <a
                href="https://kakobuy-mini.vercel.app/admin"
                target="_blank"
                rel="noreferrer"
                className="nav-button page-one"
              >
                <span className="nav-number">
                  01
                </span>

                <span>
                  PAGE 1
                </span>
              </a>

              <a
                href="https://kakobuy-check-order.vercel.app/admin"
                target="_blank"
                rel="noreferrer"
                className="nav-button page-two"
              >
                <span className="nav-number">
                  02
                </span>

                <span>
                  PAGE 2
                </span>
              </a>

              <button
                onClick={logout}
                className="logout-button"
              >
                LOGOUT
              </button>

            </div>

          </div>

        </header>

        {/* MAIN */}

        <div className="dashboard">

          <section className="hero">

            <div>
              <div className="eyebrow">
                KAKOBUY CONTROL CENTER
              </div>

              <h1>
                Payment Control
              </h1>

              <p>
                Manage payment methods,
                wallet addresses, QR codes
                and buyer payment
                submissions.
              </p>
            </div>

            <div className="live">
              <span />
              LIVE
            </div>

          </section>

          {message && (
            <div className="success">
              ✓ {message}
            </div>
          )}

          {error && (
            <div className="error">
              ⚠ {error}
            </div>
          )}

          {loading ? (
            <div className="loading-card">
              <div className="spinner" />
              <p>
                Loading dashboard...
              </p>
            </div>
          ) : (
            <>

              {/* LOGO */}

              <section className="card">

                <div className="section-head">
                  <span>
                    01
                  </span>

                  <h2>
                    Shared Kakobuy Logo
                  </h2>

                  <p>
                    Change the logo displayed
                    across your Kakobuy
                    payment experience.
                  </p>
                </div>

                <div className="logo-editor">

                  <div className="logo-preview">

                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt="Logo preview"
                      />
                    ) : (
                      <span>
                        K
                      </span>
                    )}

                  </div>

                  <div className="logo-controls">

                    <label>
                      Upload Logo
                    </label>

                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={
                        handleLogoImage
                      }
                    />

                    <button
                      onClick={saveLogo}
                      disabled={
                        savingLogo
                      }
                      className="save-button"
                    >
                      {savingLogo
                        ? "SAVING..."
                        : "SAVE LOGO"}
                    </button>

                  </div>

                </div>

              </section>

              {/* PAYMENT METHODS */}

              <section className="card">

                <div className="section-head">
                  <span>
                    02
                  </span>

                  <h2>
                    Payment Methods
                  </h2>

                  <p>
                    Select a payment method
                    and manage its wallet,
                    code and QR.
                  </p>
                </div>

                <div className="coin-grid">

                  {COINS.map(
                    (coin) => (
                      <button
                        key={coin.id}
                        onClick={() =>
                          setSelectedCoin(
                            coin.id
                          )
                        }
                        className={
                          selectedCoin ===
                          coin.id
                            ? "coin selected"
                            : "coin"
                        }
                      >

                        <strong>
                          {coin.symbol}
                        </strong>

                        <span>
                          {coin.name}
                        </span>

                        {selectedCoin ===
                          coin.id && (
                          <small>
                            SELECTED
                          </small>
                        )}

                      </button>
                    )
                  )}

                </div>

                <div className="form">

                  <div>
                    <label>
                      Payment Name
                    </label>

                    <input
                      value={
                        currentMethod.name
                      }
                      onChange={(e) =>
                        updateMethod(
                          "name",
                          e.target.value
                        )
                      }
                    />
                  </div>

                  <div>
                    <label>
                      Wallet Address
                    </label>

                    <textarea
                      value={
                        currentMethod.wallet_address
                      }
                      onChange={(e) =>
                        updateMethod(
                          "wallet_address",
                          e.target.value
                        )
                      }
                      rows={3}
                      placeholder="Enter wallet address"
                    />
                  </div>

                  <div>
                    <label>
                      Payment Information /
                      Code
                    </label>

                    <textarea
                      value={
                        currentMethod.information
                      }
                      onChange={(e) =>
                        updateMethod(
                          "information",
                          e.target.value
                        )
                      }
                      rows={5}
                      placeholder="Enter payment information or code..."
                    />
                  </div>

                  <div className="qr-section">

                    <h3>
                      QR Code
                    </h3>

                    {currentMethod.qr_image_url ? (
                      <div className="qr-preview">
                        <img
                          src={
                            currentMethod.qr_image_url
                          }
                          alt="QR code"
                        />
                      </div>
                    ) : (
                      <div className="no-qr">
                        No QR code uploaded
                      </div>
                    )}

                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={
                        handleQrImage
                      }
                    />

                  </div>

                  <button
                    onClick={
                      savePaymentMethod
                    }
                    disabled={saving}
                    className="save-payment"
                  >
                    {saving
                      ? "SAVING..."
                      : `SAVE ${currentMethod.name.toUpperCase()} SETTINGS`}
                  </button>

                </div>

              </section>

              {/* PAYMENTS */}

              <section className="card">

                <div className="payments-header">

                  <div>
                    <span className="section-number">
                      03
                    </span>

                    <h2>
                      Payment Submissions
                    </h2>

                    <p>
                      Review buyer payments
                      and confirm or reject
                      transactions.
                    </p>
                  </div>

                  <button
                    onClick={loadOrders}
                    className="refresh"
                  >
                    {loadingOrders
                      ? "REFRESHING..."
                      : "↻ REFRESH"}
                  </button>

                </div>

                {orders.length === 0 ? (
                  <div className="empty">
                    <strong>
                      No payment submissions
                    </strong>

                    <p>
                      New buyer payment
                      submissions will
                      appear here.
                    </p>
                  </div>
                ) : (
                  <div className="orders">

                    {orders.map(
                      (order) => {

                        const status =
                          (
                            order.payment_status ||
                            "pending"
                          ).toLowerCase()

                        const image =
                          order.transaction_image ||
                          ""

                        return (
                          <div
                            key={
                              String(
                                order.id
                              )
                            }
                            className="order"
                          >

                            <div className="order-info">

                              <small>
                                ORDER #
                                {
                                  order.id
                                }
                              </small>

                              <h3>
                                {
                                  order.product_name ||
                                  "Order"
                                }
                              </h3>

                              <p>
                                CUSTOMER:{" "}
                                {
                                  order.full_name ||
                                  "—"
                                }
                              </p>

                              <p>
                                METHOD:{" "}
                                {
                                  order.payment_method ||
                                  "—"
                                }
                              </p>

                              <p>
                                TOTAL:{" "}
                                {
                                  order.total ||
                                  "—"
                                }
                              </p>

                            </div>

                            <div className="order-actions">

                              <div
                                className={`status ${status}`}
                              >
                                {status.toUpperCase()}
                              </div>

                              {image && (
                                <button
                                  className="view-image"
                                  onClick={() =>
                                    setPreviewImage(
                                      image
                                    )
                                  }
                                >
                                  VIEW SCREENSHOT
                                </button>
                              )}

                              <div className="status-buttons">

                                <button
                                  onClick={() =>
                                    updateOrderStatus(
                                      order.id,
                                      "pending"
                                    )
                                  }
                                  disabled={
                                    updatingOrder ===
                                    order.id
                                  }
                                  className="pending"
                                >
                                  PENDING
                                </button>

                                <button
                                  onClick={() =>
                                    updateOrderStatus(
                                      order.id,
                                      "confirmed"
                                    )
                                  }
                                  disabled={
                                    updatingOrder ===
                                    order.id
                                  }
                                  className="confirmed"
                                >
                                  CONFIRMED
                                </button>

                                <button
                                  onClick={() =>
                                    updateOrderStatus(
                                      order.id,
                                      "failed"
                                    )
                                  }
                                  disabled={
                                    updatingOrder ===
                                    order.id
                                  }
                                  className="failed"
                                >
                                  FAILED
                                </button>

                              </div>

                            </div>

                          </div>
                        )
                      }
                    )}

                  </div>
                )}

              </section>

            </>
          )}

        </div>

        {previewImage && (
          <div
            className="modal"
            onClick={() =>
              setPreviewImage("")
            }
          >

            <button
              onClick={() =>
                setPreviewImage("")
              }
              className="close"
            >
              ×
            </button>

            <img
              src={previewImage}
              alt="Transaction"
              onClick={(e) =>
                e.stopPropagation()
              }
            />

          </div>
        )}

      </main>
    </>
  )
}

const styles = `
* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  background: #020202;
}

body {
  font-family: Arial, Helvetica, sans-serif;
}

button,
input,
textarea {
  font: inherit;
}

button {
  cursor: pointer;
}

button:disabled {
  opacity: .55;
  cursor: not-allowed;
}

.admin-page {
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
  color: white;
  background:
    radial-gradient(
      circle at 10% 10%,
      rgba(255,0,0,.12),
      transparent 28%
    ),
    radial-gradient(
      circle at 90% 30%,
      rgba(255,0,0,.08),
      transparent 25%
    ),
    #020202;
}

.floating-orb {
  position: fixed;
  width: 240px;
  height: 240px;
  border-radius: 50%;
  background: rgba(255,0,0,.16);
  filter: blur(60px);
  pointer-events: none;
  z-index: 0;
  animation: float 9s ease-in-out infinite alternate;
}

.orb-one {
  left: -120px;
  top: 10%;
}

.orb-two {
  right: -120px;
  top: 45%;
  animation-delay: -3s;
}

.orb-three {
  left: 35%;
  bottom: -130px;
  animation-delay: -6s;
}

@keyframes float {
  from {
    transform: translate(0,0) scale(.9);
  }

  to {
    transform: translate(35px,-30px) scale(1.15);
  }
}

.admin-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(2,2,2,.9);
  backdrop-filter: blur(18px);
  border-bottom: 1px solid #222;
}

.header-inner {
  max-width: 1200px;
  min-height: 76px;
  margin: auto;
  padding: 10px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.brand-area {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
}

.header-logo {
  width: 43px;
  height: 43px;
  border-radius: 12px;
  object-fit: contain;
  border: 1px solid #292929;
  background: #080808;
}

.default-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(
    135deg,
    #ff2020,
    #970000
  );
  font-size: 22px;
  font-weight: 950;
}

.brand-name {
  font-size: 15px;
  font-weight: 950;
  letter-spacing: 2px;
}

.brand-small {
  margin-top: 3px;
  color: #666;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 1px;
}

/* THESE BUTTONS ARE ALWAYS VISIBLE */

.header-actions {
  display: flex;
  align-items: center;
  gap: 7px;
  position: relative;
  z-index: 5;
}

.nav-button {
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 7px 12px;
  border-radius: 13px;
  text-decoration: none;
  color: #fff;
  font-size: 10px;
  font-weight: 950;
  letter-spacing: .6px;

  border: 1px solid
    rgba(255,40,40,.5);

  background:
    linear-gradient(
      135deg,
      rgba(255,0,0,.2),
      #090909
    );

  box-shadow:
    0 0 16px
      rgba(255,0,0,.14),
    inset 0 0 15px
      rgba(255,0,0,.04);

  transition:
    transform .2s ease,
    border-color .2s ease,
    box-shadow .2s ease;
}

.nav-button:hover,
.nav-button:active {
  transform: translateY(-2px);
  border-color: #ff2525;
  box-shadow:
    0 0 25px
      rgba(255,0,0,.4),
    inset 0 0 18px
      rgba(255,0,0,.1);
}

.nav-number {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;

  color: white;

  background:
    linear-gradient(
      135deg,
      #ff2525,
      #a50000
    );

  box-shadow:
    0 0 13px
      rgba(255,0,0,.4);

  font-size: 8px;
}

.logout-button {
  min-height: 42px;
  padding: 7px 12px;
  border-radius: 13px;
  border: 1px solid #333;
  background: #0c0c0c;
  color: #aaa;
  font-size: 9px;
  font-weight: 950;
}

.logout-button:hover {
  color: white;
  border-color: #777;
}

.dashboard {
  max-width: 1200px;
  margin: auto;
  padding: 30px 16px 60px;
  position: relative;
  z-index: 2;
}

.hero {
  min-height: 165px;
  padding: 28px;
  margin-bottom: 20px;
  border-radius: 24px;
  border: 1px solid #292929;

  background:
    linear-gradient(
      135deg,
      rgba(255,0,0,.12),
      rgba(10,10,10,.95)
    );

  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.eyebrow {
  color: #ff3030;
  font-size: 9px;
  font-weight: 950;
  letter-spacing: 2px;
  margin-bottom: 7px;
}

.hero h1 {
  margin: 0;
  font-size: 38px;
  letter-spacing: -1px;
}

.hero p {
  max-width: 650px;
  margin: 9px 0 0;
  color: #777;
  font-size: 13px;
  line-height: 1.5;
}

.live {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 13px;
  border-radius: 30px;
  border: 1px solid #254025;
  background: #071007;
  color: #64d879;
  font-size: 9px;
  font-weight: 950;
}

.live span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #38df52;
  box-shadow: 0 0 10px #38df52;
}

.success,
.error {
  padding: 13px 15px;
  margin-bottom: 16px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 800;
}

.success {
  color: #5ddd7c;
  border: 1px solid rgba(0,220,70,.25);
  background: rgba(0,220,70,.06);
}

.error {
  color: #ff6464;
  border: 1px solid rgba(255,0,0,.3);
  background: rgba(255,0,0,.07);
}

.card {
  margin-bottom: 20px;
  padding: 24px;
  border-radius: 22px;
  border: 1px solid #252525;
  background: rgba(10,10,10,.95);
  box-shadow: 0 20px 60px rgba(0,0,0,.28);
}

.section-head {
  margin-bottom: 22px;
}

.section-head > span,
.section-number {
  color: #ed2424;
  font-size: 9px;
  font-weight: 950;
  letter-spacing: 2px;
}

.section-head h2,
.payments-header h2 {
  margin: 5px 0 0;
  font-size: 21px;
}

.section-head p,
.payments-header p {
  margin: 7px 0 0;
  color: #707070;
  font-size: 12px;
  line-height: 1.5;
}

.logo-editor {
  display: flex;
  align-items: center;
  gap: 25px;
}

.logo-preview {
  width: 130px;
  height: 130px;
  flex-shrink: 0;
  border-radius: 20px;
  border: 1px solid #303030;
  background: #050505;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.logo-preview img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.logo-preview span {
  font-size: 50px;
  font-weight: 950;
  color: #f02020;
}

.logo-controls {
  flex: 1;
}

.logo-controls label,
.form label {
  display: block;
  margin-bottom: 8px;
  color: #c9c9c9;
  font-size: 11px;
  font-weight: 850;
}

input[type="file"] {
  width: 100%;
  padding: 10px;
  color: #888;
  background: #060606;
  border: 1px solid #292929;
  border-radius: 10px;
  font-size: 11px;
}

input[type="file"]::file-selector-button {
  border: 0;
  border-radius: 8px;
  padding: 8px 10px;
  margin-right: 8px;
  color: white;
  background: #d80000;
  font-weight: 850;
}

.save-button,
.save-payment {
  margin-top: 10px;
  width: 100%;
  padding: 13px;
  border: 0;
  border-radius: 10px;
  color: white;
  background: linear-gradient(
    135deg,
    #f02020,
    #a90000
  );
  font-size: 10px;
  font-weight: 950;
  box-shadow:
    0 8px 22px
      rgba(220,0,0,.18);
}

.coin-grid {
  display: grid;
  grid-template-columns:
    repeat(4,1fr);
  gap: 10px;
}

.coin {
  min-height: 105px;
  position: relative;
  padding: 15px;
  text-align: left;
  border-radius: 15px;
  border: 1px solid #252525;
  background: #070707;
  color: white;
}

.coin.selected {
  border-color: #ef1b1b;
  background:
    linear-gradient(
      145deg,
      rgba(255,0,0,.13),
      #080808
    );
  box-shadow:
    0 0 25px
      rgba(255,0,0,.1);
}

.coin strong {
  display: block;
  color: #777;
  font-size: 25px;
}

.coin.selected strong {
  color: #ff2424;
}

.coin span {
  display: block;
  margin-top: 8px;
  font-size: 12px;
  font-weight: 850;
}

.coin small {
  position: absolute;
  top: 9px;
  right: 9px;
  color: #ff5050;
  font-size: 6px;
  font-weight: 950;
}

.form {
  margin-top: 22px;
  display: flex;
  flex-direction: column;
  gap: 17px;
}

.form input,
.form textarea {
  width: 100%;
  padding: 13px;
  border-radius: 10px;
  outline: none;
  color: white;
  background: #050505;
  border: 1px solid #292929;
  font-size: 12px;
}

.form input:focus,
.form textarea:focus {
  border-color: #e00000;
  box-shadow:
    0 0 0 3px
      rgba(220,0,0,.08);
}

.form textarea {
  resize: vertical;
  line-height: 1.5;
}

.qr-section {
  padding: 17px;
  border-radius: 16px;
  border: 1px solid #252525;
  background: #060606;
}

.qr-section h3 {
  margin: 0 0 13px;
  font-size: 14px;
}

.qr-preview {
  width: 180px;
  height: 180px;
  padding: 8px;
  margin-bottom: 15px;
  border-radius: 13px;
  background: white;
}

.qr-preview img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.no-qr {
  padding: 20px 0;
  color: #555;
  font-size: 11px;
}

.save-payment {
  padding: 15px;
  font-size: 11px;
}

.payments-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  margin-bottom: 20px;
}

.refresh {
  padding: 11px 15px;
  border-radius: 10px;
  border: 1px solid #333;
  background: #111;
  color: white;
  font-size: 9px;
  font-weight: 950;
}

.empty {
  padding: 50px 20px;
  text-align: center;
  border: 1px dashed #292929;
  border-radius: 15px;
}

.empty strong {
  font-size: 14px;
}

.empty p {
  color: #666;
  font-size: 11px;
}

.orders {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.order {
  padding: 17px;
  border-radius: 16px;
  border: 1px solid #252525;
  background: #070707;
  display: flex;
  justify-content: space-between;
  gap: 20px;
}

.order-info small {
  color: #e52b2b;
  font-size: 8px;
  font-weight: 950;
}

.order-info h3 {
  margin: 7px 0 12px;
  font-size: 15px;
}

.order-info p {
  margin: 5px 0;
  color: #888;
  font-size: 10px;
}

.order-actions {
  min-width: 260px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 9px;
}

.status {
  padding: 7px 10px;
  border-radius: 20px;
  font-size: 8px;
  font-weight: 950;
}

.status.confirmed {
  color: #52db78;
  background: rgba(0,220,70,.08);
}

.status.failed {
  color: #ff5050;
  background: rgba(255,0,0,.08);
}

.status.pending {
  color: #e4bd45;
  background: rgba(220,180,0,.08);
}

.view-image {
  padding: 9px 12px;
  border-radius: 8px;
  border: 1px solid #333;
  background: #111;
  color: white;
  font-size: 8px;
  font-weight: 900;
}

.status-buttons {
  width: 100%;
  display: grid;
  grid-template-columns:
    repeat(3,1fr);
  gap: 5px;
}

.status-buttons button {
  padding: 9px 4px;
  border-radius: 8px;
  background: transparent;
  font-size: 7px;
  font-weight: 950;
}

.pending {
  color: #e4bd45;
  border: 1px solid rgba(220,180,0,.3);
}

.confirmed {
  color: #4fd879;
  border: 1px solid rgba(0,220,70,.3);
}

.failed {
  color: #ff5050;
  border: 1px solid rgba(255,0,0,.3);
}

.modal {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0,0,0,.94);
}

.modal img {
  max-width: 95vw;
  max-height: 90vh;
  object-fit: contain;
  border-radius: 12px;
}

.close {
  position: fixed;
  top: 18px;
  right: 18px;
  width: 45px;
  height: 45px;
  border-radius: 50%;
  border: 1px solid #444;
  background: #111;
  color: white;
  font-size: 28px;
}

.center-page {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.loading-box {
  width: min(430px,100%);
  padding: 35px 25px;
  text-align: center;
  border-radius: 23px;
  border: 1px solid #292929;
  background: #0b0b0b;
}

.big-logo {
  width: 65px;
  height: 65px;
  margin: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 20px;
  background: linear-gradient(
    135deg,
    #ff2020,
    #920000
  );
  font-size: 28px;
  font-weight: 950;
}

.loading-box h1 {
  margin: 15px 0 7px;
}

.loading-box p {
  color: #777;
  font-size: 12px;
  line-height: 1.5;
}

.spinner {
  width: 25px;
  height: 25px;
  margin: 17px auto;
  border-radius: 50%;
  border: 3px solid #333;
  border-top-color: #ed0000;
  animation: spin .7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.red-button {
  padding: 13px;
  border: 0;
  border-radius: 10px;
  color: white;
  background: #df0000;
  font-weight: 950;
}

.full {
  width: 100%;
}

/* PHONE */

@media (max-width: 760px) {

  .header-inner {
    padding: 8px;
    min-height: 68px;
  }

  /*
    IMPORTANT:
    PAGE 1 AND PAGE 2 ARE NOT HIDDEN.
  */

  .header-actions {
    display: flex;
    flex: 1;
    justify-content: flex-end;
  }

  .nav-button,
  .logout-button {
    min-height: 37px;
    padding: 6px 7px;
    font-size: 7px;
  }

  .nav-number {
    width: 21px;
    height: 21px;
    border-radius: 6px;
    font-size: 6px;
  }

  .brand-name {
    font-size: 10px;
  }

  .brand-small {
    display: none;
  }

  .header-logo {
    width: 34px;
    height: 34px;
  }

  .dashboard {
    padding: 20px 10px 45px;
  }

  .hero {
    padding: 21px;
    min-height: 140px;
  }

  .hero h1 {
    font-size: 29px;
  }

  .hero p {
    font-size: 11px;
  }

  .live {
    display: none;
  }

  .card {
    padding: 17px;
    border-radius: 18px;
  }

  .logo-editor {
    flex-direction: column;
    align-items: stretch;
  }

  .logo-preview {
    margin: auto;
  }

  .coin-grid {
    grid-template-columns:
      repeat(2,1fr);
  }

  .order {
    flex-direction: column;
  }

  .order-actions {
    width: 100%;
    min-width: 0;
    align-items: stretch;
  }

  .payments-header {
    flex-direction: column;
    align-items: stretch;
  }

  .refresh {
    width: 100%;
  }

  .qr-preview {
    width: 160px;
    height: 160px;
  }

}

/* VERY SMALL PHONES */

@media (max-width: 430px) {

  .brand-area {
    gap: 5px;
  }

  .brand-name {
    display: none;
  }

  .header-actions {
    gap: 4px;
  }

  .nav-button,
  .logout-button {
    flex: 1;
    min-width: 0;
    justify-content: center;
    padding: 5px 3px;
  }

  .nav-button span:last-child {
    display: inline;
  }

  .dashboard {
    padding-left: 8px;
    padding-right: 8px;
  }

  .hero h1 {
    font-size: 26px;
  }

  .coin {
    min-height: 95px;
  }

  .status-buttons {
    grid-template-columns: 1fr;
  }

}
`
