"use client";

import React from "react";
import { motion } from "framer-motion";
import { formatMessageDateSection } from "./utils";
import { Loader2, MessageCircleMore, Phone } from "lucide-react";
import { useRouter } from "next/navigation";
import { Thread } from "@/types";
import { formatDuration } from "./utils";
import { AnimatePresence } from "framer-motion";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import Skeleton from "react-loading-skeleton";

const threadLastMessageDate = (thread: Thread) => {
  const textDate = thread.latestTextMessage?.createdAt;
  const callDate = thread.latestCallMessage?.createdAt;
  if (!textDate) return new Date(callDate || new Date());
  if (!callDate) return new Date(textDate || new Date());
  return new Date(textDate) > new Date(callDate)
    ? new Date(textDate)
    : new Date(callDate);
};

const threadLastMessageIsText = (thread: Thread) => {
  const textDate = thread.latestTextMessage?.createdAt;
  const callDate = thread.latestCallMessage?.createdAt;
  if (!textDate) return false;
  if (!callDate) return true;
  return new Date(textDate) > new Date(callDate);
};

const categoriesFromThread = (threads: Thread[]) => {
  const allCategories = threads
    .map((thread) =>
      thread.creator?.categories?.map((category) => category.name)
    )
    .flat();
  return [...new Set(allCategories)].filter(
    (category) => category !== undefined
  );
};

function ThreadList() {
  const [threads, setThreads] = React.useState<Thread[]>([]);
  const [categories, setCategories] = React.useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = React.useState<
    string | undefined
  >(undefined);
  const [search, setSearch] = React.useState<string>("");
  const [loading, setLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    const fetchThreads = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/threads");
        if (!response.ok) {
          throw new Error("Failed to fetch threads");
        }
        const data = await response.json();
        setThreads(
          data.sort(
            (a: Thread, b: Thread) =>
              threadLastMessageDate(b).getTime() -
              threadLastMessageDate(a).getTime()
          )
        );
        setCategories(categoriesFromThread(data as Thread[]));
      } catch (error) {
        console.error("Error fetching threads:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchThreads();
  }, []);

  const router = useRouter();
  const filteredThreads = threads
    .filter((thread) =>
      !search || search === ""
        ? true
        : thread.creator?.display_name
            ?.toLowerCase()
            .startsWith(search.toLowerCase()) ||
          thread.creator?.username
            ?.toLowerCase()
            .startsWith(search.toLowerCase()) ||
          thread.creator?.categories?.some((category) =>
            category.name.toLowerCase().startsWith(search.toLowerCase())
          ) ||
          thread.latestTextMessage?.content
            ?.toLowerCase()
            .startsWith(search.toLowerCase())
    )
    .filter((thread) =>
      selectedCategory
        ? selectedCategory === "All" ||
          thread.creator?.categories?.some(
            (category) => category.name === selectedCategory
          )
        : true
    );

  return (
    <div className="px-4 h-full flex flex-col gap-2">
      <AnimatePresence mode="wait">
        <div className="flex justify-between gap-2">
          <Input
            type="search"
            placeholder="Search"
            className="grow bg-[#2D2D2D] border-[#9D9D9D] h-12 text-[#9D9D9D] border"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="bg-[#2D2D2D] border-[#9D9D9D] h-12 text-[#9D9D9D] border">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem key={"All"} value="All">
                  All
                </SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </AnimatePresence>
      <div className="flex-grow overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex flex-col space-y-3 pt-3 pb-40">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="flex justify-between gap-2 p-4 h-20 bg-[#2D2D2D] rounded-md"
              >
                <div className="flex items-center gap-2">
                  <Skeleton
                    circle
                    width={56}
                    height={56}
                    baseColor="#3D3D3D"
                    highlightColor="#4D4D4D"
                  />
                  <div className="flex flex-col gap-2">
                    <Skeleton
                      width={120}
                      height={16}
                      baseColor="#3D3D3D"
                      highlightColor="#4D4D4D"
                    />
                    <Skeleton
                      width={180}
                      height={12}
                      baseColor="#3D3D3D"
                      highlightColor="#4D4D4D"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <ul className="flex flex-col space-y-3 overflow-y-auto pt-3 pb-40 h-full max-h-screen scrollbar-hide">
            {filteredThreads.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <MessageCircleMore size={48} className="text-gray-500 mb-4" />
                <h3 className="text-lg font-medium text-white-blackAndWhite-white mb-2">
                  No threads found
                </h3>
                <p className="text-sm text-[#9D9D9D]">
                  {search || selectedCategory !== "All"
                    ? "Try adjusting your search or filters"
                    : "Start a conversation to create a new thread"}
                </p>
              </div>
            ) : (
              filteredThreads.map((thread) => (
                <motion.li
                  key={thread.id}
                  className="overflow-hidden flex-shrink-0"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => router.push(`/u/thread/${thread.id}`)}
                >
                  <div className="flex justify-between gap-2 p-4 h-20 max-h-24 min-h-fit bg-[#2D2D2D] rounded-md">
                    <div className="flex items-center gap-2">
                      <div className="relative w-14 h-14 rounded-full overflow-hidden">
                        <img
                          src={
                            (thread.creator.Profile &&
                              thread.creator.Profile[0].profileImage) ||
                            "/default-profile-image.jpg"
                          }
                          alt={"profile image"}
                          loading="eager"
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 flex flex-col gap-2 items-start">
                        <div className="text-sm font-medium text-white-blackAndWhite-white">
                          {thread.creator.display_name}
                        </div>
                        {thread.latestTextMessage &&
                        threadLastMessageIsText(thread) ? (
                          <div className="flex items-center gap-2 text-xs font-medium text-[#9D9D9D]">
                            <MessageCircleMore
                              size={20}
                              color="#1AABF4"
                              className="min-w-[20px]"
                            />
                            <p className="line-clamp-2">
                              {thread.latestTextMessage.content}
                            </p>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-xs font-medium text-[#9D9D9D]">
                            <Phone size={20} color="#1AABF4" strokeWidth={3} />
                            <p>
                              Call Duration:{" "}
                              {formatDuration(
                                thread.latestCallMessage?.chat.durationSecs || 0
                              )}{" "}
                              min
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col justify-between items-center">
                      <div className="text-sm font-medium text-[#9D9D9D]">
                        {formatMessageDateSection(
                          threadLastMessageDate(thread)
                        )}
                      </div>
                      {/* !!thread.numberUnreadMessages && (
                <div className="w-4 h-4 p-2 rounded-full bg-[#1AABF4] text-black-900 flex justify-center items-center">
                  {thread.numberUnreadMessages}
                </div>
              )} */}
                    </div>
                  </div>
                </motion.li>
              ))
            )}
          </ul>
        )}
      </div>
    </div>
  );
}

export default ThreadList;
