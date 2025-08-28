"use client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import React from "react";
import { Instagram, User } from "lucide-react";
import { pageRoutes } from "@/utils/routes";
import { signIn } from "next-auth/react";
import AuthCard from "../AuthCard";

const LoginCard = () => {
  return (
    <AuthCard>
      <h2 className="text-xl font-medium text-black-900">
        Enter Persona World
      </h2>
      <p className="text-black-700 mt-1">Login with your social accounts</p>

      <div className="border-y border-black-900 py-5 my-5 space-y-5 items-center justify-center flex flex-col">
        <Button
          variant="outline"
          className="bg-black-900 text-white rounded-full w-56 hover:bg-black-900 hover:text-white h-[60px] customShadow"
          onClick={() =>
            signIn("twitter", {
              callbackUrl: pageRoutes.profileSetup,
            })
          }
        >
          Connect with
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </Button>
        <Button
          variant="outline"
          className="instaBackGround text-white rounded-full w-56 hover:instaBackGround hover:text-white h-[60px] customShadow"
          onClick={() =>
            signIn("instagram", {
              callbackUrl: pageRoutes.profileSetup,
            })
          }
        >
          Connect with
          <Instagram className="ml-2 w-5 h-5" />
        </Button>
        <Button
          variant="default"
          className="bg-black-900 text-white rounded-full w-56 hover:bg-black-900 hover:text-white h-[60px] customShadow"
          asChild
        >
          <Link href={pageRoutes.customLogin}>
            Login with
            <User className="ml-2 w-5 h-5" />
          </Link>
        </Button>
      </div>
      <div className="text-center text-black-700 font-medium">
        By registering, you agree to our&nbsp;
        <a href={pageRoutes.policy} target="_blank" className="text-blue-900">
          Policy
        </a>
      </div>
    </AuthCard>
  );
};

export default LoginCard;
