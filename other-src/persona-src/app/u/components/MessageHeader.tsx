"use client";

import { Phone } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

type MessageHeaderProp = {
  username: string;
  displayName: string;
  profilePicUrl?: string;
  loading?: boolean;
};
export default function MessageHeader({
  username,
  displayName,
  profilePicUrl,
  loading,
}: MessageHeaderProp) {
  const router = useRouter();
  return (
    <div className="flex justify-between items-center mx-4 py-2">
      <div className="flex gap-2 items-center">
        <div
          className="w-10 h-10 rounded-md overflow-hidden mr-4 flex-shrink-0"
          onClick={() => router.replace("/u/thread")}
        >
          <Image
            src={"/back.svg"}
            alt={"logo"}
            width={12}
            height={12}
            className="object-cover w-full h-full"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-11 h-11 rounded-full overflow-hidden">
            {loading ? (
              <div className="w-full h-full bg-gray-200 animate-pulse" />
            ) : (
              <img
                src={profilePicUrl || "/default-profile-image.jpg"}
                alt={"profile image"}
                loading="eager"
                className="object-cover"
              />
            )}
          </div>
          <div className="flex-1 flex flex-col gap-0 items-start">
            {loading ? (
              <div className="flex flex-col gap-1">
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
              </div>
            ) : (
              <>
                <div className="text-sm font-medium text-white-blackAndWhite-white">
                  {displayName}
                </div>
                <div className="text-xs font-medium text-[#9D9D9D]">
                  @{username}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <div
        className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-end"
        onClick={() => router.push(`/c/${username}/-1`)}
      >
        {loading ? (
          <div className="w-6 h-6 bg-gray-200 rounded animate-pulse" />
        ) : (
          <Phone size={24} color="#1AABF4" strokeWidth={3} />
        )}
      </div>
    </div>
  );
}
