import ChatThread from "@/features/chat/ChatThread";
import ChatUnavailable from "@/features/chat/ChatUnavailable";
import { chatTitle } from "@/features/chat/chat-title";
import { listChatMessages, listMyChats } from "@/features/chat/queries";
import { getLocale, getT } from "@/lib/i18n/server";

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [chats, messages, t, locale] = await Promise.all([listMyChats(), listChatMessages(id), getT(), getLocale()]);
  const chat = chats?.find((item) => item.id === id);

  if (!chat || messages === null) {
    return <ChatUnavailable reason={messages === null || chats === null ? "chat.loadFailed" : "chat.unavailable"} />;
  }

  const { title, subtitle } = chatTitle(chat, t, locale);
  const other = chat.kind === "direct" && chat.otherUserId ? { id: chat.otherUserId, name: title } : null;

  return <ChatThread conversationId={chat.id} title={title} subtitle={subtitle} initialMessages={messages} other={other} />;
}
