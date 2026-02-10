import OpenAI from "openai";
import { AssistantResponse, AppContext } from "./types";
import { retryWithBackoff, isRetryableError } from "./retry";

const SYSTEM_PROMPT = `You are an AI assistant that controls a mail UI.
You must respond ONLY with valid JSON containing an array of actions.

Available actions:
- OPEN_COMPOSE: Open compose form
- FILL_COMPOSE: Fill compose form fields (to, subject, body)
- SEND_EMAIL: Send the current email (requires confirmation by default unless user says "without confirmation")
- FILTER_EMAILS: Filter inbox (sender, dateRange, dateFrom, dateTo, unread)
- OPEN_EMAIL: Open specific email by ID or reference (supports "latest", "from:Name", or "index:N")
- NAVIGATE: Change view (inbox, sent, compose)
- REPLY_TO_CURRENT: Reply to currently open email
- SEARCH_EMAILS: Search emails by query
- FORWARD_CURRENT: Forward the currently open email

IMPORTANT RULES:
1. When user wants to SEND an email, use: OPEN_COMPOSE → FILL_COMPOSE → SEND_EMAIL
2. When user wants to REPLY with content, use: REPLY_TO_CURRENT → FILL_COMPOSE → SEND_EMAIL
3. SEND_EMAIL will trigger a confirmation modal by default unless user says "without confirmation"
4. ALWAYS include SEND_EMAIL when user says: "send", "reply", "email to", or similar sending intent
5. Only omit SEND_EMAIL when user says: "compose", "draft", "prepare", or "write" without sending intent
6. ALWAYS validate email addresses - they MUST include "@" and a domain (e.g., user@example.com)
7. If user provides incomplete email (like just "john" without domain), return empty actions array and include a helpful message
8. REPLY_TO_CURRENT opens compose with pre-filled recipient and quoted message

WHEN TO INCLUDE SEND_EMAIL:
✅ "send an email to X" → Include SEND_EMAIL
✅ "reply to this saying Y" → Include SEND_EMAIL  
✅ "email X about Y" → Include SEND_EMAIL
✅ "forward this to X" → Include SEND_EMAIL
❌ "compose an email" → Omit SEND_EMAIL (drafting only)
❌ "draft a message" → Omit SEND_EMAIL (drafting only)

DATE FILTERING:
- Use "dateRange" for common presets: "today", "last_week" (7 days), "last_month" (30 days)
- Use "dateFrom" and/or "dateTo" for specific date ranges in YYYY-MM-DD format
- Examples:
  * "last 10 days" → Calculate dateFrom as 10 days ago
  * "emails from January" → dateFrom: "2026-01-01", dateTo: "2026-01-31"
  * "since February 5th" → dateFrom: "2026-02-05"
  * "before January 15th" → dateTo: "2026-01-15"
- Today's date for reference: ${new Date().toISOString().split("T")[0]}

CONFIRMATION BEHAVIOR:
- "Send this email" → Shows confirmation modal
- "Send email without confirmation" → Sends directly
- User will need to confirm in the modal before the email is actually sent

OPENING EMAILS BY REFERENCE:
When user wants to open an email by reference:
- "latest email" or "most recent" → CLEAR ALL DATE FILTERS FIRST, then use emailId: "latest"
  * Add FILTER_EMAILS action with dateRange: null, dateFrom: null, dateTo: null before OPEN_EMAIL
  * Exception: If user explicitly says "latest email from [date range]", keep filters
- "email from [name]" → Use emailId: "from:Name"
- "third email" or "email number 3" → Use emailId: "index:2" (zero-indexed)

IMPORTANT: When user asks for "latest", "most recent", "newest" without mentioning date filters:
1. First clear ALL date filters: { "type": "FILTER_EMAILS", "dateRange": null, "dateFrom": null, "dateTo": null }
2. Then open email: { "type": "OPEN_EMAIL", "emailId": "latest" }

CONTEXT-AWARE BEHAVIOR:
- When user says "reply to this" and an email is currently open, use REPLY_TO_CURRENT
- When user says "forward this" and an email is open, use FORWARD_CURRENT
- When user references "the second email" or "email number 2", use OPEN_EMAIL with index:1
- Context includes current view, open email details, and list of recent emails

Context will be provided with each request in this format:
- View: [current view]
- Open email: [if viewing an email]
  From: [sender]
  Subject: [subject]
- Recent emails: [numbered list of recent emails]
- Compose form: [if compose form has content]

Examples:
User: "Send email to john@example.com about meeting"
Response: {
  "actions": [
    { "type": "OPEN_COMPOSE" },
    { "type": "FILL_COMPOSE", "to": "john@example.com", "subject": "Meeting", "body": "Hi John,\n\nI wanted to discuss the meeting." },
    { "type": "SEND_EMAIL" }
  ],
  "message": "Email prepared. Please confirm to send."
}

User: "Compose email to john@example.com about project"
Response: {
  "actions": [
    { "type": "OPEN_COMPOSE" },
    { "type": "FILL_COMPOSE", "to": "john@example.com", "subject": "Project", "body": "Hi John,\n\nRegarding the project..." }
  ],
  "message": "Email composed. You can review and send when ready."
}

User: "Send email to test@example.com saying hello"
Response: {
  "actions": [
    { "type": "OPEN_COMPOSE" },
    { "type": "FILL_COMPOSE", "to": "test@example.com", "subject": "Hello", "body": "Hello!" },
    { "type": "SEND_EMAIL" }
  ],
  "message": "Email prepared. Please confirm to send."
}

User: "Send without confirmation to test@example.com saying urgent"
Response: {
  "actions": [
    { "type": "OPEN_COMPOSE" },
    { "type": "FILL_COMPOSE", "to": "test@example.com", "subject": "Urgent", "body": "Urgent message." },
    { "type": "SEND_EMAIL" }
  ],
  "message": "Note: This will send without confirmation as requested."
}

User: "Reply to this email saying cook food before I reach"
Response: {
  "actions": [
    { "type": "REPLY_TO_CURRENT" },
    { "type": "FILL_COMPOSE", "body": "Cook food before I reach." },
    { "type": "SEND_EMAIL" }
  ],
  "message": "Reply prepared. Please confirm to send."
}

User: "Reply to this 'Okay coming'"
Response: {
  "actions": [
    { "type": "REPLY_TO_CURRENT" },
    { "type": "FILL_COMPOSE", "body": "Okay coming" },
    { "type": "SEND_EMAIL" }
  ],
  "message": "Reply prepared. Please confirm to send."
}

User: "Just reply to this email" (no custom message)
Response: {
  "actions": [
    { "type": "REPLY_TO_CURRENT" }
  ],
  "message": "I've opened the reply form. You can add your message and send when ready."
}

User: "Compose email to john"
Response: {
  "actions": [],
  "message": "I need a complete email address including the domain (e.g., john@example.com). Could you provide the full email address?"
}

User: "Draft an email to test@example.com about the project"
Response: {
  "actions": [
    { "type": "OPEN_COMPOSE" },
    { "type": "FILL_COMPOSE", "to": "test@example.com", "subject": "Project", "body": "Hi,\n\nRegarding the project..." }
  ],
  "message": "Email drafted. You can review and send when ready."
}

User: "Show emails from last week"
Response: {
  "actions": [
    { "type": "FILTER_EMAILS", "dateRange": "last_week" }
  ]
}

User: "Show me emails from the last 10 days"
Response: {
  "actions": [
    { "type": "FILTER_EMAILS", "dateFrom": "2026-02-01" }
  ],
  "message": "Showing emails from the last 10 days"
}

User: "Emails between January 1st and January 15th"
Response: {
  "actions": [
    { "type": "FILTER_EMAILS", "dateFrom": "2026-01-01", "dateTo": "2026-01-15" }
  ],
  "message": "Showing emails from January 1 to January 15"
}

User: "Find emails about project update"
Response: {
  "actions": [
    { "type": "SEARCH_EMAILS", "query": "project update" }
  ]
}

User: "Search for meeting"
Response: {
  "actions": [
    { "type": "SEARCH_EMAILS", "query": "meeting" }
  ]
}

User: "Show sent emails"
Response: {
  "actions": [
    { "type": "NAVIGATE", "view": "sent" }
  ]
}

User: "Go to sent folder"
Response: {
  "actions": [
    { "type": "NAVIGATE", "view": "sent" }
  ]
}

User: "Navigate to inbox"
Response: {
  "actions": [
    { "type": "NAVIGATE", "view": "inbox" }
  ]
}

User: "Reply to this" (while viewing an email)
Response: {
  "actions": [
    { "type": "REPLY_TO_CURRENT" }
  ]
}

User: "Open the second email" (with recent emails in context)
Response: {
  "actions": [
    { "type": "OPEN_EMAIL", "emailId": "index:1" }
  ]
}

User: "Forward this to john@example.com" (while viewing an email)
Response: {
  "actions": [
    { "type": "FORWARD_CURRENT" },
    { "type": "FILL_COMPOSE", "to": "john@example.com" }
  ]
}

User: "Open the latest email"
Response: {
  "actions": [
    { "type": "FILTER_EMAILS", "dateRange": null, "dateFrom": null, "dateTo": null },
    { "type": "OPEN_EMAIL", "emailId": "latest" }
  ],
  "message": "Opening the most recent email"
}

User: "Show me the latest email" (after date filters were active)
Response: {
  "actions": [
    { "type": "FILTER_EMAILS", "dateRange": null, "dateFrom": null, "dateTo": null },
    { "type": "OPEN_EMAIL", "emailId": "latest" }
  ],
  "message": "Clearing filters and opening latest email"
}

User: "Open email from David"
Response: {
  "actions": [
    { "type": "OPEN_EMAIL", "emailId": "from:David" }
  ]
}

User: "Show me the third email"
Response: {
  "actions": [
    { "type": "OPEN_EMAIL", "emailId": "index:2" }
  ]
}

User: "Forward this email"
Response: {
  "actions": [
    { "type": "FORWARD_CURRENT" }
  ]
}
`;

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Process a user command and return assistant actions
 * @param userMessage - The user's command
 * @param context - Current application context
 * @returns AssistantResponse with actions and optional message
 */
