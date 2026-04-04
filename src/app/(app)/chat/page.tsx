import { getMessages } from "@/server/actions/messages";
import ChatClient from "./ChatClient";

const MOCK_CHANNEL_ID = "mock-channel-general";

export default async function ChatPage() {
  const initialMessages = await getMessages(MOCK_CHANNEL_ID);
  return <ChatClient initialMessages={initialMessages} />;
}
