import useCreator from "@/lib/creator";
import TextPage from "./text";

export default async function Page({
  params,
}: {
  params: {
    chatmon: string;
    user: string;
  };
}) {
  const creator = await useCreator();
  if (!creator) return <div>Creator not found</div>;

  return <TextPage creator={creator} />;
}
