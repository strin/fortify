import IndividualMessages from "./IndividualMessages";
import MessageHeader from "../../components/MessageHeader";
import { categorizeMessagesByDay, MESSAGE_DATA } from "../data";
import Thread from "./Thread";

type MessageConversationProps = {
  params: { id: number };
};
export default function MessageConversation({
  params,
}: MessageConversationProps) {
  return <Thread id={params.id} />;
}
