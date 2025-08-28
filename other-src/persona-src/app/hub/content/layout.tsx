import { Metadata } from "next";
import Image from "next/image";

import { Separator } from "@/components/ui/separator";
import { ContentHubNav } from "./components/content-hub-nav";

export const metadata: Metadata = {
  title: "Data Sources",
  description: "Edit the knowledge source of the chatmon.",
};

const sidebarNavItems = [
  /*{
    title: "Website",
    href: "website",
  },*/
  {
    title: "Links",
    href: "links",
  },
  {
    title: "Text",
    href: "text",
  },
  {
    title: "Files",
    href: "files",
  }
];

interface SettingsLayoutProps {
  children: React.ReactNode;
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <ContentHubNav items={sidebarNavItems} />
      </div>
      <div className="flex-1 lg:max-w-2xl">{children}</div>
    </div>
  );
}
