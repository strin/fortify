"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function App() {
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