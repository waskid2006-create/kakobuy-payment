"use client"

import { FormEvent, useState } from "react"

export default function AdminLoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleLogin(event: FormEvent) {
    event.preventDefault()

    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/admin-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.error || "Login failed.")
        return
      }

      window.location.href = "/admin"
    } catch {
      setError("Unable to connect to the server.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, rgba(255,0,0,.2), transparent 40%), #050505",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#0d0d0d",
          border: "1px solid rgba(255,0,0,.35)",
          borderRadius: 22,
          padding: 30,
          boxShadow: "0 0 45px rgba(255,0,0,.15)",
        }}
      >
        <h1
          style={{
            textAlign: "center",
            margin: 0,
            fontSize: 30,
            fontWeight: 900,
            letterSpacing: 2,
          }}
        >
          KAKOBUY
        </h1>

        <p
          style={{
            textAlign: "center",
            color: "#999",
            marginBottom: 30,
          }}
        >
          Administrator Access
        </p>

        <form onSubmit={handleLogin}>
          <label>Username</label>

          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
            style={{
              width: "100%",
              boxSizing: "border-box",
              marginTop: 8,
              marginBottom: 18,
              padding: 14,
              borderRadius: 12,
              border: "1px solid #333",
              background: "#151515",
              color: "#fff",
            }}
          />

          <label>Password</label>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            style={{
              width: "100%",
              boxSizing: "border-box",
              marginTop: 8,
              marginBottom: 18,
              padding: 14,
              borderRadius: 12,
              border: "1px solid #333",
              background: "#151515",
              color: "#fff",
            }}
          />

          {error && (
            <div
              style={{
                color: "#ff5555",
                background: "rgba(255,0,0,.1)",
                border: "1px solid rgba(255,0,0,.3)",
                borderRadius: 10,
                padding: 12,
                marginBottom: 16,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: 14,
              border: 0,
              borderRadius: 12,
              background: "#e00000",
              color: "#fff",
              fontWeight: 800,
              fontSize: 15,
            }}
          >
            {loading ? "LOGGING IN..." : "LOGIN"}
          </button>
        </form>
      </div>
    </main>
  )
}
