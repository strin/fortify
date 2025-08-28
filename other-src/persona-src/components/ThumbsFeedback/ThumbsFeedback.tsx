import { ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Mixpanel } from "@/lib/mixpanel";
import { useState } from "react";

interface ThumbsFeedbackProps {
  question: string;
  answer: string;
}

export default function ThumbsFeedback({
  question,
  answer,
}: ThumbsFeedbackProps) {
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);

  const submitFeedback = (rating: "up" | "down") => {
    console.log("Submitting feedback");

    // Inside the submitFeedback function
    Mixpanel.track("Chat Feedback", {
      question: question,
      answer: answer,
      type: "thumbs", // You can change this to "up" or "down" when implementing the actual feedback
      rating,
    });

    setFeedback(rating);
  };
  return (
    <div className="flex flex-row justify-end">
      {!feedback && (
        <div className="flex justify-end mt-4 space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => submitFeedback("up")}
          >
            <ThumbsUp className="w-4 h-4 mr-1" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => submitFeedback("down")}
          >
            <ThumbsDown className="w-4 h-4 mr-1" />
          </Button>
        </div>
      )}
      {feedback && (
        <div className="text-xs text-gray-400 text-right mt-2 flex flex-row space-x-2">
          <div className="">
            {feedback === "up" ? (
              <ThumbsUp className="w-4 h-4" />
            ) : (
              <ThumbsDown className="w-4 h-4" />
            )}
          </div>
          <p>Thanks!</p>
        </div>
      )}
    </div>
  );
}
