"use client";
import { usePathname } from "next/navigation";
import { default as Link } from "@/components/TrackedLink";

import { SessionUser } from "@/types";
import { HomeIcon, MessageIcon, ProfileIcon } from "@/utils/icons";

const NAV_HIDE_PATHS = ["/u/thread/"];

export default function Nav({ user }: { user: SessionUser | null }) {
  const pathname = usePathname();
  const isNavHidden = NAV_HIDE_PATHS.some((path) => pathname.startsWith(path));
  if (isNavHidden) {
    return null;
  }

  return (
    <nav className="flex justify-around items-center h-[75px] bg-[#2D2D2D]">
      {/*       {user && user.id === 3 && (
        <>
          <Link
            href="/u/memos"
            className={`flex flex-col items-center p-2 w-20 ${pathname.startsWith("/u/memos")
              ? "text-blue-500 opacity-100"
              : "text-gray-300 opacity-90"
              }`}
            prefetch={true}
          >
            <Plus
              className={`h-6 w-6 ${pathname === "/u/memos" ? "stroke-2" : "stroke-1"}`}
            />
            <span className="text-xs mt-1">Memos</span>
          </Link>
          <Link
            href="/u/ask"
            className={`flex flex-col items-center p-2 w-20 ${pathname.startsWith("/u/ask")
              ? "text-blue-500 opacity-100"
              : "text-gray-300 opacity-90"
              }`}
            prefetch={true}
          >
            <MessageCircle
              className={`h-6 w-6 ${pathname === "/u/ask" ? "stroke-2" : "stroke-1"}`}
            />
            <span className="text-xs mt-1">Ask</span>
          </Link>
        </>
      )} */}
      <Link
        href="/u"
        className={`flex items-center justify-center h-full w-full ${pathname === "/u" ? "footerHomeActiveIcon" : ""}`}
        prefetch={true}
      >
        <HomeIcon />
      </Link>
      <Link
        href="/u/thread"
        className={`flex items-center justify-center h-full w-full ${pathname === "/u/thread" ? "footerMessageActiveIcon" : ""}`}
        prefetch={true}
      >
        <MessageIcon />
      </Link>
      <Link
        href="/u/profile"
        className={`flex items-center justify-center h-full w-full ${pathname === "/u/profile" ? "footerProfileActiveIcon" : ""}`}
        prefetch={true}
      >
        <ProfileIcon />
      </Link>
    </nav>
  );
}
