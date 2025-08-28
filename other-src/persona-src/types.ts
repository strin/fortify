export type ProfileType = {
  userName: string;
  profileImage: string;
  creatorId: number;
};

export interface Message {
  id?: number; // if it's from the database
  content: string;
  role: SpeakerRole;
  createdAt?: Date;
  updatedAt?: Date;
  startTimestamp?: number;
  endTimestamp?: number;
}

export interface Creator {
  id: number;
  display_name: string | null;
  username?: string | null;
  email: string | null;
  image?: string;
  bio?: string;
  Profile?: Profile[];
  hide?: boolean;
  followers?: { id: number }[];
  category?: string;
  categories?: {
    name: string;
  }[];
}

export interface Post {
  id: number;
  title: string;
  summary?: string;
  overview?: string;
  coverImages?: string[];
  createdAt: Date;
  updatedAt: Date;
  promptId?: number | null; // TODO: remove this in favor of prompt object
  prompt?: {
    id: number;
    welcomeMessage: string;
  };
}

export interface Profile {
  profileImage?: string | null;
  initialQuestions?: string[];
}

export interface SessionUser {
  id: number;
  name: string;
  username: string;
  email: string;
  image: string;
  display_name: string;
  bio?: string;
}

export type SpeakerRole = "user" | "assistant" | "system";

export type Chat = {
  id?: number;
  messages: Message[];
  createdAt?: Date;
  updatedAt?: Date;
  title?: string;
  summary?: string;
};

export interface DrawerItem {
  icon: React.ReactNode | any;
  label: string;
  showArrow: boolean;
  link?: string;
  isWhiteColor: boolean;
}
export interface ThreadTextMessage {
  id: number;
  type: "text";
  content: string;
  role: SpeakerRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface ThreadCallMessage {
  id: number;
  type: "call";
  createdAt: Date;
  updatedAt: Date;
  chatId: number;
  chat: {
    durationSecs: number;
    summary?: string;
  };
}

export interface Thread {
  id: number;
  creator: Creator;
  user: Creator;
  createdAt: Date;
  updatedAt: Date;
  threadTextMessages: ThreadTextMessage[];
  threadCallMessages: ThreadCallMessage[];
  latestTextMessage: ThreadTextMessage | null;
  latestCallMessage: ThreadCallMessage | null;
}

export interface Prompt {
  id: number;
  content: string;
  welcomeMessage: string;
}


export interface SlideDeck {  
  id: number;
  title: string;
}



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
