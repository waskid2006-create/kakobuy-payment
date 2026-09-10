"use client"

import { useEffect, useState } from "react"

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

export default function AdminPage() {
  const [selected, setSelected] =
    useState("bitcoin")

  const [information, setInformation] =
    useState("")

  const [heroHeading, setHeroHeading] =
    useState("PAY WITH CRYPTO")

  const [heroSubtitle, setHeroSubtitle] =
    useState(
      "Secure and simple crypto payment"
    )

  const [footerText, setFooterText] =
    useState("KAKOBUY")

  const [qrPreview, setQrPreview] =
    useState("")

  const [qrFile, setQrFile] =
    useState<File | null>(null)

  const [saved, setSaved] =
    useState(false)

  const [loading, setLoading] =
    useState(true)

  const [saving, setSaving] =
    useState(false)

  /* PAYMENT STATUS */
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

  useEffect(() => {
    async function loadInformation() {
      setLoading(true)
      setSaved(false)
      setQrPreview("")
      setQrFile(null)

      try {
        const response = await fetch(
          `/api/payment-methods?id=${selected}`,
          {
            cache: "no-store",
          }
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Unable to load payment method"
          )
        }

        setInformation(
          data.information || ""
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

        if (data.qr_image_url) {
          setQrPreview(
            data.qr_image_url
          )
        }
      } catch (error) {
        console.error(
          "Load error:",
          error
        )

        setInformation("")
        setHeroHeading("PAY WITH CRYPTO")
        setHeroSubtitle(
          "Secure and simple crypto payment"
        )
        setFooterText("KAKOBUY")
      } finally {
        setLoading(false)
      }
    }

    loadInformation()
  }, [selected])

  /*
   * Load the current status of the order.
   */
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
          cache: "no-store",
        }
      )

      const data = await response.json()

      if (!response.ok || !data.order) {
        throw new Error(
          data.error ||
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
    } catch (error) {
      console.error(
        "Order status error:",
        error
      )

      alert(
        error instanceof Error
          ? error.message
          : "Unable to load order status."
      )
    }
  }

  /*
   * Save payment status for the order.
   */
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

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to save payment status."
        )
      }

      setPaymentStatus(
        data.order?.payment_status ||
          paymentStatus
      )

      setStatusSaved(true)

      window.setTimeout(() => {
        setStatusSaved(false)
      }, 3000)
    } catch (error) {
      console.error(
        "Save payment status error:",
        error
      )

      alert(
        error instanceof Error
          ? error.message
          : "Unable to save payment status."
      )
    } finally {
      setStatusSaving(false)
    }
  }

  function handleQrChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0]

    if (!file) return

    if (!file.type.startsWith("image/")) {
      alert(
        "Please choose an image file."
      )
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert(
        "QR image must be smaller than 5 MB."
      )
      return
    }

    setQrFile(file)

    const previewUrl =
      URL.createObjectURL(file)

    setQrPreview(previewUrl)
    setSaved(false)
  }

  async function saveChanges() {
    if (saving) return

    setSaving(true)
    setSaved(false)

    try {
      const formData = new FormData()

      formData.append(
        "id",
        selected
      )

      formData.append(
        "information",
        information
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
        data = {
          error:
            text ||
            "Server returned an invalid response",
        }
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            `Save failed with status ${response.status}`
        )
      }

      if (data.qr_image_url) {
        setQrPreview(
          data.qr_image_url
        )
      }

      setQrFile(null)
      setSaved(true)

      setTimeout(() => {
        setSaved(false)
      }, 3000)
    } catch (error) {
      console.error(
        "Save error:",
        error
      )

      alert(
        error instanceof Error
          ? error.message
          : "Unable to save changes."
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="admin-page">
      <div className="admin-container">

        <div className="admin-header">
          <div>
            <h1>
              <span>KAKO</span>BUY
            </h1>

            <p>Admin Panel</p>
          </div>

          <a
            href="/"
            className="back-button"
          >
            View page
          </a>
        </div>

        {/* PAYMENT STATUS CONTROL */}

        <section className="admin-card status-card">

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
            Set the payment status for a
            customer's order. The buyer's
            Page 3 will receive this status.
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
              Load
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
              ? "Saving status..."
              : statusSaved
                ? "✓ Status saved"
                : "Save payment status"}
          </button>

        </section>

        {/* PAYMENT METHODS */}

        <section className="admin-card">
          <h2>
            Payment Methods
          </h2>

          <p className="admin-description">
            Select a method to edit its
            payment information and
            payment-page appearance.
          </p>

          <div className="admin-methods">
            {methods.map((method) => (
              <button
                key={method.id}
                onClick={() =>
                  setSelected(method.id)
                }
                className={`admin-method ${
                  selected === method.id
                    ? "admin-selected"
                    : ""
                }`}
                type="button"
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
        </section>

        {/* PAYMENT METHOD EDITOR */}

        <section className="admin-card">

          <div className="admin-title">
            <div>
              <p className="admin-label">
                EDITING
              </p>

              <h2>
                {current?.name}
              </h2>
            </div>
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
            Payment information
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

          <label className="field-label">
            QR Code Image
          </label>

          <div className="upload-box">

            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleQrChange}
              disabled={
                loading || saving
              }
            />

            <p>
              Choose QR image
            </p>

            <span>
              PNG, JPG or WEBP
            </span>

          </div>

          {qrPreview && (
            <div
              style={{
                marginTop: "15px",
                padding: "15px",
                background: "#181818",
                borderRadius: "13px",
                textAlign: "center",
              }}
            >
              <p
                style={{
                  margin:
                    "0 0 10px",
                  color: "#999",
                  fontSize: "11px",
                  fontWeight: 700,
                }}
              >
                QR PREVIEW
              </p>

              <img
                src={qrPreview}
                alt={`${current?.name} QR Code`}
                style={{
                  display: "block",
                  width: "220px",
                  height: "220px",
                  maxWidth: "100%",
                  objectFit: "contain",
                  margin: "0 auto",
                  background: "#fff",
                  borderRadius: "10px",
                }}
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
              ? "Saving..."
              : saved
                ? "✓ Saved successfully"
                : "Save changes"}
          </button>

        </section>

        <p className="admin-footer">
          KAKO<span>BUY</span> Admin
        </p>

      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .admin-page {
          min-height: 100vh;
          background: #080808;
          color: #fff;
          padding: 25px 15px 50px;
          font-family:
            Inter,
            system-ui,
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
          margin-bottom: 18px;
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

        .admin-textarea {
          min-height: 110px;
          resize: vertical;
          line-height: 1.5;
        }

        .admin-input:focus,
        .admin-textarea:focus {
          border-color: #ff3030;
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
        }
      `}</style>
    </main>
  )
}
