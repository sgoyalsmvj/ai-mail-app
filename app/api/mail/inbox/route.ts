import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { fetchInboxEmails } from "@/lib/gmail";
import {
  GmailAuthError,
  GmailRateLimitError,
  GmailQuotaError,
} from "@/lib/gmail-errors";

export async function GET(request: Request) {
  try {
    // Get the session to retrieve the access token
    const session = await getServerSession(authOptions);

    if (!session || !session.accessToken) {
      return NextResponse.json(
        { error: "Unauthorized - No valid session or access token" },
        { status: 401 },
      );
    }

    // Parse query parameters for filtering
    const { searchParams } = new URL(request.url);
    const sender = searchParams.get("sender") || undefined;
    const dateFrom = searchParams.get("dateFrom") || undefined;
    const dateTo = searchParams.get("dateTo") || undefined;

    // Fetch inbox emails using the access token with optional filters
    const emails = await fetchInboxEmails(session.accessToken, {
      sender,
      dateFrom,
      dateTo,
    });

    return NextResponse.json({
      success: true,
      emails,
      count: emails.length,
    });
  } catch (error) {
    console.error("Error fetching inbox emails:", error);

    // Handle specific Gmail error types
    if (error instanceof GmailAuthError) {
      return NextResponse.json(
        {
          error:
            "Authentication failed. Your session has expired. Please sign in again.",
        },
        { status: 401 },
      );
    }

    if (error instanceof GmailRateLimitError) {
      return NextResponse.json(
        {
          error:
            "Rate limit exceeded. Please wait a moment before trying again.",
        },
        { status: 429 },
      );
    }

    if (error instanceof GmailQuotaError) {
      return NextResponse.json(
        { error: "Gmail API quota exceeded. Please try again later." },
        { status: 403 },
      );
    }

    // Generic error fallback
    return NextResponse.json(
      { error: "Failed to fetch inbox emails. Please try again." },
      { status: 500 },
    );
  }
}
