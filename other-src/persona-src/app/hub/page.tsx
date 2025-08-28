import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Creator } from "@/types";

export default async function HubPage() {
  return <div>Hub</div>;
}
