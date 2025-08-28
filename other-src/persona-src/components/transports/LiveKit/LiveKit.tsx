"use client";

import {
  Room,
  LocalParticipant,
  RemoteParticipant,
  Track,
} from "livekit-client";
import { useState, useEffect, useRef } from "react";
import React, {
  createContext,
  useContext,
  ReactNode,
  useCallback,
} from "react";
import { EventEmitter } from "events";

import { Message, Chat } from "@/types";
import { Loading } from "@/components/ui/loading";

const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || "";

interface LiveKitProps {
  roomNamePrefix: string;
  participantName: string;
}

interface TranscriptionSegment {
  id: string;
  text: string;
  speakerRole: "agent" | "user";
}

interface LiveKitContextType {
  connect: () => Promise<void>;
  disconnect: () => void;
  isConnected: boolean;
  isConnecting: boolean;
  callDuration: number;
  transcriptHistory: Message[];
  transcriptEvents: TranscriptEventEmitter;
  room: Room | null;
  localParticipant: LocalParticipant | null;
  remoteParticipants: RemoteParticipant[];
  lastTranscriptSegment: TranscriptionSegment | null;
}

interface TranscriptEvents {
  newMessage: (message: Message) => void;
  newChat: (chat: Chat) => void;
  newUserRecording: (recording: Blob | null) => void;
  newPersonaRecording: (recording: Blob | null) => void;
}

class TranscriptEventEmitter extends EventEmitter {
  emit<K extends keyof TranscriptEvents>(
    event: K,
    ...args: Parameters<TranscriptEvents[K]>
  ): boolean {
    return super.emit(event, ...args);
  }

  on<K extends keyof TranscriptEvents>(
    event: K,
    listener: TranscriptEvents[K]
  ): this {
    return super.on(event, listener);
  }

  off<K extends keyof TranscriptEvents>(
    event: K,
    listener: TranscriptEvents[K]
  ): this {
    return super.off(event, listener);
  }
}

const LiveKitContext = createContext<LiveKitContextType | undefined>(undefined);

export function useLiveKit() {
  const context = useContext(LiveKitContext);
  if (context === undefined) {
    throw new Error("useLiveKit must be used within a LiveKitProvider");
  }
  return context;
}

interface LiveKitProviderProps extends LiveKitProps {
  children: ReactNode;
  onDataReceived?: (
    data: any,
    participant: string | undefined,
    source: string | undefined
  ) => void;
  onUploadUserRecording?: (recording: Blob) => void;
  onUploadPersonaRecording?: (recording: Blob) => void;
}

