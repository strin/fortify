"use client";
import { usePathname } from "next/navigation";
import { default as Link } from "@/components/TrackedLink";

import { SessionUser } from "@/types";
import { HomeIcon, MessageIcon, ProfileIcon } from "@/utils/icons";
import {
  BarChart2,
  Brain,
  Settings,
  Upload,
  Link as LinkIcon,
  Calendar,
  Sun,
  Moon,
  LogOut,
} from "lucide-react";
import { useTheme } from "next-themes";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { pageRoutes } from "@/utils/routes";
import { signOut } from "next-auth/react";

const NAV_HIDE_PATHS = ["/u/thread/"];

export default function DesktopNav({ user }: { user: SessionUser | null }) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const isNavHidden = NAV_HIDE_PATHS.some((path) => pathname.startsWith(path));
  if (isNavHidden) {
    return null;
  }

  const handleSignOut = async () => {
    await signOut({ callbackUrl: pageRoutes.login });
  };

  const getLinkStyle = (path: string) => {
    return `flex items-center p-4 rounded-lg ${
      pathname === path
        ? "bg-accent text-foreground text-accent-foreground"
        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
    }`;
  };

  return (
    <nav className="flex flex-col h-screen w-64 left-0 top-0 p-4 space-y-2">
      <Link
        href="/u/clone"
        className={getLinkStyle("/u/clones")}
        prefetch={true}
      >
        <LinkIcon className="h-5 w-5" />
        <span className="ml-3 text-sm font-medium">Presentations</span>
      </Link>
      {/* <Link
        href="/u/profile"
        className={`flex items-center p-4 rounded-lg hover:bg-accent transition-colors ${
          pathname === "/u/profile"
            ? "bg-accent text-foreground"
            : "text-muted-foreground"
        }`}
        prefetch={true}
      >
        <ProfileIcon />
        <span className="ml-3 text-sm font-medium">Profile</span>
      </Link> */}
      <Link
        href="/u/meetings"
        className={getLinkStyle("/u/meetings")}
        prefetch={true}
      >
        <Calendar className="h-5 w-5" />
        <span className="ml-3 text-sm font-medium">Meetings</span>
      </Link>
      <div className="relative">
        <Link
          href="/u/upload"
          className={getLinkStyle("/u/upload")}
          prefetch={true}
        >
          <Brain />
          <span className="ml-3 text-sm font-medium">Upload</span>
        </Link>

        <div
          className={`ml-6 space-y-2 overflow-hidden transition-all duration-300 ${
            pathname.startsWith("/u/upload") ? "mt-2 max-h-48" : "max-h-0 mt-0"
          }`}
        >
          <Link
            href="/u/upload/photo"
            className={getLinkStyle("/u/upload/photo")}
            prefetch={true}
          >
            <span className="text-sm font-medium">Photos</span>
          </Link>

          <Link
            href="/u/upload/blog"
            className={getLinkStyle("/u/upload/blog")}
            prefetch={true}
          >
            <span className="text-sm font-medium">Blog Post</span>
          </Link>

          <Link
            href="/u/upload/link"
            className={getLinkStyle("/u/upload/link")}
            prefetch={true}
          >
            <span className="text-sm font-medium">Link</span>
          </Link>
        </div>
      </div>
      {/* <Link
        href="/u/metrics"
        className={`flex items-center p-4 rounded-lg hover:bg-[#3D3D3D] transition-colors ${
          pathname === "/u/metrics"
            ? "bg-[#3D3D3D] text-white"
            : "text-gray-400"
        }`}
        prefetch={true}
      >
        <BarChart2 />
        <span className="ml-3 text-sm font-medium">Metrics</span>
      </Link> */}

      <Link
        href="/u/settings"
        className={getLinkStyle("/u/settings")}
        prefetch={true}
      >
        <Settings />
        <span className="ml-3 text-sm font-medium">Settings</span>
      </Link>

      <div className="flex-grow" />

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-lg hover:bg-accent transition-colors w-10 h-10 flex items-center justify-center"
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Toggle theme</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Link
        href=""
        className="flex items-center p-4 rounded-lg text-muted-foreground hover:bg-accent"
        onClick={handleSignOut}
      >
        <LogOut className="h-5 w-5" />
        <span className="ml-3 text-sm font-medium">Logout</span>
      </Link>
    </nav>
  );
}
