"use client"
// Kakobuy admin login

import { useState } from "react"

export default function AdminLoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleLogin(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

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
          credentials: "include",
          body: JSON.stringify({
            username,
            password,
          }),
        }
      )

      const data = await response.json().catch(() => ({}))

      if (!response.ok || !data.success) {
        setError(
          data?.error ||
            "Incorrect username or password."
        )
        return
      }

      // Give the browser a moment to store the cookie.
      window.location.href = "/admin"
    } catch (error) {
      console.error(error)

      setError(
        "Unable to connect to the admin login."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-black px-5 text-white">
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-md">
          {/* LOGO / BRAND */}
          <div className="mb-8 text-center">
            <div className="text-4xl font-black tracking-[0.25em] text-red-500">
              KAKOBUY
            </div>

            <p className="mt-2 text-sm text-gray-500">
              Administrator Login
            </p>
          </div>

          {/* LOGIN BOX */}
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl shadow-red-950/20 sm:p-8">
            <h1 className="text-2xl font-black">
              Admin Login
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Sign in to manage Kakobuy.
            </p>

            {error && (
              <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <form
              onSubmit={handleLogin}
              className="mt-6 space-y-5"
            >
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Username
                </label>

                <input
                  type="text"
                  value={username}
                  onChange={(event) =>
                    setUsername(event.target.value)
                  }
                  autoComplete="username"
                  placeholder="Admin username"
                  required
                  className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none transition focus:border-red-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Password
                </label>

                <input
                  type="password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  autoComplete="current-password"
                  placeholder="Admin password"
                  required
                  className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none transition focus:border-red-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-red-600 py-4 font-black text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "LOGGING IN..." : "LOGIN"}
              </button>
            </form>

            <button
              type="button"
              onClick={() =>
                (window.location.href = "/")
              }
              className="mt-3 w-full rounded-xl border border-zinc-700 py-4 font-semibold text-gray-400 transition hover:bg-zinc-900 hover:text-white"
            >
              GO BACK
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
