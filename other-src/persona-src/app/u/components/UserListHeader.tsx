"use client";
import { HomeLogoImage } from "@/utils/images";
import Image from "next/image";
import { MoreActionIcon } from "@/utils/icons";
import { useState } from "react";
import SidebarDrawer from "@/components/modals/SidebarDrawer";

export default function UserListHeader() {
  const [openDrawer, setOpenDrawer] = useState(false);

  const handleOpenDrawer = () => {
    setOpenDrawer(!openDrawer);
  };

  return (
    <>
      <div className="flex justify-between items-center mx-0 mb-3">
        {/*<Image
          alt="Logo"
          src={HomeLogoImage}
          width={44}
          height={44}
          quality={100}
          className="w-11 h-11 cursor-pointer"
        />*/}

        <p className="text-3xl translate-x-[11px] font-bold">Home</p>

        <button onClick={handleOpenDrawer} className="translate-x-[11px]">
          <MoreActionIcon />
        </button>
      </div>
      <SidebarDrawer open={openDrawer} setOpen={setOpenDrawer} />
    </>
  );
}
