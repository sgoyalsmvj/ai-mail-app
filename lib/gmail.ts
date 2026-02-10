import { Email } from "./types";

// Helper function to parse email headers
const parseHeaders = (headers: any[]) => {
  const headerMap: any = {};
  headers.forEach((header: any) => {
    headerMap[header.name.toLowerCase()] = header.value;
  });
  return headerMap;
};

// Helper function to decode base64 email body
const decodeBody = (body: string) => {
  try {
    // Replace URL-safe characters
    const base64 = body.replace(/-/g, "+").replace(/_/g, "/");
    return Buffer.from(base64, "base64").toString("utf-8");
  } catch (error) {
    console.error("Failed to decode body:", error);
    return "";
  }
};

// Helper function to extract body from message parts
const extractBody = (payload: any): string => {
  if (payload.body?.data) {
    return decodeBody(payload.body.data);
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return decodeBody(part.body.data);
      }
    }
    // Fallback to HTML if plain text not found
    for (const part of payload.parts) {
      if (part.mimeType === "text/html" && part.body?.data) {
        return decodeBody(part.body.data);
      }
    }
    // Recursively check nested parts
    for (const part of payload.parts) {
      const body = extractBody(part);
      if (body) return body;
    }
  }

  return "";
};

// Fetch inbox emails with full details
const fetchInboxEmails = async (accessToken: string): Promise<Email[]> => {
  try {
    // Step 1: Fetch list of message IDs
    const listResponse = await fetch(
      "https://www.googleapis.com/gmail/v1/users/me/messages?labelIds=INBOX&maxResults=10",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!listResponse.ok) {
      const errorData = await listResponse.json().catch(() => ({}));
      console.error("Gmail API error:", {
        status: listResponse.status,
        statusText: listResponse.statusText,
        error: errorData,
      });
      throw new Error(
        `Failed to fetch email list: ${listResponse.status} ${listResponse.statusText} - ${JSON.stringify(errorData)}`,
      );
    }

    const listData = await listResponse.json();
    const messages = listData.messages || [];

    if (messages.length === 0) {
      return [];
    }

    // Step 2: Fetch full details for each message
    const emailPromises = messages.map(async (message: any) => {
      const detailResponse = await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!detailResponse.ok) {
        console.error(`Failed to fetch email ${message.id}`);
        return null;
      }

      const emailData = await detailResponse.json();

      // Step 3: Parse headers
      const headers = parseHeaders(emailData.payload.headers);

      // Step 4: Extract body
      const body = extractBody(emailData.payload);

      // Step 5: Build Email object
      const email: Email = {
        id: emailData.id,
        from: headers.from || "Unknown",
        to: headers.to || "",
        subject: headers.subject || "(No Subject)",
        snippet: emailData.snippet || "",
        body: body || emailData.snippet || "",
        date: headers.date || new Date().toISOString(),
        isRead: !emailData.labelIds?.includes("UNREAD"),
        labels: emailData.labelIds || [],
      };

      return email;
    });

    const emails = await Promise.all(emailPromises);
    return emails.filter((email): email is Email => email !== null);
  } catch (error) {
    console.error("Error fetching inbox emails:", error);
    throw error;
  }
};

// Fetch a specific email by ID
const fetchEmailById = async (
  accessToken: string,
  emailId: string,
): Promise<Email | null> => {
  try {
    const response = await fetch(
      `https://www.googleapis.com/gmail/v1/users/me/messages/${emailId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error("Failed to fetch email");
    }

    const emailData = await response.json();
    const headers = parseHeaders(emailData.payload.headers);
    const body = extractBody(emailData.payload);

    const email: Email = {
      id: emailData.id,
      from: headers.from || "Unknown",
      to: headers.to || "",
      subject: headers.subject || "(No Subject)",
      snippet: emailData.snippet || "",
      body: body || emailData.snippet || "",
      date: headers.date || new Date().toISOString(),
      isRead: !emailData.labelIds?.includes("UNREAD"),
      labels: emailData.labelIds || [],
    };

    return email;
  } catch (error) {
    console.error("Error fetching email by ID:", error);
    return null;
  }
};

// Send an email
const sendEmail = async (
  accessToken: string,
  to: string,
  subject: string,
  body: string,
): Promise<boolean> => {
  try {
    // Create RFC 2822 formatted message
    const message = [
      `To: ${to}`,
      `Subject: ${subject}`,
      "Content-Type: text/plain; charset=utf-8",
      "",
      body,
    ].join("\n");

    // Base64 encode the message (URL-safe)
    const encodedMessage = Buffer.from(message)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    // Send the email
    const response = await fetch(
      "https://www.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          raw: encodedMessage,
        }),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("Failed to send email:", error);
      throw new Error("Failed to send email");
    }

    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

const fetchSentEmails = async (accessToken: string): Promise<Email[]> => {
  try {
    const listResponse = await fetch(
      "https://www.googleapis.com/gmail/v1/users/me/messages?labelIds=SENT&maxResults=10",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!listResponse.ok) {
      const errorData = await listResponse.json().catch(() => ({}));
      console.error("Gmail API error:", {
        status: listResponse.status,
        statusText: listResponse.statusText,
        error: errorData,
      });
      throw new Error(
        `Failed to fetch sent email list: ${listResponse.status} ${listResponse.statusText} - ${JSON.stringify(errorData)}`,
      );
    }

    const listData = await listResponse.json();
    const messages = listData.messages || [];

    if (messages.length === 0) {
      return [];
    }

    const emailPromises = messages.map(async (message: any) => {
      const detailResponse = await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!detailResponse.ok) {
        console.error(`Failed to fetch sent email ${message.id}`);
        return null;
      }

      const emailData = await detailResponse.json();
      const headers = parseHeaders(emailData.payload.headers);
      const body = extractBody(emailData.payload);

      const email: Email = {
        id: emailData.id,
        from: headers.from || "Unknown",
        to: headers.to || "",
        subject: headers.subject || "(No Subject)",
        snippet: emailData.snippet || "",
        body: body || emailData.snippet || "",
        date: headers.date || new Date().toISOString(),
        isRead: true,
        labels: emailData.labelIds || [],
      };
      return email;
    });

    const emails = await Promise.all(emailPromises);
    return emails.filter((email): email is Email => email !== null);
  } catch (error) {
    console.error("Error fetching sent emails:", error);
    throw error;
  }
};

export { fetchInboxEmails, fetchEmailById, sendEmail, fetchSentEmails };
