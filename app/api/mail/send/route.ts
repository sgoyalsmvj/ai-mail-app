import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../../auth/[...nextauth]/route";
import { sendEmail } from "@/lib/gmail";
import {
  GmailAuthError,
  GmailRateLimitError,
  GmailQuotaError,
} from "@/lib/gmail-errors";
import { validateComposeForm } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    // Get session with auth options
    const session = await getServerSession(authOptions);

    console.log("Send email - Session check:", {
      hasSession: !!session,
      hasAccessToken: !!(session as any)?.accessToken,
      email: session?.user?.email,
    });

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get access token from session
    const accessToken = (session as any).accessToken;

    if (!accessToken) {
      return NextResponse.json(
        { error: "No access token found" },
        { status: 401 },
      );
    }

    // Get email data from request body
    const body = await request.json();
    const { to, subject, body: emailBody } = body;

    // Validate all fields using validation utility
    const validation = validateComposeForm(to, subject, emailBody);

    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error || "Validation failed" },
        { status: 400 },
      );
    }

    // Send email using Gmail API
    console.log(`Sending email to ${to} with subject: ${subject}`);
    await sendEmail(accessToken, to.trim(), subject.trim(), emailBody.trim());

    return NextResponse.json(
      { success: true, message: "Email sent successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error in send email API:", error);

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
      { error: "Failed to send email. Please try again." },
      { status: 500 },
    );
  }
}
