import { NextResponse } from "next/server";
import { processCommand } from "@/lib/assistant";
import { AppContext } from "@/lib/types";

export async function POST(request: Request) {
  try {
    // Parse request body
    const body = await request.json();
    const { message, context } = body;

    // Validate required fields
    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required and must be a string" },
        { status: 400 },
      );
    }

    if (!context || typeof context !== "object") {
      return NextResponse.json(
        { error: "Context is required and must be an object" },
        { status: 400 },
      );
    }

    // Validate context structure
    const appContext: AppContext = {
      currentView: context.currentView || "inbox",
      currentEmailId: context.currentEmailId,
      currentEmail: context.currentEmail,
    };

    // Call processCommand
    const result = await processCommand(message, appContext);

    // Return the response
    return NextResponse.json({
      success: true,
      actions: result.actions,
      message: result.message,
    });
  } catch (error) {
    console.error("Error in assistant API route:", error);

    // Handle specific OpenAI errors
    if (error instanceof Error) {
      // Rate limit error
      if (error.message.includes("rate limit")) {
        return NextResponse.json(
          {
            error: "Rate limit exceeded. Please try again in a moment.",
            actions: [],
            message:
              "I'm sorry, I'm receiving too many requests. Please try again shortly.",
          },
          { status: 429 },
        );
      }

      // API key error
      if (
        error.message.includes("API key") ||
        error.message.includes("authentication")
      ) {
        return NextResponse.json(
          {
            error: "OpenAI API key error",
            actions: [],
            message: "There's a configuration issue. Please contact support.",
          },
          { status: 500 },
        );
      }

      // Timeout error
      if (error.message.includes("timeout")) {
        return NextResponse.json(
          {
            error: "Request timeout",
            actions: [],
            message: "The request took too long. Please try again.",
          },
          { status: 504 },
        );
      }
    }

    // Generic error fallback
    return NextResponse.json(
      {
        error: "Failed to process command",
        actions: [],
        message:
          "I'm sorry, I encountered an error processing your command. Please try again.",
      },
      { status: 500 },
    );
  }
}
