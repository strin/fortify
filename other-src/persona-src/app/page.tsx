import { redirect } from "next/navigation";

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session) {
    return redirect("/u");
  }
  return redirect("/login");
}
