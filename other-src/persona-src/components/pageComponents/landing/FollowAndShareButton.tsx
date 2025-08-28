"use client";
import { Button } from "@/components/ui/button";
import { ShareIcon } from "@/utils/icons";
import React from "react";
import { toast } from "sonner";

const FollowAndShareButton = () => {
  const handleShare = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("Link Copied");
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button className=" bg-blue-900 rounded-xl text-xs font-medium max-w-20 h-[42px]">
          Follow
        </Button>
        <Button
          className="h-[42px] border border-[#1AABF4] bg-transparent hover:bg-transparent text-xs font-medium text-[#1AABF4] hover:text-[#1AABF4] flex items-center gap-2 justify-start max-w-36"
          variant="outline"
          onClick={() => handleShare("pesona.com")}
        >
          <span className="flex items-center justify-center min-w-6 min-h-6 rounded-full bg-[#1AABF4]">
            <ShareIcon />
          </span>
          <span>Share Profile</span>
        </Button>
      </div>
    </>
  );
};

export default FollowAndShareButton;
