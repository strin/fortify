import NextAuth from "next-auth/next";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const authOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // Look up user in database
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });

          if (!user || !user.password) {
            return null;
          }

          // Verify password with bcrypt
          const isValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isValid) {
            return null;
          }

          // Update last login time
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          });

          return {
            id: user.id,
            email: user.email,
            name: user.displayName,
            image: user.avatarUrl,
          };
        } catch (error) {
          console.error("Error in credentials authorize:", error);
          return null;
        }
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "read:user user:email public_repo",
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account, profile }: any) {
      try {
        if (account?.provider === "github" && profile && user.email) {
          // Check if user exists
          let existingUser = await prisma.user.findUnique({
            where: { email: user.email },
          });

          if (!existingUser) {
            // Create new user for GitHub login
            existingUser = await prisma.user.create({
              data: {
                email: user.email,
                displayName: user.name || profile.name,
                githubUsername: profile.login || profile.preferred_username,
                avatarUrl: user.image || profile.avatar_url,
                emailVerified: new Date(),
                lastLoginAt: new Date(),
                githubAccessToken: account.access_token,
              },
            });
          } else {
            // Update existing user's login time and GitHub info
            await prisma.user.update({
              where: { id: existingUser.id },
              data: {
                lastLoginAt: new Date(),
                githubUsername:
                  profile.login ||
                  profile.preferred_username ||
                  existingUser.githubUsername,
                avatarUrl:
                  user.image || profile.avatar_url || existingUser.avatarUrl,
                displayName:
                  user.name || profile.name || existingUser.displayName,
                githubAccessToken: account.access_token,
              },
            });
          }

          // Store the user ID for later use
          user.id = existingUser.id;
        }

        return true;
      } catch (error) {
        console.error("Error in signIn callback:", error);
        return false;
      }
    },
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (token && session.user) {
        session.user.id = token.id as string;

        // Fetch full user data from database
        if (token.id) {
          try {
            const dbUser = await prisma.user.findUnique({
              where: { id: token.id as string },
            });

            if (dbUser) {
              session.user.name = dbUser.displayName;
              session.user.email = dbUser.email;
              session.user.image = dbUser.avatarUrl;
              session.user.githubAccessToken = dbUser.githubAccessToken;
            }
          } catch (error) {
            console.error("Error fetching user data:", error);
          }
        }
      }
      return session;
    },
  },
};

// @ts-ignore
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
