export type NotifType = "message" | "ticket" | "comment" | "user";

export interface Notification {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  time: string;
  read: boolean;
  href: string;
}

export const MOCK_NOTIFICATIONS: Notification[] = [
  { id: "n1", type: "message", title: "Ny melding fra Maria Haugen", body: "Husk at det er kodefrys fra torsdag denne uken.", time: "14:22", read: false, href: "/chat" },
  { id: "n2", type: "ticket", title: "Ny ticket opprettet", body: "VPN fungerer ikke hjemmefra — tildelt Thomas Kvam.", time: "13:45", read: false, href: "/tickets" },
  { id: "n3", type: "comment", title: "Ny kommentar på ticket", body: 'Anders Sørensen kommenterte på "Ny laptop til nyansatt".', time: "12:10", read: false, href: "/tickets" },
  { id: "n4", type: "user", title: "Ny bruker ble lagt til", body: "Kari Moe ble lagt til som medlem i organisasjonen.", time: "11:05", read: false, href: "/medlemmer" },
  { id: "n5", type: "message", title: "Ny melding i #general", body: "Thomas Kvam: Bekrefter — ingen endringer. Vi sees!", time: "09:17", read: true, href: "/chat" },
  { id: "n6", type: "comment", title: "Ny kommentar på innlegg", body: "Maria Haugen kommenterte på innlegget ditt om onboarding.", time: "I går", read: true, href: "/feed" },
  { id: "n7", type: "ticket", title: 'Ticket løst: "Spørsmål om feriepenger"', body: "Markert som løst av Maria Haugen.", time: "I går", read: true, href: "/tickets" },
];
