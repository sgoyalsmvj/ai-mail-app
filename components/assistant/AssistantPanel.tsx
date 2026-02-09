"use client";

import { useState, useRef, useEffect } from "react";
import { useMailStore } from "@/store/mailStore";
import { Send, Bot, User, Loader2 } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AssistantPanel() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hello! I'm your AI assistant. I can help you manage your emails. Try saying things like 'compose an email' or 'show me my latest emails'.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { currentView, currentEmail, emails, executeActions } = useMailStore();

  // Auto scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const buildContext = () => {
    return {
      currentView,
      currentEmailId: currentEmail?.id,
      currentEmail: currentEmail
        ? {
            id: currentEmail.id,
            from: currentEmail.from,
            subject: currentEmail.subject,
            body: currentEmail.body,
          }
        : undefined,
    };
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");

    // Add user message to chat
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      // Get current context from mail store
      const context = buildContext();

      // Call assistant API
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          context,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get assistant response");
      }

      const data = await response.json();

      // Execute returned actions
      if (data.actions && data.actions.length > 0) {
        try {
          await executeActions(data.actions);

          // Add success response to chat
          const assistantMessage =
            data.message ||
            `I've executed ${data.actions.length} action${data.actions.length > 1 ? "s" : ""} for you.`;

          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: assistantMessage },
          ]);
        } catch (actionError) {
          // Handle action execution errors
          console.error("Error executing actions:", actionError);
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content:
                "I tried to execute the actions, but encountered an error. Please check that all required information (like complete email addresses) is provided.",
            },
          ]);
        }
      } else {
        // No actions to execute
        const assistantMessage = data.message || "Done!";
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: assistantMessage },
        ]);
      }
    } catch (error) {
      console.error("Error calling assistant:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-zinc-900 dark:text-zinc-100" />
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">
            AI Assistant
          </h2>
        </div>
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
          Ask me to help with your emails
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex gap-3 ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {message.role === "assistant" && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                <Bot className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
              </div>
            )}

            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === "user"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>

            {message.role === "user" && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 dark:bg-zinc-100">
                <User className="h-4 w-4 text-white dark:text-zinc-900" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
              <Bot className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
            </div>
            <div className="max-w-[80%] rounded-lg px-4 py-2 bg-zinc-100 dark:bg-zinc-800">
              <Loader2 className="h-4 w-4 animate-spin text-zinc-600 dark:text-zinc-400" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a command..."
            disabled={isLoading}
            className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-400 dark:focus:border-zinc-100 dark:focus:ring-zinc-100"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2 text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
