import AuthForm from "@/components/auth/AuthForm"

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
      <AuthForm type="login" />
    </div>
  )
}