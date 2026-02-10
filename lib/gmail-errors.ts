/**
 * Custom error classes for Gmail API
 */

export class GmailError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
  ) {
    super(message);
    this.name = "GmailError";
  }
}

export class GmailAuthError extends GmailError {
  constructor(message: string = "Authentication failed") {
    super(message, 401, "AUTH_ERROR");
    this.name = "GmailAuthError";
  }
}

export class GmailRateLimitError extends GmailError {
  constructor(message: string = "Rate limit exceeded") {
    super(message, 429, "RATE_LIMIT");
    this.name = "GmailRateLimitError";
  }
}

export class GmailQuotaError extends GmailError {
  constructor(message: string = "Quota exceeded") {
    super(message, 403, "QUOTA_EXCEEDED");
    this.name = "GmailQuotaError";
  }
}

export class GmailNetworkError extends GmailError {
  constructor(message: string = "Network error") {
    super(message, 0, "NETWORK_ERROR");
    this.name = "GmailNetworkError";
  }
}

/**
 * Parse Gmail API error response and throw appropriate error
 */
export function handleGmailError(response: Response, errorData: any): never {
  const status = response.status;

  // Authentication errors (401)
  if (status === 401) {
    throw new GmailAuthError(
      errorData?.error?.message || "Invalid or expired token",
    );
  }

  // Rate limit errors (429)
  if (status === 429) {
    throw new GmailRateLimitError(
      errorData?.error?.message || "Too many requests",
    );
  }

  // Quota/permission errors (403)
  if (status === 403) {
    if (errorData?.error?.message?.includes("quota")) {
      throw new GmailQuotaError(errorData.error.message);
    }
    throw new GmailError(
      errorData?.error?.message || "Permission denied",
      403,
      "PERMISSION_DENIED",
    );
  }

  // Not found errors (404)
  if (status === 404) {
    throw new GmailError(
      errorData?.error?.message || "Resource not found",
      404,
      "NOT_FOUND",
    );
  }

  // Bad request (400)
  if (status === 400) {
    throw new GmailError(
      errorData?.error?.message || "Bad request",
      400,
      "BAD_REQUEST",
    );
  }

  // Server errors (500+)
  if (status >= 500) {
    throw new GmailError(
      errorData?.error?.message || "Gmail server error",
      status,
      "SERVER_ERROR",
    );
  }

  // Generic error
  throw new GmailError(
    errorData?.error?.message || `Gmail API error: ${status}`,
    status,
  );
}

/**
 * Check if error is retryable (for use with retry logic)
 */
export function isGmailRetryableError(error: any): boolean {
  if (error instanceof GmailRateLimitError) return true;
  if (error instanceof GmailNetworkError) return true;
  if (error instanceof GmailError && error.status && error.status >= 500) {
    return true;
  }
  return false;
}
