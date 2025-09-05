import { getServerSession as nextAuthGetServerSession } from "next-auth/next";
import { Session } from "next-auth";
import { authOptions } from "./route";

export interface SessionUser {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
}

export interface AuthSession {
  user: SessionUser;
  expires: string;
}

/**
 * Server-side function to get the current user session
 * Returns null if no session exists
 */
export async function getServerSession(): Promise<AuthSession | null> {
  try {
    const session = (await nextAuthGetServerSession(
      authOptions as any
    )) as Session | null;

    if (!session || !session.user) {
      return null;
    }

    return {
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
      },
      expires: session.expires,
    };
  } catch (error) {
    console.error("Error getting server session:", error);
    return null;
  }
}

/**
 * Server-side function to get the current user from session
 * Returns null if no session or user exists
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getServerSession();
  return session?.user || null;
}

/**
 * Server-side function to require authentication
 * Throws an error if no session exists
 */
export async function requireAuth(): Promise<SessionUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Authentication required");
  }

  return user;
}
