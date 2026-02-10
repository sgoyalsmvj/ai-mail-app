/**
 * Retry utility with exponential backoff
 */
export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: any) => boolean;
}

const defaultOptions: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  shouldRetry: () => true,
};

/**
 * Execute a function with retry logic and exponential backoff
 * @param fn - The async function to execute
 * @param options - Retry configuration options
 * @returns The result of the function
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const config = { ...defaultOptions, ...options };
  let lastError: any;
  let delay = config.initialDelay;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (!config.shouldRetry(error)) {
        throw error;
      }

      // If this was the last attempt, throw the error
      if (attempt === config.maxRetries) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const currentDelay = Math.min(
        delay * Math.pow(config.backoffMultiplier, attempt),
        config.maxDelay,
      );

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, currentDelay));
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError;
}

/**
 * Check if an error is retryable (rate limit, timeout, network errors)
 * @param error - The error to check
 * @returns True if the error should be retried
 */
export function isRetryableError(error: any): boolean {
  if (!error) return false;

  // Check error message
  const message = error.message?.toLowerCase() || "";

  // Rate limit errors - should retry
  if (message.includes("rate limit") || message.includes("429")) {
    return true;
  }

  // Timeout errors - should retry
  if (message.includes("timeout") || message.includes("timed out")) {
    return true;
  }

  // Network errors - should retry
  if (
    message.includes("network") ||
    message.includes("econnrefused") ||
    message.includes("enotfound")
  ) {
    return true;
  }

  // Server errors (500, 502, 503, 504) - should retry
  if (
    message.includes("500") ||
    message.includes("502") ||
    message.includes("503") ||
    message.includes("504")
  ) {
    return true;
  }

  // Check status code if available
  if (error.status >= 500 && error.status < 600) {
    return true;
  }

  if (error.status === 429) {
    return true;
  }

  // Default: don't retry
  return false;
}

/**
 * Check if an error is an authentication error
 * @param error - The error to check
 * @returns True if it's an auth error
 */
export function isAuthError(error: any): boolean {
  if (!error) return false;

  const message = error.message?.toLowerCase() || "";

  return (
    message.includes("unauthorized") ||
    message.includes("401") ||
    message.includes("authentication") ||
    message.includes("invalid credentials") ||
    message.includes("token") ||
    error.status === 401
  );
}
