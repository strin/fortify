"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Loader2, 
  Eye, 
  EyeOff, 
  Shield, 
  Lock, 
  Mail, 
  User,
  Github,
  AlertCircle
} from "lucide-react";

interface AuthFormProps {
  type: "login" | "signup";
}

export default function AuthForm({ type }: AuthFormProps) {
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get the callback URL from search params
  const callbackUrl = searchParams.get("callbackUrl") || "/projects";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setIsSubmitted(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const name = formData.get("name") as string;

    if (type === "login") {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
        setLoading(false);
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } else {
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name }),
        });

        if (res.ok) {
          router.push("/login");
        } else {
          const data = await res.json();
          setError(data.error || "Failed to create account");
        }
      } catch {
        setError("An error occurred. Please try again.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleOAuthSignIn = async (provider: string) => {
    setOauthLoading(provider);
    setError(null);
    try {
      await signIn(provider, { callbackUrl });
    } catch (error) {
      setError(`Failed to sign in with ${provider}`);
      setOauthLoading(null);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-2xl border-border/50 bg-card/95 backdrop-blur-sm">
      <CardHeader className="space-y-4 pb-6">
        <div className="flex items-center justify-center mb-2">
          <div className="rounded-full bg-primary/10 p-3">
            <Shield className="h-6 w-6 text-primary" />
          </div>
        </div>
        <div className="text-center space-y-2">
          <CardTitle className="text-2xl font-bold tracking-tight">
            {type === "login" ? "Welcome back" : "Create your account"}
          </CardTitle>
          <CardDescription className="text-base">
            {type === "login"
              ? "Sign in to your Fortify account to continue"
              : "Join Fortify to secure your code with AI"}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {type === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Full Name
              </Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Enter your full name"
                required
                disabled={loading || !!oauthLoading}
                className={`transition-all duration-200 ${
                  isSubmitted && !loading ? 'ring-2 ring-green-500/20 border-green-500/50' : ''
                }`}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              Email Address
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="Enter your email"
              required
              disabled={loading || !!oauthLoading}
              className={`transition-all duration-200 ${
                isSubmitted && !loading ? 'ring-2 ring-green-500/20 border-green-500/50' : ''
              }`}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                required
                disabled={loading || !!oauthLoading}
                className={`pr-10 transition-all duration-200 ${
                  isSubmitted && !loading ? 'ring-2 ring-green-500/20 border-green-500/50' : ''
                }`}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading || !!oauthLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="sr-only">
                  {showPassword ? "Hide password" : "Show password"}
                </span>
              </Button>
            </div>
            {type === "signup" && (
              <p className="text-xs text-muted-foreground">
                Password should be at least 8 characters long
              </p>
            )}
          </div>
          
          {error && (
            <Alert className="border-destructive/20 bg-destructive/10">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                {error}
              </AlertDescription>
            </Alert>
          )}
          
          <Button 
            type="submit" 
            className={`w-full h-11 font-medium transition-all duration-200 ${
              loading ? 'scale-95' : 'hover:scale-[1.02]'
            }`} 
            disabled={loading || !!oauthLoading}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{type === "login" ? "Signing in..." : "Creating account..."}</span>
              </div>
            ) : (
              <span>{type === "login" ? "Sign In" : "Create Account"}</span>
            )}
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-4 text-muted-foreground font-medium">
              Or continue with
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            variant="outline"
            className={`w-full h-11 font-medium transition-all duration-200 hover:bg-accent hover:scale-[1.02] ${
              oauthLoading === 'google' ? 'scale-95' : ''
            }`}
            onClick={() => handleOAuthSignIn("google")}
            disabled={loading || !!oauthLoading}
          >
            {oauthLoading === 'google' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            {oauthLoading === 'google' ? 'Connecting...' : 'Continue with Google'}
          </Button>
          <Button
            variant="outline"
            className={`w-full h-11 font-medium transition-all duration-200 hover:bg-accent hover:scale-[1.02] ${
              oauthLoading === 'github' ? 'scale-95' : ''
            }`}
            onClick={() => handleOAuthSignIn("github")}
            disabled={loading || !!oauthLoading}
          >
            {oauthLoading === 'github' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Github className="mr-2 h-4 w-4" />
            )}
            {oauthLoading === 'github' ? 'Connecting...' : 'Continue with GitHub'}
          </Button>
        </div>
      </CardContent>
      <CardFooter className="justify-center pt-6">
        <p className="text-sm text-muted-foreground text-center">
          {type === "login" ? (
            <>
              Don&apos;t have an account?{" "}
              <Link 
                href="/signup" 
                className="font-medium text-primary hover:text-primary/80 transition-colors hover:underline"
              >
                Create one
              </Link>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Link 
                href="/login" 
                className="font-medium text-primary hover:text-primary/80 transition-colors hover:underline"
              >
                Sign in instead
              </Link>
            </>
          )}
        </p>
      </CardFooter>
    </Card>
  );
}
