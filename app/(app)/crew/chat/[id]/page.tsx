import ChatThread from "@/features/chat/ChatThread";
import ChatUnavailable from "@/features/chat/ChatUnavailable";
import { chatTitle } from "@/features/chat/chat-title";
import { getNewDirectChat, listChatMessages, listMyChats } from "@/features/chat/queries";
import { getLocale, getT } from "@/lib/i18n/server";

export default async function ChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [chats, messages, t, locale] = await Promise.all([listMyChats(), listChatMessages(id), getT(), getLocale()]);
  /* The list holds chats with messages; a brand-new direct chat is
     confirmed separately. */
  const withUser = typeof query.with === "string" ? query.with : null;
  const chat =
    chats?.find((item) => item.id === id) ??
    (chats !== null && messages?.length === 0 && withUser ? await getNewDirectChat(id, withUser) : null) ??
    undefined;

  if (!chat || messages === null) {
    return <ChatUnavailable reason={messages === null || chats === null ? "chat.loadFailed" : "chat.unavailable"} />;
  }

  const { title, subtitle } = chatTitle(chat, t, locale);
  const other = chat.kind === "direct" && chat.otherUserId ? { id: chat.otherUserId, name: title } : null;

  return <ChatThread conversationId={chat.id} title={title} subtitle={subtitle} initialMessages={messages} other={other} />;
}
