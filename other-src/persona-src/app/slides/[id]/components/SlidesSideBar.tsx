import { DeckSlide } from "../types";

interface SlidesSideBarProps {
  slides: DeckSlide[];
}

export default function SlidesSideBar({ slides }: SlidesSideBarProps) {
  console.log("SlidesSideBar slides", slides);
  return (
    <div className="p-4">
      {slides && slides.length > 0 ? (
        slides.map((slide, index) => (
          <div
            key={slide.id}
            className="py-2 px-3 hover:bg-gray-100 rounded cursor-pointer"
          >
            {slide.title || `Slide ${index + 1}`}
          </div>
        ))
      ) : (
        <div className="py-2 px-3">No slides available</div>
      )}
    </div>
  );
}