export function LiveKitProvider({
  roomNamePrefix,
  participantName,
  children,
  onDataReceived,
  onUploadUserRecording,
  onUploadPersonaRecording,
}: LiveKitProviderProps) {
  const [token, setToken] = useState<string | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [localParticipant, setLocalParticipant] =
    useState<LocalParticipant | null>(null);
  const [remoteParticipants, setRemoteParticipants] = useState<
    RemoteParticipant[]
  >([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const isConnectingRef = useRef(false);
  const [callDuration, setCallDuration] = useState(0);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [lastTranscriptSegment, setLastTranscriptSegment] =
    useState<TranscriptionSegment | null>(null);

  const [transcriptHistory, setTranscriptHistory] = useState<Message[]>([]);
  const transcriptEvents = useRef(new TranscriptEventEmitter());

  // User and persona audio recorders and recordings
  const [userAudioRecorder, setUserAudioRecorder] =
    useState<MediaRecorder | null>(null);
  const [personaAudioRecorder, setPersonaAudioRecorder] =
    useState<MediaRecorder | null>(null);
  const userAudioChunks = useRef<Blob[]>([]);
  const personaAudioChunks = useRef<Blob[]>([]);

  const handleDataReceived = useCallback(
    (
      payload: Uint8Array,
      participant: RemoteParticipant | undefined,
      source: string | undefined
    ) => {
      const data = JSON.parse(new TextDecoder().decode(payload));
      if (onDataReceived) {
        onDataReceived(data, participant?.identity, source);
      }
    },
    [onDataReceived]
  );

  useEffect(() => {
    const roomName = `${
      roomNamePrefix.endsWith("/") ? roomNamePrefix : `${roomNamePrefix}/`
    }${Math.random().toString(36).substring(2, 8)}`;

    async function fetchToken() {
      try {
        const response = await fetch(
          `/api/livekit/token?roomName=${roomName}&participantName=${participantName}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch token");
        }
        const data = await response.json();
        setToken(data.token);
        console.log("Token:", data.token);
      } catch (error) {
        console.error("Error fetching token:", error);
      }
    }

    fetchToken();
  }, []);

  const handleConnect = async () => {
    if (!token || isConnectingRef.current) return;
    isConnectingRef.current = true;
    setIsConnecting(true);

    const newRoom = new Room();
    setRoom(newRoom);

    newRoom.on(
      "transcriptionReceived",
      (segments, participant, publication) => {
        for (const segment of segments) {
          setLastTranscriptSegment((prev) => ({
            id: segment.id,
            text: segment.text,
            speakerRole: participant?.isAgent ? "agent" : "user",
          }));
          if (segment.final) {
            const message = {
              content: segment.text,
              role: participant?.isAgent ? "assistant" : "user",
              startTimestamp: segment.firstReceivedTime,
              endTimestamp: segment.lastReceivedTime,
            } as Message;
            setTranscriptHistory((prev) => [...prev, message]);
            transcriptEvents.current.emit("newMessage", message);
          }
        }
      }
    );

    newRoom.on("participantConnected", (participant) => {
      console.log("Participant connected:", participant.identity);
      setRemoteParticipants((prevParticipants) => [
        ...prevParticipants,
        participant,
      ]);
      // Subscribe to participant's audio track
      participant.on("trackSubscribed", (track) => {
        if (track.kind === Track.Kind.Audio) {
          attachTrack(track);

          // Record the remote participant's audio
          const mediaStream = new MediaStream();
          mediaStream.addTrack(track.mediaStreamTrack);
          const personaRecorder = new MediaRecorder(mediaStream);

          personaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              personaAudioChunks.current.push(event.data);
            }
          };

          personaRecorder.onstop = () => {
            const audioBlob = new Blob(personaAudioChunks.current, {
              type: "audio/webm",
            });
            personaAudioChunks.current = [];
            transcriptEvents.current.emit("newPersonaRecording", audioBlob);
          };

          personaRecorder.start(500);
          setPersonaAudioRecorder(personaRecorder);
        }
      });
      const chat = {
        messages: [],
      };
      transcriptEvents.current.emit("newChat", chat);
    });

    newRoom.on("participantDisconnected", (participant) => {
      console.log("Participant disconnected:", participant.identity);
      setRemoteParticipants((prevParticipants) =>
        prevParticipants.filter((p) => p.sid !== participant.sid)
      );
    });

    newRoom.on("dataReceived", (payload, participant, source) => {
      handleDataReceived(payload, participant, source?.toString());
    });

    // Add recording setup
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          userAudioChunks.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(userAudioChunks.current, {
          type: "audio/webm",
        });
        userAudioChunks.current = [];
        transcriptEvents.current.emit("newUserRecording", audioBlob);
      };

      setUserAudioRecorder(recorder);
      recorder.start(500);
    } catch (error) {
      console.error("Failed to setup recording:", error);
    }

    try {
      await newRoom.connect(serverUrl, token);
      setIsConnected(true);
      console.log("Connected to room:", newRoom.name);

      setCallDuration(0);

      // Start duration timer.
      callTimerRef.current = setInterval(() => {
        setCallDuration((prevDuration) => prevDuration + 1);
      }, 1000);

      // Enable audio
      await newRoom.localParticipant.setMicrophoneEnabled(true);
      setLocalParticipant(newRoom.localParticipant);
    } catch (error) {
      console.error("Error connecting to room:", error);
    } finally {
      setIsConnecting(false);
      isConnectingRef.current = false;
    }
  };

  const handleDisconnect = async () => {
    if (room) {
      // Remove all audio elements and detach tracks
      //document.querySelectorAll('audio[id^="audio-"]').forEach((el) => {
      //  const trackId = el.id.replace("audio-", "");
      //  const track = room.localParticipant.getTrackByName(trackId);
      //  if (track) {
      //    track.detach();
      //  }
      //  el.remove();
      //});

      // Disconnect from the room
      console.log("Disconnecting from room", localParticipant);
      if (localParticipant) {
        await localParticipant.setMicrophoneEnabled(false);
        localParticipant.audioTrackPublications.forEach((publication) => {
          publication.track?.stop();
          console.log("Stopped track", publication.track);
          publication.track?.detach();
          console.log("Detached track", publication.track);
          console.log("Unpublishing track", publication.track);
          if (publication.track) {
            localParticipant.unpublishTrack(publication.track);
          }
        });
      }
      document.querySelectorAll("audio").forEach((el) => el.remove());
      room.disconnect();
      setIsConnected(false);
      setRoom(null);
      // Stop duration timer.
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
      console.log("Disconnected from room");
    }

    // Stop recording
    console.log("Stopping user audio recording", userAudioRecorder);
    if (userAudioRecorder) {
      userAudioRecorder.stop();
    }
    console.log("Stopping persona audio recording", personaAudioRecorder);
    if (personaAudioRecorder) {
      personaAudioRecorder.stop();
    }
  };

  const attachTrack = async (track: Track) => {
    const element = document.createElement("audio");
    element.id = `audio-${track.sid}`;
    element.autoplay = true;
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const devices = await navigator.mediaDevices.enumerateDevices();
      console.log(
        "Devices:",
        devices,
        '"setSinkId" in element:',
        "setSinkId" in element
      );
      // Check if the browser supports setSinkId
      if ("setSinkId" in element) {
        let deviceId = "default";
        // find deviceId for device with label "Airpod"
        for (const device of devices) {
          if (
            device.label.toLowerCase().includes("airpod") &&
            device.kind === "audiooutput"
          ) {
            console.log("Setting audio output device to Airpod");
            deviceId = device.deviceId;
          }
        }
        if (deviceId !== "default") {
          console.log("Setting audio output device to Airpod");
          await element.setSinkId(deviceId);
        }
      }
    } catch (error) {
      console.warn("Failed to set audio output device:", error);
    }
    document.body.appendChild(element);
    track.attach(element);
  };

  const contextValue: LiveKitContextType = {
    connect: handleConnect,
    disconnect: handleDisconnect,
    isConnected,
    isConnecting,
    room,
    localParticipant,
    remoteParticipants,
    callDuration,
    transcriptHistory,
    transcriptEvents: transcriptEvents.current,
    lastTranscriptSegment,
  };

  if (!token) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loading />
      </div>
    );
  }

  return (
    <LiveKitContext.Provider value={contextValue}>
      {children}
    </LiveKitContext.Provider>
  );
}

// Remove the default export of the LiveKit component
