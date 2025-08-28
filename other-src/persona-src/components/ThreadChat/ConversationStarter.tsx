"use client";

import * as React from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import { Creator } from "@/types";
import { useEffect, useState } from "react";

interface ConversationStarterProps {
  creator: Creator;
}

const ConversationStarter: React.FC<ConversationStarterProps> = ({
  creator,
}) => {
  const [api, setApi] = React.useState<any>();
  const [current, setCurrent] = React.useState(0);
  const [count, setCount] = React.useState(0);

  const conversationTopics = [
    "What do you do?",
    "What inspired you to start creating content?",
    "What's your favorite part about what you do?",
    "How did you get started in your field?",
  ];

  useEffect(() => {
    if (!api) {
      return;
    }

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);

  return (
    <div className="w-full px-4">
      <Carousel setApi={setApi} className="w-full">
        <CarouselContent>
          {/* Conversation Topics Card */}
          <CarouselItem>
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">
                  Conversation Starters
                </h3>
                <ul className="space-y-2">
                  {conversationTopics.map((topic, index) => (
                    <li key={index} className="text-sm">
                      • {topic}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </CarouselItem>

          {/* Blog Posts Card */}
          <CarouselItem>
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">
                  Recent Blog Posts
                </h3>
              </CardContent>
            </Card>
          </CarouselItem>

          {/* Photos Card */}
          <CarouselItem>
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Photos</h3>
                <div className="grid grid-cols-2 gap-2"></div>
              </CardContent>
            </Card>
          </CarouselItem>
        </CarouselContent>

        <CarouselPrevious />
        <CarouselNext />
      </Carousel>

      <div className="py-2 text-center text-sm text-muted-foreground">
        Slide {current} of {count}
      </div>
    </div>
  );
};

export default ConversationStarter;
