import { Loader2 } from "lucide-react";
import React from "react";
interface Props {
  isLoading: boolean;
}
const LoadingOverlay: React.FC<Props> = ({ isLoading }) => {
  return (
    <>
      {isLoading && (
        <div className="w-full h-full absolute left-0 top-0 flex items-center justify-center z-[9999] bg-[rgba(0, 0, 0, 0.5)] min-h-dvh">
          <Loader2 className="animate-spin" />
        </div>
      )}
    </>
  );
};

export default LoadingOverlay;
