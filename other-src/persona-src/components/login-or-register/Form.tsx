"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import LoadingDots from "@/components/LoadingDots";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LoginWithX from "../ui/LoginWithX";
import LoginWithInsta from "../ui/LoginWithInsta";

export default function Form({ type }: { type: "login" | "register" }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const [callback, setCallback] = useState<string | undefined>(undefined);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    console.log('window.location.search', window.location.search)
    setCallback(params.get("callback") || undefined);
    console.log("callback", params.get("callback") || undefined);
  }, []);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setLoading(true);
        if (type === "login") {
          signIn("credentials", {
            redirect: false,
            email: e.currentTarget.email.value,
            password: e.currentTarget.password.value,
            callbackUrl: callback,
            // @ts-ignore
          }).then(({ error }) => {
            if (error) {
              setLoading(false);
              toast({
                description: error,
                variant: "destructive",
              });
            } else {
              router.refresh();
              if (callback) {
                router.replace(callback);
              } else {
                router.push("/u");
              }
            }
          });
        } else {
          fetch("/api/auth/register", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: e.currentTarget.email.value,
              password: e.currentTarget.password.value,
              display_name: e.currentTarget.display_name.value,
              username: e.currentTarget.username.value,
            }),
          }).then(async (res) => {
            setLoading(false);
            if (res.status === 200) {
              toast({
                description: "Account created! Redirecting to login...",
              });
              setTimeout(() => {
                router.push(
                  "/login" +
                  (callback
                    ? "?callback=" + encodeURIComponent(callback)
                    : "")
                );
              }, 2000);
            } else {
              const { error } = await res.json();
              toast({
                description: error,
                variant: "destructive",
              });
            }
          });
        }
      }}
      className="flex flex-col space-y-4 px-4 py-8 sm:px-16 bg-gray-900 text-white"
    >
      {type === "register" && (
        <>
          <div>
            <label
              htmlFor="Display Name"
              className="block text-xs uppercase text-gray-300"
            >
              Full Name
            </label>
            <Input
              id="display_name"
              name="display_name"
              type="text"
              placeholder="Your Name"
              required
              className="bg-gray-800 text-white border-gray-700"
            />
          </div>
          <div>
            <label
              htmlFor="Username"
              className="block text-xs uppercase text-gray-300"
            >
              Username
            </label>
            <Input
              id="username"
              name="username"
              type="text"
              placeholder="Your Name"
              required
              className="bg-gray-800 text-white border-gray-700"
            />
          </div>
        </>
      )}
      <div>
        <label
          htmlFor="email"
          className="block text-xs uppercase py-1 text-gray-300"
        >
          Email Address
        </label>
        <Input
          type="email"
          placeholder="Your Email"
          name="email"
          autoComplete="email"
          required
          className="bg-gray-800 text-white border-gray-700"
        />
      </div>
      <div>
        <label
          htmlFor="password"
          className="block text-xs uppercase py-1 text-gray-300"
        >
          Password
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="Your Password"
          required
          className="bg-gray-800 text-white border-gray-700"
        />
      </div>
      <Button
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 text-white"
      >
        {loading ? (
          <LoadingDots color="#ffffff" />
        ) : (
          <p>{type === "login" ? "Sign In" : "Sign Up"}</p>
        )}
      </Button>
      {type === "login" && (
        <div className="flex flex-col">
          <LoginWithX onClick={() => signIn('twitter')} />
          {/* <LoginWithInsta onClick={() => signIn('instagram')} /> */}

          {/* <LoginWithGoogleButton
            onClick={() =>
              signIn("google", {
                callbackUrl: callback,
              })
            }
          /> */}
          {/*<LoginWithGithubButton
            onClick={() =>
              signIn("github", {
                callbackUrl: callback,
              })
            }
          />*/}
        </div>
      )}
      {type === "login" ? (
        <p className="text-center text-sm text-gray-400">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-semibold text-blue-400 hover:text-blue-300"
          >
            Sign up
          </Link>{" "}
          for free.
        </p>
      ) : (
        <p className="text-center text-sm text-gray-400">
          Already have an account?{" "}
          <Link
            href={
              "/login" +
              (callback ? "?callback=" + encodeURIComponent(callback) : "")
            }
            className="font-semibold text-blue-400 hover:text-blue-300"
          >
            Sign in
          </Link>{" "}
          instead.
        </p>
      )}
    </form>
  );
}
