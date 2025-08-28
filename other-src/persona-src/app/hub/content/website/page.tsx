import useCreator from "@/lib/creator";
import FileExplorer from "../components/file-explorer/file-explorer";
import AddNewWebsite from "./add-new";

export default async function Page() {
  const creator = await useCreator();
  console.log("creator", creator);

  return (
    <FileExplorer
      creator={creator}
      category="website"
      tools={<AddNewWebsite creator={creator} />}
    />
  );
}
