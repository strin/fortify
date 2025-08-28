// import { Suspense } from "react";
// import App from "./App";

// import { getServerSession } from "next-auth";
// import { authOptions } from "@/app/api/auth/[...nextauth]/options"; // Adjust the import path as needed
// import { SessionUser } from "@/types";

// export default async function ListOfUsers() {
//   const session = await getServerSession(authOptions);
//   const user = session?.user as SessionUser | null;
//   return (
//     <Suspense fallback={<div></div>}>
//       <App user={user} />
//     </Suspense>
//   );
// }

import { redirect } from "next/navigation";

export default function Page() {
  redirect("/u/clones");
}
