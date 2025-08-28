import { unstable_cache } from "next/cache";
import { creatorStorage } from "@/lib/supabase";
import { Profile } from "@/types";

export const updateProfileImageWithSignedUrl = async (
  profile: Profile | undefined
) => {
  if (
    profile &&
    profile.profileImage &&
    !profile.profileImage.startsWith("http")
  ) {
    const signedUrl = await getSignedUrl(profile.profileImage);
    profile.profileImage = signedUrl;
  }
};

// Example showing how the cache works
export const getSignedUrl = unstable_cache(
  // 1. Original function to cache
  async (imagePath: string) => {
    console.log("Cache MISS - Generating new signed URL"); // Debug log
    const { data } = await creatorStorage.createSignedUrl(imagePath, 3600);
    return data?.signedUrl;
  },
  // 2. Cache key construction
  ["signed-url"],
  // 3. Cache options
  {
    revalidate: 3000,
    tags: [`profile-images`],
  }
);
