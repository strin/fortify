"use client";

import React, { useState, useEffect } from "react";

interface ImageArtifactProps {
  imageUrl: string;
  duration: number; // in seconds
  delay: number; // in seconds (new parameter)
  onComplete?: () => void;
}

const ImageArtifact: React.FC<ImageArtifactProps> = ({
  imageUrl,
  duration,
  delay,
  onComplete,
}) => {
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [opacity, setOpacity] = useState(0);
  const [imageAspectRatio, setImageAspectRatio] = useState(0);
  const [panPosition, setPanPosition] = useState(0);
  const [panSpeed, setPanSpeed] = useState(0);
  const [isDelayComplete, setIsDelayComplete] = useState(false);

  useEffect(() => {
    // Implement delay
    const delayTimer = setTimeout(() => {
      setIsDelayComplete(true);
    }, delay * 1000);

    // Load image and get aspect ratio
    const img = new Image();
    img.onload = () => {
      setImageAspectRatio(img.width / img.height);
    };
    img.src = imageUrl;

    // Fade in effect (only start after delay)
    let fadeInInterval: NodeJS.Timeout;
    if (isDelayComplete) {
      fadeInInterval = setInterval(() => {
        setOpacity((prevOpacity) => {
          if (prevOpacity >= 1) {
            clearInterval(fadeInInterval);
            return 1;
          }
          return prevOpacity + 0.05;
        });
      }, 50);
    }

    // Calculate pan speed based on duration
    if (imageAspectRatio > window.innerWidth / window.innerHeight) {
      const totalPanDistance = 100; // 0% to 100%
      const panSpeedPerSecond = totalPanDistance / duration;
      setPanSpeed(panSpeedPerSecond);
    }

    let progressInterval: number;
    if (isDelayComplete) {
      progressInterval = window.setInterval(() => {
        if (!isPaused) {
          setProgress((prevProgress) => {
            if (prevProgress >= 100) {
              clearInterval(progressInterval);
              setIsCompleted(true);
              return 100;
            }
            return prevProgress + 100 / (duration * 10);
          });
        }
      }, 100);
    }

    return () => {
      clearTimeout(delayTimer);
      if (fadeInInterval) clearInterval(fadeInInterval);
      if (progressInterval) clearInterval(progressInterval);
    };
  }, [duration, isPaused, imageUrl, imageAspectRatio, delay, isDelayComplete]);

  useEffect(() => {
    if (isCompleted) {
      const fadeOutInterval = setInterval(() => {
        setOpacity((prevOpacity) => {
          if (prevOpacity <= 0) {
            clearInterval(fadeOutInterval);
            return 0;
          }
          return prevOpacity - 0.05;
        });
      }, 50);

      onComplete?.();

      return () => clearInterval(fadeOutInterval);
    }
  }, [isCompleted]);

  useEffect(() => {
    if (imageAspectRatio > window.innerWidth / window.innerHeight && !isPaused) {
      const panInterval = setInterval(() => {
        setPanPosition((prevPosition) => {
          const newPosition = prevPosition + panSpeed / 20; // Adjust for 50ms interval
          return newPosition > 100 ? 0 : newPosition;
        });
      }, 50);

      return () => clearInterval(panInterval);
    }
  }, [imageAspectRatio, isPaused, panSpeed]);

  const handleTouchStart = () => setIsPaused(true);
  const handleTouchEnd = () => setIsPaused(false);
  const handleMouseDown = () => setIsPaused(true);
  const handleMouseUp = () => setIsPaused(false);

  if (opacity <= 0 || !isDelayComplete) {
    return null;
  }

  const imageStyle =
    imageAspectRatio > window.innerWidth / window.innerHeight
      ? {
          height: "100vh",
          width: "auto",
          objectFit: "cover" as const,
          objectPosition: `${panPosition}% 50%`,
          transition: "object-position 0.05s linear",
        }
      : {
          width: "100%",
          height: "100%",
          objectFit: "contain" as const,
        };

  return (
    <div
      className="absolute top-0 left-0 w-full h-screen bg-black overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ opacity }}
    >
      <div
        className="absolute top-0 left-0 w-full h-1 bg-none"
        style={{ zIndex: 100 }}
      >
        <div
          className="h-full bg-gray-300"
          style={{
            width: `${100 - progress}%`,
            transition: isPaused ? "none" : "width 0.1s linear",
          }}
        />
      </div>
      <img
        src={imageUrl}
        alt="Story Image"
        style={{
          ...imageStyle,
          position: "absolute",
          top: 0,
          left: 0,
          zIndex: 100,
        }}
      />
    </div>
  );
};

export default ImageArtifact;
