import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { getMessages } from "@/server/actions/messages";
import ChatClient from "./ChatClient";

export default async function ChatPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await db.membership.findFirst({
    where: { userId: session.user.id },
    include: {
      organization: {
        include: {
          channels:    { where: { type: "TEXT" }, orderBy: { name: "asc" } },
          memberships: { include: { user: { select: { id: true, name: true } } } },
        },
      },
    },
    orderBy: { organization: { createdAt: "asc" } },
  });

  const channels        = membership?.organization.channels ?? [];
  const firstChannel    = channels[0] ?? null;
  const initialMessages = firstChannel ? await getMessages(firstChannel.id) : [];

  const dmContacts = (membership?.organization.memberships ?? [])
    .filter((m) => m.userId !== session.user.id)
    .map((m) => ({
      id:       m.userId,
      name:     m.user.name ?? "Ukjent",
      initials: (m.user.name ?? "?")
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase(),
    }));

  return (
    <ChatClient
      channels={channels.map((c) => ({ id: c.id, name: c.name }))}
      initialMessages={initialMessages}
      dmContacts={dmContacts}
      userId={session.user.id}
      userName={session.user.name ?? ""}
    />
  );
}
