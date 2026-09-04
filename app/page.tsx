"use client"

import { useState } from "react"

const paymentMethods = [
  { id: "bitcoin", name: "Bitcoin", symbol: "₿" },
  { id: "ethereum", name: "Ethereum", symbol: "Ξ" },
  { id: "tron", name: "TRON", symbol: "TRX" },
  { id: "binance", name: "Binance", symbol: "BNB" },
]

export default function Home() {
  const [selected, setSelected] = useState("bitcoin")
  const [copied, setCopied] = useState(false)

  const selectedMethod = paymentMethods.find(
    (item) => item.id === selected
  )

  function copyInfo() {
    navigator.clipboard.writeText("PAYMENT INFORMATION")
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
            >
              <span className="symbol">{method.symbol}</span>
              <span className="name">{method.name}</span>
            </button>
          ))}
        </div>

        <section className="payment-card">
          <div className="card-title">
            <div>
              <span className="small-title">PAYMENT METHOD</span>
              <h2>{selectedMethod?.name}</h2>
            </div>

            <div className="active-dot" />
          </div>

          <div className="info-box">
            <p className="label">Payment information</p>

            <p className="info">
              Payment information will appear here.
            </p>
          </div>

          <button
            className="copy-button"
            onClick={copyInfo}
          >
            {copied ? "✓ Copy successful" : "Copy information"}
          </button>

          <div className="qr-box">
            <div className="qr-icon">▦</div>
            <p>QR CODE</p>
            <span>QR image will appear here</span>
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
