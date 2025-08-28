import React from "react";
import { Button, ButtonProps } from "../ui/button";
import { Loader2 } from "lucide-react";

interface Props extends ButtonProps {
  className?: string;
  isLoading?: boolean;
  children: React.ReactNode;
}

const LoadingButton: React.FC<Props> = ({
  className = "",
  isLoading,
  children,
  ...other
}) => {
  return (
    <>
      <Button className={className} disabled={isLoading} {...other}>
        {isLoading ? <Loader2 className="animate-spin" /> : children}
      </Button>
    </>
  );
};

export default LoadingButton;
