import React from "react";
import { Button } from "../ui/button";
import { Mic, MicOff } from "lucide-react";
import { useLiveKit } from "@/components/transports/LiveKit";

interface IProps {
  iconOnly?: boolean;
}

const MuteButton: React.FC<IProps> = ({ iconOnly }) => {
  const { isConnected, localParticipant } = useLiveKit();
  const [isMuted, setIsMuted] = React.useState(false);

  const handleMuteAction = async () => {
    console.log("localParticipant", localParticipant);
    if (!localParticipant) return;

    const shouldMute = !isMuted;

    console.log("shouldMute", shouldMute);

    if (shouldMute) {
      await localParticipant.setMicrophoneEnabled(false); // Disable microphone
    } else {
      await localParticipant.setMicrophoneEnabled(true); // Enable microphone
    }

    console.log("isMuted", isMuted);

    setIsMuted(shouldMute);
  };

  return (
    <Button
      onClick={handleMuteAction}
      className={
        iconOnly
          ? "rounded-full p-4 w-16 h-16"
          : "flex items-center gap-2 w-full"
      }
      variant={'outline'}
    >
      {isMuted ? (
        <MicOff className={iconOnly ? "h-6 w-6" : "h-4 w-4"} />
      ) : (
        <Mic className={iconOnly ? "h-6 w-6" : "h-4 w-4"} />
      )}
      {!iconOnly && (isMuted ? "Unmute" : "Mute")}
    </Button>
  );
};

export default MuteButton;
