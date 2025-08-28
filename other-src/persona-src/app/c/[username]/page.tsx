import { redirect } from "next/navigation";

export default function CallPage({ params }: { params: { username: string } }) {
  redirect(`/c/${params.username}/-1`);
}
