"use client";
import Image from "next/image";
import { useMutation } from "@tanstack/react-query";
import BackAroow from "/public/images/back-arrow.svg";
import { Button } from "@/components/ui/button";
import Icon from "/public/images/camraIcon.svg";
import hiProfile from "/public/images/hiProfile.svg";
import styles from "./styles.module.scss";
import { Creator, Profile, SessionUser } from "@/types";
// import queryNames from '@/utils/queryNames';
// import FullScreenLoader from '@/components/ui/FullScreenLoader';
import { toast } from "sonner";
import { useCallback, useEffect, useState } from "react";
import { creatorStorage } from "@/lib/supabase";
// import { useRouter } from 'next/navigation';
// import { pageRoutes } from '@/utils/routes';
import { Input } from "@/components/ui/input";
import { profileStepHeadings } from "@/utils/contents";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import { pageRoutes } from "@/utils/routes";
import { signOut } from "next-auth/react";

interface SessionUserTypes extends SessionUser {
  Profile: Profile[];
}

interface ProfileSetupProps {
  user: SessionUserTypes;
}

// const fetchCreatorData = async (id: number) => {
//     const response = await fetch(`/api/creators/${id}`);
//     if (!response.ok) {
//         throw new Error("Error fetching data");
//     }
//     return response.json();
// };

const updateCreator = async (data: Creator) => {
  console.log("CREAAAATOOOORRSSS DDDAAAATTTAAA", data);
  const response = await fetch(`/api/creators`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    toast("Error updateing data");
    return;
  }

  toast("Updated successfuly!");
  return response.json();
};

const ProfileSetup: React.FC<ProfileSetupProps> = ({ user }: any) => {
  const router = useRouter();
  const [step, setStep] = useState<number>(0);
  const [imgPath, setImgPath] = useState<string>("");
  const [formData, setFormData] = useState<Creator>(user as Creator);

  // const { data, isLoading, isError } = useQuery({
  //     queryKey: [queryNames.GET_CREATOR],
  //     queryFn: () => fetchCreatorData(user.id),
  // });

  const getProfileImage = useCallback(async () => {
    if (user) {
      const { data: publicUrlData } = await creatorStorage.createSignedUrl(
        user?.profileImage,
        31536000
      );
      setImgPath(publicUrlData?.signedUrl || "");
    }
  }, [user]);

  useEffect(() => {
    getProfileImage();
  }, []);

  const handleImageChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    console.log("event", event.target.files?.[0]);
    const file = event.target.files?.[0];

    if (!file) {
      toast.info("Please select a file first.");
      return;
    }

    try {
      const path = `users/${user.id}/profile.png`;

      const { data, error } = await creatorStorage.update(path, file, {
        cacheControl: "3600000000",
        upsert: true,
      });

      if (!error) {
        getProfileImage();
        toast.success("Profile image updated successfully");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image. Please try again.");
    }
  };

  const goNext = () => setStep(step + 1);

  const goBack = () => setStep(step - 1);

  const {
    mutate: updateProfileMutate,
    isPending: mutatuonLoading,
    isSuccess,
  } = useMutation({ mutationFn: () => updateCreator(formData) });

  console.log("mutation loading", mutatuonLoading, isSuccess);

  useEffect(() => {
    if (step === 2) {
      router.push(pageRoutes.profilePreview);

      return;
    }
    if (isSuccess) {
      goNext();
    }
  }, [isSuccess]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (step !== 0) {
      updateProfileMutate();
    } else {
      goNext();
    }
  };

  const onChange = (field: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData((prev: any) => ({
      ...prev,
      [field]: value,
    }));
    user[field] = value;
  };

  const RenderStepOne = () => {
    return (
      <>
        <div className="relative w-[303px] mx-auto mt-6 h-[312px]">
          {imgPath && (
            <Image
              className="rounded-[14px] h-[312px]"
              alt="Image"
              src={imgPath}
              height={312}
              width={300}
            />
          )}
          <a
            href="#"
            className="w-[60px] h-[60px] rounded-[100%] text-center bg-[#ffffff73] absolute top-[50%] left-[50%] translate-y-[-50%] translate-x-[-50%]"
          >
            <Image
              className="h-full flex contant-center m-auto flex-col"
              src={Icon}
              alt="Icon"
            />
            <input
              onChange={handleImageChange}
              className="absolute top-0 left-0 w-full h-full opacity-0 right-0 cursor-pointer"
              type="file"
              accept="image/*"
            ></input>
          </a>
        </div>
      </>
    );
  };

  const RenderStepTwo = useCallback(() => {
    return (
      <>
        <div className="flex justify-center w-full pb-4">
          <Image
            className="h-[250px] center"
            alt="Image"
            src={hiProfile}
            height={250}
            width={300}
          />
        </div>
        <Input
          key="display_name"
          value={formData?.display_name || ""}
          onChange={(e) => onChange("display_name", e)}
        />
      </>
    );
  }, []);

  const RenderStepThree = useCallback(
    () => (
      <Textarea
        value={formData?.bio}
        onChange={(e: any) => onChange("bio", e)}
      />
    ),
    []
  );

  // if (isLoading)
  //     return <FullScreenLoader />

  // if (isError) {
  //     toast.error("Something went wrong! Please try again");
  // }

  return (
    <div>
      {step !== 0 && (
        <div className="mt-4 mb-5">
          <Image src={BackAroow} alt="Back Arrow" onClick={goBack} />
        </div>
      )}
      <div className="w-fit mx-auto">
        <h1 className="text-[20px] text-center color-white font-bold">
          {profileStepHeadings?.[step]?.title}
        </h1>
        <h4 className="text-base color-white font-normal mt-2 ">
          {profileStepHeadings?.[step]?.subTitle}
        </h4>
        <div className="py-10">
          {step === 0 ? (
            <RenderStepOne />
          ) : step === 1 ? (
            <RenderStepTwo />
          ) : (
            <RenderStepThree />
          )}
        </div>
      </div>

      <div className={styles.footerWrapper}>
        <Button onClick={handleClick}>Next</Button>
      </div>
    </div>
  );
};

export default ProfileSetup;
