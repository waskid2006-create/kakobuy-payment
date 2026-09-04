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

  const current = methods.find((item) => item.id === selected)

  useEffect(() => {
    async function loadInformation() {
      setLoading(true)
      setQrPreview("")
      setQrFile(null)

      try {
        const response = await fetch(
          `/api/payment-methods?id=${selected}`
        )

        const data = await response.json()

        setInformation(
          data.information ||
            "Payment information will appear here."
        )

        if (data.qr_image_url) {
          setQrPreview(data.qr_image_url)
        }
      } catch {
        setInformation(
          "Payment information will appear here."
        )
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

    setQrFile(file)

    const previewUrl = URL.createObjectURL(file)
    setQrPreview(previewUrl)
  }

  async function saveChanges() {
    try {
      let qrImageUrl = qrPreview

      /*
       * If an image was selected, upload it through the API.
       */
      if (qrFile) {
        const formData = new FormData()
        formData.append("id", selected)
        formData.append("information", information)
        formData.append("qr", qrFile)

        const uploadResponse = await fetch(
          "/api/payment-methods",
          {
            method: "PUT",
            body: formData,
          }
        )

        if (!uploadResponse.ok) {
          throw new Error("Failed to save")
        }

        const data = await uploadResponse.json()

        qrImageUrl = data.qr_image_url || qrPreview
      } else {
        const response = await fetch(
          "/api/payment-methods",
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              id: selected,
              information,
              qr_image_url: qrImageUrl,
            }),
          }
        )

        if (!response.ok) {
          throw new Error("Failed to save")
        }
      }

      setQrPreview(qrImageUrl)
      setQrFile(null)
      setSaved(true)

      setTimeout(() => {
        setSaved(false)
      }, 2000)
    } catch (error) {
      console.error(error)
      alert("Unable to save changes.")
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
            disabled={loading}
          />

          <label className="field-label">
            QR Code Image
          </label>

          <div className="upload-box">

            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleQrChange}
              disabled={loading}
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
            disabled={loading}
          >
            {saved
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
