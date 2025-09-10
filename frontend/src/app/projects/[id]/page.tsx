"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [projectId, setProjectId] = useState<string>("");

  // Get project ID from params and redirect to overview
  useEffect(() => {
    params.then((p) => {
      setProjectId(p.id);
      router.replace(`/projects/${p.id}/overview`);
    });
  }, [params, router]);

  // This page just redirects, so return null
  return null;
}
