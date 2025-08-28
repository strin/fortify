import Form from "@/components/login-or-register";

export default function Login() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="z-10 w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
        <div className="flex flex-col items-center justify-center space-y-3 border-b border-border px-4 py-6 pt-8 text-center sm:px-16">
          <h3 className="text-xl font-semibold text-foreground">Sign Up</h3>
          <p className="text-sm text-muted-foreground">
            Create an account with your email and password
          </p>
        </div>
        <Form type="register" />
      </div>
    </div>
  );
}
