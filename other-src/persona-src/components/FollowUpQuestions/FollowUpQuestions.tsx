"use client";
import React from "react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export interface FollowUpQuestion {
  question: string;
  displayText: string;
  darkMode?: boolean;
}

interface FollowUpQuestionsProps {
  title?: string;
  runQuestion?: (question: string) => void;
  followUpQuestions: FollowUpQuestion[];
  darkMode?: boolean;
}

export default function FollowUpQuestions(props: FollowUpQuestionsProps) {
  const { runQuestion } = props;

  return (
    <Card
      className={`mt-4 w-full ${props.darkMode ? "bg-gray-900 border-gray-800" : ""}`}
    >
      {props.title && (
        <div className="flex flex-col space-y-1.5 pt-6 pb-4 px-6">
          <p
            className={`text-sm text-muted-foreground ${props.darkMode ? "text-gray-400" : ""}`}
          >
            {props.title}
          </p>
        </div>
      )}
      <CardContent>
        {props.followUpQuestions.map((question, index) => (
          <React.Fragment key={index}>
            <div
              className={`text-sm cursor-pointer transition-colors duration-200 py-4 rounded ${
                props.darkMode
                  ? "text-white hover:text-gray-400"
                  : "hover:text-gray-500"
              }`}
              onClick={() => runQuestion && runQuestion(question.question)}
            >
              {question.displayText}
            </div>
            {index < props.followUpQuestions.length - 1 && (
              <Separator className={props.darkMode ? "bg-gray-800" : ""} />
            )}
          </React.Fragment>
        ))}
      </CardContent>
    </Card>
  );
}
