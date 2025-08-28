import React from "react";
import { Button } from "../ui/button";
import { Loader2, Phone } from "lucide-react";
import { useLiveKit } from "@/components/transports/LiveKit";
import LiveCallTranscript from "./LiveTranscript";

interface IProps {
  onFinishCall?: () => void;
  iconOnly?: boolean;
  disabled?: boolean;
}

const LiveCallButton: React.FC<IProps> = ({
  onFinishCall,
  iconOnly,
  disabled,
}) => {
  const { isConnecting, isConnected, connect, disconnect } = useLiveKit();

  const handleCallAction = () => {
    if (isConnected) {
      disconnect();
      onFinishCall?.();
    } else {
      connect();
    }
  };

  if (isConnecting) {
    return (
      <Button
        className={
          iconOnly
            ? "rounded-full p-4 w-16 h-16"
            : "flex items-center gap-2 w-full"
        }
      >
        <Loader2
          className={iconOnly ? "h-6 w-6 animate-spin" : "h-4 w-4 animate-spin"}
        />
        {!iconOnly && "Connecting..."}
      </Button>
    );
  }

  if (isConnected) {
    return (
      <Button
        onClick={handleCallAction}
        className={
          iconOnly
            ? "rounded-full p-4 w-16 h-16 bg-red-500 hover:bg-red-600 text-white"
            : "flex items-center gap-2 w-full bg-red-500 hover:bg-red-600 text-white"
        }
        variant="destructive"
      >
        <Phone className={iconOnly ? "h-6 w-6" : "h-4 w-4"} />
        {!iconOnly && <span>End the Call</span>}
      </Button>
    );
  }

  return (
    <Button
      onClick={handleCallAction}
      className={
        iconOnly
          ? "rounded-full p-4 w-16 h-16 bg-blue-500 hover:bg-blue-600 text-white"
          : "flex items-center gap-2 w-full bg-blue-500 hover:bg-blue-600 text-white"
      }
      disabled={disabled}
    >
      <Phone className={iconOnly ? "h-6 w-6" : "h-4 w-4"} />
      {!iconOnly && "Start Call"}
    </Button>
  );
};

export default LiveCallButton;
