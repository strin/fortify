import useCreator from "@/lib/creator";
import FilesDrivePage from "./files";

export default async function Page() {
  const creator = await useCreator();
  if (!creator) return <div>Creator not found</div>;

  return <FilesDrivePage creator={creator} />;
}
