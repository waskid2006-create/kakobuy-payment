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

  const current = methods.find(
    (item) => item.id === selected
  )

  /* ==================== 5. LOAD PAGE 3 SETTINGS ==================== */

  useEffect(() => {
    let cancelled = false

    async function loadInformation() {
      setLoading(true)
      setSaved(false)
      setError("")
      setQrFile(null)

      /*
       * Clear the old cryptocurrency data
       * before loading the newly selected one.
       */
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

        /*
         * Your API returns:
         *
         * {
         *   paymentMethod: {...}
         * }
         *
         * But this also supports APIs that
         * return the object directly.
         */
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

  /* ==================== 6. QR PREVIEW CLEANUP ==================== */

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

  /* ==================== 7. LOAD ORDER STATUS ==================== */

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

      setStatusSaved(false)
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

  /* ==================== 8. SAVE ORDER PAYMENT STATUS ==================== */

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

      setPaymentStatus(
        data?.order?.payment_status ||
          paymentStatus
      )

      setStatusSaved(true)

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

  /* ==================== 9. HANDLE QR IMAGE ==================== */

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

    /*
     * Remove the previous temporary
     * browser preview if there was one.
     */
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

  /* ==================== 10. SAVE PAGE 3 CHANGES ==================== */

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

      /*
       * Cryptocurrency being edited.
       */
      formData.append(
        "id",
        selected
      )

      /*
       * Payment information shown
       * on Page 3.
       */
      formData.append(
        "information",
        information
      )

      /*
       * Wallet address shown
       * on Page 3.
       */
      formData.append(
        "wallet_address",
        walletAddress.trim()
      )

      /*
       * Page 3 hero heading.
       */
      formData.append(
        "hero_heading",
        heroHeading
      )

      /*
       * Page 3 hero subtitle.
       */
      formData.append(
        "hero_subtitle",
        heroSubtitle
      )

      /*
       * Page 3 footer.
       */
      formData.append(
        "footer_text",
        footerText
      )

      /*
       * Only upload a QR image when
       * the admin selected a new file.
       */
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

      /*
       * Keep the value returned by
       * the server.
       */
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

      /*
       * If the API returns a new QR URL,
       * use it immediately.
       */
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

        {/* ==================== 11. ADMIN HEADER ==================== */}

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

        {/* ==================== 12. ADMIN NAVIGATION ==================== */}

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

        {/* ==================== 13. ERROR MESSAGE ==================== */}

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

        {/* ==================== 14. PAYMENT STATUS ==================== */}

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

        {/* ==================== 15. CRYPTOCURRENCY SELECTOR ==================== */}

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

        {/* ==================== 16. PAGE 3 EDITOR ==================== */}

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

          {/* ==================== 17. WALLET ADDRESS ==================== */}

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

          {/* ==================== 18. HERO HEADING ==================== */}

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

          {/* ==================== 19. HERO SUBTITLE ==================== */}

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

          {/* ==================== 20. FOOTER TEXT ==================== */}

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

          {/* ==================== 21. PAYMENT INFORMATION ==================== */}

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

          {/* ==================== 22. QR CODE ==================== */}

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

          {/* ==================== 23. SAVE PAGE 3 ==================== */}

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

      {/* ==================== 25. PAGE 3 ADMIN STYLES ==================== */}

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .admin-page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at top left,
              rgba(
                255,
                48,
                48,
                0.12
              ),
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
          grid-template-columns: repeat(
            3,
            1fr
          );
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
          transition: 0.2s ease;
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
          border: 1px solid
            rgba(
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
          white-space: nowrap;
        }

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

        .field-help {
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

        .wallet-help {
          color: #666;
          font-size: 10px;
          line-height: 1.5;
          margin: 7px 2px 0;
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

        .status-option.pending
          .status-icon {
          color: #d7a82c;
        }

        .status-option.confirmed
          .status-icon {
          color: #20b66b;
        }

        .status-option.failed
          .status-icon {
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
          transition: 0.2s ease;
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
        }
      `}</style>
    </main>
  )
}
