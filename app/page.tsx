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

  const selectedMethod = paymentMethods.find((item) => item.id === selected)

  function copyInfo() {
    navigator.clipboard.writeText("PAYMENT INFORMATION")
    setCopied(true)

    setTimeout(() => {
      setCopied(false)
    }, 2000)
  }

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white">
      <div className="mx-auto max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-black tracking-tight">KAKOBUY</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Select your payment method
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {paymentMethods.map((method) => (
            <button
              key={method.id}
              onClick={() => setSelected(method.id)}
              className={`rounded-2xl border p-4 text-left transition ${
                selected === method.id
                  ? "border-white bg-white text-black"
                  : "border-zinc-800 bg-zinc-950 hover:border-zinc-600"
              }`}
            >
              <div className="text-2xl font-black">{method.symbol}</div>
              <div className="mt-2 text-sm font-bold">{method.name}</div>
            </button>
          ))}
        </div>

        <section className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-xl font-bold">{selectedMethod?.name}</h2>

          <div className="mt-5 rounded-xl bg-zinc-900 p-4">
            <p className="mb-2 text-xs uppercase tracking-wider text-zinc-500">
              Payment information
            </p>

            <p className="break-all text-sm text-zinc-300">
              Payment information will appear here.
            </p>
          </div>

          <button
            onClick={copyInfo}
            className="mt-4 w-full rounded-xl bg-white py-3 font-bold text-black transition hover:bg-zinc-200"
          >
            {copied ? "✓ Copy successful" : "Copy information"}
          </button>

          <div className="mt-5 rounded-xl border border-dashed border-zinc-700 p-8 text-center">
            <p className="text-sm text-zinc-500">QR code</p>
            <p className="mt-1 text-xs text-zinc-600">
              QR image will appear here
            </p>
          </div>
        </section>

        <p className="mt-6 text-center text-xs text-zinc-600">
          Kakobuy
        </p>
      </div>
    </main>
  )
  }
