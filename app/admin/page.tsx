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
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState("")
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  const current = methods.find((item) => item.id === selected)

  useEffect(() => {
    async function loadInformation() {
      setLoading(true)
      setSelectedFile(null)
      setPreview("")

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
          setPreview(data.qr_image_url)
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

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0]

    if (!file) return

    setSelectedFile(file)

    const imageUrl = URL.createObjectURL(file)
    setPreview(imageUrl)
  }

  async function saveChanges() {
    try {
      const response = await fetch("/api/payment-methods", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: selected,
          information,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save")
      }

      setSaved(true)

      setTimeout(() => {
        setSaved(false)
      }, 2000)
    } catch {
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

            {preview ? (
              <div>
                <img
                  src={preview}
                  alt="Selected QR preview"
                  style={{
                    width: "220px",
                    maxWidth: "100%",
                    borderRadius: "12px",
                    marginBottom: "15px",
                  }}
                />

                <p>Image selected</p>
              </div>
            ) : (
              <>
                <div className="qr-icon">▦</div>
                <p>Choose QR image</p>
                <span>PNG, JPG or WEBP</span>
              </>
            )}

            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileChange}
            />

          </div>

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
