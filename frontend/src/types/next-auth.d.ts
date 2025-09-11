import { SessionUser } from "@/app/api/auth/[...nextauth]/utils";

declare module "next-auth" {
  interface Session {
    user: SessionUser;
    accessToken?: string;
  }

  interface User {
    id: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
  }
}
