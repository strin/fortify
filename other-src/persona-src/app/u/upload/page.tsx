import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { SessionUser } from "@/types";
import { redirect } from "next/navigation";

export default async function UploadPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | null;

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex flex-col items-center justify-start w-full max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-8">Upload Content</h1>

      <div className="w-full p-8 border border-gray-800 rounded-lg">
        <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-gray-700 rounded-lg bg-gray-900/50 cursor-pointer hover:bg-gray-900/70 transition-colors">
          <p className="text-gray-400 text-center mb-2">
            Drag and drop your files here
          </p>
          <p className="text-sm text-gray-500">or click to select files</p>
        </div>

        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">Upload Details</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Title
              </label>
              <input
                type="text"
                className="w-full p-2 bg-gray-900 border border-gray-800 rounded-md"
                placeholder="Enter title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Description
              </label>
              <textarea
                className="w-full p-2 bg-gray-900 border border-gray-800 rounded-md h-24"
                placeholder="Enter description"
              />
            </div>

            <button className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
              Upload
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
