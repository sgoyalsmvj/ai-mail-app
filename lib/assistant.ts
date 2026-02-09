import OpenAI from "openai";
import { AssistantResponse, AppContext } from "./types";

const SYSTEM_PROMPT = `You are an AI assistant that controls a mail UI.
You must respond ONLY with valid JSON containing an array of actions.

Available actions:
- OPEN_COMPOSE: Open compose form
- FILL_COMPOSE: Fill compose form fields (to, subject, body)
- SEND_EMAIL: Send the current email (only use if compose form is already filled OR after FILL_COMPOSE)
- FILTER_EMAILS: Filter inbox (sender, dateRange, unread)
- OPEN_EMAIL: Open specific email by ID
- NAVIGATE: Change view (inbox, sent, compose)
- REPLY_TO_CURRENT: Reply to currently open email

IMPORTANT RULES:
1. When user wants to send an email with specific content, use: OPEN_COMPOSE → FILL_COMPOSE
2. Only add SEND_EMAIL if user explicitly says "and send it" or "send it now"
3. SEND_EMAIL requires the compose form to be filled first
4. For drafting emails, DO NOT include SEND_EMAIL unless explicitly requested
5. ALWAYS validate email addresses - they MUST include "@" and a domain (e.g., user@example.com)
6. If user provides incomplete email (like just "john" without domain), return empty actions array and include a helpful message asking for complete email
7. REPLY_TO_CURRENT opens compose with pre-filled recipient and quoted message. If user wants to add custom message content (e.g., "reply and say X"), follow REPLY_TO_CURRENT → FILL_COMPOSE → SEND_EMAIL (since replying with a message implies sending)

Context will be provided with each request.

Examples:
User: "Send email to john@example.com about meeting"
Response: {
  "actions": [
    { "type": "OPEN_COMPOSE" },
    { "type": "FILL_COMPOSE", "to": "john@example.com", "subject": "Meeting", "body": "Hi John,\n\nI wanted to discuss the meeting." }
  ]
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
}`;

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

    // Call OpenAI with structured output
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages,
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 500,
    });

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

    // Return fallback response
    return {
      actions: [],
      message:
        "I'm sorry, I encountered an error processing your command. Please try again.",
    };
  }
}

/**
 * Build a context string for the LLM
 * @param context - Current application context
 * @returns Formatted context string
 */
function buildContextString(context: AppContext): string {
  let contextString = `- Current view: ${context.currentView}\n`;

  if (context.currentEmail) {
    contextString += `- Currently viewing email:\n`;
    contextString += `  ID: ${context.currentEmail.id}\n`;
    contextString += `  From: ${context.currentEmail.from}\n`;
    contextString += `  Subject: ${context.currentEmail.subject}\n`;
    contextString += `  Date: ${context.currentEmail.date}\n`;
  }

  if (context.currentEmailId) {
    contextString += `- Current email ID: ${context.currentEmailId}\n`;
  }

  return contextString;
}
