"use client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import React from "react";
import { InstaIcon, PersonIcon, XIcon } from "@/utils/icons";
import { pageRoutes } from "@/utils/routes";
import { signIn } from "next-auth/react";

const SignupCard = () => {
  return (
    <>
      <div className="absolute bottom-0 left-1/2 w-full -translate-x-1/2 bg-white-blackAndWhite-white p-5 rounded-t-[30px] ">
        <h2 className="text-xl font-medium text-black-900">
          Create Digital Version wih Persona
        </h2>
        <p className="text-black-700 mt-1">Get Started</p>

        <div className="border-y border-black-900 py-5 my-5 space-y-5 items-center justify-center flex flex-col ">
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
            <XIcon className="ml-2" />
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
            <InstaIcon className="ml-2" />
          </Button>
          <Button
            variant="outline"
            className="bg-blue-900 text-white rounded-full w-56 hover:bg-blue-900 hover:text-white h-[60px] customShadow"
            asChild
          >
            <Link href={pageRoutes.customSignup}>
              Sign up with
              <PersonIcon className="ml-2" />
            </Link>
          </Button>
        </div>
        <div className="text-center text-black-700 font-medium">
          By registering, you agree to our&nbsp;
          <a href={pageRoutes.policy} target="_blank" className="text-blue-900">
            Policy
          </a>
        </div>
      </div>
    </>
  );
};

export default SignupCard;
