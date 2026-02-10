import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { fetchSentEmails } from "@/lib/gmail";

export async function GET() {
  try {
    // Get the session to retrieve the access token
    const session = await getServerSession(authOptions);

    if (!session || !session.accessToken) {
      return NextResponse.json(
        { error: "Unauthorized - No valid session or access token" },
        { status: 401 },
      );
    }

    // Fetch sent emails using the access token
    const emails = await fetchSentEmails(session.accessToken);

    return NextResponse.json({
      success: true,
      emails,
      count: emails.length,
    });
  } catch (error) {
    console.error("Error fetching sent emails:", error);

    // Handle specific error cases
    if (error instanceof Error) {
      if (
        error.message.includes("401") ||
        error.message.includes("Invalid Credentials")
      ) {
        return NextResponse.json(
          { error: "Authentication failed - Please sign in again" },
          { status: 401 },
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to fetch sent emails" },
      { status: 500 },
    );
  }
}
