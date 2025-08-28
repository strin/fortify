import Image from "next/image";

interface INavigationLinkProps {
  src: string;
  isActive: boolean;
}
export default function NavigationLink({
  src,
  isActive
}: INavigationLinkProps) {
  return (
    <div className="flex justify-center items-center w-32">
      <Image
        src={isActive ? `${src}_active.svg` : `${src}.svg`}
        alt={"logo"}
        width={44}
        height={44}
        objectFit="contain"
      />
    </div>
  );
}
