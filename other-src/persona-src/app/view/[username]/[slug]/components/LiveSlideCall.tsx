"use client";
import React, { useEffect, useState } from "react";
import { Chat, Creator, DeckMarkdownSlide, Post, Profile } from "@/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, ArrowDownRight } from "lucide-react";

import { LiveKitProvider, useLiveKit } from "@/components/transports/LiveKit";
import LiveCallButton from "@/components/LiveCall/LiveCallButton";
import LiveCallContent from "@/components/LiveCall/LiveCallContent";

import { PageZoomIn } from "@/lib/motion";
import { SessionUser } from "@/types";
import MuteButton from "@/components/LiveCall/MuteButton";
import { PostCallStatusUpdate } from "@/components/LiveCall/types";
import { LiveTranscriptComponent } from "./LiveTranscriptComponent";
import { CallDurationComponent } from "./CallDurationComponent";
import { SlideDeck, DeckSlide } from "@/types";
import { renderSlide } from "@/lib/slides/render";

const LiveCall: React.FC<{
  creator: Creator;
  profile: Profile;
  user: SessionUser | null;
  guestDisplayName?: string | null;
  onCallStatusUpdate?: (status: PostCallStatusUpdate) => void;
  onFinishCall?: (chat: Chat) => void;
  disableCallButton?: boolean;
  deck: SlideDeck;
}> = ({
  creator,
  profile,
  user,
  guestDisplayName,
  onCallStatusUpdate,
  onFinishCall,
  disableCallButton,
  deck,
}) => {
  const [activeSpeaker, setActiveSpeaker] = useState<"creator" | "user" | null>(
    null
  );

  useEffect(() => {
    sessionStorage.setItem("previousPath", window.location.pathname);
  }, []);

  const [slides, setSlides] = useState<DeckSlide[]>([]);
  const [isLoadingSlides, setIsLoadingSlides] = useState(true);
  const [slideError, setSlideError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSlides = async () => {
      try {
        const response = await fetch(`/api/slide-decks/${deck.id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch slides");
        }
        const data = await response.json();
        let slides: DeckSlide[] = [];
        slides = slides.concat(data.DeckMarkdownSlide);
        slides = slides.concat(data.DeckImageSlide);
        slides = slides.sort((a, b) => a.order - b.order);
        setSlides(slides);
      } catch (err) {
        setSlideError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoadingSlides(false);
      }
    };

    if (deck?.id) {
      fetchSlides();
    }
  }, [deck?.id]);

  const SANDBOX_ID = process.env.NEXT_PUBLIC_LIVEKIT_SANDBOX_ID;
  let sandboxPrefix = "";
  if (SANDBOX_ID) {
    sandboxPrefix = `${SANDBOX_ID}/`;
  }

  const [userImage, setUserImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserImage = async () => {
      if (!user?.id) return;

      try {
        const response = await fetch(`/api/creators/${user.id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch user data");
        }
        const userData: Creator = await response.json();
        if (userData.Profile && userData.Profile[0]?.profileImage) {
          setUserImage(userData.Profile[0].profileImage);
        }
      } catch (error) {
        console.error("Error fetching user image:", error);
      }
    };

    fetchUserImage();
  }, [user]);

  const ParticipantSquares = () => {
    return (
      <div className="w-full max-w-4xl grid grid-cols-2 gap-4 px-4 h-48">
        {/* Creator square - should show creator's video stream */}
        <div
          className={`aspect-square bg-gray-800 rounded-lg flex items-center justify-center relative ${
            activeSpeaker === "creator"
              ? "border-4 border-green-500"
              : "border-2"
          } overflow-hidden transition-all duration-300`}
        >
          {/* Replace static profile image with LiveKit video component */}
          <div className="w-full h-full flex items-center justify-center">
            <LiveCallContent
              creator={creator}
              profile={profile}
              user={user}
              onCallStatusUpdate={onCallStatusUpdate}
              onFinishCall={onFinishCall}
            />
          </div>
          <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-sm">
            {(creator.display_name || creator.username)?.split(" ")[0]}
          </div>
        </div>

        {/* User square - should show user's video stream */}
        <div
          className={`aspect-square bg-gray-800 rounded-lg flex items-center justify-center relative ${
            activeSpeaker === "user"
              ? "border-4 border-green-500"
              : "border-2 border-gray-600"
          } overflow-hidden transition-all duration-300`}
        >
          {/* Replace static profile image with LiveKit video component */}
          <div className="w-full h-full">
            {/* This should be replaced with the LiveKit video component for the user */}
            {/* For example: <LocalParticipantView /> */}
            {userImage ? (
              <img
                src={userImage}
                alt={user?.name || "User"}
                className="w-32 h-32 rounded-full object-cover absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-gray-600 flex items-center justify-center absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <svg
                  className="w-16 h-16 text-gray-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                    clipRule="evenodd"
                  ></path>
                </svg>
              </div>
            )}
          </div>
          <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-sm">
            {user
              ? user.display_name?.split(" ")[0] || "You"
              : guestDisplayName?.split(" ")[0] || "Guest"}
          </div>
        </div>
      </div>
    );
  };

  interface SlidesViewProps {
    slides: DeckSlide[];
    currentSlide: number;
    onSlideChange?: (slideIndex: number) => void;
  }

  const SlidesView = ({
    slides,
    currentSlide,
    onSlideChange,
  }: SlidesViewProps) => {
    if (slides.length === 0) return <div>No slides</div>;
    if (currentSlide < 0 || currentSlide >= slides.length) {
      return <div>Invalid slide index</div>;
    }

    return (
      <div className="w-full h-full flex flex-col items-center justify-center relative ">
        {/* Fixed canvas-like screen for slides */}
        <div className="w-full max-w-4xl md:aspect-video aspect-square bg-black/10 flex items-center justify-center rounded-lg shadow-lg overflow-hidden relative">
          {renderSlide(slides[currentSlide] as DeckMarkdownSlide)}

          {/* Previous slide button */}
          <button
            onClick={() => onSlideChange?.(Math.max(0, currentSlide - 1))}
            disabled={currentSlide === 0}
            hidden={currentSlide === 0}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 disabled:opacity-50 disabled:hover:bg-black/20 p-2 rounded-full transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-white"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          {/* Next slide button */}
          <button
            onClick={() =>
              onSlideChange?.(Math.min(slides.length - 1, currentSlide + 1))
            }
            disabled={currentSlide === slides.length - 1}
            hidden={currentSlide === slides.length - 1}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 disabled:opacity-50 disabled:hover:bg-black/20 p-2 rounded-full transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-white"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {/* Participant squares in bottom right */}
        <div className="absolute bottom-4 right-4 z-10">
          <div className="scale-75 origin-bottom-right">
            <ParticipantSquares />
          </div>
        </div>
      </div>
    );
  };

  const SlideViewNarrator = () => {
    const { room } = useLiveKit();

    return (
      <SlidesView
        slides={slides}
        currentSlide={currentSlide}
        onSlideChange={(slideIndex) => {
          setCurrentSlide(slideIndex);

          if (room) {
            const data = {
              type: "agent_narrate",
              script: slides[slideIndex].script,
            };
            const encodedData = new TextEncoder().encode(JSON.stringify(data));
            room.localParticipant.publishData(encodedData, {
              reliable: true,
            });
            console.log("OnSlideChange: Sent agent_narrate event");
          }
        }}
      />
    );
  };

  const [currentSlide, setCurrentSlide] = useState(0);

  return (
    <div className="bg-background h-screen w-full relative flex flex-col">
      {/* {!user && <LoginBanner />} */}
      <PageZoomIn className="flex flex-col h-full">
        <div className="flex flex-col h-full">
          <div className="flex-grow flex items-center justify-center relative flex-col">
            <LiveKitProvider
              roomNamePrefix={`${sandboxPrefix}users/${
                user?.id || "-1"
              }/creators/${creator.id}/posts/-1`}
              participantName="random-user"
              onDataReceived={(payload, participant, source) => {
                console.log("Data received:", {
                  payload,
                  participant,
                  source,
                });
                if (!payload.data) {
                  return;
                }
              }}
            >
              <div className="absolute top-4 right-4 flex items-center gap-4 mb-4">
                <h1 className="text-foreground bg-muted px-4 py-2 rounded-xl">
                  Slide 1/1
                </h1>
                <h1 className="text-foreground bg-muted px-4 py-2 rounded-xl">
                  {deck.title}
                </h1>
                <CallDurationComponent />
              </div>
              {/* Call duration display - positioned at top center */}
              <div
                className="w-full h-full flex flex-col items-center justify-center"
                style={{ marginTop: "-200px" }}
              >
                <SlideViewNarrator />
              </div>

              {/* Call controls bar - fixed at bottom */}
              <div className="fixed bottom-8 left-0 right-0 flex justify-center">
                <div className="bg-background/80 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg flex items-center gap-6">
                  <MuteButton iconOnly />
                  <LiveCallButton iconOnly disabled={disableCallButton} />
                </div>
              </div>

              <ActiveSpeakerDetector setActiveSpeaker={setActiveSpeaker} />
              <LiveTranscriptComponent creator={creator} />
            </LiveKitProvider>
          </div>
        </div>
      </PageZoomIn>
    </div>
  );
};

// Add a new component to detect active speakers
const ActiveSpeakerDetector = ({
  setActiveSpeaker,
}: {
  setActiveSpeaker: React.Dispatch<
    React.SetStateAction<"creator" | "user" | null>
  >;
}) => {
  const { room } = useLiveKit();

  useEffect(() => {
    if (!room) return;

    const handleActiveSpeakersChanged = (speakers: any[]) => {
      if (speakers.length === 0) {
        setActiveSpeaker(null);
        return;
      }

      // Determine if the active speaker is the creator or the user
      // This logic may need to be adjusted based on how you identify participants
      const activeSpeaker = speakers[0];

      if (
        activeSpeaker.identity.includes("agent") ||
        activeSpeaker.identity.includes("creator")
      ) {
        setActiveSpeaker("creator");
      } else {
        setActiveSpeaker("user");
      }
    };

    room.on("activeSpeakersChanged", handleActiveSpeakersChanged);

    return () => {
      room.off("activeSpeakersChanged", handleActiveSpeakersChanged);
    };
  }, [room, setActiveSpeaker]);

  return null;
};

export default LiveCall;
