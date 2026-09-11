"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function AdminLoginPage() {
  const router = useRouter()

  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleLogin(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    if (!password.trim()) {
      setError("Enter your admin password.")
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await fetch(
        "/api/admin-login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            password,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(
          data?.error || "Login failed."
        )
      }

      router.replace("/admin")
      router.refresh()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Login failed."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <div className="logo">
          <span>KAKO</span>BUY
        </div>

        <p className="label">
          ADMIN ACCESS
        </p>

        <h1>
          Admin Login
        </h1>

        <p className="description">
          Enter your password to access
          the Kakobuy payment admin.
        </p>

        <form onSubmit={handleLogin}>
          <label>
            Password
          </label>

          <input
            type="password"
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
            placeholder="Enter admin password"
            autoComplete="current-password"
            disabled={loading}
          />

          {error && (
            <div className="error">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
          >
            {loading
              ? "LOGGING IN..."
              : "LOGIN"}
          </button>
        </form>

        <p className="footer">
          KAKOBUY PAYMENT ADMIN
        </p>
      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .login-page {
          min-height: 100vh;
          background: #080808;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          font-family:
            Inter,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        .login-card {
          width: 100%;
          max-width: 420px;
          background: #101010;
          border: 1px solid #292929;
          border-radius: 18px;
          padding: 28px 22px;
        }

        .logo {
          font-size: 28px;
          font-weight: 900;
          letter-spacing: -0.04em;
          margin-bottom: 25px;
        }

        .logo span {
          color: #ff3030;
        }

        .label {
          color: #777;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.13em;
          margin: 0 0 7px;
        }

        h1 {
          margin: 0;
          font-size: 25px;
        }

        .description {
          color: #777;
          font-size: 12px;
          line-height: 1.6;
          margin: 8px 0 25px;
        }

        label {
          display: block;
          color: #aaa;
          font-size: 11px;
          font-weight: 700;
          margin-bottom: 8px;
        }

        input {
          width: 100%;
          border: 1px solid #292929;
          background: #080808;
          color: #fff;
          border-radius: 10px;
          outline: none;
          padding: 14px;
          font-size: 14px;
        }

        input:focus {
          border-color: #ff3030;
          box-shadow:
            0 0 0 2px
            rgba(255, 48, 48, 0.08);
        }

        .error {
          margin-top: 10px;
          padding: 11px;
          border-radius: 9px;
          border: 1px solid
            rgba(255, 48, 48, 0.35);
          background: rgba(255, 48, 48, 0.08);
          color: #ff7777;
          font-size: 11px;
        }

        button {
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

        button:hover {
          background: #ff4545;
        }

        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .footer {
          text-align: center;
          color: #444;
          font-size: 9px;
          margin: 22px 0 0;
          letter-spacing: 0.08em;
        }
      `}</style>
    </main>
  )
}
