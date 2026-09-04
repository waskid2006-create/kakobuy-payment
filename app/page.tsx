"use client"

import { useEffect, useState } from "react"

const paymentMethods = [
  { id: "bitcoin", name: "Bitcoin", symbol: "₿" },
  { id: "ethereum", name: "Ethereum", symbol: "Ξ" },
  { id: "tron", name: "TRON", symbol: "TRX" },
  { id: "binance", name: "Binance", symbol: "BNB" },
]

export default function Home() {
  const [selected, setSelected] = useState("bitcoin")
  const [copied, setCopied] = useState(false)
  const [information, setInformation] = useState("")
  const [qrImage, setQrImage] = useState("")
  const [loading, setLoading] = useState(true)

  const selectedMethod = paymentMethods.find(
    (item) => item.id === selected
  )

  useEffect(() => {
    async function loadPaymentMethod() {
      setLoading(true)
      setInformation("")
      setQrImage("")
      setCopied(false)

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
            data.error || "Unable to load payment information"
          )
        }

        setInformation(data.information || "")
        setQrImage(data.qr_image_url || "")
      } catch (error) {
        console.error("Payment method loading error:", error)
        setInformation("")
        setQrImage("")
      } finally {
        setLoading(false)
      }
    }

    loadPaymentMethod()
  }, [selected])

  function copyInfo() {
    if (!information) return

    navigator.clipboard.writeText(information)
    setCopied(true)

    setTimeout(() => {
      setCopied(false)
    }, 2000)
  }

  return (
    <main className="page">
      <div className="container">

        <header className="header">
          <h1>
            <span className="kako">KAKO</span>
            <span className="buy">BUY</span>
          </h1>

          <p>Select your payment method</p>
        </header>

        <div className="methods">
          {paymentMethods.map((method) => (
            <button
              key={method.id}
              onClick={() => setSelected(method.id)}
              className={`method ${
                selected === method.id ? "selected" : ""
              }`}
              type="button"
            >
              <span className="symbol">{method.symbol}</span>
              <span className="name">{method.name}</span>
            </button>
          ))}
        </div>

        <section className="payment-card">
          <div className="card-title">
            <div>
              <span className="small-title">
                PAYMENT METHOD
              </span>

              <h2>{selectedMethod?.name}</h2>
            </div>

            <div className="active-dot" />
          </div>

          <div className="info-box">
            <p className="label">Payment information</p>

            <p className="info">
              {loading
                ? "Loading..."
                : information || "No payment information available."}
            </p>
          </div>

          <button
            className="copy-button"
            onClick={copyInfo}
            disabled={loading || !information}
            type="button"
          >
            {copied
              ? "✓ Copy successful"
              : "Copy information"}
          </button>

          <div className="qr-box">
            {loading ? (
              <>
                <div className="qr-icon">▦</div>
                <p>QR CODE</p>
                <span>Loading QR image...</span>
              </>
            ) : qrImage ? (
              <>
                <img
                  src={qrImage}
                  alt={`${selectedMethod?.name} QR Code`}
                  style={{
                    display: "block",
                    width: "220px",
                    height: "220px",
                    maxWidth: "100%",
                    objectFit: "contain",
                    margin: "0 auto 15px",
                    background: "#fff",
                    borderRadius: "10px",
                  }}
                />

                <p>QR CODE</p>
                <span>Scan to make payment</span>
              </>
            ) : (
              <>
                <div className="qr-icon">▦</div>
                <p>QR CODE</p>
                <span>QR image not available</span>
              </>
            )}
          </div>
        </section>

        <div className="notice">
          <span>!</span>

          <p>
            Please make sure you select the correct payment
            method before continuing.
          </p>
        </div>

        <p className="footer">
          <span>KAKO</span>BUY
        </p>

      </div>
    </main>
  )
}
