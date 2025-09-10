"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { signIn } from "next-auth/react"
import { X } from "lucide-react"

export default function PromoBanner() {
  const [isVisible, setIsVisible] = useState(true)

  const handleGetFreeScan = () => {
    signIn("github", { callbackUrl: "/dashboard" })
  }

  if (!isVisible) return null

  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 relative">
      <div className="container mx-auto flex items-center justify-center text-center">
        <div className="flex items-center gap-4">
          <span className="font-semibold">
            🎉 Limited Time: Get Pro features free for 30 days!
          </span>
          <Button 
            onClick={handleGetFreeScan}
            variant="secondary" 
            size="sm"
            className="bg-background text-primary hover:bg-accent"
          >
            Claim Offer
          </Button>
        </div>
        
        <button
          onClick={() => setIsVisible(false)}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 hover:bg-white/20 rounded-full p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
