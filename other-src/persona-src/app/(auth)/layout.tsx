import Image from "next/image";
import { LogoSVGImage } from "@/utils/images";

interface Props {
  children: React.ReactNode;
}
const AuthLayout: React.FC<Props> = ({ children }) => {
  return (
    <>
      <div className="m-auto max-w-[576px] min-h-dvh relative bg-background text-foreground">
        <div className="flex justify-center items-center flex-col p-5 pt-24">
          <Image src={LogoSVGImage} width={102} height={102} alt="Logo" />
          <h1 className="text-primary text-2xl font-bold text-center mt-5">
            Persona
          </h1>
          <p className="text-muted-foreground text-center font-medium mt-2">
            Bring your social presence to life
          </p>
        </div>
        {children}
      </div>
    </>
  );
};

export default AuthLayout;
