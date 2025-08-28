"use client";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import InvestorUpdateTemplate from "./templates/investor-update";
import { useRouter } from "next/navigation";

interface Template {
  id: string;
  name: string;
  icon: React.ReactNode;
  disabled?: boolean;
  ui: React.ReactNode;
  onCreate?: (data: any) => void;
}

interface NewLivelyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTemplateSelect: (templateId: string) => void;
  creatorId: number;
}

export default function NewLivelyDialog({
  creatorId,
  open,
  onOpenChange,
  onTemplateSelect,
}: NewLivelyDialogProps) {
  const [selectedTemplate, setSelectedTemplate] = React.useState<string | null>(
    null
  );
  const [templateContent, setTemplateContent] = React.useState<string | null>(
    null
  );
  const [isCreating, setIsCreating] = React.useState(false);
  const router = useRouter();

  const templates: Template[] = [
    {
      id: "investor-update",
      name: "Investor Update",
      icon: (
        <svg
          className="w-12 h-12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M3 3v18h18" />
          <path d="m3 15 5-5 5 5 8-8" />
        </svg>
      ),
      ui: (
        <InvestorUpdateTemplate
          content={templateContent}
          onUpdateTemplateContent={setTemplateContent}
        />
      ),
      onCreate: async (content: any) => {
        const res = await fetch("/api/lively/from-template/investor-update", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: content,
            creatorId: creatorId,
          }),
        });
        const response = await res.json();
        if (response.error) {
          throw new Error(response.error);
        }
        console.log("Created slide deck:", response);
        // redirect to the new slide deck
        router.push(`/edit/${response.id}`);
      },
    },
    {
      id: "sales-pitch",
      name: "Sales Pitch",
      icon: (
        <svg
          className="w-12 h-12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
      disabled: true,
      ui: <div>Sales Pitch</div>,
    },
  ];

  const selectedTemplateData = templates.find(
    (template) => template.id === selectedTemplate
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Lively
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        {!selectedTemplate ? (
          <>
            <DialogHeader>
              <DialogTitle>Create New Lively</DialogTitle>
              <DialogDescription>Choose from these templates</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {/* <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates"
                  className="pl-9 focus:outline-none"
                  autoFocus={false}
                />
              </div> */}
              <div className="grid grid-cols-3 gap-4 mt-6">
                {templates.map((template) => (
                  <TooltipProvider key={template.id}>
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <button
                          className={`flex flex-col items-center justify-center p-6 border rounded-lg transition-colors ${
                            template.disabled
                              ? "bg-muted cursor-not-allowed text-muted-foreground"
                              : selectedTemplate === template.id
                              ? "border-orange-500 border-2"
                              : "hover:border-primary"
                          }`}
                          onClick={() => {
                            if (!template.disabled) {
                              setSelectedTemplate(template.id);
                              onTemplateSelect(template.id);
                            }
                          }}
                          disabled={template.disabled}
                        >
                          {template.icon}
                          <span className="mt-2 text-sm font-medium">
                            {template.name}
                          </span>
                        </button>
                      </TooltipTrigger>
                      {template.disabled && (
                        <TooltipContent>
                          <p>Coming soon</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                ))}
                <TooltipProvider>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <button
                        className="flex flex-col items-center justify-center p-6 border rounded-lg  transition-colors bg-muted cursor-not-allowed text-muted-foreground"
                        disabled={true}
                      >
                        <Plus className="w-12 h-12" />
                        <span className="mt-2 text-sm font-medium">
                          Custom Template
                        </span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Coming soon</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{selectedTemplateData?.name}</DialogTitle>
            </DialogHeader>
            <div className="py-4 w-full">{selectedTemplateData?.ui}</div>
          </>
        )}
        <DialogFooter>
          {selectedTemplate && (
            <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
              Back
            </Button>
          )}
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            variant="default"
            disabled={!selectedTemplate || isCreating}
            onClick={async () => {
              if (selectedTemplateData?.onCreate) {
                setIsCreating(true);
                try {
                  await selectedTemplateData.onCreate(templateContent);
                } catch (error) {
                  console.error("Failed to create:", error);
                } finally {
                  setIsCreating(false);
                }
              }
            }}
          >
            {isCreating ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Creating...
              </>
            ) : (
              "Create"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
