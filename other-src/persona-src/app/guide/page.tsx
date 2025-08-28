"use client";

import GuideSteps from "@/components/pageComponents/guide/GuideSteps";
import { LogoSVGImage } from "@/utils/images";
import { pageRoutes } from "@/utils/routes";
import Image from "next/image";
import Link from "next/link";
import React from "react";

const GuidePage = () => {
  return (
    <div className="p-5">
      <div className="text-end">
        <Link
          href={pageRoutes.signup}
          className="text-blue-900 font-medium background-transparent border-none"
        >
          Skip
        </Link>
      </div>
      <div className="flex justify-center items-center flex-col">
        <Image src={LogoSVGImage.src} width={102} height={102} alt="Logo" />
        <h1 className="text-blue-500 text-2xl font-bold text-center mt-5">
          Persona
        </h1>
        <p className="text-white-blackAndWhite-300 text-center font-medium mt-2 mb-10">
          Bring your social presence to life
        </p>
        <GuideSteps />
      </div>
    </div>
  );
};

export default GuidePage;
