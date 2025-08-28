"use client";

import {
  Home,
  MessageSquare,
  Settings,
  LogOut,
  FileText,
  Mic,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import TrackedLink from "@/components/TrackedLink";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

export default function SideBar() {
  const pathname = usePathname();

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <div className="w-64 bg-gray-100 h-full p-4 flex flex-col justify-between">
      <div className="mb-8 mt-6">
        <h1 className="text-2xl font-bold text-center">Creator Studio</h1>
      </div>
      <nav className="space-y-2">
        <TrackedLink href="/hub/dashboard">
          <Button
            variant={isActive("/hub/dashboard") ? "secondary" : "ghost"}
            className="w-full justify-start hover:bg-gray-200 transition-colors duration-200"
          >
            <Home className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
        </TrackedLink>
        <TrackedLink href="/hub/voice">
          <Button
            variant={isActive("/hub/voice") ? "secondary" : "ghost"}
            className="w-full justify-start hover:bg-gray-200 transition-colors duration-200"
          >
            <Mic className="mr-2 h-4 w-4" />
            Voice
          </Button>
        </TrackedLink>
        <TrackedLink href="/hub/profile">
          <Button
            variant={isActive("/hub/profile") ? "secondary" : "ghost"}
            className="w-full justify-start hover:bg-gray-200 transition-colors duration-200"
          >
            <User className="mr-2 h-4 w-4" />
            Profile
          </Button>
        </TrackedLink>
        <TrackedLink href="/hub/prompt">
          <Button
            variant={isActive("/hub/prompt") ? "secondary" : "ghost"}
            className="w-full justify-start hover:bg-gray-200 transition-colors duration-200"
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            Prompt
          </Button>
        </TrackedLink>
        <TrackedLink href="/hub/content">
          <Button
            variant={isActive("/hub/content") ? "secondary" : "ghost"}
            className="w-full justify-start hover:bg-gray-200 transition-colors duration-200"
          >
            <FileText className="mr-2 h-4 w-4" />
            Content
          </Button>
        </TrackedLink>
        <TrackedLink href="/hub/posts">
          <Button
            variant={isActive("/hub/posts") ? "secondary" : "ghost"}
            className="w-full justify-start hover:bg-gray-200 transition-colors duration-200"
          >
            <FileText className="mr-2 h-4 w-4" />
            Posts
          </Button>
        </TrackedLink>
        <TrackedLink href="/hub/settings">
          <Button
            variant={isActive("/hub/settings") ? "secondary" : "ghost"}
            className="w-full justify-start hover:bg-gray-200 transition-colors duration-200"
          >
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </TrackedLink>
      </nav>

      <div className="mt-auto pt-4 border-t border-gray-200">
        <Button
          variant="ghost"
          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-100 transition-colors duration-200"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}
