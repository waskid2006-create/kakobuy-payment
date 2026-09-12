"use client"

import { useEffect, useState } from "react"

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

type Order = {
  id: number | string
  product_name?: string
  productName?: string
  full_name?: string
  fullName?: string
  email?: string
  phone?: string
  total?: number | string
  payment_status?: string
  paymentStatus?: string
  payment_method?: string
  paymentMethod?: string
  transaction_image?: string
  transactionImage?: string
  transaction_submitted_at?: string
  transaction_submittedAt?: string
  created_at?: string
  createdAt?: string
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
  hero_heading: "Complete Your Payment",
  hero_subtitle: "Send the exact amount to the wallet below.",
  footer_text: "Kakobuy payment service",
})

export default function AdminPage() {
  const [authorized, setAuthorized] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)

  const [logoUrl, setLogoUrl] = useState("")
  const [logoFile, setLogoFile] = useState<File | null>(null)

  const [methods, setMethods] = useState<Record<string, PaymentMethod>>({
    bitcoin: emptyMethod("bitcoin", "Bitcoin"),
    ethereum: emptyMethod("ethereum", "Ethereum"),
    tron: emptyMethod("tron", "TRON"),
    binance: emptyMethod("binance", "Binance"),
  })

  const [selectedCoin, setSelectedCoin] = useState("bitcoin")
  const [orders, setOrders] = useState<Order[]>([])

  const [loading, setLoading] = useState(true)
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingLogo, setSavingLogo] = useState(false)

  const [updatingOrder, setUpdatingOrder] = useState<
    number | string | null
  >(null)

  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const [previewImage, setPreviewImage] = useState("")

  const currentMethod =
    methods[selectedCoin] ||
    emptyMethod(
      selectedCoin,
      COINS.find((coin) => coin.id === selectedCoin)?.name ||
        selectedCoin
    )

  useEffect(() => {
    checkAdmin()
  }, [])

  async function checkAdmin() {
    try {
      setCheckingAuth(true)

      const response = await fetch("/api/admin-check", {
        method: "GET",
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
    } catch (err) {
      console.error(err)
      setAuthorized(false)
      setCheckingAuth(false)
    }
  }

  async function loadEverything() {
    setLoading(true)
    setError("")

    try {
      await Promise.all([
        loadLogo(),
        loadPaymentMethods(),
        loadOrders(),
      ])
    } catch (err) {
      console.error(err)
      setError("Some admin information could not be loaded.")
    } finally {
      setLoading(false)
    }
  }

  async function loadLogo() {
    try {
      const response = await fetch("/api/site-settings", {
        cache: "no-store",
      })

      if (!response.ok) return

      const data = await response.json()

      const logo =
        data?.logo_url ||
        data?.logoUrl ||
        data?.settings?.logo_url ||
        data?.settings?.logoUrl ||
        ""

      setLogoUrl(logo)
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
          {
            method: "GET",
            cache: "no-store",
          }
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
          information:
            source.information ||
            source.info ||
            "",
          wallet_address:
            source.wallet_address ||
            source.walletAddress ||
            "",
          qr_image_url:
            source.qr_image_url ||
            source.qrImageUrl ||
            "",
          hero_heading:
            source.hero_heading ||
            source.heroHeading ||
            "Complete Your Payment",
          hero_subtitle:
            source.hero_subtitle ||
            source.heroSubtitle ||
            "Send the exact amount to the wallet below.",
          footer_text:
            source.footer_text ||
            source.footerText ||
            "Kakobuy payment service",
        }
      } catch (err) {
        console.error(`Failed to load ${coin.id}:`, err)
      }
    }

    setMethods(updated)
  }

  async function loadOrders() {
    try {
      setLoadingOrders(true)

      const response = await fetch("/api/payment-status", {
        method: "GET",
        cache: "no-store",
      })

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

      setOrders(Array.isArray(list) ? list : [])
    } catch (err) {
      console.error("Orders load error:", err)
      setOrders([])
    } finally {
      setLoadingOrders(false)
    }
  }

  useEffect(() => {
    if (!authorized) return

    const interval = setInterval(() => {
      loadOrders()
    }, 5000)

    return () => clearInterval(interval)
  }, [authorized])

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

  async function savePaymentMethod() {
    setSaving(true)
    setMessage("")
    setError("")

    try {
      const method = methods[selectedCoin]

      const response = await fetch("/api/payment-methods", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          id: selectedCoin,
          name: method.name,
          information: method.information,
          wallet_address: method.wallet_address,
          qr_image_url: method.qr_image_url,
          hero_heading: method.hero_heading,
          hero_subtitle: method.hero_subtitle,
          footer_text: method.footer_text,
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Unable to save payment settings."
        )
      }

      setMessage(
        `${method.name} settings saved successfully.`
      )

      await loadPaymentMethods()
    } catch (err) {
      console.error(err)

      setError(
        err instanceof Error
          ? err.message
          : "Unable to save changes."
      )
    } finally {
      setSaving(false)
    }
  }

  function handleQrImage(
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
      setError("QR image must be JPG, PNG or WEBP.")
      event.target.value = ""
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("QR image must be smaller than 5MB.")
      event.target.value = ""
      return
    }

    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result !== "string") return

      updateMethod("qr_image_url", reader.result)
      setMessage("QR image selected. Click SAVE.")
    }

    reader.readAsDataURL(file)
  }

  function removeQr() {
    updateMethod("qr_image_url", "")
    setMessage("QR image removed. Click SAVE.")
  }

  function handleLogoImage(
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
      setError("Logo must be JPG, PNG or WEBP.")
      event.target.value = ""
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Logo must be smaller than 5MB.")
      event.target.value = ""
      return
    }

    setLogoFile(file)

    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result === "string") {
        setLogoUrl(reader.result)
        setMessage("Logo selected. Click SAVE LOGO.")
      }
    }

    reader.readAsDataURL(file)
  }

  async function saveLogo() {
    setSavingLogo(true)
    setMessage("")
    setError("")

    try {
      const response = await fetch("/api/site-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          logo_url: logoUrl,
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Unable to save logo."
        )
      }

      setLogoFile(null)
      setMessage("Kakobuy logo saved successfully.")
    } catch (err) {
      console.error(err)

      setError(
        err instanceof Error
          ? err.message
          : "Unable to save logo."
      )
    } finally {
      setSavingLogo(false)
    }
  }

  async function removeLogo() {
    setLogoUrl("")
    setLogoFile(null)

    setSavingLogo(true)
    setMessage("")
    setError("")

    try {
      const response = await fetch("/api/site-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          logo_url: "",
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Unable to remove logo."
        )
      }

      setMessage("Logo removed successfully.")
    } catch (err) {
      console.error(err)

      setError(
        err instanceof Error
          ? err.message
          : "Unable to remove logo."
      )
    } finally {
      setSavingLogo(false)
    }
  }

  async function updateOrderStatus(
    orderId: number | string,
    status: "pending" | "confirmed" | "failed"
  ) {
    setUpdatingOrder(orderId)
    setMessage("")
    setError("")

    try {
      const response = await fetch("/api/payment-status", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          id: orderId,
          status,
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Unable to update payment status."
        )
      }

      setMessage(`Order #${orderId} marked ${status}.`)

      await loadOrders()
    } catch (err) {
      console.error(err)

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
      await fetch("/api/admin-logout", {
        method: "POST",
        credentials: "include",
      })
    } catch (err) {
      console.error(err)
    }

    window.location.href = "/admin/login"
  }

  if (checkingAuth) {
    return (
      <>
        <style>{styles}</style>

        <main className="admin-page loading-page">
          <div className="loading-box">
            <div className="big-logo">K</div>
            <h1>KAKOBUY</h1>
            <div className="spinner" />
            <p>Checking admin access...</p>
          </div>
        </main>
      </>
    )
  }

  if (!authorized) {
    return (
      <>
        <style>{styles}</style>

        <main className="admin-page">
          <div className="login-required">
            <div className="big-logo">K</div>

            <h1>Admin Login Required</h1>

            <p>
              You need to log in before opening the
              Kakobuy admin dashboard.
            </p>

            <button
              className="red-button full"
              onClick={() =>
                (window.location.href = "/admin/login")
              }
            >
              LOGIN
            </button>

            <button
              className="dark-button full"
              onClick={() =>
                (window.location.href = "/")
              }
            >
              GO BACK
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

        <div className="glow glow-one" />
        <div className="glow glow-two" />

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
                  Admin Dashboard
                </div>
              </div>
            </div>

            <div className="header-actions">

              <a
                href="https://kakobuy-mini.vercel.app/"
                target="_blank"
                rel="noreferrer"
                className="header-link"
              >
                PAGE 2
              </a>

              <a
                href="https://kakobuy-payment-page.vercel.app/"
                target="_blank"
                rel="noreferrer"
                className="header-link"
              >
                PAGE 3
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

        <div className="dashboard">

          {/* HERO */}
          <section className="dashboard-hero">
            <div>
              <div className="eyebrow">
                KAKOBUY CONTROL CENTER
              </div>

              <h1>Payment Control</h1>

              <p>
                Manage payment methods, wallet addresses,
                QR codes and buyer payment submissions.
              </p>
            </div>

            <div className="live-indicator">
              <span />
              LIVE
            </div>
          </section>

          {/* MESSAGE */}
          {message && (
            <div className="success-message">
              ✓ {message}
            </div>
          )}

          {error && (
            <div className="error-message">
              ⚠ {error}
            </div>
          )}

          {loading ? (
            <div className="loading-card">
              <div className="spinner" />
              <p>Loading admin dashboard...</p>
            </div>
          ) : (
            <div className="dashboard-content">

              {/* LOGO */}
              <section className="card">

                <div className="card-heading">
                  <div>
                    <div className="section-number">
                      01
                    </div>

                    <h2>Shared Kakobuy Logo</h2>

                    <p>
                      Change the logo displayed across
                      your Kakobuy payment experience.
                    </p>
                  </div>
                </div>

                <div className="logo-editor">

                  <div className="logo-preview">
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt="Kakobuy logo preview"
                      />
                    ) : (
                      <span>K</span>
                    )}
                  </div>

                  <div className="editor-actions">

                    <label className="field-label">
                      Upload Logo
                    </label>

                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleLogoImage}
                      className="file-input"
                    />

                    <div className="button-row">

                      <button
                        onClick={saveLogo}
                        disabled={savingLogo}
                        className="red-button"
                      >
                        {savingLogo
                          ? "SAVING..."
                          : "SAVE LOGO"}
                      </button>

                      <button
                        onClick={removeLogo}
                        disabled={savingLogo}
                        className="dark-button"
                      >
                        REMOVE
                      </button>

                    </div>
                  </div>
                </div>
              </section>

              {/* PAYMENT METHODS */}
              <section className="card">

                <div className="card-heading">
                  <div>
                    <div className="section-number">
                      02
                    </div>

                    <h2>Payment Methods</h2>

                    <p>
                      Select a payment method and edit
                      what buyers see on Page 3.
                    </p>
                  </div>
                </div>

                {/* COINS */}
                <div className="coin-grid">

                  {COINS.map((coin) => {
                    const selected =
                      selectedCoin === coin.id

                    return (
                      <button
                        key={coin.id}
                        onClick={() => {
                          setSelectedCoin(coin.id)
                          setMessage("")
                          setError("")
                        }}
                        className={`coin-card ${
                          selected ? "coin-selected" : ""
                        }`}
                      >
                        <div className="coin-symbol">
                          {coin.symbol}
                        </div>

                        <div className="coin-name">
                          {coin.name}
                        </div>

                        {selected && (
                          <div className="selected-label">
                            SELECTED
                          </div>
                        )}
                      </button>
                    )
                  })}

                </div>

                {/* FORM */}
                <div className="settings-form">

                  <div className="form-group">
                    <label>
                      Payment Name
                    </label>

                    <input
                      value={currentMethod.name}
                      onChange={(event) =>
                        updateMethod(
                          "name",
                          event.target.value
                        )
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      Wallet Address
                    </label>

                    <textarea
                      value={currentMethod.wallet_address}
                      onChange={(event) =>
                        updateMethod(
                          "wallet_address",
                          event.target.value
                        )
                      }
                      rows={3}
                      placeholder="Enter wallet address"
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      Payment Information
                    </label>

                    <textarea
                      value={currentMethod.information}
                      onChange={(event) =>
                        updateMethod(
                          "information",
                          event.target.value
                        )
                      }
                      rows={5}
                      placeholder="Payment instructions..."
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      Hero Heading
                    </label>

                    <input
                      value={currentMethod.hero_heading}
                      onChange={(event) =>
                        updateMethod(
                          "hero_heading",
                          event.target.value
                        )
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      Hero Subtitle
                    </label>

                    <textarea
                      value={currentMethod.hero_subtitle}
                      onChange={(event) =>
                        updateMethod(
                          "hero_subtitle",
                          event.target.value
                        )
                      }
                      rows={3}
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      Footer Text
                    </label>

                    <input
                      value={currentMethod.footer_text}
                      onChange={(event) =>
                        updateMethod(
                          "footer_text",
                          event.target.value
                        )
                      }
                    />
                  </div>

                  {/* QR */}
                  <div className="qr-box">

                    <div className="qr-heading">
                      <div>
                        <h3>QR Code</h3>
                        <p>
                          JPG, PNG or WEBP · Maximum 5MB
                        </p>
                      </div>
                    </div>

                    {currentMethod.qr_image_url ? (
                      <div className="qr-content">

                        <div className="qr-preview">
                          <img
                            src={currentMethod.qr_image_url}
                            alt={`${currentMethod.name} QR code`}
                          />
                        </div>

                        <button
                          onClick={removeQr}
                          className="remove-button"
                        >
                          REMOVE QR
                        </button>

                      </div>
                    ) : (
                      <div className="no-qr">
                        No QR code uploaded
                      </div>
                    )}

                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleQrImage}
                      className="file-input"
                    />

                  </div>

                  <button
                    onClick={savePaymentMethod}
                    disabled={saving}
                    className="save-payment-button"
                  >
                    {saving
                      ? "SAVING..."
                      : `SAVE ${currentMethod.name.toUpperCase()} SETTINGS`}
                  </button>

                </div>
              </section>

              {/* PAYMENTS */}
              <section className="card">

                <div className="payment-heading">

                  <div>
                    <div className="section-number">
                      03
                    </div>

                    <h2>Payment Submissions</h2>

                    <p>
                      Review buyer payments and manually
                      confirm or reject transactions.
                    </p>
                  </div>

                  <button
                    onClick={loadOrders}
                    disabled={loadingOrders}
                    className="refresh-button"
                  >
                    {loadingOrders
                      ? "REFRESHING..."
                      : "↻ REFRESH"}
                  </button>

                </div>

                {orders.length === 0 ? (
                  <div className="empty-payments">
                    <div className="empty-icon">
                      ◉
                    </div>

                    <h3>
                      No payment submissions
                    </h3>

                    <p>
                      New buyer payment submissions
                      will appear here automatically.
                    </p>
                  </div>
                ) : (
                  <div className="orders-list">

                    {orders.map((order) => {

                      const status =
                        order.payment_status ||
                        order.paymentStatus ||
                        "pending"

                      const image =
                        order.transaction_image ||
                        order.transactionImage ||
                        ""

                      const product =
                        order.product_name ||
                        order.productName ||
                        "Order"

                      const customer =
                        order.full_name ||
                        order.fullName ||
                        "Customer"

                      const paymentMethod =
                        order.payment_method ||
                        order.paymentMethod ||
                        "Not specified"

                      const total =
                        order.total ?? ""

                      const created =
                        order.transaction_submitted_at ||
                        order.transaction_submittedAt ||
                        order.created_at ||
                        order.createdAt ||
                        ""

                      return (
                        <div
                          key={String(order.id)}
                          className="order-card"
                        >

                          <div className="order-top">

                            <div className="order-info">

                              <div className="order-title-row">

                                <h3>
                                  Order #{order.id}
                                </h3>

                                <span
                                  className={`status status-${status}`}
                                >
                                  {status}
                                </span>

                              </div>

                              <div className="order-details">

                                <div>
                                  <span>
                                    PRODUCT
                                  </span>
                                  {product}
                                </div>

                                <div>
                                  <span>
                                    CUSTOMER
                                  </span>
                                  {customer}
                                </div>

                                {order.email && (
                                  <div>
                                    <span>
                                      EMAIL
                                    </span>
                                    <b className="break">
                                      {order.email}
                                    </b>
                                  </div>
                                )}

                                <div>
                                  <span>
                                    PAYMENT
                                  </span>
                                  {paymentMethod}
                                </div>

                                <div>
                                  <span>
                                    TOTAL
                                  </span>
                                  {total}
                                </div>

                                {created && (
                                  <div className="date">
                                    {new Date(
                                      created
                                    ).toLocaleString()}
                                  </div>
                                )}

                              </div>
                            </div>

                            {image && (
                              <button
                                className="transaction-image-button"
                                onClick={() =>
                                  setPreviewImage(image)
                                }
                              >
                                <img
                                  src={image}
                                  alt="Transaction screenshot"
                                />

                                <span>
                                  VIEW PAYMENT
                                </span>
                              </button>
                            )}

                          </div>

                          {/* STATUS */}
                          <div className="status-controls">

                            <button
                              onClick={() =>
                                updateOrderStatus(
                                  order.id,
                                  "pending"
                                )
                              }
                              disabled={
                                updatingOrder === order.id
                              }
                              className="status-button pending-button"
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
                                updatingOrder === order.id
                              }
                              className="status-button confirmed-button"
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
                                updatingOrder === order.id
                              }
                              className="status-button failed-button"
                            >
                              FAILED
                            </button>

                          </div>

                        </div>
                      )
                    })}

                  </div>
                )}

              </section>

            </div>
          )}
        </div>

        {/* IMAGE VIEWER */}
        {previewImage && (
          <div
            className="image-modal"
            onClick={() => setPreviewImage("")}
          >
            <button
              className="close-modal"
              onClick={() => setPreviewImage("")}
            >
              ×
            </button>

            <img
              src={previewImage}
              alt="Full transaction screenshot"
              onClick={(event) =>
                event.stopPropagation()
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
  background: #050505;
}

body {
  font-family:
    Arial,
    Helvetica,
    sans-serif;
}

button,
input,
textarea {
  font-family: inherit;
}

button {
  cursor: pointer;
}

.admin-page {
  min-height: 100vh;
  background:
    radial-gradient(
      circle at 10% 5%,
      rgba(230, 0, 0, .14),
      transparent 28%
    ),
    radial-gradient(
      circle at 90% 55%,
      rgba(180, 0, 0, .08),
      transparent 30%
    ),
    #050505;
  color: #fff;
  position: relative;
  overflow-x: hidden;
  padding-bottom: 60px;
}

.glow {
  position: fixed;
  width: 360px;
  height: 360px;
  border-radius: 50%;
  filter: blur(120px);
  pointer-events: none;
  opacity: .25;
}

.glow-one {
  top: -180px;
  left: -150px;
  background: #d00000;
}

.glow-two {
  right: -180px;
  bottom: -150px;
  background: #9d0000;
}

.admin-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(5,5,5,.88);
  border-bottom: 1px solid #222;
  backdrop-filter: blur(18px);
}

.header-inner {
  max-width: 1180px;
  margin: auto;
  min-height: 76px;
  padding: 12px 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
}

.brand-area {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-logo {
  width: 44px;
  height: 44px;
  border-radius: 13px;
  object-fit: cover;
  border: 1px solid rgba(255,0,0,.35);
}

.default-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg,#ff1a1a,#a40000);
  font-weight: 900;
  font-size: 22px;
  box-shadow: 0 0 25px rgba(220,0,0,.25);
}

.brand-name {
  font-weight: 900;
  letter-spacing: 2px;
  font-size: 15px;
}

.brand-small {
  color: #666;
  font-size: 11px;
  margin-top: 3px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-link,
.logout-button {
  border-radius: 9px;
  padding: 10px 13px;
  font-size: 11px;
  font-weight: 800;
  text-decoration: none;
  white-space: nowrap;
}

.header-link {
  color: #bbb;
  border: 1px solid #292929;
  background: #0c0c0c;
}

.header-link:hover {
  border-color: #555;
  color: #fff;
}

.logout-button {
  border: 0;
  color: #fff;
  background: linear-gradient(135deg,#ef1616,#b40000);
}

.dashboard {
  max-width: 1180px;
  margin: auto;
  padding: 35px 18px;
  position: relative;
  z-index: 2;
}

.dashboard-hero {
  min-height: 150px;
  padding: 28px;
  border: 1px solid #252525;
  border-radius: 25px;
  background:
    linear-gradient(
      135deg,
      rgba(255,0,0,.10),
      rgba(20,20,20,.85)
    );
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 22px;
  box-shadow: 0 20px 60px rgba(0,0,0,.35);
}

.eyebrow {
  color: #ef3030;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 2px;
  margin-bottom: 8px;
}

.dashboard-hero h1 {
  margin: 0;
  font-size: 38px;
  letter-spacing: -1.5px;
}

.dashboard-hero p {
  margin: 9px 0 0;
  color: #888;
  font-size: 14px;
  max-width: 650px;
  line-height: 1.5;
}

.live-indicator {
  display: flex;
  align-items: center;
  gap: 7px;
  border: 1px solid #253525;
  background: #071007;
  color: #73d473;
  border-radius: 30px;
  padding: 9px 13px;
  font-size: 10px;
  font-weight: 900;
}

.live-indicator span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #35db35;
  box-shadow: 0 0 10px #35db35;
}

.success-message,
.error-message {
  padding: 14px 16px;
  border-radius: 13px;
  margin-bottom: 18px;
  font-size: 13px;
  font-weight: 700;
}

.success-message {
  background: rgba(0,200,60,.08);
  border: 1px solid rgba(0,220,80,.25);
  color: #63dc80;
}

.error-message {
  background: rgba(220,0,0,.09);
  border: 1px solid rgba(255,0,0,.25);
  color: #ff6666;
}

.dashboard-content {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.card {
  background: rgba(12,12,12,.92);
  border: 1px solid #252525;
  border-radius: 23px;
  padding: 25px;
  box-shadow: 0 20px 55px rgba(0,0,0,.30);
}

.card-heading {
  margin-bottom: 23px;
}

.section-number {
  color: #e30000;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 2px;
  margin-bottom: 5px;
}

.card h2 {
  margin: 0;
  font-size: 21px;
}

.card-heading p,
.payment-heading p {
  color: #666;
  font-size: 13px;
  margin: 7px 0 0;
  line-height: 1.5;
}

.logo-editor {
  display: flex;
  gap: 25px;
  align-items: center;
}

.logo-preview {
  width: 130px;
  height: 130px;
  flex-shrink: 0;
  border-radius: 22px;
  background: #050505;
  border: 1px solid #303030;
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
  font-weight: 900;
  color: #ef2020;
}

.editor-actions {
  flex: 1;
}

.field-label {
  display: block;
  color: #ddd;
  font-size: 12px;
  font-weight: 800;
  margin-bottom: 8px;
}

.file-input {
  width: 100%;
  padding: 11px;
  background: #070707;
  border: 1px solid #292929;
  color: #aaa;
  border-radius: 11px;
  font-size: 12px;
}

.file-input::file-selector-button {
  border: 0;
  background: #df0000;
  color: #fff;
  padding: 9px 12px;
  border-radius: 8px;
  font-weight: 800;
  margin-right: 10px;
}

.button-row {
  display: flex;
  gap: 9px;
  margin-top: 11px;
}

.red-button,
.dark-button {
  border-radius: 10px;
  padding: 12px 17px;
  font-size: 11px;
  font-weight: 900;
  border: 0;
}

.red-button {
  color: #fff;
  background: linear-gradient(135deg,#ef1616,#b60000);
  box-shadow: 0 7px 20px rgba(220,0,0,.17);
}

.red-button:hover {
  background: #ff2020;
}

.dark-button {
  color: #bbb;
  background: #111;
  border: 1px solid #303030;
}

.dark-button:hover {
  color: #fff;
  border-color: #555;
}

.full {
  width: 100%;
  margin-top: 10px;
}

.coin-grid {
  display: grid;
  grid-template-columns: repeat(4,1fr);
  gap: 10px;
}

.coin-card {
  position: relative;
  min-height: 105px;
  padding: 17px;
  text-align: left;
  border-radius: 15px;
  background: #070707;
  border: 1px solid #252525;
  color: #fff;
  transition: .2s;
}

.coin-card:hover {
  border-color: #555;
  transform: translateY(-2px);
}

.coin-selected {
  border-color: #e00000;
  background:
    linear-gradient(
      145deg,
      rgba(230,0,0,.13),
      #090909
    );
  box-shadow: 0 0 25px rgba(220,0,0,.10);
}

.coin-symbol {
  font-size: 25px;
  font-weight: 900;
  color: #777;
}

.coin-selected .coin-symbol {
  color: #ff2222;
}

.coin-name {
  margin-top: 9px;
  font-size: 13px;
  font-weight: 800;
}

.selected-label {
  position: absolute;
  top: 10px;
  right: 10px;
  color: #ff5555;
  font-size: 7px;
  font-weight: 900;
}

.settings-form {
  margin-top: 25px;
  display: flex;
  flex-direction: column;
  gap: 17px;
}

.form-group label {
  display: block;
  color: #ccc;
  font-size: 12px;
  font-weight: 800;
  margin-bottom: 7px;
}

.form-group input,
.form-group textarea {
  width: 100%;
  color: #fff;
  background: #060606;
  border: 1px solid #292929;
  border-radius: 11px;
  padding: 13px 14px;
  outline: none;
  font-size: 13px;
  transition: .2s;
}

.form-group textarea {
  resize: vertical;
  line-height: 1.5;
}

.form-group input:focus,
.form-group textarea:focus {
  border-color: #e00000;
  box-shadow: 0 0 0 3px rgba(220,0,0,.08);
}

.qr-box {
  padding: 18px;
  border: 1px solid #242424;
  border-radius: 17px;
  background: #060606;
}

.qr-heading h3 {
  margin: 0;
  font-size: 15px;
}

.qr-heading p {
  margin: 5px 0 15px;
  color: #666;
  font-size: 11px;
}

.qr-content {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 15px;
}

.qr-preview {
  width: 180px;
  height: 180px;
  padding: 8px;
  background: #fff;
  border-radius: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.qr-preview img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.remove-button {
  border: 1px solid rgba(255,0,0,.35);
  background: rgba(220,0,0,.06);
  color: #ff5555;
  border-radius: 10px;
  padding: 11px 14px;
  font-size: 11px;
  font-weight: 900;
}

.no-qr {
  border: 1px dashed #333;
  border-radius: 11px;
  padding: 30px;
  text-align: center;
  color: #555;
  font-size: 12px;
  margin-bottom: 13px;
}

.save-payment-button {
  width: 100%;
  border: 0;
  border-radius: 12px;
  padding: 15px;
  background: linear-gradient(135deg,#f01717,#b00000);
  color: #fff;
  font-weight: 900;
  font-size: 12px;
  box-shadow: 0 9px 25px rgba(220,0,0,.18);
}

.save-payment-button:hover {
  background: #ff1b1b;
}

.save-payment-button:disabled,
.red-button:disabled,
.dark-button:disabled,
.refresh-button:disabled,
.status-button:disabled {
  opacity: .5;
  cursor: not-allowed;
}

.payment-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 15px;
  margin-bottom: 20px;
}

.refresh-button {
  border: 1px solid #333;
  background: #0b0b0b;
  color: #ccc;
  border-radius: 10px;
  padding: 11px 14px;
  font-size: 10px;
  font-weight: 900;
}

.refresh-button:hover {
  border-color: #666;
  color: #fff;
}

.empty-payments {
  text-align: center;
  padding: 55px 20px;
  border: 1px dashed #292929;
  border-radius: 17px;
  background: #070707;
}

.empty-icon {
  font-size: 30px;
  color: #555;
}

.empty-payments h3 {
  margin: 12px 0 5px;
  font-size: 15px;
}

.empty-payments p {
  margin: 0;
  color: #666;
  font-size: 12px;
}

.orders-list {
  display: flex;
  flex-direction: column;
  gap: 13px;
}

.order-card {
  border: 1px solid #252525;
  border-radius: 18px;
  overflow: hidden;
  background: #050505;
}

.order-top {
  padding: 18px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
}

.order-title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 9px;
}

.order-title-row h3 {
  margin: 0;
  font-size: 18px;
}

.status {
  padding: 5px 9px;
  border-radius: 20px;
  font-size: 8px;
  font-weight: 900;
  text-transform: uppercase;
}

.status-confirmed {
  background: rgba(0,220,80,.09);
  color: #50d878;
}

.status-failed {
  background: rgba(230,0,0,.10);
  color: #ff5252;
}

.status-pending {
  background: rgba(230,180,0,.10);
  color: #e4bf4e;
}

.order-details {
  margin-top: 13px;
  display: flex;
  flex-direction: column;
  gap: 7px;
  font-size: 12px;
  color: #ddd;
}

.order-details div span {
  display: inline-block;
  width: 85px;
  color: #555;
  font-size: 8px;
  font-weight: 900;
  letter-spacing: .5px;
}

.order-details .date {
  color: #555;
  font-size: 10px;
  margin-top: 3px;
}

.break {
  word-break: break-all;
}

.transaction-image-button {
  width: 145px;
  height: 145px;
  flex-shrink: 0;
  padding: 0;
  position: relative;
  border: 1px solid #333;
  border-radius: 14px;
  overflow: hidden;
  background: #111;
}

.transaction-image-button img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.transaction-image-button span {
  position: absolute;
  left: 7px;
  right: 7px;
  bottom: 7px;
  padding: 7px;
  border-radius: 7px;
  background: rgba(0,0,0,.8);
  color: #fff;
  font-size: 8px;
  font-weight: 900;
}

.status-controls {
  display: grid;
  grid-template-columns: repeat(3,1fr);
  gap: 7px;
  padding: 0 18px 18px;
}

.status-button {
  padding: 12px 8px;
  border-radius: 10px;
  background: transparent;
  font-size: 9px;
  font-weight: 900;
}

.pending-button {
  color: #e5c247;
  border: 1px solid rgba(220,190,40,.3);
  background: rgba(220,190,40,.04);
}

.confirmed-button {
  color: #45d575;
  border: 1px solid rgba(0,220,70,.3);
  background: rgba(0,220,70,.04);
}

.failed-button {
  color: #ff5050;
  border: 1px solid rgba(230,0,0,.3);
  background: rgba(230,0,0,.04);
}

.pending-button:hover {
  background: rgba(220,190,40,.12);
}

.confirmed-button:hover {
  background: rgba(0,220,70,.12);
}

.failed-button:hover {
  background: rgba(230,0,0,.12);
}

.image-modal {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0,0,0,.94);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 25px;
}

.image-modal img {
  max-width: 95vw;
  max-height: 90vh;
  object-fit: contain;
  border-radius: 12px;
}

.close-modal {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 45px;
  height: 45px;
  border-radius: 50%;
  border: 1px solid #444;
  background: #111;
  color: #fff;
  font-size: 30px;
  line-height: 1;
}

.loading-page {
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-box,
.login-required {
  width: min(430px, calc(100% - 30px));
  padding: 35px 25px;
  text-align: center;
  border-radius: 24px;
  background: #0d0d0d;
  border: 1px solid #282828;
  box-shadow: 0 25px 70px rgba(0,0,0,.55);
}

.loading-box h1 {
  margin: 10px 0;
  letter-spacing: 3px;
}

.loading-box p,
.login-required p {
  color: #777;
  font-size: 13px;
  line-height: 1.5;
}

.big-logo {
  width: 65px;
  height: 65px;
  margin: auto;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg,#ff1717,#a50000);
  color: #fff;
  font-size: 28px;
  font-weight: 900;
  box-shadow: 0 0 30px rgba(220,0,0,.35);
}

.login-required h1 {
  margin: 20px 0 7px;
  font-size: 23px;
}

.spinner {
  width: 25px;
  height: 25px;
  margin: 18px auto;
  border-radius: 50%;
  border: 3px solid #333;
  border-top-color: #e00000;
  animation: spin .7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 760px) {

  .header-link {
    display: none;
  }

  .dashboard {
    padding: 22px 13px;
  }

  .dashboard-hero {
    padding: 22px;
    align-items: flex-start;
  }

  .dashboard-hero h1 {
    font-size: 30px;
  }

  .live-indicator {
    display: none;
  }

  .card {
    padding: 18px;
    border-radius: 19px;
  }

  .coin-grid {
    grid-template-columns: repeat(2,1fr);
  }

  .logo-editor {
    flex-direction: column;
    align-items: stretch;
  }

  .logo-preview {
    margin: auto;
  }

  .qr-content {
    flex-direction: column;
    align-items: flex-start;
  }

  .payment-heading {
    flex-direction: column;
  }

  .refresh-button {
    width: 100%;
  }

  .order-top {
    flex-direction: column;
  }

  .transaction-image-button {
    width: 100%;
    height: 220px;
  }
}

@media (max-width: 480px) {

  .header-inner {
    padding: 11px 13px;
  }

  .logout-button {
    padding: 9px 11px;
  }

  .dashboard-hero {
    border-radius: 19px;
  }

  .dashboard-hero h1 {
    font-size: 27px;
  }

  .card h2 {
    font-size: 19px;
  }

  .status-controls {
    grid-template-columns: 1fr;
  }

  .button-row {
    flex-direction: column;
  }

  .button-row button {
    width: 100%;
  }

  .qr-preview {
    width: 160px;
    height: 160px;
  }

  .order-details div span {
    width: 75px;
  }
}
`
