"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function App() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/scan-targets")
    }
  }, [status, router])

  // Show loading state while checking authentication
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Fortify</h1>
          <p className="text-gray-300">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto px-4 py-16">
        <nav className="flex justify-between items-center mb-16">
          <h1 className="text-2xl font-bold">Fortify</h1>
          <Button asChild variant="outline">
            <Link href="/login">Login</Link>
          </Button>
        </nav>

        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl md:text-6xl font-bold mb-6">
            Welcome to Fortify
          </h2>
          <p className="text-xl md:text-2xl text-gray-300 mb-12">
            Build secure, scalable applications with confidence
          </p>

          <div className="flex gap-4 justify-center">
            <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700 text-white">
              <Link href="/signup">Get Started</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}