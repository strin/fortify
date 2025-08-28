import LinkEditor from "./LinkEditor";
import useCreator from "@/lib/creator";

export default async function LinksPage() {
  const creator = await useCreator();
  return <LinkEditor creator={creator} />;
}
