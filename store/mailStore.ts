import { create } from "zustand";
import { Email, ComposeForm, View } from "../lib/types";

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
}));
