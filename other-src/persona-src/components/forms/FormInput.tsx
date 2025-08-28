import React from "react";
import { Input } from "@/components/ui/input";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { UseFormReturn } from "react-hook-form";

interface FormInputProps {
  name: string;
  label?: string;
  form: UseFormReturn<any>;
  type?: string;
  placeholder?: string;
  rules?: Record<string, any>;
  showPassword?: boolean;
  icon?: React.ReactNode;
  className?: string;
  isRequired?: boolean;
}

const FormInput: React.FC<FormInputProps> = ({
  name,
  label,
  form,
  type = "text",
  placeholder,
  rules,
  showPassword,
  icon,
  className = "",
  isRequired = true,
}) => {
  const inputType = type === "password" && showPassword ? "text" : type;

  return (
    <div>
      {label && (
        <label className="text-sm font-medium text-black-700 mb-2 block">
          {label} {isRequired && <span className="text-grey-500">*</span>}
        </label>
      )}
      <FormField
        control={form.control}
        name={name}
        rules={rules}
        render={({ field }) => (
          <>
            <FormItem>
              <FormControl>
                <div className="relative">
                  <Input
                    type={inputType}
                    placeholder={placeholder}
                    {...field}
                    className={`bg-white-blackAndWhite-100  placeholder:text-black-500 text-sm h-[60px] focus:ring-0 ${className} text-black-900`}
                  />
                  {icon && icon}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          </>
        )}
      />
    </div>
  );
};

export default FormInput;
