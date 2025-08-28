"use client";
import React, { useState, useEffect } from "react";
import styled, { keyframes } from "styled-components";

interface BlinkingTextProps {
  text: string;
  duration?: number;
  delay?: number;
  textStyle?: React.CSSProperties;
}

const revealAnimation = keyframes`
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
`;

const AnimatedCharacter = styled.span<{ delay: number; duration: number }>`
  display: inline-block;
  opacity: 0;
  animation: ${revealAnimation} ${(props) => props.duration}s linear forwards;
  animation-delay: ${(props) => props.delay}s;
`;

const WordContainer = styled.span`
  display: inline-block;
  margin-right: 0.25em;
`;

const LineContainer = styled.div`
  margin-bottom: 0.5em;
`;

const BlinkingText: React.FC<BlinkingTextProps> = ({
  text,
  delay = 0,
  duration = 0.5,
  textStyle,
}) => {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    setShouldRender(true);
  }, []);

  if (!shouldRender) {
    return (
      <div style={textStyle}>
        {text.split("\n").map((line, index) => (
          <div key={index}>{line}</div>
        ))}
      </div>
    );
  }

  const lines = text.split("\n");
  const totalWords = lines.reduce(
    (count, line) => count + line.split(" ").length,
    0
  );
  const wordDuration = duration / totalWords;

  return (
    <div style={textStyle}>
      {lines.map((line, lineIndex) => (
        <LineContainer key={lineIndex}>
          {line.split(" ").map((word, wordIndex) => (
            <WordContainer key={`${lineIndex}-${wordIndex}`}>
              {word.split("").map((char, charIndex) => (
                <AnimatedCharacter
                  key={`${lineIndex}-${wordIndex}-${charIndex}`}
                  delay={
                    (lineIndex > 0
                      ? lines
                          .slice(0, lineIndex)
                          .reduce((count, l) => count + l.split(" ").length, 0)
                      : 0) *
                      wordDuration +
                    wordIndex * wordDuration +
                    delay +
                    (charIndex * wordDuration) / word.length
                  }
                  duration={wordDuration / word.length}
                >
                  {char}
                </AnimatedCharacter>
              ))}
            </WordContainer>
          ))}
        </LineContainer>
      ))}
    </div>
  );
};

export default BlinkingText;
