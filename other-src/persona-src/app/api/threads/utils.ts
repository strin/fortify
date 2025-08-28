import { ThreadTextMessage } from "@prisma/client";

export const transformMessage = (message: ThreadTextMessage | null) => {
  if (!message) return null;
  return {
    ...message,
    role: message.role.toLowerCase(),
  };
};
