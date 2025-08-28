"use client";

// import VoiceNote from "@/app/note/upload/VoiceNote";
// import SwipeableViews from "react-swipeable-views";
import { Creator } from "@/types";
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface MemoPageProps {
  creator: Creator;
}

export default function MemoPage({ creator }: MemoPageProps) {
  const [index, setIndex] = useState(0);

  const handleTabChange = (value: number) => {
    setIndex(value);
  };

  const handleSwipeChange = (value: number) => {
    setIndex(value);
  };

  return (
    <div className="h-full overflow-none px-4">
      <Tabs value={index.toString()} className="w-full dark">
        <TabsList className="grid w-full grid-cols-2 dark:bg-gray-800">
          <TabsTrigger
            value="0"
            onClick={() => handleTabChange(0)}
            className="dark:text-gray-200 dark:data-[state=active]:bg-gray-700"
          >
            Private
          </TabsTrigger>
          <TabsTrigger
            value="1"
            onClick={() => handleTabChange(1)}
            className="dark:text-gray-200 dark:data-[state=active]:bg-gray-700"
          >
            Public
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {/* <SwipeableViews
        index={index}
        onChangeIndex={handleSwipeChange}
        containerStyle={{ height: "100%" }}
        style={{ height: "100%" }}
      >
        <VoiceNote creator={creator} />
        <VoiceNote creator={creator} publicOnly />
      </SwipeableViews> */}
    </div>
  );
}
