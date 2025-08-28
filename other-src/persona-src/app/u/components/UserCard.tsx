"use client";
import Image from "next/image";
import { Creator } from "@/types";
import { useRouter } from "next/navigation";
import Link from "next/link";
interface IUserCard {
  creator: Creator;
}

export default function UserCard({ creator }: IUserCard) {
  const router = useRouter();
  return (
    <Link
      href={`/u/${creator.username}`}
      prefetch={true}
      className="flex flex-col gap-4 text-center"
      style={{ width: "80px", overflow: "hidden" }}
    >
      <div className="relative w-[80px] h-[80px] rounded-full overflow-hidden">
        <Image
          src={
            (creator.Profile && creator.Profile[0]?.profileImage) ||
            "/default-profile-image.jpg"
          }
          alt={creator.display_name || ""}
          fill
          loading="eager"
          className="object-cover"
        />
      </div>
      <div className="flex flex-col gap-1">
        <h4 className="text-xs text-center">{creator.display_name}</h4>
      </div>
    </Link>
  );
}
