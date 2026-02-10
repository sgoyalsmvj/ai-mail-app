import { create } from "zustand";
import {
  Email,
  ComposeForm,
  View,
  AssistantAction,
  EmailFilters,
} from "../lib/types";
import { toast } from "sonner";

interface MailStoreState {
  // State
  emails: Email[];
  sentEmails: Email[];
  filteredEmails: Email[];
  currentView: View;
  currentEmail: Email | null;
  composeForm: ComposeForm;
  isLoading: boolean;
  filters: Partial<EmailFilters>;
  searchQuery: string;
  requiresConfirmation: boolean;
  showConfirmationModal: boolean;

  // Actions
  setEmails: (emails: Email[]) => void;
  setSentEmails: (emails: Email[]) => void;
  setCurrentView: (view: View) => void;
  setCurrentEmail: (email: Email | null) => void;
  updateComposeForm: (field: keyof ComposeForm, value: string) => void;
  resetComposeForm: () => void;
  setIsLoading: (isLoading: boolean) => void;
  setSearchQuery: (query: string) => void;
  setRequiresConfirmation: (requires: boolean) => void;
  setShowConfirmationModal: (show: boolean) => void;
  confirmAndSendEmail: () => Promise<void>;
  fetchEmails: (accessToken: string) => Promise<void>;

  // Filter Actions
  setFilters: (filters: Partial<EmailFilters>) => void;
  applyFilters: () => void;
  clearFilters: () => void;

  // AI Assistant Actions
  executeAction: (
    action: AssistantAction,
    accessToken?: string,
  ) => Promise<void>;
  executeActions: (
    actions: AssistantAction[],
    accessToken?: string,
  ) => Promise<void>;
}

const initialComposeForm: ComposeForm = {
  to: "",
  subject: "",
  body: "",
};

