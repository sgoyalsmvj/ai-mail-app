"use client";

import { useMailStore } from "@/store/mailStore";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";

export default function ComposeForm() {
  const { composeForm, updateComposeForm, resetComposeForm, setCurrentView } =
    useMailStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Refs for animation
  const toRef = useRef<HTMLInputElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // Previous values to detect AI fills
  const prevTo = useRef(composeForm.to);
  const prevSubject = useRef(composeForm.subject);
  const prevBody = useRef(composeForm.body);

  // Detect AI fills and animate
  useEffect(() => {
    if (composeForm.to !== prevTo.current && composeForm.to) {
      toRef.current?.classList.add("ai-field-highlight");
      setTimeout(
        () => toRef.current?.classList.remove("ai-field-highlight"),
        1000,
      );
      prevTo.current = composeForm.to;
    }
  }, [composeForm.to]);

  useEffect(() => {
    if (composeForm.subject !== prevSubject.current && composeForm.subject) {
      subjectRef.current?.classList.add("ai-field-highlight");
      setTimeout(
        () => subjectRef.current?.classList.remove("ai-field-highlight"),
        1000,
      );
      prevSubject.current = composeForm.subject;
    }
  }, [composeForm.subject]);

  useEffect(() => {
    if (composeForm.body !== prevBody.current && composeForm.body) {
      bodyRef.current?.classList.add("ai-field-highlight");
      setTimeout(
        () => bodyRef.current?.classList.remove("ai-field-highlight"),
        1000,
      );
      prevBody.current = composeForm.body;
    }
  }, [composeForm.body]);

  const handleCancel = () => {
    resetComposeForm();
    setCurrentView("inbox");
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSend = async () => {
    // Validate fields
    setError(null);
    setSuccess(false);

    if (!composeForm.to.trim()) {
      setError("Recipient email is required");
      return;
    }

    if (!validateEmail(composeForm.to.trim())) {
      setError("Please enter a valid email address");
      return;
    }

    if (!composeForm.subject.trim()) {
      setError("Subject is required");
      return;
    }

    if (!composeForm.body.trim()) {
      setError("Email body cannot be empty");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/mail/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: composeForm.to.trim(),
          subject: composeForm.subject.trim(),
          body: composeForm.body.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to send email");
      }

      // Success
      setSuccess(true);
      setTimeout(() => {
        resetComposeForm();
        setCurrentView("inbox");
      }, 2000);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to send email";
      setError(errorMessage);
      console.error("Error sending email:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleCancel}
          disabled={isLoading}
          className="flex items-center gap-2 text-sm font-medium text-zinc-700 transition-colors hover:text-zinc-900 disabled:opacity-50 dark:text-zinc-300 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Cancel
        </button>

        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          Compose Email
        </h2>

        <button
          onClick={handleSend}
          disabled={isLoading || success}
          className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : success ? (
            "Sent!"
          ) : (
            <>
              <Send className="h-4 w-4" />
              Send
            </>
          )}
        </button>
      </div>

      {/* Success Message */}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
          <p className="text-sm font-medium text-green-800 dark:text-green-200">
            Email sent successfully! Returning to inbox...
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Form */}
      <div className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {/* To Field */}
        <div>
          <label
            htmlFor="to"
            className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            To
          </label>
          <input
            ref={toRef}
            id="to"
            type="email"
            value={composeForm.to}
            onChange={(e) => updateComposeForm("to", e.target.value)}
            placeholder="recipient@example.com"
            disabled={isLoading || success}
            className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-100 dark:focus:ring-zinc-100"
          />
        </div>

        {/* Subject Field */}
        <div>
          <label
            htmlFor="subject"
            className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Subject
          </label>
          <input
            ref={subjectRef}
            id="subject"
            type="text"
            value={composeForm.subject}
            onChange={(e) => updateComposeForm("subject", e.target.value)}
            placeholder="Email subject"
            disabled={isLoading || success}
            className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-100 dark:focus:ring-zinc-100"
          />
        </div>

        {/* Body Field */}
        <div>
          <label
            htmlFor="body"
            className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Message
          </label>
          <textarea
            ref={bodyRef}
            id="body"
            value={composeForm.body}
            onChange={(e) => updateComposeForm("body", e.target.value)}
            placeholder="Write your message here..."
            disabled={isLoading || success}
            rows={12}
            className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-100 dark:focus:ring-zinc-100"
          />
        </div>
      </div>
    </div>
  );
}
