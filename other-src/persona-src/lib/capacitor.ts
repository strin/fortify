import { Plugins } from "@capacitor/core";
const { Mixpanel: CapacitorMixpanel } = Plugins;

export const isCapacitor = () => {
  return CapacitorMixpanel !== undefined;
};
