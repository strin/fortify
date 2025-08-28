import { DrawerItem } from "@/types";
import {
  ShareEmailIcon,
  ShareFacebookIcon,
  ShareInstaIcon,
  ShareWhatsAppIcon,
  ShareXIcon,
  SmallArrowIcon,
} from "@/utils/icons";
import Link from "next/link";
import React, { useState } from "react";
import BottomDrawer from "./BottomDrawer";
import { Button } from "../ui/button";

const MenuItem: React.FC<DrawerItem> = ({
  icon: Icon,
  label,
  showArrow,
  isWhiteColor,
  link,
}) => {
  const [openShareModal, setOpenShareModal] = useState(false);
  const [openDeleteAccountModal, setOpenDeleteAccountModal] = useState(false);
  const [openDeleteCallModal, setOpenDeleteCallModal] = useState(false);
  const [openDeleteChatModal, setOpenDeleteChatModal] = useState(false);

  const handleCloseDeleteAccountModal = () => {
    setOpenDeleteAccountModal(false);
  };
  const handleCloseDeleteCallModal = () => {
    setOpenDeleteCallModal(false);
  };
  const handleCloseDeleteChatModal = () => {
    setOpenDeleteChatModal(false);
  };

  const handleItemClick = (itemLabel: string) => {
    switch (itemLabel) {
      case "Share App":
        setOpenShareModal(true);
        break;
      case "Delete Account":
        setOpenDeleteAccountModal(true);
        break;
      case "Clear All Call History":
        setOpenDeleteCallModal(true);
        break;
      case "Clear All Chat History":
        setOpenDeleteChatModal(true);
        break;
      default:
        break;
    }
  };

  return (
    <>
      {link ? (
        <Link
          href={link}
          className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-white bg-[#2D2D2D] h-[60px]"
        >
          <span className="flex items-center gap-3">
            <Icon />

            <span
              className={` ${isWhiteColor ? "text-[#fff]" : "text-[#FF2222]"}`}
            >
              {label}
            </span>
          </span>
          {showArrow && <SmallArrowIcon />}
        </Link>
      ) : (
        <button
          className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-white bg-[#2D2D2D] h-[60px]"
          onClick={() => handleItemClick(label)}
        >
          <span className="flex items-center gap-3">
            <Icon />

            <span
              className={` ${isWhiteColor ? "text-[#fff]" : "text-[#FF2222]"}`}
            >
              {label}
            </span>
          </span>
          {showArrow && <SmallArrowIcon />}
        </button>
      )}
      <BottomDrawer
        open={openShareModal}
        setOpen={setOpenShareModal}
        title="Share Story"
      >
        <div className="mt-5 flex items-center justify-between gap-2">
          <button className="w-[60px] h-[60px]  bg-[#6B76D8] rounded-[9px] flex items-center justify-center ">
            <ShareEmailIcon />
          </button>
          <button className="w-[60px] h-[60px]  bg-[#1877F2] rounded-[9px] flex items-center justify-center ">
            <ShareFacebookIcon />
          </button>
          <button className="w-[60px] h-[60px]  bg-[#000000] rounded-[9px] flex items-center justify-center">
            <ShareXIcon />
          </button>
          <button className="w-[60px] h-[60px] shareInstaBackGround rounded-[9px] flex items-center justify-center ">
            <ShareInstaIcon />
          </button>

          <button className="w-[60px] h-[60px]  bg-[#25D366] rounded-[9px] flex items-center justify-center ">
            <ShareWhatsAppIcon />
          </button>
        </div>
      </BottomDrawer>
      <BottomDrawer
        open={openDeleteAccountModal}
        setOpen={setOpenDeleteAccountModal}
        title="Delete Account"
        showCloseButton={false}
      >
        <div className="mt-5">
          <p className="text-black-900 font-medium text-xl">
            Are you sure want to delete this account?
          </p>
          <p className="text-black-800 mt-3">
            It will remove all account related data and cannot be undone.
          </p>
          <div className="flex items-center gap-5 mt-5">
            <Button
              className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground buttonShadow rounded-[8px] p-2 font-medium"
              onClick={handleCloseDeleteAccountModal}
            >
              Yes
            </Button>
            <Button
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground buttonShadow rounded-[8px] p-2 font-medium"
              onClick={handleCloseDeleteAccountModal}
            >
              No
            </Button>
          </div>
        </div>
      </BottomDrawer>
      <BottomDrawer
        open={openDeleteCallModal}
        setOpen={setOpenDeleteCallModal}
        title="Delete Call History"
        showCloseButton={false}
      >
        <div className="mt-5">
          <p className="text-black-900 font-medium text-xl">
            Are you sure want to delete all Call History?
          </p>
          <p className="text-black-800 mt-3">
            It will remove all call related data with all users and cannot be
            undone.
          </p>
          <div className="flex items-center gap-5 mt-5">
            <Button
              variant="outline"
              className="flex-1 text-[#FF2222] border-[#FF2222] hover:bg-red-[#FF2222] hover:text-[#FF2222] font-medium buttonShadow rounded-[8px] p-2"
              onClick={handleCloseDeleteCallModal}
            >
              Yes
            </Button>
            <Button
              className="flex-1 bg-blue-800 hover:bg-blue-800 text-white-blackAndWhite-white buttonShadow rounded-[8px] p-2 font-medium"
              onClick={handleCloseDeleteCallModal}
            >
              No
            </Button>
          </div>
        </div>
      </BottomDrawer>
      <BottomDrawer
        open={openDeleteChatModal}
        setOpen={setOpenDeleteChatModal}
        title="Delete Chat History"
        showCloseButton={false}
      >
        <div className="mt-5">
          <p className="text-black-900 font-medium text-xl">
            Are you sure want to delete all Chat History?
          </p>
          <p className="text-black-800 mt-3">
            It will remove all chat related data with all users and cannot be
            undone.
          </p>
          <div className="flex items-center gap-5 mt-5">
            <Button
              variant="outline"
              className="flex-1 text-[#FF2222] border-[#FF2222] hover:bg-red-[#FF2222] hover:text-[#FF2222] font-medium buttonShadow rounded-[8px] p-2"
              onClick={handleCloseDeleteChatModal}
            >
              Yes
            </Button>
            <Button
              className="flex-1 bg-blue-800 hover:bg-blue-800 text-white-blackAndWhite-white buttonShadow rounded-[8px] p-2 font-medium"
              onClick={handleCloseDeleteChatModal}
            >
              No
            </Button>
          </div>
        </div>
      </BottomDrawer>
    </>
  );
};

export default MenuItem;
