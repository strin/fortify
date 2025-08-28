import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SessionUser } from "@/types";
import Logo from "@/components/Logo";

interface TopNavProps {
  user: SessionUser | null;
}

export default function TopNav({ user }: TopNavProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 h-12">
      <Logo />
      {/* Center Section - can add page title or search here */}
      <div className="hidden md:flex items-center">
        {/* Optional: Add page title or search bar here */}
      </div>

      {/* User Profile Section */}
      <div className="flex items-center gap-2">
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="focus:outline-none">
                <Avatar className="h-8 w-8 cursor-pointer text-xs">
                  <AvatarImage
                    src={user.image || ""}
                    alt={user.name || "User"}
                  />
                  <AvatarFallback className="text-xs">
                    {user.display_name
                      ? user.display_name
                          .split(" ")
                          .map((name) => name[0])
                          .join("")
                          .toUpperCase()
                          .substring(0, 2)
                      : "U"}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>{user.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {user.email}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/u/profile">Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/u/settings">Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/api/auth/signout">Sign out</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Link href="/api/auth/signin" className="text-sm">
            Sign in
          </Link>
        )}
      </div>
    </div>
  );
}
