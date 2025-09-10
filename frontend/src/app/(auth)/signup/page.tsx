import { Suspense } from "react";
import AuthForm from "@/components/auth/AuthForm";

function SignupForm() {
  return <AuthForm type="signup" />;
}

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Suspense fallback={<div>Loading...</div>}>
        <SignupForm />
      </Suspense>
    </div>
  );
}
