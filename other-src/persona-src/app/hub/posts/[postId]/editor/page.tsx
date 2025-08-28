import PostEditor from "./PostEditor";
import useCreator from "@/lib/creator";

export default async function PostEditorPage({
  params,
}: {
  params: { postId: string };
}) {
  const creator = await useCreator();
  return <PostEditor postId={params.postId} creator={creator} />;
}
