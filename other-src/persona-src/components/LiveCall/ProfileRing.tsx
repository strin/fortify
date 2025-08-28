"use client";
import React from "react";
import { Profile } from "@/types";
import { useLiveKit } from "@/components/transports/LiveKit";

const ProfileRing = ({ profile }: { profile: Profile }) => {
  const { isConnected } = useLiveKit();

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative w-44 h-44 flex items-center justify-center">
        {profile.profileImage ? (
          <div className="w-32 h-32 rounded-full overflow-hidden z-10">
            <img
              src={profile.profileImage}
              className="w-full h-full object-cover object-center"
            />
          </div>
        ) : (
          <div className="w-32 h-32 rounded-full bg-gray-300 flex items-center justify-center z-10">
            <span className="text-gray-600 text-2xl">No Image</span>
          </div>
        )}
        {isConnected && (
          <>
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="w-44 h-44 bg-[#1AABF4] rounded-full animate-ping"
                style={{
                  animationDelay: "4s",
                  animationDuration: "7s",
                  opacity: 0.17,
                }}
              ></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="w-40 h-40 bg-[#1AABF4] rounded-full animate-ping"
                style={{
                  animationDelay: "3s",
                  animationDuration: "6s",
                  opacity: 0.5,
                }}
              ></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="w-36 h-36 bg-[#1AABF4] rounded-full animate-ping"
                style={{
                  animationDelay: "2s",
                  animationDuration: "5s",
                }}
              ></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="w-32 h-32 bg-[#35559D] rounded-full animate-ping"
                style={{
                  animationDelay: "1s",
                  animationDuration: "3s",
                  opacity: 0.6,
                }}
              ></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="w-24 h-24 bg-[#35559D] rounded-full animate-ping"
                style={{
                  animationDelay: "0s",
                  animationDuration: "2s",
                }}
              ></div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ProfileRing;
