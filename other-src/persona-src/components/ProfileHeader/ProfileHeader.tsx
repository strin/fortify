"use client";
import Image from "next/image";
import { Creator } from "@/types";
import SocialMedia from "@/components/SocialMedia";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { SessionUser } from "@/types";
import { useEffect, useState } from "react";
import { creatorPublicStorage, creatorStorage } from "@/lib/supabase";
import { DefaultProfileImage } from "@/utils/images";
import FollowAndShareButton from "./FollowAndShareButton";
import { ChatsIcon, FollowersIcon, LineIcon, StoriesIcon } from "@/utils/icons";
import { signOut } from "next-auth/react";

interface ProfileProps {
  creator: Creator;
  showSocialMedia?: boolean;
  user?: SessionUser | null;
}

const FollowButton: React.FC<{
  creator: Creator;
  user: SessionUser | null | undefined;
}> = ({ creator, user }) => {
  const [isFollowing, setIsFollowing] = useState(
    creator.followers?.some((follower) => follower.id === user?.id)
  );

  const followHandler = async () => {
    const response = await fetch(`/api/creators/${creator.id}/follow`, {
      method: "PUT",
    });
    const data = await response.json();
    console.log("follow response", data);
    setIsFollowing(data.following);
  };
  const unFollowHandler = async () => {
    const response = await fetch(`/api/creators/${creator.id}/unfollow`, {
      method: "PUT",
    });
    const data = await response.json();
    console.log("unfollow response", data);
    setIsFollowing(data.following);
  };
  if (!user) {
    return (
      <Button
        variant="default"
        onClick={() => (window.location.href = "/login")}
      >
        Follow
      </Button>
    );
  }

  return isFollowing ? (
    <Button
      variant="secondary"
      className="px-2 py-1 rounded-md font-semibold text-sm"
      onClick={unFollowHandler}
      size="sm"
    >
      Following
    </Button>
  ) : (
    <Button variant="default" onClick={followHandler} size="sm">
      Follow
    </Button>
  );
};

const Profile: React.FC<ProfileProps> = ({
  creator,
  user,
  showSocialMedia = true,
}) => {
  const [imgPath, setImgPath] = useState("");

  const handleShare = () => {
    navigator.clipboard.writeText(
      `https://${window.location.host}/d/${creator.username}`
    );
    toast.success("Profile link has been copied!");
  };

  useEffect(() => {
    const getImgPath = async () => {
      const profileImage = creator?.Profile?.[0]?.profileImage;
      if (profileImage) {
        if (profileImage.startsWith("https://")) {
          setImgPath(profileImage);
        } else {
          const { data: publicUrlData }: any =
            await creatorStorage.createSignedUrl(profileImage, 3600);
          setImgPath(publicUrlData?.signedUrl);
        }
      }
    };

    getImgPath();
  }, []);

  return (
    <>
      <div className="px-2">
        <div className="bg-black-800 p-[10px] rounded-[14px]">
          <div className="flex gap-3 p-2">
            <Image
              src={imgPath || DefaultProfileImage.src}
              alt="User"
              className="rounded-[14px] w-[100px] h-[100px] object-cover"
              width={100}
              height={100}

              // unoptimized
            />
            <div className="flex-1 flex flex-col gap-1">
              <h1 className="text-white-blackAndWhite-white text-2xl font-bold word-break break-all">
                {creator?.display_name}
              </h1>
              <p className="text-black-500">@{creator?.username || ""}</p>
              <div className="flex items-center gap-2">
                {!user ||
                  (user.id !== creator.id && (
                    <FollowButton creator={creator} user={user} />
                  ))}
                <Button onClick={handleShare} variant="outline" size="sm">
                  Share Profile
                </Button>
              </div>
            </div>
          </div>
        </div>
        {/* <div className="mt-3 p-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StoriesIcon />
            <p className="text-xs text-black-700 font-medium">0 stories</p>
          </div>
          <LineIcon />
          <div className="flex items-center gap-2">
            <FollowersIcon />
            <p className="text-xs text-black-700 font-medium">No Followers</p>
          </div>
          <LineIcon />
          <div className="flex items-center gap-2">
            <ChatsIcon />
            <p className="text-xs text-black-700 font-medium">5K Chats</p>
          </div>
        </div> */}
      </div>
      {/* {showSocialMedia && <SocialMedia />} */}
    </>
  );
};

export default Profile;
