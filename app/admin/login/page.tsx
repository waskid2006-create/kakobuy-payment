"use client"

import { useState } from "react"

export default function AdminLoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/admin-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          username,
          password,
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok || !data.success) {
        setError(data?.error || "Incorrect username or password.")
        return
      }

      window.location.href = "/admin"
    } catch (error) {
      console.error(error)
      setError("Unable to connect to the admin login.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          min-height: 100%;
          background: #050505;
        }

        body {
          font-family: Arial, Helvetica, sans-serif;
        }

        .kakobuy-login {
          min-height: 100vh;
          width: 100%;
          background:
            radial-gradient(circle at 15% 15%, rgba(220, 0, 0, 0.20), transparent 30%),
            radial-gradient(circle at 85% 85%, rgba(180, 0, 0, 0.15), transparent 30%),
            #050505;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 30px 18px;
          position: relative;
          overflow: hidden;
        }

        .kakobuy-login::before {
          content: "";
          position: absolute;
          width: 420px;
          height: 420px;
          border-radius: 50%;
          background: rgba(255, 0, 0, 0.08);
          filter: blur(100px);
          top: -180px;
          left: -180px;
          pointer-events: none;
        }

        .kakobuy-login::after {
          content: "";
          position: absolute;
          width: 400px;
          height: 400px;
          border-radius: 50%;
          background: rgba(255, 0, 0, 0.07);
          filter: blur(110px);
          bottom: -200px;
          right: -180px;
          pointer-events: none;
        }

        .login-wrapper {
          width: 100%;
          max-width: 430px;
          position: relative;
          z-index: 2;
          animation: appear 0.7s ease;
        }

        @keyframes appear {
          from {
            opacity: 0;
            transform: translateY(25px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .brand {
          text-align: center;
          margin-bottom: 25px;
        }

        .logo {
          width: 72px;
          height: 72px;
          margin: 0 auto 16px;
          border-radius: 22px;
          background: linear-gradient(145deg, #ff2020, #a90000);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          font-weight: 900;
          box-shadow:
            0 0 25px rgba(255, 0, 0, 0.45),
            0 12px 35px rgba(0, 0, 0, 0.5);
        }

        .brand-name {
          margin: 0;
          font-size: 34px;
          font-weight: 900;
          letter-spacing: -1.5px;
        }

        .brand-subtitle {
          margin: 7px 0 0;
          color: #8c8c8c;
          font-size: 14px;
        }

        .login-card {
          background: rgba(20, 20, 20, 0.88);
          border: 1px solid rgba(255, 255, 255, 0.10);
          border-radius: 24px;
          padding: 30px;
          box-shadow:
            0 25px 70px rgba(0, 0, 0, 0.65),
            0 0 50px rgba(255, 0, 0, 0.05);
          backdrop-filter: blur(20px);
        }

        .login-title {
          margin: 0;
          font-size: 23px;
          font-weight: 800;
        }

        .login-description {
          margin: 8px 0 26px;
          color: #888;
          font-size: 14px;
          line-height: 1.5;
        }

        .field {
          margin-bottom: 19px;
        }

        .field-label {
          display: block;
          margin-bottom: 8px;
          color: #ddd;
          font-size: 13px;
          font-weight: 700;
        }

        .input-wrapper {
          position: relative;
        }

        .input {
          width: 100%;
          height: 52px;
          padding: 0 15px;
          border: 1px solid #292929;
          border-radius: 13px;
          outline: none;
          background: #090909;
          color: white;
          font-size: 15px;
          transition: 0.2s ease;
        }

        .input.password {
          padding-right: 72px;
        }

        .input::placeholder {
          color: #555;
        }

        .input:focus {
          border-color: #e00000;
          box-shadow: 0 0 0 3px rgba(230, 0, 0, 0.12);
        }

        .input:disabled {
          opacity: 0.55;
        }

        .show-button {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          border: 0;
          background: transparent;
          color: #999;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }

        .show-button:hover {
          color: white;
        }

        .error {
          margin: 4px 0 18px;
          padding: 12px 14px;
          border-radius: 12px;
          border: 1px solid rgba(255, 50, 50, 0.35);
          background: rgba(220, 0, 0, 0.10);
          color: #ff6666;
          font-size: 13px;
          line-height: 1.4;
        }

        .login-button {
          width: 100%;
          height: 52px;
          border: 0;
          border-radius: 13px;
          background: linear-gradient(135deg, #ff1616, #c40000);
          color: white;
          font-size: 15px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 8px 25px rgba(220, 0, 0, 0.25);
          transition: 0.2s ease;
        }

        .login-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 12px 30px rgba(220, 0, 0, 0.38);
        }

        .login-button:active {
          transform: scale(0.98);
        }

        .login-button:disabled {
          opacity: 0.65;
          cursor: not-allowed;
          transform: none;
        }

        .security {
          margin-top: 23px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          color: #666;
          font-size: 11px;
        }

        .security-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #e00000;
          box-shadow: 0 0 8px rgba(255, 0, 0, 0.8);
        }

        .footer {
          text-align: center;
          margin-top: 22px;
          color: #555;
          font-size: 11px;
        }

        .spinner {
          display: inline-block;
          width: 15px;
          height: 15px;
          margin-right: 8px;
          vertical-align: -3px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 480px) {
          .kakobuy-login {
            padding: 22px 15px;
          }

          .login-card {
            padding: 24px 20px;
            border-radius: 20px;
          }

          .brand-name {
            font-size: 30px;
          }

          .logo {
            width: 64px;
            height: 64px;
            border-radius: 19px;
          }
        }
      `}</style>

      <main className="kakobuy-login">
        <div className="login-wrapper">

          <div className="brand">
            <div className="logo">K</div>

            <h1 className="brand-name">
              Kakobuy
            </h1>

            <p className="brand-subtitle">
              Admin Control Panel
            </p>
          </div>

          <div className="login-card">

            <h2 className="login-title">
              Welcome back
            </h2>

            <p className="login-description">
              Sign in to manage your Kakobuy store, orders and payment settings.
            </p>

            <form onSubmit={handleLogin}>

              <div className="field">
                <label
                  className="field-label"
                  htmlFor="username"
                >
                  Username
                </label>

                <input
                  id="username"
                  className="input"
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="Enter admin username"
                  autoComplete="username"
                  required
                  disabled={loading}
                />
              </div>

              <div className="field">
                <label
                  className="field-label"
                  htmlFor="password"
                >
                  Password
                </label>

                <div className="input-wrapper">
                  <input
                    id="password"
                    className="input password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter admin password"
                    autoComplete="current-password"
                    required
                    disabled={loading}
                  />

                  <button
                    type="button"
                    className="show-button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    {showPassword ? "HIDE" : "SHOW"}
                  </button>
                </div>
              </div>

              {error && (
                <div className="error">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="login-button"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </button>

            </form>

            <div className="security">
              <span className="security-dot" />
              Secure Kakobuy Admin Access
            </div>

          </div>

          <div className="footer">
            © {new Date().getFullYear()} Kakobuy. All rights reserved.
          </div>

        </div>
      </main>
    </>
  )
}
