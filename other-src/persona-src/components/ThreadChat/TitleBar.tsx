"use client";

import { Phone, Plus } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type MessageHeaderProp = {
  username: string;
  displayName: string;
  profilePicUrl?: string;
  loading?: boolean;
  onStartCall?: () => void;
  onNewChat?: () => void;
};
export default function MessageHeader({
  username,
  displayName,
  profilePicUrl,
  loading,
  onStartCall,
  onNewChat,
}: MessageHeaderProp) {
  return (
    <div className="flex justify-between items-center mx-4 py-2">
      <div className="flex gap-2 items-center">
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
      <div className="flex items-center gap-2">
        <div
          className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-end cursor-pointer"
          onClick={() => onStartCall?.()}
        >
          {loading ? (
            <div className="w-6 h-6 bg-gray-200 rounded animate-pulse" />
          ) : (
            <Phone size={24} color="#1AABF4" strokeWidth={3} />
          )}
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-end cursor-pointer"
                onClick={() => onNewChat?.()}
              >
                {loading ? (
                  <div className="w-6 h-6 bg-gray-200 rounded animate-pulse" />
                ) : (
                  <Plus size={24} color="#1AABF4" strokeWidth={3} />
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>New Chat</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
