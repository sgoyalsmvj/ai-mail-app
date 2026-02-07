import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { fetchInboxEmails } from "@/lib/gmail";

export async function GET() {
  try {
    // Get the session to retrieve the access token
    const session = await getServerSession(authOptions);
    console.log("Session check:", {
      hasSession: !!session,
      hasAccessToken: !!session?.accessToken,
      email: session?.user?.email,
    });
    if (!session || !session.accessToken) {
      return NextResponse.json(
        { error: "Unauthorized - No valid session or access token" },
        { status: 401 },
      );
    }

    // Fetch inbox emails using the access token
    const emails = await fetchInboxEmails(session.accessToken);

    return NextResponse.json({
      success: true,
      emails,
      count: emails.length,
    });
  } catch (error) {
    console.error("Error fetching inbox emails:", error);

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
      { error: "Failed to fetch inbox emails" },
      { status: 500 },
    );
  }
}
