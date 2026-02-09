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

export type AssistantAction =
  | { type: "OPEN_COMPOSE" }
  | { type: "FILL_COMPOSE"; to?: string; subject?: string; body?: string }
  | { type: "SEND_EMAIL" }
  | { type: "FILTER_EMAILS"; sender?: string; dateRange?: string; unread?: boolean }
  | { type: "OPEN_EMAIL"; emailId: string }
  | { type: "NAVIGATE"; view: View }
  | { type: "REPLY_TO_CURRENT" };

export interface AssistantResponse {
  actions: AssistantAction[];
  message?: string;
}

export interface EmailFilters {
  sender?: string;
  dateRange?: string;
  unread?: boolean;
}