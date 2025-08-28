'use client'

import { useRouter } from "next/navigation";
import Image from "next/image";

function HeaderNavigation() {
  const router = useRouter()

  return (
    <div className="w-full flex justify-between items-center mb-3 px-8 pt-3 cursor-pointer">
      <Image
        src={`/back.svg`}
        alt={"logo"}
        width={34}
        height={34}
        className="object-cover"
        onClick={() => router.back()}
      />
      <p>Conversation</p>
      <Image
        src={`/message_header.svg`}
        alt={"logo"}
        width={34}
        height={34}
        className="object-cover"
      />
    </div>
  )
}

export default HeaderNavigation