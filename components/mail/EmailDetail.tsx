"use client";

import { useMailStore } from "@/store/mailStore";
import { ArrowLeft, Mail, Calendar, User } from "lucide-react";
import { useMemo } from "react";
import DOMPurify from "dompurify";

export default function EmailDetail() {
  const { currentEmail, setCurrentView, isLoading } = useMailStore();

  const handleBack = () => {
    setCurrentView("inbox");
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch (error) {
      return dateString;
    }
  };

  const extractEmailAddress = (fullEmail: string) => {
    const match = fullEmail.match(/<(.+)>/);
    if (match) {
      return match[1];
    }
    return fullEmail;
  };

  const extractName = (fullEmail: string) => {
    const match = fullEmail.match(/^(.+?)\s*</);
    if (match) {
      return match[1].replace(/"/g, "");
    }
    return extractEmailAddress(fullEmail);
  };

  // Detect if content is HTML
  const isHTML = (content: string) => {
    const htmlRegex = /<\/?[a-z][\s\S]*>/i;
    return htmlRegex.test(content);
  };

  // Linkify URLs in plain text
  const linkifyText = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  // Clean up excessive whitespace characters (zero-width spaces, nbsp, etc.)
  const cleanWhitespace = (text: string) => {
    return text
      .replace(/[\u200B-\u200D\uFEFF]/g, "") // Remove zero-width spaces
      .replace(/\u00A0/g, " ") // Replace nbsp with regular space
      .replace(/\s{3,}/g, "\n\n"); // Replace 3+ spaces with double newline
  };

  // Sanitize and prepare email body for rendering
  const sanitizedBody = useMemo(() => {
    if (!currentEmail) return "";

    let content = currentEmail.body || currentEmail.snippet || "No content";

    if (isHTML(content)) {
      // Only sanitize HTML content in the browser
      if (typeof window !== "undefined") {
        let sanitized = DOMPurify.sanitize(content, {
          ALLOWED_TAGS: [
            "a",
            "b",
            "i",
            "u",
            "strong",
            "em",
            "p",
            "br",
            "div",
            "span",
            "h1",
            "h2",
            "h3",
            "h4",
            "h5",
            "h6",
            "ul",
            "ol",
            "li",
            "blockquote",
            "table",
            "thead",
            "tbody",
            "tr",
            "td",
            "th",
            "img",
            "hr",
            "center",
          ],
          ALLOWED_ATTR: [
            "href",
            "title",
            "alt",
            "src",
            "width",
            "height",
            "style",
            "class",
            "id",
            "target",
            "border",
            "cellpadding",
            "cellspacing",
            "valign",
            "align",
            "bgcolor",
            "leftmargin",
            "marginheight",
            "marginwidth",
            "topmargin",
          ],
          ALLOWED_URI_REGEXP:
            /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
        });

        // Post-process to clean up visible URLs in links
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = sanitized;

        // Find all links and clean up redundant URL text
        const links = tempDiv.querySelectorAll("a[href]");
        links.forEach((link) => {
          const href = link.getAttribute("href");
          const textContent = link.textContent || "";

          // If link text is just the URL or contains the full URL, clean it up
          if (href && textContent.includes(href)) {
            // Extract descriptive text before the URL if exists
            const parts = textContent.split(href);
            const descriptiveText = parts[0].trim();

            if (descriptiveText && descriptiveText.length > 0) {
              // Keep only the descriptive part
              link.textContent = descriptiveText;
            } else {
              // If no descriptive text, show shortened URL
              try {
                const url = new URL(href);
                link.textContent = url.hostname;
              } catch {
                link.textContent = "Link";
              }
            }
          }
        });

        return tempDiv.innerHTML;
      }
      // Return unsanitized content during SSR (will be sanitized on client)
      return content;
    }

    // Clean up plain text content
    return cleanWhitespace(content);
  }, [currentEmail]);

  // Loading state
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 w-32 rounded bg-zinc-200 dark:bg-zinc-800"></div>
        <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4 h-8 w-2/3 rounded bg-zinc-200 dark:bg-zinc-800"></div>
          <div className="mb-6 space-y-2">
            <div className="h-4 w-1/2 rounded bg-zinc-200 dark:bg-zinc-800"></div>
            <div className="h-4 w-1/3 rounded bg-zinc-200 dark:bg-zinc-800"></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-full rounded bg-zinc-200 dark:bg-zinc-800"></div>
            <div className="h-4 w-full rounded bg-zinc-200 dark:bg-zinc-800"></div>
            <div className="h-4 w-3/4 rounded bg-zinc-200 dark:bg-zinc-800"></div>
          </div>
        </div>
      </div>
    );
  }

  // No email selected
  if (!currentEmail) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
        <Mail className="mb-4 h-12 w-12 text-zinc-400 dark:text-zinc-600" />
        <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          No email selected
        </h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Select an email from the inbox to view its contents.
        </p>
        <button
          onClick={handleBack}
          className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Back to Inbox
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Back Button */}
      <button
        onClick={handleBack}
        className="flex items-center gap-2 text-sm font-medium text-zinc-700 transition-colors hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Inbox
      </button>

      {/* Email Content */}
      <div className="rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {/* Email Header */}
        <div className="border-b border-zinc-200 p-6 dark:border-zinc-800">
          <h1 className="mb-4 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {currentEmail.subject || "(No Subject)"}
          </h1>

          <div className="space-y-3">
            {/* From */}
            <div className="flex items-start gap-3">
              <User className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {extractName(currentEmail.from)}
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {extractEmailAddress(currentEmail.from)}
                </p>
              </div>
            </div>

            {/* To */}
            {currentEmail.to && (
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    To: {currentEmail.to}
                  </p>
                </div>
              </div>
            )}

            {/* Date */}
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" />
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {formatDate(currentEmail.date)}
              </p>
            </div>
          </div>

          {/* Labels */}
          {currentEmail.labels && currentEmail.labels.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {currentEmail.labels
                .filter(
                  (label) =>
                    !["INBOX", "SENT", "UNREAD", "CATEGORY_PERSONAL"].includes(
                      label,
                    ),
                )
                .map((label) => (
                  <span
                    key={label}
                    className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    {label}
                  </span>
                ))}
            </div>
          )}
        </div>

        {/* Email Body */}
        <div className="p-6">
          {isHTML(currentEmail.body || currentEmail.snippet || "") ? (
            // Render HTML content
            <div
              className="email-html-content prose prose-zinc max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: sanitizedBody }}
              style={{
                wordWrap: "break-word",
                overflowWrap: "break-word",
              }}
            />
          ) : (
            // Render plain text content with linkified URLs
            <div className="prose prose-zinc max-w-none dark:prose-invert">
              <div className="whitespace-pre-wrap wrap-break-word text-sm leading-relaxed text-zinc-900 dark:text-zinc-100">
                {linkifyText(sanitizedBody)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
