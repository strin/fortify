import mixpanel from "mixpanel-browser";

// Check if we're running in Capacitor by looking for the global Capacitor object
const isCapacitor =
  typeof window !== "undefined" &&
  // @ts-ignore
  window.Capacitor !== undefined;

// Export for use in other files
export const IS_CAPACITOR = isCapacitor;

console.log("IS_CAPACITOR", IS_CAPACITOR);

import { Plugins } from "@capacitor/core";
const { Mixpanel: CapacitorMixpanel } = Plugins;

if (IS_CAPACITOR && CapacitorMixpanel) {
  try {
    CapacitorMixpanel.initialize({
      token: process.env.NEXT_PUBLIC_MIXPANEL_TOKEN,
    });
  } catch (e) {
    console.error("Error initializing Capacitor Mixpanel", e);
  }
}

mixpanel.init(process.env.NEXT_PUBLIC_MIXPANEL_TOKEN || "", {
  debug: false,
  track_pageview: true,
  persistence: "localStorage",
});

export const Mixpanel = {
  track: (name: string, props: any) => {
    console.log("track", name, props);
    mixpanel.track(name, props);
    if (IS_CAPACITOR && CapacitorMixpanel) {
      try {
        console.log("capacitor track", name, props);
        CapacitorMixpanel.track({
          event: name,
          properties: props,
        });
      } catch (e) {
        console.error("Error tracking event in Capacitor", e);
      }
    }
  },
  identify: (id: string) => {
    mixpanel.identify(id);
    if (IS_CAPACITOR && CapacitorMixpanel) {
      try {
        CapacitorMixpanel.identify({
          distinctId: id,
        });
      } catch (e) {
        console.error("Error identifying in Capacitor", e);
      }
    }
  },
  people: {
    set: (props: any) => {
      mixpanel.people.set(props);
      if (IS_CAPACITOR && CapacitorMixpanel) {
        try {
          CapacitorMixpanel.setProfile({
            properties: props,
          });
        } catch (e) {
          console.error("Error setting people in Capacitor", e);
        }
      }
    },
  },
};

export const trackLinkClick = async (url: string) => {
  Mixpanel.track("Link Click", {
    category: "Navigation",
    url,
  });
};

export const trackCallEvent = async (event: string) => {
  Mixpanel.track("Call Event", {
    event,
  });
};
