"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Creator } from "@/types";
import { useSession } from "next-auth/react";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import Creatable from "react-select/creatable";
import Image from "next/image";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ProfileEditor() {
  const { data: session } = useSession();
  const creator = session?.user as Creator;
  const { toast } = useToast();

  const [bio, setBio] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<
    { value: string; label: string }[]
  >([]);
  const [allCategories, setAllCategories] = useState<
    { value: string; label: string }[]
  >([]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (creator?.id) {
        try {
          const response = await fetch(`/api/creators/${creator.id}/profile`);
          if (response.ok) {
            const data = await response.json();
            setProfileImage(data.profileImage || "");
          }
        } catch (error) {
          console.error("Error fetching profile:", error);
        }
      }
    };

    const fetchAllCategories = async () => {
      const response = await fetch("/api/creators/categories");
      if (response.ok) {
        const data = await response.json();
        setAllCategories(
          data.map((c: { id: number; name: string }) => ({
            value: c.id.toString(),
            label: c.name,
          }))
        );
      }
    };

    const fetchCreatorCategories = async () => {
      const response = await fetch(`/api/creators/${creator.id}/categories`);
      if (response.ok) {
        const data = await response.json();
        setCategories(
          data.map((c: { id: number; name: string }) => ({
            value: c.id.toString(),
            label: c.name,
          }))
        );
      }
    };

    fetchProfile();
    fetchAllCategories();
    fetchCreatorCategories();
  }, [creator?.id]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      // Upload to Supabase
      const fileExt = file.name.split(".").pop();
      const fileName = `images/${creator.id}-${Date.now()}.${fileExt}`;
      const { data, error } = await supabase.storage
        .from("creator-public")
        .upload(fileName, file);

      if (error) throw error;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("creator-public").getPublicUrl(fileName);

      // Update profile in database
      const response = await fetch(`/api/creators/${creator.id}/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profileImage: publicUrl,
        }),
      });

      if (!response.ok) throw new Error("Failed to update profile");

      setProfileImage(publicUrl);
      toast({
        title: "Success",
        description: "Profile image updated successfully",
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "Error",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  const handleCategoryChange = async (
    newCategories: readonly { value: string; label: string }[] | null
  ) => {
    if (!newCategories) return;

    const response = await fetch(`/api/creators/${creator.id}/categories`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        categoryIds: newCategories.map((c) => c.value),
      }),
    });

    if (response.ok) {
      setCategories(Array.from(newCategories));
    }
  };

  const handleCategoryCreate = async (input: string) => {
    console.log("Creating category:", input);
    const response = await fetch("/api/creators/categories", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: input }),
    });

    const data = await response.json();
    if (response.ok) {
      setAllCategories([...allCategories, { value: data.id, label: input }]);
    }

    // Update categories for this creator
    if (response.ok) {
      const newCategory = { value: data.id, label: input };

      // Update categories on server
      const updateResponse = await fetch(
        `/api/creators/${creator.id}/categories`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            categoryIds: [...categories, newCategory].map((c) => c.value),
          }),
        }
      );

      if (updateResponse.ok) {
        toast({
          title: "Success",
          description: "Category created and added successfully",
        });
        setCategories([...categories, newCategory]);
      } else {
        toast({
          title: "Error",
          description: "Failed to update categories. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleBioChange = async (newBio: string) => {
    setBio(newBio);
    try {
      const response = await fetch(`/api/creators/${creator.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bio: newBio,
        }),
      });

      if (!response.ok) throw new Error("Failed to update bio");

      toast({
        title: "Success",
        description: "Bio updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update bio. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Profile Settings</h1>

      <div className="max-w-md space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">
            Profile Image
          </label>
          {profileImage && (
            <div className="mb-4">
              <Image
                src={profileImage}
                alt="Profile"
                width={100}
                height={100}
                className="rounded-full object-cover w-[100px] h-[100px]"
              />
            </div>
          )}
          <Input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            disabled={loading}
            className="w-full"
          />
        </div>

        {/*<div>
          <label className="block text-sm font-medium mb-2">Bio</label>
          <Textarea
            value={bio}
            onChange={(e) => handleBioChange(e.target.value)}
            placeholder="Tell us about yourself..."
            className="w-full h-32"
          />
        </div>*/}
        <div>
          <label className="block text-sm font-medium mb-2">Categories</label>
          <Creatable
            isMulti
            onCreateOption={(input) => {
              handleCategoryCreate(input);
              return { value: input, label: input };
            }}
            options={allCategories}
            value={categories}
            onChange={handleCategoryChange}
          />
        </div>
      </div>
    </div>
  );
}
