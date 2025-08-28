import ProfileSetupCard from "@/components/pageComponents/profile-setup/ProfileSetupCard";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../api/auth/[...nextauth]/options";

const ProfileSetup = async () => {
  const session = await getServerSession(authOptions);
  console.log("getServerSession", session);

  return (
    <div className="m-auto max-w-[576px] min-h-dvh relative bg-background text-foreground">
      <ProfileSetupCard />
    </div>
  );
};

export default ProfileSetup;
