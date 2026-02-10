import OpenAI from "openai";
import { AssistantResponse, AppContext } from "./types";
import { retryWithBackoff, isRetryableError } from "./retry";

const SYSTEM_PROMPT = `You are an AI assistant that controls a mail UI.
You must respond ONLY with valid JSON containing an array of actions.

Available actions:
- OPEN_COMPOSE: Open compose form
- FILL_COMPOSE: Fill compose form fields (to, subject, body)
- SEND_EMAIL: Send the current email (requires confirmation by default unless user says "without confirmation")
- FILTER_EMAILS: Filter inbox (sender, dateRange, unread)
- OPEN_EMAIL: Open specific email by ID or reference (supports "latest", "from:Name", or "index:N")
- NAVIGATE: Change view (inbox, sent, compose)
- REPLY_TO_CURRENT: Reply to currently open email
- SEARCH_EMAILS: Search emails by query
- FORWARD_CURRENT: Forward the currently open email

IMPORTANT RULES:
1. When user wants to send an email with specific content, use: OPEN_COMPOSE → FILL_COMPOSE
2. SEND_EMAIL will trigger a confirmation modal by default
3. If user explicitly says "send without confirmation" or "send directly", the email will be sent immediately
4. For drafting emails, DO NOT include SEND_EMAIL unless explicitly requested
5. ALWAYS validate email addresses - they MUST include "@" and a domain (e.g., user@example.com)
6. If user provides incomplete email (like just "john" without domain), return empty actions array and include a helpful message
7. REPLY_TO_CURRENT opens compose with pre-filled recipient and quoted message

CONFIRMATION BEHAVIOR:
- "Send this email" → Shows confirmation modal
- "Send email without confirmation" → Sends directly
- User will need to confirm in the modal before the email is actually sent

OPENING EMAILS BY REFERENCE:
When user wants to open an email by reference:
- "latest email" or "most recent" → Use emailId: "latest"
- "email from [name]" → Use emailId: "from:Name"
- "third email" or "email number 3" → Use emailId: "index:2" (zero-indexed)

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
    { "type": "FILL_COMPOSE", "to": "john@example.com", "subject": "Meeting", "body": "Hi John,\n\nI wanted to discuss the meeting." }
  ]
}

User: "Send email to test@example.com saying hello and send it"
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

User: "Reply to this email and say cook food before I reach"
Response: {
  "actions": [
    { "type": "REPLY_TO_CURRENT" },
    { "type": "FILL_COMPOSE", "body": "Cook food before I reach." },
    { "type": "SEND_EMAIL" }
  ]
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

User: "Compose and immediately send email to test@example.com saying hello"
Response: {
  "actions": [
    { "type": "OPEN_COMPOSE" },
    { "type": "FILL_COMPOSE", "to": "test@example.com", "subject": "Hello", "body": "Hello!" },
    { "type": "SEND_EMAIL" }
  ]
}

User: "Show emails from last week"
Response: {
  "actions": [
    { "type": "FILTER_EMAILS", "dateRange": "last_week" }
  ]
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
    { "type": "OPEN_EMAIL", "emailId": "latest" }
  ]
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
