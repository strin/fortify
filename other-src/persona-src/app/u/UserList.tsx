"use client";

import { Creator, SessionUser } from "@/types";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { supabase } from "@/lib/supabase";
import { Category } from "./data";
import { redirect } from "next/navigation";

import CategorySection from "./components/CategorySection";
import UserListHeader from "./components/UserListHeader";

export default function UserList({ user }: { user: SessionUser | null }) {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [followedCreators, setFollowedCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("Following");
  const [categories, setCategories] = useState<Category[]>([
    { id: 0, name: "All", _CreatorCategory: [] },
  ]);

  if (!user) {
    redirect("/login");
  }

  useEffect(() => {
    const fetchCreators = async () => {
      try {
        const { data: categoriesResult } = await supabase
          .from("CreatorCategory")
          .select("*, _CreatorCategory(A)");

        if (categoriesResult) {
          setCategories((prev) => {
            const existingIds = new Set(prev.map((cat) => cat.id));
            const filteredCategories = categoriesResult.filter(
              (cat) => !existingIds.has(cat.id)
            );
            return [...prev, ...filteredCategories];
          });
        }

        const response = await fetch(`/api/creators?followerId=${user.id}`, {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
            Expires: "0",
          },
        });
        if (!response.ok) throw new Error("Failed to fetch creators");

        const data = await response.json();
        console.log("Data: ", data);
        const creators = data.filter((creator: Creator) => !creator.hide);
        console.log("Creators: ", creators);
        const followed = user
          ? creators.filter((creator: Creator) =>
              creator.followers?.some((follower) => follower.id === user.id)
            )
          : [];

        setCreators(creators);
        setFollowedCreators(followed);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCreators();
  }, [user]);

  const handleCategoryChange = (categoryName: string) => {
    setSelectedCategory(categoryName);
  };

  const groupCreatorsByCategory = (
    categories: Category[],
    creators: Creator[]
  ) => {
    const grouped: Record<string, Creator[]> = {};
    categories.forEach(({ name, _CreatorCategory }) => {
      if (name !== "All") {
        grouped[name] = _CreatorCategory
          .map(({ A }) => creators.find((creator) => creator.id === A))
          .filter(Boolean) as Creator[];
      }
    });
    return grouped;
  };

  const filteredCreators = groupCreatorsByCategory(categories, creators);
  const filteredFollowedCreators = groupCreatorsByCategory(
    categories,
    followedCreators
  );

  if (loading) {
    return (
      <>
        <UserListHeader />
        <div className="flex space-x-3 overflow-x-scroll scrollbar-hide px-3 pt-0 pb-3">
          {categories.map((_, index) => (
            <Skeleton
              key={index}
              className="rounded-md opacity-50"
              width={100}
              height={40}
            />
          ))}
        </div>
        <div className="flex flex-col gap-8 p-3">
          {Array.from({ length: 4 }).map((_, categoryIndex) => (
            <motion.li
              key={categoryIndex}
              className="overflow-hidden flex-shrink-0 list-none"
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex flex-col gap-4">
                <Skeleton width={120} height={24} className="opacity-50" />
                <ul className="flex space-x-6 overflow-x-auto scrollbar-hide list-none">
                  {Array.from({ length: 5 }).map((_, creatorIndex) => (
                    <motion.li
                      key={creatorIndex}
                      className="overflow-hidden flex-shrink-0 list-none"
                      initial={{ opacity: 1, y: 0 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div
                        className="flex flex-col gap-4 text-center"
                        style={{ width: "80px" }}
                      >
                        <div className="relative w-[80px] h-[80px]">
                          <Skeleton
                            circle
                            className="opacity-50"
                            width={80}
                            height={80}
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <Skeleton
                            width={80}
                            height={15}
                            className="opacity-50"
                          />
                        </div>
                      </div>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </motion.li>
          ))}
        </div>
      </>
    );
  }

  return (
    <div className="flex flex-col h-full px-2">
      <UserListHeader />
      <ul className="flex space-x-3 overflow-x-scroll scrollbar-hide px-3 pt-0 pb-3">
        <motion.li
          className="flex-shrink-0"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          <Button
            className={`${
              selectedCategory === "Following"
                ? "bg-[#F5F5F5] text-[#2D2D2D] pointer-events-none"
                : "bg-[#2D2D2D] text-white hover:text-white"
            }`}
            onClick={() => handleCategoryChange("Following")}
          >
            Following
          </Button>
        </motion.li>
        {categories.map((category) => (
          <motion.li
            key={category.id}
            className="flex-shrink-0"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <Button
              className={`${
                category.name === selectedCategory
                  ? "bg-[#F5F5F5] text-[#2D2D2D] pointer-events-none"
                  : "bg-[#2D2D2D] text-white hover:text-white"
              }`}
              onClick={() => handleCategoryChange(category.name)}
            >
              {category.name}
            </Button>
          </motion.li>
        ))}
      </ul>
      <ul className="flex flex-col space-y-3 overflow-y-auto px-3 pt-3 pb-40 h-full max-h-screen">
        {selectedCategory === "Following"
          ? Object.entries(filteredFollowedCreators).map(
              ([category, creators]) => (
                <CategorySection
                  key={category}
                  category={category}
                  creators={creators}
                />
              )
            )
          : selectedCategory === "All"
            ? Object.entries(filteredCreators).map(([category, creators]) => (
                <CategorySection
                  key={category}
                  category={category}
                  creators={creators}
                />
              ))
            : filteredCreators[selectedCategory] && (
                <CategorySection
                  category={selectedCategory}
                  creators={filteredCreators[selectedCategory]}
                />
              )}
      </ul>
    </div>
  );
}
