import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import InstagramProvider from "next-auth/providers/instagram";
import TwitterProvider from "next-auth/providers/twitter";
import prisma from "@/lib/prisma";
import { compare } from "bcrypt";
import jwt from "jsonwebtoken";
import {
  createCreator,
  getCreatorByEmail,
} from "@/services/prisma/creator.prisma";
import { createProfile } from "@/services/prisma/profile.prisma";
import { uploadBlobImgFromUrl } from "@/services/supabase/storage.supabase";
import { pageRoutes } from "@/utils/routes";

const PROVIDERS = {
  twitter: "twitter",
  google: "google",
  instagram: "instagram",
  credentials: "credentials",
};

type userType = {
  id: number;
  email: string;
  password: string;
  display_name: string;
  username: string | null;
  is_profile_complete: boolean;
  bio_description: string | null;
  Profile?: { profileImage?: string }[];
};

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      credentials: {
        username: {
          type: "text",
        },
        password: { type: "password" },
      },
      // @ts-ignore
      async authorize(credentials, _) {
        const { username, password } = credentials as {
          username: string;
          password: string;
        };

        if (!username || !password) {
          throw new Error("Missing email or password");
        }
        const user = await prisma.creator.findUnique({
          where: {
            username,
          },
          include: {
            Profile: true,
          },
        });

        if (!user || !(await compare(password, user.password))) {
          throw new Error("Invalid email or password");
        }

        return user;
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    }),
    InstagramProvider({
      clientId: process.env.INSTA_CLIENT_ID as string,
      clientSecret: process.env.INSTA_SECRET_ID as string,
      authorization: {
        params: {
          scope: "user_profile,user_media",
        },
      },
    }),
    TwitterProvider({
      clientId: process.env.X_CLIENT_ID as string,
      clientSecret: process.env.X_CLIENT_SECRET as string,
      version: "1.0A",
      httpOptions: {
        timeout: 300000,
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: pageRoutes.customLogin,
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",

  // useSecureCookies: false,
  jwt: {
    encode: async ({ secret, token }) => {
      //@ts-ignore
      return jwt.sign(token, secret, { algorithm: "HS256" });
    },
    decode: async ({ secret, token }) => {
      try {
        //@ts-ignore
        return jwt.verify(token, secret, { algorithms: ["HS256"] });
      } catch (err) {
        console.error("Token verifcation failed:", err);
        return null;
      }
    },
  },

  callbacks: {
    async signIn({ user, account, profile, credentials, callbackUrl }: any) {
      console.log("signIn", {
        user,
        account,
        profile,
        credentials,
        callbackUrl,
      });

      if (
        account.provider === PROVIDERS.twitter ||
        account.provider === PROVIDERS.instagram
      ) {
        const { email = "", name, screen_name, username } = profile;

        const existingUser: any = await getCreatorByEmail(name || username);

        if (existingUser) {
          user.user_id = existingUser.id;
          user.id = existingUser.id;
          user.display_name = existingUser.display_name;
          user.isProfileComplete = existingUser.isProfileComplete;
          user.profileImage = existingUser?.Profile?.[0]?.profileImage;
          user.bioDescription = existingUser.bioDescription;
          return true;
        }

        const newUserObj = {
          email: email || "",
          display_name: "",
          username: name || username,
          password: "",
          bioDescription: "",
        };

        const newUser = await createCreator(newUserObj);

        let profileData;
        if (user?.image) {
          const path = `users/${newUser.id}/profile.png`;
          const imgPath = await uploadBlobImgFromUrl(path, user?.image);

          profileData = await createProfile({
            profileImage: imgPath,
            creatorId: newUser.id,
          });
        }

        user.userId = newUser.id;
        user.id = newUser.id;
        user.display_name = newUser.display_name || name;
        user.isProfileComplete = newUser.isProfileComplete;
        user.bioDescription = newUser.bioDescription;
        user.profileImage = profileData?.profileImage;
        user.id = newUser.id;

        return true;
      }

      return true;
    },
    async redirect({ url, baseUrl }: any) {
      return url;
    },

    async session({ session, user, token }: any) {
      session.user = {
        ...session.user,
        id: token.id,
        display_name: token.display_name,
        username: token.name,
        email: token.email,
        profileImage: token?.profileImage,
        isProfileComplete: token.isProfileComplete,
        bioDescription: token.bioDescription,
        creator_prompt: token.creator_prompt,
        voice_settings: token.voice_settings,
        hide: token.hide,
        welcomeMessage: token.welcomeMessage,
      };

      return session;
    },

    async jwt({ token, user, trigger, account, profile, isNewUser, se }: any) {
      if (user) {
        token = {
          ...token,
          id: user.id,
          display_name: user.display_name,
          profileImage: user?.profileImage || token?.profileImage,
          bioDescription: user.bioDescription,
          isProfileComplete: user.isProfileComplete,
          creator_prompt: user.creator_prompt,
          voice_settings: user.voice_settings,
          hide: user.hide,
          welcomeMessage: user.welcomeMessage,
        };

        // Special handling for credentials provider
        if (account?.provider === "credentials") {
          token.name = user.username; // Set the name from username for credentials
        }
      }

      // if (!token.displayName) {
      //   token.displayName = token.name;
      // }

      if (trigger === "update") {
        const existingUser: any = await getCreatorByEmail(
          token.name || token.username
        );
        console.log("existingUser", existingUser);

        console.log("trigger", token, existingUser);

        token.display_name = existingUser.display_name;
        token.profileImage = existingUser?.Profile?.[0]?.profileImage;
        token.bioDescription = existingUser.bioDescription;
        token.isProfileComplete = existingUser.isProfileComplete;
        token.creator_prompt = existingUser.creator_prompt;
        token.voice_settings = existingUser.voice_settings;
        token.hide = existingUser.hide;
        token.welcomeMessage = existingUser.welcomeMessage;
      }

      return token;
    },

    // async session({ session, user, token }: any) {
    //   session.user.id = token.id;
    //   session.user.displayName = token.displayName;
    //   session.user.username = token.name;
    //   session.user.email = token.email;
    //   session.user.profileImage = token.profileImage;
    //   session.user.isProfileComplete = token.isProfileComplete;

    //   return session;
    // },

    // async jwt({ token, user, account, profile, isNewUser }: any) {
    //   if (user) {
    //     token.displayName = user?.display_name || token.name;
    //     token.profileImage = user.profileImage || token.profileImage;
    //     token.bio = user?.bio || token.bio;
    //     token.isProfileComplete = user?.isProfileComplete;
    //     // token.username = user?.username;
    //     if (token.provider !== "google" && user?.id) {
    //       token.id = user?.id;
    //     }
    //   }
    //   if (!token.displayName) {
    //     token.displayName = token.name;
    //   }

    //   return token;
    // },
  },
};
