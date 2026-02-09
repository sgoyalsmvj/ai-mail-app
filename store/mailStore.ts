import { create } from "zustand";
import { Email, ComposeForm, View, AssistantAction } from "../lib/types";
import { toast } from "sonner";

interface MailStoreState {
  // State
  emails: Email[];
  currentView: View;
  currentEmail: Email | null;
  composeForm: ComposeForm;
  isLoading: boolean;

  // Actions
  setEmails: (emails: Email[]) => void;
  setCurrentView: (view: View) => void;
  setCurrentEmail: (email: Email | null) => void;
  updateComposeForm: (field: keyof ComposeForm, value: string) => void;
  resetComposeForm: () => void;
  setIsLoading: (isLoading: boolean) => void;

  // AI Assistant Actions
  executeAction: (action: AssistantAction) => Promise<void>;
  executeActions: (actions: AssistantAction[]) => Promise<void>;
}

const initialComposeForm: ComposeForm = {
  to: "",
  subject: "",
  body: "",
};

export const useMailStore = create<MailStoreState>((set) => ({
  // Initial state
  emails: [],
  currentView: "inbox",
  currentEmail: null,
  composeForm: initialComposeForm,
  isLoading: false,

  // Actions
  setEmails: (emails) => set({ emails }),

  setCurrentView: (view) => set({ currentView: view }),

  setCurrentEmail: (email) => set({ currentEmail: email }),

  updateComposeForm: (field, value) =>
    set((state) => ({
      composeForm: {
        ...state.composeForm,
        [field]: value,
      },
    })),

  resetComposeForm: () => set({ composeForm: initialComposeForm }),

  setIsLoading: (isLoading) => set({ isLoading }),

  // AI Assistant Action Dispatcher
  executeAction: async (action) => {
    const state = useMailStore.getState();

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
        try {
          const { composeForm } = state;

          // Validate form before sending
          if (!composeForm.to || !composeForm.subject || !composeForm.body) {
            toast.error("Please fill in all email fields before sending");
            console.error(
              "Cannot send email: missing required fields",
              composeForm,
            );
            break;
          }

          console.log("Sending email with data:", {
            to: composeForm.to,
            subject: composeForm.subject,
            bodyLength: composeForm.body.length,
          });

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
        // Filter functionality (Day 3 feature)
        // For now, just log the filter criteria
        console.log("Filter emails:", {
          sender: action.sender,
          dateRange: action.dateRange,
          unread: action.unread,
        });
        // TODO: Implement filtering logic when filter state is added
        break;

      case "OPEN_EMAIL":
        // Find email by ID and open it
        const email = state.emails.find((e) => e.id === action.emailId);
        if (email) {
          toast.success("Opening email...");
          set({ currentEmail: email, currentView: "detail" });
        } else {
          toast.error("Email not found");
          console.error("Email not found:", action.emailId);
        }
        break;

      case "NAVIGATE":
        toast.info(`Navigating to ${action.view}...`);
        set({ currentView: action.view });
        break;

      case "REPLY_TO_CURRENT":
        // Pre-fill compose form with reply data
        if (state.currentEmail) {
          toast.success("Preparing reply...");
          const { from, subject, body } = state.currentEmail;
          
          // Extract email address from "Name <email@domain.com>" format
          const emailMatch = from.match(/<(.+?)>/) || from.match(/([^\s@]+@[^\s@]+\.[^\s@]+)/);
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

      default:
        console.warn("Unknown action type:", action);
    }
  },

  executeActions: async (actions) => {
    // Execute actions sequentially with a delay for visual effect
    for (let i = 0; i < actions.length; i++) {
      await useMailStore.getState().executeAction(actions[i]);
      // Add delay between actions (except for the last one)
      if (i < actions.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }
  },
}));
