import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import ProfileSetup from "@/components/pageComponents/Onboarding/ProfileSetup";
import { Profile, SessionUser } from "@/types";
import { getServerSession } from "next-auth";

interface SessionUserTypes extends SessionUser {
  Profile: Profile[];
}

const Onboarding: React.FC = async () => {
  const session = await getServerSession(authOptions);

  const user = session!.user as SessionUserTypes;

  return <ProfileSetup user={user} />;
};

export default Onboarding;
