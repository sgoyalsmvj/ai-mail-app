"use client";

import { useMailStore } from "@/store/mailStore";
import { Mail, MailOpen } from "lucide-react";
import { Email } from "@/lib/types";

interface EmailListProps {
  onEmailClick?: (emailId: string) => void;
  emails?: Email[];
}

export default function EmailList({
  onEmailClick,
  emails: emailsProp,
}: EmailListProps) {
  const { filteredEmails, isLoading, setCurrentEmail, setCurrentView } =
    useMailStore();

  // Use provided emails or fall back to filteredEmails from store
  const emails = emailsProp || filteredEmails;

  const handleEmailClick = (emailId: string) => {
    const email = emails.find((e) => e.id === emailId);
    if (email) {
      setCurrentEmail(email);
      setCurrentView("detail");
      onEmailClick?.(emailId);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

      if (diffInHours < 24) {
        return date.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        });
      } else if (diffInHours < 168) {
        // Less than a week
        return date.toLocaleDateString("en-US", { weekday: "short" });
      } else {
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
      }
    } catch (error) {
      return dateString;
    }
  };

  const extractEmailAddress = (fullEmail: string) => {
    // Extract email from "Name <email@example.com>" format
    const match = fullEmail.match(/<(.+)>/);
    if (match) {
      return match[1];
    }
    return fullEmail;
  };

  const extractName = (fullEmail: string) => {
    // Extract name from "Name <email@example.com>" format
    const match = fullEmail.match(/^(.+?)\s*</);
    if (match) {
      return match[1].replace(/"/g, "");
    }
    // If no name, return email address
    return extractEmailAddress(fullEmail);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="mb-2 h-4 w-1/3 rounded bg-zinc-200 dark:bg-zinc-800"></div>
            <div className="mb-2 h-4 w-2/3 rounded bg-zinc-200 dark:bg-zinc-800"></div>
            <div className="h-3 w-full rounded bg-zinc-200 dark:bg-zinc-800"></div>
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
        <Mail className="mb-4 h-12 w-12 text-zinc-400 dark:text-zinc-600" />
        <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          No emails found
        </h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Your inbox is empty or no emails match your current filter.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {emails.map((email) => (
        <div
          key={email.id}
          onClick={() => handleEmailClick(email.id)}
          className={`group cursor-pointer rounded-lg border bg-white p-4 transition-all hover:shadow-md dark:bg-zinc-900 ${
            email.isRead
              ? "border-zinc-200 dark:border-zinc-800"
              : "border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800"
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              {/* Unread indicator icon */}
              <div className="mt-1 shrink-0">
                {email.isRead ? (
                  <MailOpen className="h-4 w-4 text-zinc-400 dark:text-zinc-600" />
                ) : (
                  <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                {/* From */}
                <div className="mb-1 flex items-center gap-2">
                  <span
                    className={`truncate text-sm ${
                      email.isRead
                        ? "font-normal text-zinc-700 dark:text-zinc-300"
                        : "font-semibold text-zinc-900 dark:text-zinc-100"
                    }`}
                  >
                    {extractName(email.from)}
                  </span>
                  {!email.isRead && (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-blue-600 dark:bg-blue-400"></span>
                  )}
                </div>

                {/* Subject */}
                <h3
                  className={`mb-1 truncate text-base ${
                    email.isRead
                      ? "font-normal text-zinc-800 dark:text-zinc-200"
                      : "font-semibold text-zinc-900 dark:text-zinc-100"
                  }`}
                >
                  {email.subject || "(No Subject)"}
                </h3>

                {/* Snippet */}
                <p className="line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {email.snippet}
                </p>
              </div>
            </div>

            {/* Date */}
            <div className="shrink-0 text-xs text-zinc-500 dark:text-zinc-500">
              {formatDate(email.date)}
            </div>
          </div>

          {/* Labels (optional) */}
          {email.labels && email.labels.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {email.labels
                .filter(
                  (label) =>
                    !["INBOX", "SENT", "UNREAD", "CATEGORY_PERSONAL"].includes(
                      label,
                    ),
                )
                .slice(0, 3)
                .map((label) => (
                  <span
                    key={label}
                    className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                  >
                    {label}
                  </span>
                ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
