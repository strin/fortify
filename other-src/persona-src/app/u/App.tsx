"use client";

import UserList from "./UserList";
import { SessionUser } from "@/types";

export default function App({ user }: { user: SessionUser | null }) {
  return <UserList user={user} />;
}
