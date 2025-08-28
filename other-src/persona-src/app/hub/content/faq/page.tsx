import useCreator from "@/lib/creator";
import FAQDrivePage from "./faq";

export default async function Page({
  params,
}: {
  params: {
    chatmon: string;
    user: string;
  };
}) {
  const creator = await useCreator();

  return <FAQDrivePage creator={creator} />;
}
