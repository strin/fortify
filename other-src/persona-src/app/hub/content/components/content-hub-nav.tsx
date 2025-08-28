"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

interface ContentHubNavProps extends React.HTMLAttributes<HTMLElement> {
  items: {
    href: string;
    title: string;
  }[];
}

export function ContentHubNav({ className, items, ...props }: ContentHubNavProps) {
  const pathname = usePathname();
  const segment = pathname.split("/").pop();
  const pathdir = pathname.split("/").slice(0, -1).join("/");

  console.log("segment", segment, pathname);

  return (
    <nav
      className={cn("flex flex-row space-x-2 items-center w-full", className)}
      {...props}
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={pathdir + "/" + item.href}
          className={cn(
            buttonVariants({ variant: "ghost" }),
            segment === item.href
              ? "bg-muted hover:bg-muted"
              : "hover:bg-transparent hover:underline",
            "justify-center"
          )}
        >
          {item.title}
        </Link>
      ))}
    </nav>
  );
}
