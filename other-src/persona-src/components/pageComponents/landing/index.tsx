"use client";
import React, { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import FollowAndShareButton from "@/components/pageComponents/landing/FollowAndShareButton";
import { Button } from "@/components/ui/button";
import {
  // ArrowBackIcon,
  ChatsIcon,
  FollowersIcon,
  LineIcon,
  StoriesIcon,
} from "@/utils/icons";
// import { ProfileImage } from "@/utils/images";
import { pageRoutes } from "@/utils/routes";
import { creatorStorage } from "@/lib/supabase";
import profileDefaultImg from "/public/images/profile.png";
import { signOut } from "next-auth/react";

export default function Landing({ user }: any) {
  const [img, setImg] = useState("");

  const { display_name, username, bioDescription, profileImage } = user || {};
  const getServerImg = useCallback((): any => {
    async function getServerData() {
      try {
        const { data: publicUrlData }: any =
          await creatorStorage.createSignedUrl(profileImage, 3600);
        setImg(publicUrlData?.signedUrl);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    }

    getServerData();
  }, [user]);

  useEffect(() => {
    getServerImg();
  }, [user]);

  return (
    <>
      <div className="absolute left-5 top-5">
        {/* <Link href={pageRoutes.login}> */}
        {/* <ArrowBackIcon /> */}
        {/* </Link> */}
      </div>

      <div className="py-5 px-2">
        <div className="bg-black-800 p-[10px] mt-8 rounded-[14px]">
          <div className="flex gap-3">
            <Image
              src={img || profileDefaultImg}
              alt="User"
              className="rounded-[14px]"
              width={100}
              height={100}
            />
            <div className="flex-1 flex flex-col gap-2">
              <h1 className="text-white-blackAndWhite-white text-2xl font-bold word-break break-all">
                {display_name}
              </h1>
              <p className="text-black-500">@{username}</p>
              <FollowAndShareButton />
            </div>
          </div>
        </div>
        <div className="mt-3 p-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StoriesIcon />
            <p className="text-xs text-black-700 font-medium">0 stories</p>
          </div>
          <LineIcon />
          <div className="flex items-center gap-2">
            <FollowersIcon />
            <p className="text-xs text-black-700 font-medium">No Followers</p>
          </div>
          <LineIcon />
          <div className="flex items-center gap-2">
            <ChatsIcon />
            <p className="text-xs text-black-700 font-medium">5K Chats</p>
          </div>
        </div>
        <div className="p-2 mt-3">
          <h4 className="text-black-500 font-medium">BIO</h4>
          <p className="text-xs mt-1">{bioDescription}</p>
        </div>
        <Button className="w-full bg-blue-900 hover:bg-blue-900 text-white h-[60px] mt-10">
          <Link href={pageRoutes.profile}>Start</Link>
        </Button>
      </div>
    </>
  );
}
