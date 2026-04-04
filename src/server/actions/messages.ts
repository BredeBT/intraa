"use server";

import { db } from "@/server/db";
import type { MessageWithAuthor } from "@/lib/types";

const MOCK_MESSAGES: MessageWithAuthor[] = [
  {
    id: "mock-msg-1",
    content: "God morgen alle! Noen som vet om standup er flyttet i dag?",
    createdAt: new Date(Date.now() - 1000 * 60 * 45),
    channelId: "mock-channel-general",
    authorId: "mock-user-1",
    author: { id: "mock-user-1", name: "Anders Sørensen", email: "anders@intraa.no", avatarUrl: null, createdAt: new Date() },
  },
  {
    id: "mock-msg-2",
    content: "Nei, den er som vanlig kl. 09:00 så vidt jeg vet.",
    createdAt: new Date(Date.now() - 1000 * 60 * 42),
    channelId: "mock-channel-general",
    authorId: "mock-user-2",
    author: { id: "mock-user-2", name: "Maria Haugen", email: "maria@intraa.no", avatarUrl: null, createdAt: new Date() },
  },
  {
    id: "mock-msg-3",
    content: "Bekrefter — ingen endringer. Vi sees!",
    createdAt: new Date(Date.now() - 1000 * 60 * 40),
    channelId: "mock-channel-general",
    authorId: "mock-user-3",
    author: { id: "mock-user-3", name: "Thomas Kvam", email: "thomas@intraa.no", avatarUrl: null, createdAt: new Date() },
  },
  {
    id: "mock-msg-4",
    content: "Perfekt, takk! 👍",
    createdAt: new Date(Date.now() - 1000 * 60 * 39),
    channelId: "mock-channel-general",
    authorId: "mock-user-1",
    author: { id: "mock-user-1", name: "Anders Sørensen", email: "anders@intraa.no", avatarUrl: null, createdAt: new Date() },
  },
  {
    id: "mock-msg-5",
    content: "Husk at det er kodefrys fra torsdag denne uken.",
    createdAt: new Date(Date.now() - 1000 * 60 * 15),
    channelId: "mock-channel-general",
    authorId: "mock-user-2",
    author: { id: "mock-user-2", name: "Maria Haugen", email: "maria@intraa.no", avatarUrl: null, createdAt: new Date() },
  },
];

export async function getMessages(channelId: string): Promise<MessageWithAuthor[]> {
  
  try {
    return await db.message.findMany({
      where: { channelId },
      include: { author: true },
      orderBy: { createdAt: "asc" },
    });
  } catch {
    return MOCK_MESSAGES;
  }
}

export async function sendMessage(
  channelId: string,
  authorId: string,
  content: string
): Promise<MessageWithAuthor> {

  return db.message.create({
    data: { channelId, authorId, content },
    include: { author: true },
  });
}
