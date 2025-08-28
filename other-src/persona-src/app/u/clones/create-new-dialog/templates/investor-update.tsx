import React from "react";
import ReactMarkdown from "react-markdown";
import { Textarea } from "@/components/ui/textarea";

interface InvestorUpdateTemplateProps {
  content: string | null;
  onUpdateTemplateContent: (content: string) => void;
}

export default function InvestorUpdateTemplate({
  content,
  onUpdateTemplateContent,
}: InvestorUpdateTemplateProps) {
  return (
    <div className="border-none p-4 w-full">
      <Textarea
        value={content || ""}
        onChange={(e) => onUpdateTemplateContent(e.target.value)}
        placeholder="Paste your investor update here..."
        className="w-full min-h-[300px] resize-none border rounded-none"
      />
    </div>
  );
}