export const useMailStore = create<MailStoreState>((set, get) => ({
  // Initial state
  emails: [],
  sentEmails: [],
  filteredEmails: [],
  currentView: "inbox",
  currentEmail: null,
  composeForm: initialComposeForm,
  isLoading: false,
  filters: {},
  searchQuery: "",
  requiresConfirmation: true,
  showConfirmationModal: false,

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
    get().applyFilters();
  },

  setSentEmails: (emails: Email[]) => set({ sentEmails: emails }),
  setEmails: (emails: Email[]) => {
    set({ emails, filteredEmails: emails });
    get().applyFilters(); // Apply any existing filters
  },

  setRequiresConfirmation: (required: boolean) =>
    set({ requiresConfirmation: required }),

  setShowConfirmationModal: (show: boolean) =>
    set({ showConfirmationModal: show }),

  confirmAndSendEmail: async () => {
    const { composeForm } = get();
    try {
      const response = await fetch("/api/mail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: composeForm.to,
          subject: composeForm.subject,
          body: composeForm.body,
        }),
      });
      if (response.ok) {
        toast.success("Email sent successfully! 📧");
        set({
          composeForm: initialComposeForm,
          currentView: "inbox",
          showConfirmationModal: false,
        });
      } else {
        const errorData = await response.json();
        toast.error(
          `Failed to send email: ${errorData.error || "Unknown error"}`,
        );
        console.error("Failed to send email:", errorData);
      }
    } catch (error) {
      console.error("Failed to send email:", error);
      toast.error("Failed to send email. Please try again.");
    }
  },

  setCurrentView: (view) => set({ currentView: view }),

  setCurrentEmail: (email) => set({ currentEmail: email }),

  // Filter Actions
  setFilters: (newFilters: Partial<EmailFilters>) => {
    set((state) => {
      const updatedFilters = { ...state.filters };

      // Handle each filter property - remove if null/undefined
      Object.keys(newFilters).forEach((key) => {
        const filterKey = key as keyof EmailFilters;
        const value = newFilters[filterKey];

        if (value === null || value === undefined) {
          // Remove the filter property
          delete updatedFilters[filterKey];
        } else {
          // Set the filter property
          updatedFilters[filterKey] = value as any;
        }
      });

      return { filters: updatedFilters };
    });
    // Auto-apply filters after setting them
    get().applyFilters();
  },

  /**
   * Apply current filters and search query to emails
   * Filters are applied sequentially: search → date → unread
   * Note: Sender and date filters are now handled server-side in fetchEmails
   */
  applyFilters: () => {
    const { emails, filters, searchQuery } = get();

    console.log("Applying filters:", {
      totalEmails: emails.length,
      filters,
      searchQuery,
    });

    let filtered = [...emails];

    // Client-side search query filtering
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (email) =>
          email.subject.toLowerCase().includes(query) ||
          email.from.toLowerCase().includes(query) ||
          email.snippet.toLowerCase().includes(query),
      );
    }

    // Note: Sender filtering is now handled server-side in the Gmail API query
    // Date filtering is also handled server-side for better performance

    // Filter by date range (preset ranges)
    if (filters.dateRange) {
      const now = new Date();
      let cutoffDate = new Date();

      switch (filters.dateRange) {
        case "today":
          cutoffDate.setHours(0, 0, 0, 0);
          break;
        case "last_week":
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case "last_month":
          cutoffDate.setDate(now.getDate() - 30);
          break;
      }

      filtered = filtered.filter((email) => {
        const emailDate = new Date(email.date);
        return emailDate >= cutoffDate;
      });
    }

    // Filter by custom date range (dateFrom/dateTo)
    if (filters.dateFrom || filters.dateTo) {
      filtered = filtered.filter((email) => {
        try {
          const emailDate = new Date(email.date);

          // Get just the date part (YYYY-MM-DD) for comparison
          const emailYear = emailDate.getFullYear();
          const emailMonth = emailDate.getMonth();
          const emailDay = emailDate.getDate();

          if (filters.dateFrom) {
            const [fromYear, fromMonth, fromDay] = filters.dateFrom
              .split("-")
              .map(Number);
            const fromDateObj = new Date(fromYear, fromMonth - 1, fromDay);
            const emailDateObj = new Date(emailYear, emailMonth, emailDay);

            if (emailDateObj < fromDateObj) return false;
          }

          if (filters.dateTo) {
            const [toYear, toMonth, toDay] = filters.dateTo
              .split("-")
              .map(Number);
            const toDateObj = new Date(toYear, toMonth - 1, toDay);
            const emailDateObj = new Date(emailYear, emailMonth, emailDay);

            if (emailDateObj > toDateObj) return false;
          }

          return true;
        } catch (error) {
          console.error("Error filtering email by date:", email.date, error);
          return true; // Include email if date parsing fails
        }
      });
    }

    // Filter by unread status
    if (filters.unread) {
      filtered = filtered.filter((email) => !email.isRead);
    }

    console.log("After filtering:", {
      resultCount: filtered.length,
      sampleDates: filtered
        .slice(0, 3)
        .map((e) => ({ id: e.id.substring(0, 8), date: e.date })),
    });

    set({ filteredEmails: filtered });
  },

  clearFilters: () => {
    const { emails } = get();
    set({
      filters: {},
      searchQuery: "",
      filteredEmails: emails,
    });
  },

  fetchEmails: async (accessToken: string) => {
    try {
      set({ isLoading: true });
      const { filters } = get();

      // Build query parameters for server-side filtering
      const params = new URLSearchParams();
      if (filters.sender) {
        params.append("sender", filters.sender);
      }
      if (filters.dateFrom) {
        params.append("dateFrom", filters.dateFrom);
      }
      if (filters.dateTo) {
        params.append("dateTo", filters.dateTo);
      }

      const url = `/api/mail/inbox${params.toString() ? `?${params.toString()}` : ""}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Failed to fetch emails");
      }

      const data = await response.json();
      get().setEmails(data.emails || []);
    } catch (error) {
      console.error("Error fetching emails:", error);
      toast.error("Failed to fetch emails");
    } finally {
      set({ isLoading: false });
    }
  },

  updateComposeForm: (field, value) =>
    set((state) => ({
      composeForm: {
        ...state.composeForm,
        [field]: value,
      },
    })),

  resetComposeForm: () => set({ composeForm: initialComposeForm }),

  setIsLoading: (isLoading) => set({ isLoading }),

  /**
   * AI Assistant Action Dispatcher
   * Executes actions returned by the OpenAI assistant
   * Includes validation, error handling, and user feedback via toasts
   */
  executeAction: async (action, accessToken) => {
    let state = useMailStore.getState();

    switch (action.type) {
      case "OPEN_COMPOSE":
        toast.info("Opening compose form...");
        set({ currentView: "compose" });
        break;

      case "FILL_COMPOSE":
        toast.success("Filling email form...");

        // Validate email address if provided
        if (action.to) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(action.to)) {
            toast.error(
              `Invalid email address: "${action.to}". Please provide a complete email (e.g., user@example.com)`,
            );
            console.error("Invalid email format:", action.to);
            break;
          }
        }

        set((state) => {
          const updates: Partial<ComposeForm> = {};

          if (action.to) updates.to = action.to;
          if (action.subject) updates.subject = action.subject;

          // Smart body handling: if there's already a body (e.g., from REPLY_TO_CURRENT)
          // and the new body doesn't contain the "---" separator, prepend new message
          if (action.body !== undefined) {
            const existingBody = state.composeForm.body;
            const hasQuotedText = existingBody.includes("\n\n---\n");
            const newBodyHasQuote = action.body.includes("\n\n---\n");

            if (hasQuotedText && !newBodyHasQuote && action.body.trim()) {
              // Prepend new message to existing quoted text
              updates.body = action.body.trim() + "\n" + existingBody;
            } else {
              // Replace body entirely
              updates.body = action.body;
            }
          }

          return {
            composeForm: {
              ...state.composeForm,
              ...updates,
            },
          };
        });
        break;

      case "SEND_EMAIL":
        // Trigger the send email flow

        const { composeForm, requiresConfirmation } = state;
        const skipConfirmation = action.skipConfirmation || false;
        // Validate form before sending
        if (!composeForm.to || !composeForm.subject || !composeForm.body) {
          toast.error("Please fill in all email fields before sending");
          console.error(
            "Cannot send email: missing required fields",
            composeForm,
          );
          break;
        }
        if (requiresConfirmation && !skipConfirmation) {
          toast.info("Please confirm before sending the email...");
          set({ showConfirmationModal: true });
          break;
        }
        try {
          const response = await fetch("/api/mail/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: composeForm.to,
              subject: composeForm.subject,
              body: composeForm.body,
            }),
          });

          if (response.ok) {
            toast.success("Email sent successfully! 📧");
            // Reset form and navigate to inbox
            set({ composeForm: initialComposeForm, currentView: "inbox" });
          } else {
            const errorData = await response.json();
            toast.error(
              `Failed to send email: ${errorData.error || "Unknown error"}`,
            );
            console.error("Failed to send email:", errorData);
          }
        } catch (error) {
          toast.error("Error sending email");
          console.error("Error sending email:", error);
        }
        break;

      case "FILTER_EMAILS":
        toast.info("Filtering emails...");
        get().setFilters({
          sender: action.sender,
          dateRange: action.dateRange,
          dateFrom: action.dateFrom,
          dateTo: action.dateTo,
          unread: action.unread,
        });

        // If accessToken provided, refetch emails from API with new filters
        if (accessToken) {
          await get().fetchEmails(accessToken);
        }
        break;

      case "OPEN_EMAIL":
        // Find email by ID or reference
        let emailToOpen: Email | undefined;

        // Handle special references
        if (action.emailId === "latest") {
          // Find most recent email
          const sorted = [...state.filteredEmails].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
          );
          emailToOpen = sorted[0];
          toast.success("Opening latest email...");
        } else if (action.emailId.startsWith("from:")) {
          // Find by sender
          const sender = action.emailId.substring(5).toLowerCase();
          emailToOpen = state.filteredEmails.find((e) =>
            e.from.toLowerCase().includes(sender),
          );
          toast.success(`Opening email from ${sender}...`);
        } else if (action.emailId.startsWith("index:")) {
          // Find by index (e.g., "index:2" for third email)
          const index = parseInt(action.emailId.substring(6));
          emailToOpen = state.filteredEmails[index];
          toast.success(`Opening email #${index + 1}...`);
        } else {
          // Find by actual ID
          emailToOpen = state.emails.find((e) => e.id === action.emailId);
          toast.success("Opening email...");
        }

        if (emailToOpen) {
          set({ currentEmail: emailToOpen, currentView: "detail" });
        } else {
          toast.error("Email not found");
          console.error("Email not found:", action.emailId);
        }
        break;

      case "NAVIGATE":
        toast.info(`Navigating to ${action.view}...`);
        set({ currentView: action.view });

        if (action.view !== "inbox") {
          get().clearFilters();
        }
        break;

      case "REPLY_TO_CURRENT":
        // Pre-fill compose form with reply data
        if (state.currentEmail) {
          toast.success("Preparing reply...");
          const { from, subject, body } = state.currentEmail;

          // Extract email address from "Name <email@domain.com>" format
          const emailMatch =
            from.match(/<(.+?)>/) || from.match(/([^\s@]+@[^\s@]+\.[^\s@]+)/);
          const toEmail = emailMatch ? emailMatch[1] : from;

          set({
            composeForm: {
              to: toEmail,
              subject: subject.startsWith("Re: ") ? subject : `Re: ${subject}`,
              body: `\n\n---\nOn ${state.currentEmail.date}, ${from} wrote:\n${body}`,
            },
            currentView: "compose",
          });
        } else {
          toast.error("No email to reply to");
          console.error("No email to reply to");
        }
        break;

      case "SEARCH_EMAILS":
        toast.info(`Searching for: "${action.query}"`);
        get().setSearchQuery(action.query);
        break;

      case "FORWARD_CURRENT":
        if (state.currentEmail) {
          toast.success("Preparing forward...");
          const { subject, body, from, date } = state.currentEmail;

          set({
            composeForm: {
              to: "",
              subject: subject.startsWith("Fwd: ")
                ? subject
                : `Fwd: ${subject}`,
              body: `\n\n---\nForwarded message from ${from} on ${date}:\nSubject: ${subject}\n\n${body}`,
            },
            currentView: "compose",
          });
        } else {
          toast.error("No email to forward");
          console.error("No email to forward");
        }
        break;

      default:
        console.warn("Unknown action type:", action);
    }
  },

  executeActions: async (actions, accessToken) => {
    // Execute actions sequentially with a delay for visual effect
    for (let i = 0; i < actions.length; i++) {
      await useMailStore.getState().executeAction(actions[i], accessToken);
      // Add delay between actions (except for the last one)
      if (i < actions.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }
  },
}));
