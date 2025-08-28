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
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import LoadingButton from "@/components/buttons/LoadingButton";
import AuthCard from "../AuthCard";

type FormData = {
  username: string;
  password: string;
  redirect?: boolean;
};

const CustomLoginForm = () => {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<FormData>({
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const handleFormRequest = async (userFormData: FormData) => {
    const result = await signIn("credentials", {
      redirect: false,
      ...userFormData,
    });
    if (result?.error) {
      toast.error(result.error);
    } else {
      router.push(pageRoutes.home);
    }
  };
  const mutation = useMutation({ mutationFn: handleFormRequest });

  const handleFormSubmit = (myFormData: FormData) => {
    mutation.mutate(myFormData);
  };

  return (
    <AuthCard>
      <div className="absolute left-10 top-10">
        <Link href={pageRoutes.login}>
          <ArrowBackIcon />
        </Link>
      </div>

      <div className="w-full max-w-sm space-y-6 pb-5 px-3 m-auto mt-16 bg-card rounded-lg">
        <div className="space-y-2">
          <h2 className="text-xl font-medium tracking-tight text-foreground">
            Welcome Back
          </h2>
          <p className="text-muted-foreground">
            Login to access your Persona account
          </p>
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
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
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
                className="bg-white-blackAndWhite-100"
                icon={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute bg-white-blackAndWhite-white right-2 top-1/2 -translate-y-1/2 text-black-500 hover:bg-white-blackAndWhite-100 hover:text-black-500"
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

            <LoadingButton
              type="submit"
              className="w-full bg-blue-900 hover:bg-blue-900 text-white h-[60px]"
              isLoading={mutation.isPending}
            >
              Login
            </LoadingButton>
          </form>
        </Form>
        <div className="text-center">
          <Link
            href={pageRoutes.customSignup}
            className="font-medium text-blue-900 hover:text-blue-900"
          >
            I am a New User
          </Link>
        </div>
      </div>
    </AuthCard>
  );
};

export default CustomLoginForm;
