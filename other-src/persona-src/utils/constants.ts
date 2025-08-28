import { DrawerItem } from "@/types";
import {
  AboutPersonaIcon,
  ClearCallIcon,
  ClearChatIcon,
  DeleteAccountIcon,
  FAQIcon,
  Guide1,
  Guide2,
  Guide3,
  HowItWorksIcon,
  PoliciesIcon,
  RateAppIcon,
  ShareAppIcon,
} from "@/utils/icons";

export const SESSION_COOKIE_NAME = process.env.NEXT_PUBLIC_SESSION_COOKIE_NAME!;

export const UNAUTHORIZED_SESSION =
  process.env.NEXT_PUBLIC_UNAUTHORIZED_SESSION!;

export const guideStepsData = [
  {
    image: Guide1,
    title: "Create Your Digital Persona",
    description:
      "view profile and start conversation with your friends’ digital personality",
  },
  {
    image: Guide2,
    title: "Clone your voice",
    description:
      "record your voice and share your digital persona and communicate through AI ",
  },
  {
    image: Guide3,
    title: "Stories, Images, Links .. and more",
    description:
      "your persona evolves with your stories and likings ... share stories and upload images, links precisely ",
  },
];

export const drawrerData: DrawerItem[] = [
  {
    icon: AboutPersonaIcon,
    label: "About PERSONA",
    showArrow: true,
    isWhiteColor: true,
    link: "/about",
  },
  {
    icon: HowItWorksIcon,
    label: "How it Works",
    showArrow: true,
    isWhiteColor: true,
  },
  {
    icon: FAQIcon,
    label: "FAQ",
    showArrow: true,
    isWhiteColor: true,
  },
  {
    icon: ShareAppIcon,
    label: "Share App",
    showArrow: true,
    isWhiteColor: true,
  },
  {
    icon: RateAppIcon,
    label: "Rate the App",
    showArrow: true,
    isWhiteColor: true,
  },
  {
    icon: PoliciesIcon,
    label: "Policies",
    showArrow: true,
    isWhiteColor: true,
  },
  /*{
    icon: ClearChatIcon,
    label: "Clear All Chat History",
    showArrow: false,
    isWhiteColor: false,
  },
  {
    icon: ClearCallIcon,
    label: "Clear All Call History",
    showArrow: false,
    isWhiteColor: false,
  },
  {
    icon: DeleteAccountIcon,
    label: "Delete Account",
    showArrow: false,
    isWhiteColor: false,
  },*/
];
