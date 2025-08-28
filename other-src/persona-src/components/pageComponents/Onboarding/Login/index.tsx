"use client";

import Image from "next/image";
import { signIn } from "next-auth/react";
import LoginWithX from "@/components/ui/LoginWithX";
import LoginWithInsta from "@/components/ui/LoginWithInsta";
import Logosm from "/public/images/logo.svg";
import styles from "./styles.module.scss";
import { pageRoutes } from "@/utils/routes";

const Login: React.FC = () => {
  return (
    <div>
      <div className=" mt-5 mb-10">
        <Image src={Logosm} alt="logo" className="mx-auto" />
      </div>
      <div>
        <h1 className="text-[20px] color-white font-bold">
          Create Digital Version wih Persona
        </h1>
        <h4 className="text-base color-white font-normal mt-2">Get Started</h4>
      </div>
      <div className="py-10">
        <LoginWithX
          onClick={() => signIn("twitter", { callbackUrl: pageRoutes.profile })}
        />
        <LoginWithInsta
          onClick={() =>
            signIn("instagram", { callbackUrl: pageRoutes.profile })
          }
        />
      </div>
      <div className={styles.footerWrapper}>
        <p className="text-center">
          By registering, you agree to our{" "}
          <a className="text-[#35559D]" href="#">
            Policy
          </a>
        </p>
      </div>
    </div>
  );
};

export default Login;
