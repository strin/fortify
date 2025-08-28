import useCreator from "@/lib/creator";
import ClonesView from "./ClonesView";

export default async function CloneTypesPage() {
  const creator = await useCreator();
  return <ClonesView creator={creator} />;
}
