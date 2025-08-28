"use client";
import React from "react";
import { trackLinkClick } from "@/lib/mixpanel";
import Link from "next/link";

const TrackedLink: React.FC<
  {
    href: string;
    children: React.ReactNode;
    prefetch?: boolean;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>
> = ({ href, children, prefetch, ...props }) => {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    trackLinkClick(href);
  };

  return (
    <Link href={href} onClick={handleClick} prefetch={prefetch} {...props}>
      {children}
    </Link>
  );
};

export default TrackedLink;
