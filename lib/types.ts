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
  currentEmail?: {
    id: string;
    from: string;
    subject: string;
    date?: string;
  };
  recentEmails?: Array<{
    id: string;
    index: number;
    from: string;
    subject: string;
    date: string;
  }>;
}

export type AssistantAction =
  | { type: "OPEN_COMPOSE" }
  | { type: "FILL_COMPOSE"; to?: string; subject?: string; body?: string }
  | { type: "SEND_EMAIL" }
  | {
      type: "FILTER_EMAILS";
      sender?: string;
      dateRange?: string;
      unread?: boolean;
    }
  | { type: "OPEN_EMAIL"; emailId: string }
  | { type: "NAVIGATE"; view: View }
  | { type: "REPLY_TO_CURRENT" }
  | { type: "SEARCH_EMAILS"; query: string };

export interface AssistantResponse {
  actions: AssistantAction[];
  message?: string;
}

export interface EmailFilters {
  sender?: string;
  dateRange?: string;
  unread?: boolean;
}
