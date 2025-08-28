import Image from "next/image";
import TwitterX from "/public/images/twitterX.png";

interface Props {
  onClick?: () => void;
}

const LoginWithX: React.FC<Props> = ({ onClick }) => {
  return (
    <button
      className="flex items-center justify-center bg-black rounded-full p-4 my-5 mx-auto w-[274px] h-[60px]"
      onClick={onClick}
    >
      <span className="text-[20px] text-white font-bold mr-2 leading-none">
        Connect with
      </span>
      <Image
        src={TwitterX}
        alt="X logo"
        width={24}
        height={24}
        className="inline-block"
      />
    </button>
  );
};

export default LoginWithX;
