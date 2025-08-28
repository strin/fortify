interface DeckSlideBase {
  id: string;
  order: number;
  script: string;
  context: string;
}

export interface DeckImageSlide extends DeckSlideBase {
  id: string;
  title: string;
  imageUrl: string;
}

export interface DeckMarkdownSlide extends DeckSlideBase {
  id: string;
  title: string;
  markdown: string;
}

export type DeckSlide = DeckImageSlide | DeckMarkdownSlide;
