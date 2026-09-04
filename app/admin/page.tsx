"use client"

import { useEffect, useState } from "react"

const methods = [
  { id: "bitcoin", name: "Bitcoin", symbol: "₿" },
  { id: "ethereum", name: "Ethereum", symbol: "Ξ" },
  { id: "tron", name: "TRON", symbol: "TRX" },
  { id: "binance", name: "Binance", symbol: "BNB" },
]

export default function AdminPage() {
  const [selected, setSelected] = useState("bitcoin")
  const [information, setInformation] = useState("")
  const [qrPreview, setQrPreview] = useState("")
  const [qrFile, setQrFile] = useState<File | null>(null)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const current = methods.find((item) => item.id === selected)

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
            data.error || "Unable to load payment method"
          )
        }

        setInformation(data.information || "")

        if (data.qr_image_url) {
          setQrPreview(data.qr_image_url)
        }
      } catch (error) {
        console.error("Load error:", error)

        setInformation("")
      } finally {
        setLoading(false)
      }
    }

    loadInformation()
  }, [selected])

  function handleQrChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0]

    if (!file) return

    if (!file.type.startsWith("image/")) {
      alert("Please choose an image file.")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("QR image must be smaller than 5 MB.")
      return
    }

    setQrFile(file)

    const previewUrl = URL.createObjectURL(file)
    setQrPreview(previewUrl)
    setSaved(false)
  }

  async function saveChanges() {
    if (saving) return

    setSaving(true)
    setSaved(false)

    try {
      const formData = new FormData()

      formData.append("id", selected)
      formData.append("information", information)

      if (qrFile) {
        formData.append("qr", qrFile)
      }

      const response = await fetch(
        "/api/payment-methods",
        {
          method: "PUT",
          body: formData,
        }
      )

      const text = await response.text()

      let data: any = {}

      try {
        data = JSON.parse(text)
      } catch {
        data = {
          error: text || "Server returned an invalid response",
        }
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            `Save failed with status ${response.status}`
        )
      }

      if (data.qr_image_url) {
        setQrPreview(data.qr_image_url)
      }

      setQrFile(null)
      setSaved(true)

      setTimeout(() => {
        setSaved(false)
      }, 3000)
    } catch (error) {
      console.error("Save error:", error)

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

          <a href="/" className="back-button">
            View page
          </a>
        </div>

        <section className="admin-card">
          <h2>Payment Methods</h2>

          <p className="admin-description">
            Select a method to edit its payment information.
          </p>

          <div className="admin-methods">
            {methods.map((method) => (
              <button
                key={method.id}
                onClick={() => setSelected(method.id)}
                className={`admin-method ${
                  selected === method.id
                    ? "admin-selected"
                    : ""
                }`}
                type="button"
              >
                <strong>{method.symbol}</strong>
                <span>{method.name}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="admin-card">

          <div className="admin-title">
            <div>
              <p className="admin-label">EDITING</p>
              <h2>{current?.name}</h2>
            </div>
          </div>

          <label className="field-label">
            Payment information
          </label>

          <textarea
            value={information}
            onChange={(event) =>
              setInformation(event.target.value)
            }
            className="admin-textarea"
            placeholder="Enter payment information"
            disabled={loading || saving}
          />

          <label className="field-label">
            QR Code Image
          </label>

          <div className="upload-box">

            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleQrChange}
              disabled={loading || saving}
            />

            <p>Choose QR image</p>

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
                  margin: "0 0 10px",
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
            disabled={loading || saving}
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
    </main>
  )
}
