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

  const [methods, setMethods] = useState<
    Record<string, PaymentMethod>
  >({
    bitcoin: emptyMethod("bitcoin", "Bitcoin"),
    ethereum: emptyMethod("ethereum", "Ethereum"),
    tron: emptyMethod("tron", "TRON"),
    binance: emptyMethod("binance", "Binance"),
  })

  const [selectedCoin, setSelectedCoin] = useState("bitcoin")

  const [orders, setOrders] = useState<Order[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingLogo, setSavingLogo] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const [loadingOrders, setLoadingOrders] = useState(false)
  const [updatingOrder, setUpdatingOrder] = useState<
    number | string | null
  >(null)

  const currentMethod =
    methods[selectedCoin] ||
    emptyMethod(
      selectedCoin,
      COINS.find((coin) => coin.id === selectedCoin)?.name ||
        selectedCoin
    )

  // ------------------------------------------------------------
  // CHECK ADMIN LOGIN
  // ------------------------------------------------------------

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

  // ------------------------------------------------------------
  // LOAD EVERYTHING
  // ------------------------------------------------------------

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

  // ------------------------------------------------------------
  // LOAD LOGO
  // ------------------------------------------------------------

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

  // ------------------------------------------------------------
  // LOAD PAYMENT METHODS
  // ------------------------------------------------------------

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
          `/api/payment-methods?id=${encodeURIComponent(
            coin.id
          )}`,
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
        console.error(
          `Failed to load ${coin.id}:`,
          err
        )
      }
    }

    setMethods(updated)
  }

  // ------------------------------------------------------------
  // LOAD ORDERS
  // ------------------------------------------------------------

  async function loadOrders() {
    try {
      setLoadingOrders(true)

      const response = await fetch(
        "/api/payment-status",
        {
          method: "GET",
          cache: "no-store",
        }
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

      setOrders(Array.isArray(list) ? list : [])
    } catch (err) {
      console.error("Orders load error:", err)
      setOrders([])
    } finally {
      setLoadingOrders(false)
    }
  }

  // Refresh orders automatically
  useEffect(() => {
    if (!authorized) return

    const interval = setInterval(() => {
      loadOrders()
    }, 5000)

    return () => clearInterval(interval)
  }, [authorized])

  // ------------------------------------------------------------
  // CHANGE PAYMENT FIELD
  // ------------------------------------------------------------

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

  // ------------------------------------------------------------
  // SAVE PAYMENT METHOD
  // ------------------------------------------------------------

  async function savePaymentMethod() {
    setSaving(true)
    setMessage("")
    setError("")

    try {
      const method = methods[selectedCoin]

      const response = await fetch(
        "/api/payment-methods",
        {
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
        }
      )

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

  // ------------------------------------------------------------
  // QR IMAGE
  // ------------------------------------------------------------

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
      setError(
        "QR image must be JPG, PNG or WEBP."
      )
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
      const result = reader.result

      if (typeof result !== "string") return

      updateMethod("qr_image_url", result)
      setMessage("QR image selected. Click SAVE.")
    }

    reader.readAsDataURL(file)
  }

  // ------------------------------------------------------------
  // REMOVE QR
  // ------------------------------------------------------------

  function removeQr() {
    updateMethod("qr_image_url", "")
    setMessage("QR image removed. Click SAVE.")
  }

  // ------------------------------------------------------------
  // LOGO IMAGE
  // ------------------------------------------------------------

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
      setError(
        "Logo must be JPG, PNG or WEBP."
      )
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

  // ------------------------------------------------------------
  // SAVE LOGO
  // ------------------------------------------------------------

  async function saveLogo() {
    setSavingLogo(true)
    setMessage("")
    setError("")

    try {
      const response = await fetch(
        "/api/site-settings",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            logo_url: logoUrl,
          }),
        }
      )

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

  // ------------------------------------------------------------
  // REMOVE LOGO
  // ------------------------------------------------------------

  async function removeLogo() {
    setLogoUrl("")
    setLogoFile(null)

    setSavingLogo(true)
    setMessage("")
    setError("")

    try {
      const response = await fetch(
        "/api/site-settings",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            logo_url: "",
          }),
        }
      )

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

  // ------------------------------------------------------------
  // UPDATE ORDER STATUS
  // ------------------------------------------------------------

  async function updateOrderStatus(
    orderId: number | string,
    status: "pending" | "confirmed" | "failed"
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
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            id: orderId,
            status,
          }),
        }
      )

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Unable to update payment status."
        )
      }

      setMessage(
        `Order #${orderId} marked ${status}.`
      )

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

  // ------------------------------------------------------------
  // LOGOUT
  // ------------------------------------------------------------

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

  // ------------------------------------------------------------
  // LOADING SCREEN
  // ------------------------------------------------------------

  if (checkingAuth) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl font-black tracking-widest text-red-500">
            KAKOBUY
          </div>

          <p className="mt-3 text-gray-400">
            Checking admin access...
          </p>
        </div>
      </main>
    )
  }

  // ------------------------------------------------------------
  // NOT LOGGED IN
  // ------------------------------------------------------------

  if (!authorized) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center px-5">
        <div className="w-full max-w-md rounded-3xl border border-red-500/30 bg-zinc-950 p-8 text-center shadow-2xl shadow-red-950/30">
          <div className="text-4xl font-black tracking-widest text-red-500">
            KAKOBUY
          </div>

          <h1 className="mt-6 text-2xl font-bold">
            Admin Login Required
          </h1>

          <p className="mt-3 text-gray-400">
            You need to log in before opening the
            admin dashboard.
          </p>

          <button
            onClick={() =>
              (window.location.href =
                "/admin/login")
            }
            className="mt-7 w-full rounded-xl bg-red-600 py-4 font-bold text-white transition hover:bg-red-500 active:scale-[0.98]"
          >
            LOGIN
          </button>

          <button
            onClick={() =>
              (window.location.href = "/")
            }
            className="mt-3 w-full rounded-xl border border-zinc-700 py-4 font-semibold text-gray-300 transition hover:bg-zinc-900"
          >
            GO BACK
          </button>
        </div>
      </main>
    )
  }

  // ------------------------------------------------------------
  // MAIN DASHBOARD
  // ------------------------------------------------------------

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-red-600/10 blur-3xl" />
        <div className="absolute -right-32 top-1/3 h-96 w-96 rounded-full bg-red-700/10 blur-3xl" />
      </div>

      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-black/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Kakobuy"
                className="h-10 w-10 rounded-xl object-cover border border-red-500/30"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 font-black">
                K
              </div>
            )}

            <div>
              <div className="font-black tracking-wider">
                KAKOBUY
              </div>

              <div className="text-xs text-gray-500">
                Admin Dashboard
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://kakobuy-mini.vercel.app/"
              target="_blank"
              rel="noreferrer"
              className="hidden rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold text-gray-300 hover:bg-zinc-900 sm:block"
            >
              PAGE 2
            </a>

            <a
              href="https://kakobuy-payment-page.vercel.app/"
              target="_blank"
              rel="noreferrer"
              className="hidden rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold text-gray-300 hover:bg-zinc-900 sm:block"
            >
              PAGE 3
            </a>

            <button
              onClick={logout}
              className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold hover:bg-red-500"
            >
              LOGOUT
            </button>
          </div>
        </div>
      </header>

      <div className="relative mx-auto max-w-7xl px-4 py-6">
        {/* TITLE */}
        <section className="mb-6">
          <h1 className="text-3xl font-black sm:text-4xl">
            Payment Control
          </h1>

          <p className="mt-2 text-sm text-gray-400">
            Manage Kakobuy payment methods, QR codes,
            shared logo and buyer payment submissions.
          </p>
        </section>

        {/* MESSAGES */}
        {message && (
          <div className="mb-5 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-10 text-center text-gray-400">
            Loading admin dashboard...
          </div>
        ) : (
          <div className="space-y-8">
            {/* ------------------------------------------------ */}
            {/* SHARED LOGO */}
            {/* ------------------------------------------------ */}

            <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-xl">
              <div className="mb-5">
                <h2 className="text-xl font-black">
                  Shared Kakobuy Logo
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  This logo can appear across your
                  Kakobuy payment pages.
                </p>
              </div>

              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-zinc-700 bg-black">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Kakobuy logo preview"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <span className="text-4xl font-black text-red-500">
                      K
                    </span>
                  )}
                </div>

                <div className="flex-1">
                  <label className="mb-2 block text-sm font-semibold">
                    Upload Logo
                  </label>

                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleLogoImage}
                    className="block w-full rounded-xl border border-zinc-700 bg-black p-3 text-sm text-gray-300 file:mr-4 file:rounded-lg file:border-0 file:bg-red-600 file:px-4 file:py-2 file:font-bold file:text-white"
                  />

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={saveLogo}
                      disabled={savingLogo}
                      className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold hover:bg-red-500 disabled:opacity-50"
                    >
                      {savingLogo
                        ? "SAVING..."
                        : "SAVE LOGO"}
                    </button>

                    <button
                      onClick={removeLogo}
                      disabled={savingLogo}
                      className="rounded-xl border border-zinc-700 px-5 py-3 text-sm font-bold text-gray-300 hover:bg-zinc-900 disabled:opacity-50"
                    >
                      REMOVE
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* ------------------------------------------------ */}
            {/* PAYMENT METHODS */}
            {/* ------------------------------------------------ */}

            <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-xl">
              <div className="mb-5">
                <h2 className="text-xl font-black">
                  Payment Methods
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Choose a coin and edit the information
                  buyers see on Page 3.
                </p>
              </div>

              {/* COIN BUTTONS */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
                      className={`rounded-xl border p-4 text-left transition ${
                        selected
                          ? "border-red-500 bg-red-600/10 shadow-lg shadow-red-950/30"
                          : "border-zinc-800 bg-black hover:border-zinc-600"
                      }`}
                    >
                      <div
                        className={`text-2xl font-black ${
                          selected
                            ? "text-red-500"
                            : "text-gray-400"
                        }`}
                      >
                        {coin.symbol}
                      </div>

                      <div className="mt-2 text-sm font-bold">
                        {coin.name}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* FORM */}
              <div className="mt-7 space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold">
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
                    className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Wallet Address
                  </label>

                  <textarea
                    value={
                      currentMethod.wallet_address
                    }
                    onChange={(event) =>
                      updateMethod(
                        "wallet_address",
                        event.target.value
                      )
                    }
                    rows={3}
                    placeholder="Enter wallet address"
                    className="w-full resize-none rounded-xl border border-zinc-700 bg-black px-4 py-3 font-mono text-sm text-white outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Payment Information
                  </label>

                  <textarea
                    value={
                      currentMethod.information
                    }
                    onChange={(event) =>
                      updateMethod(
                        "information",
                        event.target.value
                      )
                    }
                    rows={4}
                    placeholder="Payment instructions..."
                    className="w-full resize-none rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm text-white outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Hero Heading
                  </label>

                  <input
                    value={
                      currentMethod.hero_heading
                    }
                    onChange={(event) =>
                      updateMethod(
                        "hero_heading",
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Hero Subtitle
                  </label>

                  <textarea
                    value={
                      currentMethod.hero_subtitle
                    }
                    onChange={(event) =>
                      updateMethod(
                        "hero_subtitle",
                        event.target.value
                      )
                    }
                    rows={3}
                    className="w-full resize-none rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Footer Text
                  </label>

                  <input
                    value={
                      currentMethod.footer_text
                    }
                    onChange={(event) =>
                      updateMethod(
                        "footer_text",
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none focus:border-red-500"
                  />
                </div>

                {/* QR */}
                <div className="rounded-2xl border border-zinc-800 bg-black p-4">
                  <div className="mb-4">
                    <h3 className="font-bold">
                      QR Code
                    </h3>

                    <p className="mt-1 text-xs text-gray-500">
                      JPG, PNG or WEBP. Maximum 5MB.
                    </p>
                  </div>

                  {currentMethod.qr_image_url ? (
                    <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center">
                      <div className="flex h-48 w-48 items-center justify-center overflow-hidden rounded-xl border border-zinc-700 bg-white">
                        <img
                          src={
                            currentMethod.qr_image_url
                          }
                          alt={`${currentMethod.name} QR code`}
                          className="h-full w-full object-contain"
                        />
                      </div>

                      <button
                        onClick={removeQr}
                        className="rounded-xl border border-red-500/40 px-4 py-3 text-sm font-bold text-red-400 hover:bg-red-500/10"
                      >
                        REMOVE QR
                      </button>
                    </div>
                  ) : (
                    <div className="mb-4 rounded-xl border border-dashed border-zinc-700 p-8 text-center text-sm text-gray-500">
                      No QR code uploaded.
                    </div>
                  )}

                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleQrImage}
                    className="block w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-sm text-gray-300 file:mr-4 file:rounded-lg file:border-0 file:bg-red-600 file:px-4 file:py-2 file:font-bold file:text-white"
                  />
                </div>

                <button
                  onClick={savePaymentMethod}
                  disabled={saving}
                  className="w-full rounded-xl bg-red-600 py-4 font-black text-white shadow-lg shadow-red-950/30 transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "SAVING..."
                    : `SAVE ${currentMethod.name.toUpperCase()} SETTINGS`}
                </button>
              </div>
            </section>

            {/* ------------------------------------------------ */}
            {/* ORDERS / PAYMENT SUBMISSIONS */}
            {/* ------------------------------------------------ */}

            <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-xl">
              <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-xl font-black">
                    Payment Submissions
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Review buyer transaction screenshots
                    and confirm or reject payments.
                  </p>
                </div>

                <button
                  onClick={loadOrders}
                  disabled={loadingOrders}
                  className="rounded-xl border border-zinc-700 px-4 py-3 text-sm font-bold hover:bg-zinc-900 disabled:opacity-50"
                >
                  {loadingOrders
                    ? "REFRESHING..."
                    : "REFRESH"}
                </button>
              </div>

              {orders.length === 0 ? (
                <div className="rounded-xl border border-zinc-800 bg-black p-8 text-center">
                  <div className="text-3xl">📭</div>

                  <p className="mt-3 font-bold">
                    No payment submissions
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    New buyer payment submissions will
                    appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
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
                        className="overflow-hidden rounded-2xl border border-zinc-800 bg-black"
                      >
                        <div className="p-4">
                          <div className="flex flex-col justify-between gap-4 sm:flex-row">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-lg font-black">
                                  Order #{order.id}
                                </span>

                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
                                    status === "confirmed"
                                      ? "bg-green-500/10 text-green-400"
                                      : status === "failed"
                                      ? "bg-red-500/10 text-red-400"
                                      : "bg-yellow-500/10 text-yellow-400"
                                  }`}
                                >
                                  {status}
                                </span>
                              </div>

                              <div className="mt-3 space-y-1 text-sm">
                                <p>
                                  <span className="text-gray-500">
                                    Product:
                                  </span>{" "}
                                  {product}
                                </p>

                                <p>
                                  <span className="text-gray-500">
                                    Customer:
                                  </span>{" "}
                                  {customer}
                                </p>

                                {order.email && (
                                  <p className="break-all">
                                    <span className="text-gray-500">
                                      Email:
                                    </span>{" "}
                                    {order.email}
                                  </p>
                                )}

                                <p>
                                  <span className="text-gray-500">
                                    Payment:
                                  </span>{" "}
                                  {paymentMethod}
                                </p>

                                <p>
                                  <span className="text-gray-500">
                                    Total:
                                  </span>{" "}
                                  {total}
                                </p>

                                {created && (
                                  <p className="text-xs text-gray-600">
                                    {new Date(
                                      created
                                    ).toLocaleString()}
                                  </p>
                                )}
                              </div>
                            </div>

                            {image && (
                              <a
                                href={image}
                                target="_blank"
                                rel="noreferrer"
                                className="block"
                              >
                                <img
                                  src={image}
                                  alt="Transaction screenshot"
                                  className="h-40 w-40 rounded-xl border border-zinc-700 object-cover"
                                />
                              </a>
                            )}
                          </div>

                          {/* STATUS BUTTONS */}
                          <div className="mt-5 grid grid-cols-3 gap-2">
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
                              className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 px-3 py-3 text-xs font-bold text-yellow-400 hover:bg-yellow-500/10 disabled:opacity-50"
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
                              className="rounded-xl border border-green-500/30 bg-green-500/5 px-3 py-3 text-xs font-bold text-green-400 hover:bg-green-500/10 disabled:opacity-50"
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
                              className="rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-3 text-xs font-bold text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                            >
                              FAILED
                            </button>
                          </div>
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
    </main>
  )
}
