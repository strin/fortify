import useCreator from "@/lib/creator";
import LayoutView from "./LayoutView";
import { redirect } from "next/navigation";

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: {
    slug: string;
  };
}) {
  const creator = await useCreator();
  const { slug } = params;

  if (!slug) {
    return <div>No slug provided</div>;
  }

  if (!creator.username) {
    redirect("/u");
  }

  return (
    <LayoutView username={creator.username} slug={slug}>
      {children}
    </LayoutView>
  );
}
