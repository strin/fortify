import Image from "next/image";
import Instagram from "/public/images/instagram.png";

interface Props {
    onClick?: () => void
}

const LoginWithInsta: React.FC<Props> = ({ onClick }) => {
    return (
        <button
            className="flex items-center justify-center bg-[#ffffff] rounded-[10px] p-4 my-5 mx-auto w-[274px]"
            onClick={onClick}
        >
            <span className="text-[#35559D] text-[20px]  font-bold ">
                Connect with
            </span>
            <Image className="mx-3" src={Instagram} alt="icon" />
        </button>
    );
};

export default LoginWithInsta;