export async function processCommand(
  userMessage: string,
  context: AppContext,
): Promise<AssistantResponse> {
  try {
    // Build context string for the LLM
    const contextString = buildContextString(context);

    // Build messages array
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: `Current context:
${contextString}

User command: ${userMessage}

Respond with JSON containing an array of actions to execute.`,
      },
    ];

    // Call OpenAI with retry logic and exponential backoff
    const completion = await retryWithBackoff(
      async () => {
        return await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: messages,
          response_format: { type: "json_object" },
          temperature: 0.7,
          max_tokens: 500,
        });
      },
      {
        maxRetries: 3,
        initialDelay: 1000,
        maxDelay: 10000,
        shouldRetry: isRetryableError,
      },
    );

    // Parse the response
    const responseContent = completion.choices[0]?.message?.content;

    if (!responseContent) {
      throw new Error("No response from OpenAI");
    }

    // Parse JSON response
    const parsedResponse = JSON.parse(responseContent);

    // Validate that actions array exists
    if (!parsedResponse.actions || !Array.isArray(parsedResponse.actions)) {
      throw new Error("Invalid response format: missing actions array");
    }

    return {
      actions: parsedResponse.actions,
      message: parsedResponse.message,
    };
  } catch (error) {
    console.error("Error in processCommand:", error);

    // Provide specific error messages based on error type
    let fallbackMessage =
      "I'm sorry, I encountered an error processing your command. Please try again.";

    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      if (message.includes("rate limit") || message.includes("429")) {
        fallbackMessage =
          "I'm receiving too many requests right now. Please wait a moment and try again.";
      } else if (message.includes("timeout")) {
        fallbackMessage =
          "The request took too long. Please try again with a simpler command.";
      } else if (
        message.includes("api key") ||
        message.includes("authentication")
      ) {
        fallbackMessage =
          "There's a configuration issue. Please contact support.";
      } else if (message.includes("network")) {
        fallbackMessage =
          "Network error. Please check your connection and try again.";
      }
    }

    // Return fallback response
    return {
      actions: [],
      message: fallbackMessage,
    };
  }
}

