"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import * as z from "zod";
import { useForm } from "react-hook-form";
import { toast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { getContentServiceHost } from "@/lib/content-service";
import { Creator } from "@/types";

const ScrapeSchema = z.object({
  url: z.string().url().min(3, {
    message: "URL must be at least 3 characters.",
  }),
  crawl: z.boolean().default(false).optional(),
});

export default function AddNewWebsite(props: {
  creator: Creator;
}) {
  const form = useForm<z.infer<typeof ScrapeSchema>>({
    resolver: zodResolver(ScrapeSchema),
    defaultValues: {
      url: undefined,
      crawl: true,
    },
  });

  const [open, setOpen] = useState(false);

  function onSubmit(data: z.infer<typeof ScrapeSchema>) {
    const hostname = new URL(data.url).hostname;
    console.log("hostname", hostname);
    fetch(getContentServiceHost() + "/jobs", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        url: data.url,
        crawl: data.crawl,
        creatorId: props.creator.id,
        destination: {
          type: "supabase",
          bucket: "chatmon-storage",
          baseDir: `${props.creator.id}/website/${hostname}`,
        },
      }),
    })
      .then((res) => {
        return res.json();
      })
      .then((result) => {
        console.log("result", result);
      })
      .catch((err) => {
        console.error("err", err);
      });

    toast({
      title: "You submitted the following values:",
      description: (
        <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
          <code className="text-white">{JSON.stringify(data, null, 2)}</code>
        </pre>
      ),
    });

    setOpen(false);
  }

  return (
    <div>
      <Button
        size="sm"
        onClick={() => {
          setOpen(true);
        }}
      >
        Add Source
      </Button>
      <Dialog
        open={open}
        onOpenChange={(open) => {
          setOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a website source</DialogTitle>
            <DialogDescription>
              Provide a url to a website you want to scrape. The chatbot will
              learn from this knowledge source.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website URL</FormLabel>
                    <FormControl>
                      <Input
                        id="url"
                        placeholder={"https://example.com"}
                        value={field.value}
                        onChange={field.onChange}
                        className="col-span-3"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="crawl"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Crawl the website</FormLabel>
                      <FormDescription>
                        Allow the web scraper follow links and crawl your site.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="submit">Submit</Button>
                </DialogClose>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
