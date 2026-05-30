// ─── Enums ────────────────────────────────────────────────────────────────────

export type OrgType = "COMPANY" | "COMMUNITY";
export type OrgPlan = "FREE" | "PRO" | "ENTERPRISE";
export type MemberRole = "OWNER" | "ADMIN" | "MODERATOR" | "VIP" | "MEMBER";
export type TicketStatus   = "OPEN" | "IN_PROGRESS" | "WAITING" | "RESOLVED" | "CLOSED";
export type TicketPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
export type TicketSource   = "INTERNAL" | "SUPPORT";
export type ChannelType = "TEXT" | "DIRECT";

// ─── Base models ──────────────────────────────────────────────────────────────

export type Organization = {
  id: string;
  slug: string;
  name: string;
  type: OrgType;
  plan: OrgPlan;
  createdAt: Date;
};

export type User = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  hasFanpass?: boolean;
};

/**
 * Brukerinfo som er trygg å sende til klienten — IKKE e-post. Brukes som
 * `author`/`user`-shape på posts, kommentarer, meldinger og medlemsslister
 * der respons-payloaden flyter til andre brukere enn eieren selv. Hindrer
 * at e-postadresser lekker via API-responsen.
 */
export type PublicUser = {
  id:         string;
  name:       string | null;
  avatarUrl:  string | null;
  createdAt:  Date;
  hasFanpass?: boolean;
};

export type Membership = {
  id:             string;
  role:           MemberRole;
  userId:         string;
  organizationId: string;
  username:       string | null;
};

export type Post = {
  id:       string;
  content:  string;
  imageUrl: string | null;
  createdAt: Date;
  orgId:    string;
  authorId: string;
};

export type Comment = {
  id: string;
  content: string;
  createdAt: Date;
  postId: string;
  authorId: string;
};

export type Channel = {
  id: string;
  name: string;
  type: ChannelType;
  orgId: string;
};

export type Message = {
  id:              string;
  content:         string;
  imageUrl:        string | null;
  audioUrl:        string | null;
  audioDuration:   number | null;
  createdAt:       Date;
  editedAt:        Date | null;
  isPinned:        boolean;
  channelId:       string;
  authorId:        string;
  parentMessageId: string | null;
};

export type ReactionGroup = {
  emoji:      string;
  count:      number;
  reactedByMe: boolean;
};

export type Ticket = {
  id:          string;
  title:       string;
  description: string;
  status:      TicketStatus;
  priority:    TicketPriority;
  category:    string | null;
  source:      TicketSource;
  fromTenantId: string | null;
  createdAt:   Date;
  updatedAt:   Date;
  orgId:       string;
  authorId:    string;
  assigneeId:  string | null;
};

export type File = {
  id: string;
  name: string;
  url: string;
  size: number;
  createdAt: Date;
  orgId: string;
  uploaderId: string;
};

export type Like = {
  id:             string;
  postId:         string;
  userId:         string;
  organizationId: string;
  createdAt:      Date;
};

// ─── With relations ───────────────────────────────────────────────────────────

export type CommentWithAuthor = Comment & {
  author: PublicUser;
};

export type PostWithAuthor = Post & {
  author:         PublicUser;
  comments:       CommentWithAuthor[];
  likeCount:      number;
  likedByMe:      boolean;
  bookmarkedByMe: boolean;
  hiddenAt:       Date | null;
  hiddenReason:   string | null;
};

export type TicketWithAssignee = Ticket & {
  assignee: Pick<User, "id" | "name"> | null;
  author:   Pick<User, "id" | "name">;
};

export type MessageWithAuthor = Message & {
  author:     PublicUser;
  reactions:  ReactionGroup[];
  replyCount: number;
  replies:    MessageWithAuthor[];
};

export type MembershipWithUser = Membership & {
  user: PublicUser;
};

export type ChannelWithMessages = Channel & {
  messages: MessageWithAuthor[];
};