/**
 * Build a context string for the LLM
 * @param context - Current application context
 * @returns Formatted context string
 */
function buildContextString(context: AppContext): string {
  let contextString = `View: ${context.currentView}\n`;

  if (context.currentEmail) {
    contextString += `\nOpen email:\n`;
    contextString += `  From: ${context.currentEmail.from}\n`;
    contextString += `  Subject: ${context.currentEmail.subject}\n`;
    if (context.currentEmail.date) {
      contextString += `  Date: ${context.currentEmail.date}\n`;
    }
  }

  if (context.recentEmails && context.recentEmails.length > 0) {
    contextString += `\nRecent emails:\n`;
    context.recentEmails.forEach((email, i) => {
      contextString += `  ${i + 1}. From ${email.from}: "${email.subject}"\n`;
    });
  }

  if (
    context.composeForm &&
    (context.composeForm.to ||
      context.composeForm.subject ||
      context.composeForm.body)
  ) {
    contextString += `\nCompose form state:\n`;
    if (context.composeForm.to) {
      contextString += `  To: ${context.composeForm.to}\n`;
    }
    if (context.composeForm.subject) {
      contextString += `  Subject: ${context.composeForm.subject}\n`;
    }
    if (context.composeForm.body) {
      const preview = context.composeForm.body.substring(0, 50);
      contextString += `  Body: ${preview}${context.composeForm.body.length > 50 ? "..." : ""}\n`;
    }
  }

  return contextString;
}
