import { DeckMarkdownSlide, DeckSlide } from "@/types";
import Markdown from "react-markdown";

export const renderSlide = (slide: DeckMarkdownSlide) => {
  console.log("slide", slide);
  return (
    <div className="flex-1 p-8 flex items-center justify-center bg-none">
      <div className="w-full aspect-[16/9] bg-gray-100 rounded-lg">
        <Markdown
          className="prose prose-sm md:prose-base lg:prose-lg max-w-none h-full p-8 prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl"
          components={{
            ul: ({ node, ...props }) => (
              <ul className="list-disc list-inside" {...props} />
            ),
            ol: ({ node, ...props }) => (
              <ol className="list-decimal list-inside" {...props} />
            ),
            h1: ({ node, ...props }) => (
              <h1 className="text-2xl font-bold mt-4 mb-2" {...props} />
            ),
            h2: ({ node, ...props }) => (
              <h2 className="text-xl font-bold mt-3 mb-2" {...props} />
            ),
            h3: ({ node, ...props }) => (
              <h3 className="text-lg font-bold mt-2 mb-1" {...props} />
            ),
          }}
        >
          {slide.markdown}
        </Markdown>
      </div>
    </div>
  );
};
