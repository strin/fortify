"use client";

import React, { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ArrowBackIcon } from "@/utils/icons";
import Image from "next/image";
import { CameraImage, SmilyImage } from "@/utils/images";
import { useForm } from "react-hook-form";
import { post, put } from "@/utils/server";
import { CREATE_PROFILE, USER_SIGNUP } from "@/utils/apiRoutes";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import FormInput from "@/components/forms/FormInput";
import LoadingButton from "@/components/buttons/LoadingButton";
import { Form } from "@/components/ui/form";
import FormTextarea from "@/components/forms/FormTextArea";
import { signOut, useSession } from "next-auth/react";
import { creatorStorage } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { pageRoutes } from "@/utils/routes";

type FormData = {
  profileImage?: any;
  display_name: string;
  bioDescription: string;
  email?: string;
};

const MAX_BIO_LENGTH = 100;

const ProfileSetupCard = () => {
  const router = useRouter();
  const [tabValue, setTabValue] = useState(0);
  const [progress, setProgress] = useState(33);
  const [image, setImage] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const { data: session, update } = useSession();
  const { user }: any = session || {};

  const form = useForm<FormData>({
    defaultValues: {
      profileImage: null,
      display_name: "",
      bioDescription: "",
    },
    mode: "onChange",
  });

  useEffect(() => {
    const fetchData = async () => {
      if (user) {
        const { display_name, profileImage, bioDescription }: any = user || {};
        const { data }: any = await creatorStorage.createSignedUrl(
          profileImage,
          3600
        );
        let file;

        if (data) {
          setImage(data?.signedUrl);
        }
        form.reset((prevValues) => ({
          ...prevValues,
          display_name: display_name || "",
          bioDescription: bioDescription || "",
        }));
      }
    };

    fetchData();
  }, [user]);

  const {
    watch,
    setValue,
    formState: { errors },
    trigger,
  } = form;
  const bioValue = watch("bioDescription");

  useEffect(() => {
    if (bioValue && bioValue.length > MAX_BIO_LENGTH) {
      setValue("bioDescription", bioValue.slice(0, MAX_BIO_LENGTH));
    }
  }, [bioValue, setValue]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImage(URL.createObjectURL(file));
      setValue("profileImage", file);
    }
  };

  const handleFormRequest = async (userFormData: FormData) => {
    let newFileData: any;
    let newUpdatedImg: any;

    const path = `users/${user.id}/profile.png`;
    newFileData = await creatorStorage.upload(path, userFormData?.profileImage);

    if (
      newFileData?.error?.statusCode === "409" ||
      newFileData?.statusCode === "409"
    ) {
      newUpdatedImg = await updateImage(userFormData);
    }

    if (newFileData?.data || newUpdatedImg?.path) {
      await createProfile(path);
    } else {
      console.error("Upload error:", newFileData.error.message);
    }

    const payload = {
      username: user?.name,
      display_name: userFormData?.display_name,
      isProfileComplete: true,
      bioDescription: userFormData?.bioDescription,
      email: user?.email ? user?.email : userFormData?.email,
    };

    const { status, data: userData, message } = await put(USER_SIGNUP, payload);
    if (status) {
      toast.success("Profile created successfully!");
      await update();
      router.push(pageRoutes.profile);
    } else {
      toast.error(message);
    }
  };

  const mutation = useMutation({ mutationFn: handleFormRequest });

  const handleFormSubmit = (myFormData: FormData) => {
    mutation.mutate(myFormData);
  };

  const createProfile = async (path: string) => {
    try {
      const {
        status,
        data: userData,
        message,
      } = await post(CREATE_PROFILE, {
        profileImage: path,
        creatorId: user.id,
      });
      if (status) {
        toast.success("Profile created successfully!");
      } else {
        toast.error(message);
      }
    } catch (error) {
      console.log("data errror", error);
    }
  };

  const updateImage = async (userFormData: any) => {
    const path = `users/${user.id}/profile.png`;
    const { data, error } = await creatorStorage.update(
      path,
      userFormData?.profileImage,
      {
        cacheControl: "3600000000",
        upsert: true,
      }
    );
    if (error) {
      toast.error("Not able to update profile image!");
      return error;
    }

    return data;
  };

  const handleTabIncrement = async () => {
    setShowErrors(true);
    if (tabValue === 0) {
      if (!image) {
        return;
      }
    }
    const isValid = await trigger();

    if (isValid) {
      const newTabValue = tabValue + 1;
      if (newTabValue === 1) {
        setProgress(66);
      } else if (newTabValue === 2) {
        setProgress(100);
      }
      setTabValue(newTabValue);
      setShowErrors(false);
    }
  };

  const handleTabDecrement = () => {
    const newTabValue = tabValue - 1;
    if (newTabValue < 0) {
      return;
    }
    if (newTabValue === 0) {
      setProgress(33);
    } else if (newTabValue === 1) {
      setProgress(66);
    }
    setTabValue(newTabValue);
    setShowErrors(false);
  };

  return (
    <>
      {/* <LoadingOverlay isLoading={isLoading} /> */}
      <div className="p-5">
        <div className="space-y-8">
          <div className="space-y-6">
            <Button
              variant="ghost"
              className="bg-transparent hover:bg-transparent p-0"
              onClick={handleTabDecrement}
            >
              <ArrowBackIcon />
            </Button>
            <Progress value={progress} className="h-1 bg-black-500" />
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-xl font-medium tracking-tight">
                {tabValue === 0
                  ? "Are you happy with your profile image?"
                  : tabValue === 1
                    ? "What should Persona members call you?"
                    : "Create your BIO"}
              </h1>
              <p className="text-white-blackAndWhite-300">
                {tabValue === 0
                  ? "Please check your avatar or edit"
                  : tabValue === 1
                    ? "Your @username is unique. You can always change it later"
                    : "Write up a few sentences about you"}
              </p>
            </div>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleFormSubmit)}
                className="flex flex-col gap-4"
              >
                {tabValue === 0 && (
                  <div className="flex justify-center">
                    <div className="relative">
                      <div
                        className={`w-[300px] h-[300px] rounded-xl overflow-hidden bg-gray-900 
                        ${!image ? "flex items-center justify-center border-2 border-dashed border-gray-700" : ""}`}
                      >
                        {image && (
                          <Image
                            src={image}
                            alt="Profile preview"
                            fill
                            className="object-cover rounded-xl"
                          />
                        )}
                        <label
                          htmlFor="fileUpload"
                          className="w-full h-full cursor-pointer relative z-10 inline-block"
                        >
                          <span className="w-[60px] h-[60px] rounded-[100%] text-center bg-[#ffffff73] absolute top-[50%] left-[50%] translate-y-[-50%] translate-x-[-50%] z-20 inline-block cursor-pointer">
                            <Image
                              className="h-full flex contant-center m-auto flex-col"
                              src={CameraImage}
                              alt="Icon"
                            />
                          </span>
                          <input
                            id="fileUpload"
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                            onClick={(e: any) => {
                              e.target.value = null;
                            }}
                          />
                        </label>
                      </div>
                      {showErrors && !image && (
                        <p className="text-red-500 text-sm mt-2">
                          Please upload a profile image
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {tabValue === 1 && (
                  <>
                    <div className="flex justify-center">
                      <Image
                        src={SmilyImage}
                        alt="Smily"
                        width={200}
                        height={170}
                      />
                    </div>
                    <FormInput
                      name="display_name"
                      label="Display Name"
                      form={form}
                      placeholder="Your display name"
                      rules={{ required: "Display Name is required" }}
                    />
                    {user?.email ? null : (
                      <FormInput
                        name="email"
                        label="Email"
                        form={form}
                        placeholder="email@example.com"
                        rules={{
                          required: "Email is required",
                          pattern: {
                            value:
                              /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                            message: "Please enter a valid email address",
                          },
                        }}
                      />
                    )}
                  </>
                )}
                {tabValue === 2 && (
                  <div>
                    <FormTextarea
                      name="bioDescription"
                      label="BIO"
                      form={form}
                      placeholder="Write a short bio about yourself"
                      rules={{
                        required: "BIO is required",
                        maxLength: MAX_BIO_LENGTH,
                      }}
                      className="min-h-40"
                    />
                    <p className="text-sm text-end text-[#E84928] mt-3">
                      {MAX_BIO_LENGTH - (bioValue?.length || 0)} characters left
                    </p>
                  </div>
                )}
                <div className="mt-10">
                  {(tabValue === 0 || tabValue === 1) && (
                    <LoadingButton
                      type="button"
                      className="w-full bg-blue-900 hover:bg-blue-900 text-white h-[60px]"
                      onClick={handleTabIncrement}
                    >
                      Next
                    </LoadingButton>
                  )}
                  {tabValue === 2 && (
                    <LoadingButton
                      type="submit"
                      className="w-full bg-blue-900 hover:bg-blue-900 text-white h-[60px]"
                      isLoading={mutation.isPending}
                    >
                      Submit
                    </LoadingButton>
                  )}
                </div>
              </form>
            </Form>
            <Button
              onClick={() =>
                signOut({
                  callbackUrl: pageRoutes.login,
                })
              }
            >
              Sign out
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProfileSetupCard;
