import React from "react";

import NavMobile from "./components/NavMobile";
import DesktopNav from "./components/NavDesktop";
import TopNav from "./components/TopNav";

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options"; // Adjust the import path as needed
import { SessionUser } from "@/types";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | null;

  return (
    <main className="flex flex-col h-[100dvh]">
      {/* Top Navigation Bar */}
      <div className="w-full border-b border-border bg-background">
        <TopNav user={user} />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden md:flex w-64 border-r border-border bg-background">
          <DesktopNav user={user} />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-auto">
          <div className="flex-1 p-4 w-full mx-auto overflow-auto">
            {children}
          </div>

          {/* Mobile Footer Navigation */}
          <div className="md:hidden w-full bg-background border-t border-border">
            <NavMobile user={user} />
          </div>
        </div>
      </div>
    </main>
  );
}
