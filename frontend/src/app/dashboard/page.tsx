import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getServerSession } from "@/app/api/auth/[...nextauth]/utils";

export default async function DashboardPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto px-4 py-16">
        <nav className="flex justify-between items-center mb-16">
          <h1 className="text-2xl font-bold">Fortify Dashboard</h1>
          <Button asChild variant="outline">
            <Link href="/api/auth/signout">Sign Out</Link>
          </Button>
        </nav>

        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Welcome back!</h2>
          <p className="text-xl text-gray-300 mb-8">
            You are signed in as: {session.user?.email}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4">Repository Scanner</h3>
              <p className="text-gray-300 mb-6">
                Scan your GitHub repositories for security vulnerabilities and
                get AI-powered fixes.
              </p>
              <Button asChild className="w-full">
                <Link href="/repositories">View Repositories</Link>
              </Button>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4">Recent Scans</h3>
              <p className="text-gray-300 mb-6">
                View your latest security scans and their results.
              </p>
              <Button variant="outline" className="w-full" disabled>
                Coming Soon
              </Button>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4">Security Reports</h3>
              <p className="text-gray-300 mb-6">
                Generate comprehensive security reports for your projects.
              </p>
              <Button variant="outline" className="w-full" disabled>
                Coming Soon
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
