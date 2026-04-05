export type NotifType = "MESSAGE" | "TICKET" | "COMMENT" | "USER";

export interface Notification {
  id:        string;
  type:      NotifType;
  title:     string;
  body:      string;
  href:      string;
  createdAt: Date;
  readAt:    Date | null;
}
