import BlinkingText from "../BlinkingText";

const bios = [
  "Tim Shi is the Co-Founder & CTO of Cresta, where he’s been quietly helping to bring generative AI into the enterprise world before it became the buzzword it is today. As an early member of the OpenAI team back in 2016, Tim played a part in making sure that AI grew up safe and sound. His mission? Unleashing human potential through AGI.",
];

export default function ShortBio() {
  return (
    <BlinkingText
      text={bios[Math.floor(Math.random() * bios.length)]}
      duration={2}
      delay={0.05}
      textStyle={{ lineHeight: "1.5" }}
    />
  );
}
