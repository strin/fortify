import { Suspense } from "react"
import AuthForm from "@/components/auth/AuthForm"

function LoginForm() {
  return <AuthForm type="login" />
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Suspense fallback={<div>Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  )
}