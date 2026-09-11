"use client"

import { FormEvent, useState } from "react"

export default function AdminLoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleLogin(e: FormEvent) {
    e.preventDefault()

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
          "radial-gradient(circle at top, rgba(255,0,0,.18), transparent 35%), #050505",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "#0d0d0d",
          border: "1px solid rgba(255,0,0,.35)",
          borderRadius: "22px",
          padding: "30px",
          boxShadow: "0 0 45px rgba(255,0,0,.12)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div
            style={{
              fontSize: "30px",
              fontWeight: 900,
              letterSpacing: "2px",
            }}
          >
            KAKOBUY
          </div>

          <div
            style={{
              marginTop: "8px",
              color: "#aaa",
              fontSize: "14px",
            }}
          >
            Administrator Access
          </div>
        </div>

        <form onSubmit={handleLogin}>
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontSize: "14px",
              color: "#ccc",
            }}
          >
            Username
          </label>

          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "14px",
              marginBottom: "18px",
              borderRadius: "12px",
              border: "1px solid #333",
              background: "#151515",
              color: "white",
              outline: "none",
            }}
          />

          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontSize: "14px",
              color: "#ccc",
            }}
          >
            Password
          </label>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "14px",
              marginBottom: "18px",
              borderRadius: "12px",
              border: "1px solid #333",
              background: "#151515",
              color: "white",
              outline: "none",
            }}
          />

          {error && (
            <div
              style={{
                background: "rgba(255,0,0,.1)",
                border: "1px solid rgba(255,0,0,.3)",
                color: "#ff6b6b",
                padding: "12px",
                borderRadius: "10px",
                marginBottom: "16px",
                fontSize: "14px",
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
              padding: "14px",
              border: "none",
              borderRadius: "12px",
              background: "#e00000",
              color: "white",
              fontWeight: 800,
              fontSize: "15px",
              cursor: loading ? "wait" : "pointer",
            }}
          >
            {loading ? "LOGGING IN..." : "LOGIN"}
          </button>
        </form>
      </div>
    </main>
  )
            }
