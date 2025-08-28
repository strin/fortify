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
import { Textarea } from "../ui/textarea";

interface FormFormTextareaProps {
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

const FormTextarea: React.FC<FormFormTextareaProps> = ({
  name,
  label,
  form,
  type = "text",
  placeholder,
  rules,
  className = "",
  isRequired = true,
}) => {
  return (
    <div>
      {label && (
        <label className="text-sm font-medium text-black-500 mb-2 block">
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
                <Textarea
                  placeholder={placeholder}
                  {...field}
                  className={`bg-black-800 border-0 outline-0  placeholder:text-black-500 text-sm h-[60px] focus:border-0 focus:ring-0 focus-visible:ring-offset-0 focus-visible:ring-0 ${className}`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          </>
        )}
      />
    </div>
  );
};

export default FormTextarea;
