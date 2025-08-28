import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import SessionWrapper from "./SessionWrapper";
import SideBar from "@/components/SideBar";
import { authOptions } from "@/app/api/auth/[...nextauth]/options"; // Adjust the import path as needed

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login"); // Redirect to login page if no session exists
  }

  return (
    <SessionWrapper>
      <div className="flex h-screen p-5">
        <SideBar />
        <main className="flex-1 overflow-y-auto p-4 mt-6">{children}</main>
      </div>
    </SessionWrapper>
  );
}
