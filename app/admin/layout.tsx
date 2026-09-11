import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const adminCookie = cookieStore.get("kakobuy_admin")?.value

  if (adminCookie !== "authenticated") {
    redirect("/admin/login")
  }

  return children
}
