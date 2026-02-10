"use client";

import { useEffect, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { useMailStore } from "@/store/mailStore";
import EmailList from "@/components/mail/EmailList";
import EmailDetail from "@/components/mail/EmailDetail";
import ComposeForm from "@/components/mail/ComposeForm";
import AssistantPanel from "@/components/assistant/AssistantPanel";
import { Inbox, RefreshCw, LogOut, PenSquare } from "lucide-react";
import FilterBar from "@/components/mail/FilterBar";
import SearchBar from "@/components/mail/SearchBar";

export default function Home() {
  const { data: session, status } = useSession();
  const {
    emails,
    setEmails,
    setIsLoading,
    isLoading,
    currentView,
    setCurrentView,
    sentEmails,
    setSentEmails,
  } = useMailStore();
  const [error, setError] = useState<string | null>(null);

  const fetchEmails = async () => {
    if (!session) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/mail/inbox");

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Session expired. Please sign in again.");
        }
        throw new Error("Failed to fetch emails");
      }

      const data = await response.json();
      setEmails(data.emails || []);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch emails";
      setError(errorMessage);
      console.error("Error fetching emails:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSentEmails = async () => {
    if (!session) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/mail/sent");

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Session expired. Please sign in again.");
        }
        throw new Error("Failed to fetch sent emails");
      }

      const data = await response.json();
      setSentEmails(data.emails || []);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch sent emails";
      setError(errorMessage);
      console.error("Error fetching sent emails:", err);
    } finally {
      setIsLoading(false);
    }
  };
  // Fetch emails on mount when user is authenticated
  useEffect(() => {
    if (session && status === "authenticated") {
      fetchEmails();
      fetchSentEmails();
    }
  }, [session, status]);

  // Loading state for authentication
  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <p className="text-zinc-600 dark:text-zinc-400">Loading...</p>
      </div>
    );
  }

  // Not authenticated - show sign in
  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <main className="flex flex-col items-center gap-8 p-8">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            AI Mail App
          </h1>

          <div className="flex flex-col items-center gap-4">
            <p className="text-zinc-600 dark:text-zinc-400">
              Sign in to access your Gmail
            </p>
            <button
              onClick={() => signIn("google")}
              className="flex items-center gap-2 rounded-full bg-white px-6 py-3 text-zinc-900 shadow-md transition-colors hover:bg-zinc-100"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign in with Google
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Authenticated - show inbox
  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-900">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-black">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Inbox className="h-6 w-6 text-zinc-900 dark:text-zinc-100" />
                <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                  AI Mail App
                </h1>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentView("inbox")}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      currentView === "inbox"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                        : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <Inbox className="h-4 w-4" />
                    <span>Inbox</span>
                    {emails.length > 0 && (
                      <span className="ml-1 rounded-full bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 text-xs">
                        {emails.length}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setCurrentView("sent");
                      fetchSentEmails();
                    }}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      currentView === "sent"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                        : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
                    </svg>
                    <span>Sent</span>
                    {sentEmails.length > 0 && (
                      <span className="ml-1 rounded-full bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 text-xs">
                        {sentEmails.length}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setCurrentView("compose")}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                  >
                    <PenSquare className="h-4 w-4" />
                    <span>Compose</span>
                  </button>
                </div>

                <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-700"></div>
                <button
                  onClick={fetchEmails}
                  disabled={isLoading}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  title="Refresh emails"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                  />
                  <span className="hidden sm:inline">Refresh</span>
                </button>

                <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-700"></div>

                <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                  <span className="hidden sm:inline">
                    {session.user?.email}
                  </span>
                </div>

                <button
                  onClick={() => signOut()}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            {/* Error Message */}
            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
                <p className="text-sm text-red-800 dark:text-red-200">
                  {error}
                </p>
                {error.includes("Session expired") && (
                  <button
                    onClick={() => signIn("google")}
                    className="mt-2 text-sm font-medium text-red-600 underline dark:text-red-400"
                  >
                    Sign in again
                  </button>
                )}
              </div>
            )}

            {currentView === "inbox" && (
              <div className="space-y-4">
                <SearchBar />
                <FilterBar />
                <EmailList />
              </div>
            )}

            {currentView === "sent" && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                  Sent Emails
                </h2>
                <EmailList emails={sentEmails} />
              </div>
            )}

            {currentView === "detail" && <EmailDetail />}
            {currentView === "compose" && <ComposeForm />}
          </div>
        </main>
      </div>

      {/* Assistant Panel Sidebar */}
      <aside className="hidden lg:block w-96 border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="h-screen sticky top-0">
          <AssistantPanel />
        </div>
      </aside>
    </div>
  );
}
