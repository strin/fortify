import React, { useState } from "react";
import { Creator } from "@/types";
import { useLiveKit } from "@/components/transports/LiveKit";
import LiveTranscript from "@/components/LiveCall/LiveTranscript";

export const LiveTranscriptComponent = ({ creator }: { creator: Creator }) => {
  const [lastAssistantTranscript, setLastAssistantTranscript] = 
    React.useState<string>("");
  const [openTranscript, setOpenTranscript] = useState(false);

  const { lastTranscriptSegment, room } = useLiveKit();

  React.useEffect(() => {
    if (
      lastTranscriptSegment &&
      lastTranscriptSegment.speakerRole === "agent"
    ) {
      setLastAssistantTranscript(lastTranscriptSegment.text);
    }
  }, [lastTranscriptSegment]);

  const onClickTranscript = () => {
    setOpenTranscript(true);
  };

  const handleInterrupt = () => {
    if (room) {
      const data = {
        type: "agent_stream_interrupted",
      };
      const encodedData = new TextEncoder().encode(JSON.stringify(data));
      room.localParticipant.publishData(encodedData, { reliable: true });
      console.log("Sent agent_stream_interrupted event");
    }
  };

  return (
    <div>
      <LiveTranscript
        creator={creator}
        open={openTranscript}
        onOpenChange={(open: boolean) => setOpenTranscript(open)}
      />
      {lastAssistantTranscript && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 flex flex-col items-center z-50">
          <button
            onClick={handleInterrupt}
            className="text-xs mb-1 bg-muted/80 hover:bg-muted/90 text-foreground px-2 py-1 rounded-full text-center backdrop-blur-sm transition-colors"
          >
            tap to interrupt
          </button>
          <p
            onClick={onClickTranscript}
            className="text-md max-w-xs w-64 text-left bg-muted/80 backdrop-blur-sm p-2 rounded text-foreground cursor-pointer hover:bg-muted/90 transition-colors"
          >
            {lastAssistantTranscript}
          </p>
        </div>
      )}
    </div>
  );
}; 