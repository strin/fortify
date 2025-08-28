import { Post } from "@prisma/client";
import { getSignedUrl } from "@/lib/supabase";

// Cache signed URLs for 1 hour
// TODO: This is a temporary solution to avoid rate limiting on the supabase storage.
// TODO: figure out a better solution in the future.
const signedUrlCache = new Map<string, { url: string; expires: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

export const updateCoverImageUrls = async (post: Post) => {
  if (!post.coverImages) {
    return;
  }

  for (const [index, coverImage] of post.coverImages.entries()) {
    if (coverImage.startsWith("http")) {
      continue;
    }

    // Check cache first
    const cached = signedUrlCache.get(coverImage);
    if (cached && cached.expires > Date.now()) {
      post.coverImages[index] = cached.url;
      continue;
    }

    // Get fresh signed URL if not in cache or expired
    const signedUrl = await getSignedUrl(coverImage);
    if (signedUrl) {
      // Update cache
      signedUrlCache.set(coverImage, {
        url: signedUrl,
        expires: Date.now() + CACHE_TTL,
      });
      post.coverImages[index] = signedUrl;
    }
  }
};
