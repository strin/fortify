"use client";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  DrawerTitle,
} from "@/components/ui/drawer";
import { drawrerData } from "@/utils/constants";
import MenuItem from "./MenuItem";
import { DrawerItem } from "@/types";
import { ArrowBackIcon, LogoutIcon } from "@/utils/icons";
import { signOut } from "next-auth/react";
import { pageRoutes } from "@/utils/routes";

interface Props {
  open: boolean;
  setOpen: any;
}
const SidebarDrawer: React.FC<Props> = ({ open, setOpen }) => {
  const handleSignOut = async () => {
    await signOut({ callbackUrl: pageRoutes.login });
  };

  return (
    <Drawer direction="left" open={open} onOpenChange={setOpen}>
      <DrawerOverlay className="fixed inset-0 customOverlay z-50" />

      <DrawerContent className="fixed left-0 h-full w-full max-w-sm  bg-[#000] overflow-auto hideScroll border-0 rounded-none outline-none leftDrawer">
        <DrawerHeader className="px-4 pb-4 py-8">
          <DrawerTitle className="flex items-center justify-between text-[#fff]">
            <button onClick={() => setOpen(false)}>
              <ArrowBackIcon />
            </button>
            <span className="text-base font-medium">More</span>
            <span></span>
          </DrawerTitle>
        </DrawerHeader>
        <div className="flex flex-col p-4 gap-[10px]">
          {drawrerData.map((item: DrawerItem) => {
            return <MenuItem key={item.label} {...item} />;
          })}
          <button
            className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-white bg-transparent h-[60px]"
            onClick={handleSignOut}
          >
            <span className="flex items-center gap-2">
              <LogoutIcon />
              <span className="text-[#FF2222]">Logout</span>
            </span>
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default SidebarDrawer;
