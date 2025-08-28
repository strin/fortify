"use client";
import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import FormInput from "@/components/forms/FormInput";
import { useForm } from "react-hook-form";
import { pageRoutes } from "@/utils/routes";
import { ArrowBackIcon } from "@/utils/icons";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { post } from "@/utils/server";
import { USER_SIGNUP } from "@/utils/apiRoutes";
import { useMutation } from "@tanstack/react-query";
import LoadingButton from "@/components/buttons/LoadingButton";
import { signIn, useSession } from "next-auth/react";
import AuthCard from "../AuthCard";

type FormData = {
  username: string;
  password: string;
  confirmPassword: string;
  email: string;
};

const CustomSignupForm = () => {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { update } = useSession();

  const form = useForm<FormData>({
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      email: "",
    },
  });

  const handleFormRequest = async (userFormData: FormData) => {
    const payload = JSON.stringify({
      ...userFormData,
      // displayName: userFormData.username,
    });

    const { status, data, message } = await post(USER_SIGNUP, payload);

    if (status) {
      const result = await signIn("credentials", {
        redirect: false,
        username: userFormData.username,
        password: userFormData.password,
        // action: "signup",
      });

      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Account created! Redirecting to profile...");
        router.push(pageRoutes.profileSetup);
      }

      // setTimeout(() => {
      //   router.push("/login");
      // }, 2000);
    } else {
      toast.error(message);
    }
  };
  const mutation = useMutation({ mutationFn: handleFormRequest });

  const handleFormSubmit = (myFormData: FormData) => {
    mutation.mutate(myFormData);
  };

  return (
    <AuthCard>
      <div className="absolute left-5 top-10">
        <Link href={pageRoutes.signup}>
          <ArrowBackIcon />
        </Link>
      </div>
      <div className="w-full max-w-sm space-y-6 pb-5 px-3 m-auto">
        <div className="space-y-2">
          <h2 className="text-xl font-medium tracking-tight">
            Sign up with user name and password
          </h2>
        </div>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleFormSubmit)}
            className="space-y-4"
          >
            <FormInput
              name="username"
              label="User Name"
              form={form}
              placeholder="Your username"
              rules={{ required: "Username is required" }}
            />
            <FormInput
              name="email"
              label="Email"
              form={form}
              placeholder="email@example.com"
              rules={{
                required: "Email is required",
                pattern: {
                  value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                  message: "Please enter a valid email address",
                },
              }}
            />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-black-500">
                  Password *
                </span>
                {/*                 <Link href="#" className="text-sm text-red-500">
                  Rule
                </Link> */}
              </div>

              <FormInput
                name="password"
                form={form}
                type="password"
                placeholder="Type in ..."
                rules={{ required: "Password is required" }}
                showPassword={showPassword}
                icon={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute bg-transparent right-2 top-1/2 -translate-y-1/2 text-blue-900 hover:bg-transparent hover:text-blue-900"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                }
              />
            </div>

            <FormInput
              name="confirmPassword"
              label="Confirm Password"
              form={form}
              type="password"
              placeholder="Type in ..."
              rules={{
                required: "Please confirm your password",
                validate: (value: any) =>
                  value === form.getValues("password") ||
                  "Passwords do not match",
              }}
              showPassword={showConfirmPassword}
              icon={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute bg-transparent right-2 top-1/2 -translate-y-1/2 text-blue-900 hover:bg-transparent hover:text-blue-900"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              }
            />
            <LoadingButton
              type="submit"
              className="w-full bg-blue-900 hover:bg-blue-900 text-white h-[60px]"
              isLoading={mutation.isPending}
            >
              Sign up
            </LoadingButton>
          </form>
        </Form>
        <div className="text-center">
          <Link
            href={pageRoutes.customLogin}
            className="font-medium text-blue-900 hover:text-blue-900"
          >
            I am an Existing User
          </Link>
        </div>
      </div>
    </AuthCard>
  );
};

export default CustomSignupForm;
