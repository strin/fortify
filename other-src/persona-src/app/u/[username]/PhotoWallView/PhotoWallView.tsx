"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import useUser from "@/lib/creator";
import { Creator } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { creatorStorage, creatorPublicStorage } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";

export default function PhotoWallView({
  user,
  creator,
}: {
  user?: Creator | null;
  creator: Creator;
}) {
  const [photos, setPhotos] = useState<
    {
      id: number;
      url: string;
      caption: string;
    }[]
  >([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [caption, setCaption] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    const fetchPhotos = async () => {
      if (creator && creator.id) {
        try {
          const response = await fetch(
            `/api/photo-posts?creatorId=${creator.id}`
          );
          if (!response.ok) {
            throw new Error("Failed to fetch photos");
          }
          const data = await response.json();
          setPhotos(
            data.map((post: any) => ({
              id: post.id,
              url: post.imageUrls[0], // Assuming the first image URL is the main one
              caption: post.caption,
            }))
          );
        } catch (error) {
          console.error("Error fetching photos:", error);
          // Handle error (e.g., show error message to user)
        }
      }
    };

    fetchPhotos();
  }, [creator]);

  const handleUpload = async () => {
    if (!imageFile || !caption) {
      console.error("Image file and caption are required");
      return;
    }
    if (!user) {
      console.error("User is required");
      return;
    }

    const imageUuid = uuidv4().slice(0, 8); // Use first 8 characters of UUID
    const fileName = `${imageUuid}`;
    // Get the file extension from the original file name
    const fileExtension = imageFile.name.split(".").pop();

    // Ensure the extension is valid, default to 'jpg' if not
    const validExtensions = ["jpg", "jpeg", "png", "gif", "webp"];
    const safeExtension = validExtensions.includes(
      fileExtension?.toLowerCase() || ""
    )
      ? fileExtension
      : "jpg";

    // Append the safe extension to the fileName
    const safeFileName = `${fileName}.${safeExtension}`;

    const path = `users/${user.id}/photos/${safeFileName}`;

    const { data, error } = await creatorPublicStorage.upload(path, imageFile, {
      cacheControl: "3600000000",
      upsert: false,
    });

    if (error) {
      console.error("Error uploading image:", error);
      return;
    }

    // Upload image to Supabase Storage
    try {
      const { data: publicUrlData } =
        await creatorPublicStorage.getPublicUrl(path);

      const imageUrl = publicUrlData?.publicUrl;

      if (!imageUrl) {
        throw new Error("Failed to generate signed URL for uploaded image");
      }

      console.log("imageUrl", imageUrl);

      const postData = {
        imageUrls: [imageUrl],
        caption: caption,
        creatorId: user.id.toString(),
      };

      const response = await fetch(`/api/photo-posts?creatorId=${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(postData),
      });

      if (!response.ok) {
        throw new Error("Failed to upload photo");
      }

      const newPhoto = await response.json();
      setPhotos((prevPhotos) => [
        ...prevPhotos,
        {
          id: newPhoto.id,
          url: newPhoto.imageUrls[0],
          caption: newPhoto.caption,
        },
      ]);

      console.log("Photo uploaded successfully");
    } catch (error) {
      console.error("Error uploading photo:", error);
      // Handle error (e.g., show error message to user)
    }
    console.log("Uploading image with caption:", caption);
    setIsDialogOpen(false);
    setCaption("");
    setImageFile(null);
  };

  return (
    <>
      <div className="grid grid-cols-3 gap-4 p-4">
        {photos.length > 0
          ? photos.map((photo) => (
              <div key={photo.id} className="aspect-square relative">
                <Dialog>
                  <DialogTrigger
                    asChild
                    onClick={() => {
                      const urlParts = photo.url.split("/");
                      const lastPart = urlParts[urlParts.length - 1];
                      console.log("photo.url", lastPart);
                    }}
                  >
                    <Image
                      src={photo.url}
                      alt={`Photo ${photo.id}`}
                      layout="fill"
                      objectFit="cover"
                      className="rounded-lg cursor-pointer"
                    />
                  </DialogTrigger>
                  <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 border-none">
                    <Image
                      src={photo.url}
                      alt={`Photo ${photo.id}`}
                      layout="responsive"
                      width={1000}
                      height={1000}
                      objectFit="contain"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-gray-300 p-2">
                      <p className="text-sm">{photo.caption}</p>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            ))
          : !user && (
              <div className="col-span-3 text-center text-gray-500">
                No photos available
              </div>
            )}
        {user && (
          <div
            className="aspect-square relative bg-gray-200 rounded-lg flex items-center justify-center cursor-pointer"
            onClick={() => setIsDialogOpen(true)}
          >
            <span className="text-4xl text-gray-500">+</span>
          </div>
        )}
      </div>

      {user && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="bg-gray-900 text-white">
            <DialogHeader>
              <DialogTitle className="text-white">Upload Photo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="caption" className="text-gray-300">
                  Image Caption
                </Label>
                <Input
                  id="caption"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Enter image caption"
                  className="bg-gray-800 text-white border-gray-700 focus:border-gray-600"
                />
              </div>
              <div>
                <Label htmlFor="image" className="text-gray-300">
                  Image File
                </Label>
                <Input
                  id="image"
                  type="file"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  accept="image/*"
                  className="bg-gray-800 text-white border-gray-700 focus:border-gray-600"
                />
              </div>
              <Button
                onClick={handleUpload}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Upload Photo
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
