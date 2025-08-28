import PostList from "./PostList";
import useCreator from "@/lib/creator";

export default async function PostsPage() {
  const creator = await useCreator();

  return <PostList creator={creator} />;
}
