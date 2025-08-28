"use client";
import { Button } from "@/components/ui/button";
import { guideStepsData } from "@/utils/constants";
import { pageRoutes } from "@/utils/routes";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

const GuideSteps = () => {
  const [tabValue, setTabValue] = useState(0);
  const router = useRouter();

  const handleTabChange = () => {
    if (tabValue < guideStepsData.length - 1) {
      setTabValue(tabValue + 1);
    } else {
      router.push(pageRoutes.signup);
    }
  };

  return (
    <>
      <Image
        alt={guideStepsData[tabValue].title}
        src={guideStepsData[tabValue].image}
        width="0"
        height="0"
        sizes="100vw"
        className="w-full h-auto"
      />
      <h2 className="mt-3 text-white-blackAndWhite-white text-center text-xl font-medium">
        {guideStepsData[tabValue].title}
      </h2>
      <p className="mt-2 mb-5 text-white-blackAndWhite-300 text-center ">
        {guideStepsData[tabValue].description}
      </p>
      <Button onClick={handleTabChange}>
        {tabValue === 0 || tabValue === 1 ? "Next" : "Start"}
      </Button>
    </>
  );
};

export default GuideSteps;
