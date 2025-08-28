import { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const DOMAIN = "https://shi.ai";

  // Define static routes for your site.
  // Add more pages as needed.
  const routes = [
    {
      url: `${DOMAIN}/`,
      lastModified: new Date(),
    },
    {
      url: `${DOMAIN}/about`,
      lastModified: new Date(),
    },
    {
      url: `${DOMAIN}/contact`,
      lastModified: new Date(),
    },
  ];

  return routes;
}
