import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto px-4 py-16">
        <nav className="flex justify-between items-center mb-16">
          <h1 className="text-2xl font-bold">Fortify Dashboard</h1>
          <Button asChild variant="outline">
            <Link href="/api/auth/signout">Sign Out</Link>
          </Button>
        </nav>

        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Welcome back!</h2>
          <p className="text-xl text-gray-300 mb-8">
            You are signed in as: {session.user?.email}
          </p>

          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4">Your Dashboard</h3>
            <p className="text-gray-300">
              This is your secure dashboard. You can add more features and content here.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}