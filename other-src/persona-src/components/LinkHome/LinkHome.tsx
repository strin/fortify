"use client";
import React, { useState, useEffect } from "react";
// Removed the Sanity client import
// import { client } from "@/sanity/lib/client";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import TrackedLink from "../TrackedLink";

interface Gist {
  title: string;
  slug: {
    current: string;
  };
  _updatedAt: string;
}

// Simulated local gist data. Replace this with your new data source as needed.
const mockGists: Gist[] = [
  {
    title: "Gist Title 1",
    slug: { current: "gist-title-1" },
    _updatedAt: "2025-02-12T08:00:00.000Z",
  },
  {
    title: "Gist Title 2",
    slug: { current: "gist-title-2" },
    _updatedAt: "2025-02-10T08:00:00.000Z",
  },
];

const BlogList: React.FC = () => {
  const [gists, setGists] = useState<Gist[]>([]);

  useEffect(() => {
    const fetchGists = async () => {
      // Simulate a fetch delay. Replace this with your real data-fetching logic.
      await new Promise((resolve) => setTimeout(resolve, 100));
      setGists(mockGists);
    };

    fetchGists();
  }, []);

  return (
    <div className="space-y-4">
      {gists.map((gist) => (
        <TrackedLink
          href={`/g/${gist.slug.current}`}
          className="block"
          key={gist.slug.current}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">{gist.title}</CardTitle>
              <CardDescription>
                {new Date(gist._updatedAt).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
          </Card>
        </TrackedLink>
      ))}
    </div>
  );
};

export default BlogList;
