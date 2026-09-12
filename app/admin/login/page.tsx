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
      console.error("Login error:", error)
      setError("Unable to connect to the admin login.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-5 py-10 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute w-72 h-72 bg-red-600/20 rounded-full blur-[120px] -top-20 -left-20" />
        <div className="absolute w-80 h-80 bg-red-700/10 rounded-full blur-[130px] -bottom-24 -right-20" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,0,0,0.07),transparent_55%)]" />
      </div>

      {/* Login card */}
      <section className="relative z-10 w-full max-w-md">
        {/* Logo / brand */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-5 w-16 h-16 rounded-2xl bg-red-600 flex items-center justify-center shadow-[0_0_35px_rgba(220,38,38,0.45)]">
            <span className="text-white text-2xl font-black tracking-tight">
              K
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
            Kakobuy
          </h1>

          <p className="mt-2 text-sm text-gray-400">
            Admin Control Panel
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.045] backdrop-blur-xl p-6 sm:p-8 shadow-2xl">
          <div className="mb-7">
            <h2 className="text-xl font-bold">
              Welcome back
            </h2>

            <p className="text-sm text-gray-400 mt-1">
              Sign in to manage your Kakobuy store.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Username */}
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Username
              </label>

              <input
                id="username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Enter admin username"
                autoComplete="username"
                required
                disabled={loading}
                className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3.5 text-white placeholder:text-gray-600 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/20 disabled:opacity-50"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Password
              </label>

              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter admin password"
                  autoComplete="current-password"
                  required
                  disabled={loading}
                  className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3.5 pr-20 text-white placeholder:text-gray-600 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/20 disabled:opacity-50"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400 hover:text-white transition disabled:opacity-50"
                >
                  {showPassword ? "HIDE" : "SHOW"}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
                <p className="text-sm text-red-400">
                  {error}
                </p>
              </div>
            )}

            {/* Login button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-red-600 py-3.5 font-bold text-white shadow-[0_0_25px_rgba(220,38,38,0.25)] transition hover:bg-red-500 hover:shadow-[0_0_35px_rgba(220,38,38,0.4)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Security notice */}
          <div className="mt-7 flex items-center justify-center gap-2 text-xs text-gray-500">
            <span className="text-red-500">●</span>
            <span>Secure Kakobuy Admin Access</span>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-600 mt-6">
          © {new Date().getFullYear()} Kakobuy. All rights reserved.
        </p>
      </section>
    </main>
  )
}
