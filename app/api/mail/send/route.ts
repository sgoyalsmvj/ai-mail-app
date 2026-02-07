import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../../auth/[...nextauth]/route";
import { sendEmail } from "@/lib/gmail";

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

    // Validate required fields
    if (!to || !subject || !emailBody) {
      return NextResponse.json(
        { error: "Missing required fields: to, subject, body" },
        { status: 400 },
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 },
      );
    }

    // Send email using Gmail API
    console.log(`Sending email to ${to} with subject: ${subject}`);
    await sendEmail(accessToken, to, subject, emailBody);

    return NextResponse.json(
      { success: true, message: "Email sent successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error in send email API:", error);
    return NextResponse.json(
      { error: "Failed to send email. Please try again." },
      { status: 500 },
    );
  }
}
