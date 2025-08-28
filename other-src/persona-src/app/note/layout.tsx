import React from "react";
import { FileIcon, HelpCircleIcon } from "lucide-react";
import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options"; // Adjust the import path as needed
import { redirect } from "next/navigation";

const NoteLayout = async ({ children }: { children: React.ReactNode }) => {
  const session = await getServerSession(authOptions);
  interface SessionUser {
    id: number;
    name: string;
    username: string;
    display_name: string;
  }
  let user = null as SessionUser | null | undefined;
  if (session) {
    user = session.user as SessionUser;
  }
  if (!user) {
    redirect("/login");
  }

  return (
    <main className="flex flex-col min-h-screen bg-white text-black p-5">
      <div className="flex-grow w-full max-w-2xl mx-auto pb-4 pt-4">
        {children}
      </div>

      <footer className="bg-gray-100 p-4 sticky bottom-0">
        <nav className="flex justify-around">
          <Link
            href="/note/upload"
            className={`text-black flex flex-col items-center`}
          >
            <FileIcon className="h-8 w-8" />
            <span className="text-xs mt-1">Note</span>
          </Link>
          <Link
            href="/note/ask"
            className={`text-black flex flex-col items-center`}
          >
            <HelpCircleIcon className="h-8 w-8" />
            <span className="text-xs mt-1">Ask</span>
          </Link>
        </nav>
      </footer>
    </main>
  );
};

export default NoteLayout;
