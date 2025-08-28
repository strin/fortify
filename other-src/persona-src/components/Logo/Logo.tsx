import Link from "next/link";
import Image from "next/image";

interface LogoProps {
  withText?: boolean;
}

export default function Logo({ withText = true }: LogoProps) {
  return (
    <div className="flex items-center">
      <Link href="/u" className="flex items-center gap-0">
        <Image src="/logo.png" alt="Lively Logo" width={54} height={54} />
        {withText && (
          <Image
            src="/lively-text.png"
            alt="Lively"
            width={120}
            height={48}
            className="w-[80px] h-auto -ml-3"
          />
        )}
      </Link>
    </div>
  );
}
