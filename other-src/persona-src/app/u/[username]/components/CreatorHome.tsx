"use client";

import { Button } from "@/components/ui/button";
import { Linkedin } from "lucide-react";
import Link from "next/link";

interface CreatorHomeProps {
  username: string;
}

export default function CreatorHome({ username }: CreatorHomeProps) {
  return (
    <div className="flex flex-col gap-4 w-full">
      <Button variant="outline" className="w-full">
        <Linkedin className="mr-2 h-4 w-4" />
        Connect LinkedIn
      </Button>

      <Link href={`/c/${username}`} className="w-full">
        <Button variant="outline" className="w-full">
          Start Interview
        </Button>
      </Link>
    </div>
  );
}
