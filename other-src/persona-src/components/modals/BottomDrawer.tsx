import React from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerOverlay,
} from "@/components/ui/drawer";
import { ModalCloseIcon } from "@/utils/icons";

interface Props {
  open: boolean;
  setOpen: any;
  children: React.ReactNode;
  title: string;
  showCloseButton?: boolean;
}
const BottomDrawer: React.FC<Props> = ({
  open,
  setOpen,
  children,
  title,
  showCloseButton = true,
}) => {
  const handleCloseDrawer = () => {
    setOpen(false);
  };
  return (
    <>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerOverlay className="fixed inset-0 customOverlay z-50" />
        <DrawerContent className="fixed inset-x-0 bottom-0 z-50 bg-white-blackAndWhite-white p-5 rounded-t-[30px] bottomDrawer max-w-[576px] m-auto">
          <DrawerHeader className="flex items-center justify-between border-b border-[#9D9D9D] p-0 pb-5">
            <DrawerTitle className="text-xl font-medium text-black-900">
              {title}
            </DrawerTitle>
            {showCloseButton && (
              <button onClick={handleCloseDrawer}>
                <ModalCloseIcon />
              </button>
            )}
          </DrawerHeader>
          {children}
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default BottomDrawer;
