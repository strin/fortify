"use client";
import Image from "next/image";
import { ProfileType } from "@/types";
import SocialMedia from "@/components/SocialMedia";

interface ProfileProps {
  profile: ProfileType;
  showSocialMedia?: boolean;
}

const Profile: React.FC<ProfileProps> = ({
  profile,
  showSocialMedia = true,
}) => {
  return (
    <div
      className="flex flex-col items-center"
      style={{
        paddingTop: "40px",
        paddingBottom: "40px",
      }}
    >
      <div className="flex justify-center w-[150px] h-[150px] rounded-full overflow-hidden relative">
        <Image
          src={profile.profileImage}
          alt="Profile Image"
          width={150}
          height={150}
          className="object-cover relative z-10"
          style={{
            width: "100%",
            height: "100%",
          }}
        />
      </div>
      {showSocialMedia && <SocialMedia />}
    </div>
  );
};

export default Profile;
