import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/options";
import Landing from "@/components/pageComponents/landing";

const LandingPage = async () => {
  const session = await getServerSession(authOptions);
  const { user }: any = session || {};

  return (
    <>
      <div className="m-auto max-w-[576px] min-h-dvh relative">
        <Landing user={user} />
      </div>
    </>
  );
};

export default LandingPage;
