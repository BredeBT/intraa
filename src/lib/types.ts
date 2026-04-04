// ─── Enums ────────────────────────────────────────────────────────────────────

export type OrgType = "COMPANY" | "COMMUNITY";
export type OrgPlan = "FREE" | "PRO" | "ENTERPRISE";
export type MemberRole = "OWNER" | "ADMIN" | "MODERATOR" | "VIP" | "MEMBER";
export type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED";
export type TicketCategory = "IT" | "HR" | "OTHER";
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
};

export type Membership = {
  id: string;
  role: MemberRole;
  userId: string;
  organizationId: string;
};

export type Post = {
  id: string;
  content: string;
  createdAt: Date;
  orgId: string;
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
  id: string;
  content: string;
  createdAt: Date;
  channelId: string;
  authorId: string;
};

export type Ticket = {
  id: string;
  title: string;
  status: TicketStatus;
  category: TicketCategory;
  createdAt: Date;
  orgId: string;
  assigneeId: string | null;
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

// ─── With relations ───────────────────────────────────────────────────────────

export type PostWithAuthor = Post & {
  author: User;
  comments: Comment[];
};

export type TicketWithAssignee = Ticket & {
  assignee: User | null;
};

export type MessageWithAuthor = Message & {
  author: User;
};

export type MembershipWithUser = Membership & {
  user: User;
};

export type ChannelWithMessages = Channel & {
  messages: MessageWithAuthor[];
};
