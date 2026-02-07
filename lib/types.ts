export interface Email {
  id: string;
  from: string;
  to: string;
  subject: string;
  snippet: string;
  body: string;
  date: string;
  isRead: boolean;
  labels: string[];
}

export interface ComposeForm {
  to: string;
  subject: string;
  body: string;
}

export type View = "inbox" | "sent" | "compose" | "detail";

export interface AppContext {
  currentView: View;
  currentEmailId?: string;
  currentEmail?: Email;
}
