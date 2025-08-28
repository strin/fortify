"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ChevronDown,
  Presentation,
  Layers,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { SessionUser } from "@/types";

interface WaitingPageProps {
  onJoin: (guestDisplayName?: string) => void;
  username: string;
  slug: string;
}

export default function WaitingPage({
  onJoin,
  username,
  slug,
}: WaitingPageProps) {
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>("");
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>("");
  const [showOptions, setShowOptions] = useState(true);
  const [cloneName, setCloneName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  const { data: session } = useSession();
  const user = session?.user as SessionUser | null;

  useEffect(() => {
    // Fetch clone information
    async function fetchCloneInfo() {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/clones/by-slug/${slug}`);
        if (response.ok) {
          const data = await response.json();
          setCloneName(data.name || username);
        } else {
          console.error("Failed to fetch clone info");
          setCloneName(username);
        }
      } catch (error) {
        console.error("Error fetching clone info:", error);
        setCloneName(username);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCloneInfo();
  }, [username]);

  useEffect(() => {
    // Get available media devices
    async function getDevices() {
      try {
        // Request permission to access devices
        await navigator.mediaDevices.getUserMedia({ audio: true, video: true });

        const devices = await navigator.mediaDevices.enumerateDevices();

        const audioInputs = devices.filter(
          (device) => device.kind === "audioinput"
        );
        const videoInputs = devices.filter(
          (device) => device.kind === "videoinput"
        );

        setAudioDevices(audioInputs);
        setVideoDevices(videoInputs);

        if (audioInputs.length > 0)
          setSelectedAudioDevice(audioInputs[0].deviceId);
        if (videoInputs.length > 0)
          setSelectedVideoDevice(videoInputs[0].deviceId);
      } catch (error) {
        console.error("Error accessing media devices:", error);
      }
    }

    getDevices();
  }, []);

  const handleJoin = () => {
    if (!user && !displayName.trim()) {
      alert("Please enter your name before joining");
      return;
    }

    onJoin(user ? undefined : displayName);
  };

  return (
    <div className="flex flex-col min-h-[600px] h-full max-h-[100vh] md:max-h-[600px] my-auto bg-gray-50 p-4 md:p-8 gap-4 max-w-[1000px] w-full">
      <div className="w-full">
        <h1 className="text-3xl font-bold text-left  min-h-[40px]">
          {isLoading ? "Loading..." : cloneName}
        </h1>
      </div>
      <div className="flex flex-col md:flex-row flex-1 gap-6 md:gap-8">
        {/* Left side - Camera preview */}
        <div className="flex-1 flex flex-col min-h-[300px]">
          <div className="relative bg-black rounded-lg overflow-hidden flex-1 flex items-center justify-center">
            {cameraEnabled ? (
              <video
                className="w-full h-full object-cover"
                autoPlay
                muted
                playsInline
              />
            ) : (
              <div className="text-white text-xl">Camera is off</div>
            )}

            <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4">
              <Button
                variant="outline"
                size="icon"
                className="rounded-full bg-gray-800 hover:bg-gray-700 border-none text-white h-12 w-12"
                onClick={() => setMicEnabled(!micEnabled)}
              >
                {micEnabled ? <Mic size={20} /> : <MicOff size={20} />}
              </Button>

              <Button
                variant="outline"
                size="icon"
                className="rounded-full bg-gray-800 hover:bg-gray-700 border-none text-white h-12 w-12"
                onClick={() => setCameraEnabled(!cameraEnabled)}
              >
                {cameraEnabled ? <Video size={20} /> : <VideoOff size={20} />}
              </Button>
            </div>

            <div className="absolute top-4 left-4 text-white font-medium">
              {user?.display_name || displayName || "You"}
            </div>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Select
                value={selectedAudioDevice}
                onValueChange={setSelectedAudioDevice}
              >
                <SelectTrigger className="w-full">
                  <div className="flex items-center gap-2">
                    <Mic size={16} />
                    <SelectValue placeholder="Microphone" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {audioDevices.map((device) => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.label ||
                        `Microphone ${device.deviceId.slice(0, 5)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <Select
                value={selectedVideoDevice}
                onValueChange={setSelectedVideoDevice}
              >
                <SelectTrigger className="w-full">
                  <div className="flex items-center gap-2">
                    <Video size={16} />
                    <SelectValue placeholder="Camera" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {videoDevices.map((device) => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.label || `Camera ${device.deviceId.slice(0, 5)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Right side - Join options */}
        <div className="w-full md:w-80 flex flex-col items-center justify-center py-6">
          <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-6">
            <div className="text-indigo-500">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 2L4 7L12 12L20 7L12 2Z" fill="currentColor" />
                <path
                  d="M4 17L12 22L20 17M4 12L12 17L20 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          <h1 className="text-2xl font-semibold mb-2">Ready to join?</h1>
          <p className="text-gray-500 mb-6 min-h-[24px] w-full text-center">
            {isLoading ? "Loading..." : `${username}'s AI `} is waiting for you.
          </p>

          {!user && (
            <Input
              type="text"
              placeholder="Your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mb-4"
            />
          )}

          <Button
            className="w-full mb-2 bg-blue-600 hover:bg-blue-700"
            onClick={handleJoin}
          >
            Join now
          </Button>
        </div>
      </div>
    </div>
  );
}
