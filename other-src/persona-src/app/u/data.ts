import { Creator } from "@/types";

export interface Category {
  id: number;
  name: string;
  _CreatorCategory: CreatorCategory[];
}

export interface CreatorCategory {
  A: number;
}

export function groupCreatorsByCategory(
  categories: Category[],
  creators: Creator[]
): Record<string, Creator[]> {
  const groupedCreators: Record<string, Creator[]> = {};

  categories.forEach((category) => {
    const creatorsUnderCategory = category._CreatorCategory
      .map((creatorCategory) =>
        creators.find((creator) => creator.id === creatorCategory.A)
      )
      .filter(Boolean) as Creator[];

    groupedCreators[category.name] = creatorsUnderCategory;
  });

  return groupedCreators;
}

export const CATEGORIES: Category[] = [
  { id: 1, name: "Creators", _CreatorCategory: [] },
  { id: 2, name: "Visual Artists", _CreatorCategory: [] },
  { id: 3, name: "Fitness Coaches", _CreatorCategory: [] },
  { id: 4, name: "Musicians", _CreatorCategory: [] },
];

export const generateCreators = (numCreators: number): Creator[] => {
  const dummyImageUrl =
    "https://salptvuabtjefqxcwhoj.supabase.co/storage/v1/object/public/creator-public/images/6-1731883380652.webp";

  const getRandomCategory = () => {
    const randomIndex = Math.floor(Math.random() * CATEGORIES.length);
    return CATEGORIES[randomIndex].name;
  };

  return Array.from({ length: numCreators }, (_, index) => ({
    id: index + 1,
    display_name: `Creator ${index + 1}`,
    username: `@creator${index + 1}`,
    email: `creator${index + 1}@example.com`,
    image: dummyImageUrl,
    Profile: [
      {
        profileImage: dummyImageUrl,
      },
    ],
    hide: Math.random() > 0.7, // Randomly hide some creators
    followers: Array.from(
      { length: Math.floor(Math.random() * 5) }, // Random number of followers
      (_, followerIndex) => ({ id: 100 + index * 5 + followerIndex })
    ),
    category: getRandomCategory(),
  }));
};

export const CREATORS: Creator[] = generateCreators(40);
