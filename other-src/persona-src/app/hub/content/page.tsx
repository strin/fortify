import { redirect } from "next/navigation";

export default function DefaultDrivePage({
  params,
}: {
  params: { user: string; chatmon: string };
}) {
  redirect(`/hub/content/website`);
}
