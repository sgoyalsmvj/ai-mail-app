/**
 * Form validation utilities
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate email address format
 * @param email - Email address to validate
 * @returns Validation result
 */
export function validateEmail(email: string): ValidationResult {
  const trimmed = email.trim();

  if (!trimmed) {
    return { isValid: false, error: "Email address is required" };
  }

  // Basic email regex pattern
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(trimmed)) {
    return { isValid: false, error: "Please enter a valid email address" };
  }

  // Check for common typos
  const commonDomains = [
    "gmail.com",
    "yahoo.com",
    "outlook.com",
    "hotmail.com",
  ];
  const domain = trimmed.split("@")[1]?.toLowerCase();

  // Check for missing TLD
  if (domain && !domain.includes(".")) {
    return {
      isValid: false,
      error: "Email domain must include a top-level domain (e.g., .com)",
    };
  }

  // Check length
  if (trimmed.length > 254) {
    return { isValid: false, error: "Email address is too long" };
  }

  return { isValid: true };
}

/**
 * Validate subject line
 * @param subject - Subject to validate
 * @param required - Whether subject is required
 * @returns Validation result
 */
export function validateSubject(
  subject: string,
  required: boolean = true,
): ValidationResult {
  const trimmed = subject.trim();

  if (required && !trimmed) {
    return { isValid: false, error: "Subject is required" };
  }

  if (trimmed.length > 998) {
    return {
      isValid: false,
      error: "Subject is too long (max 998 characters)",
    };
  }

  return { isValid: true };
}

/**
 * Validate email body
 * @param body - Email body to validate
 * @param required - Whether body is required
 * @returns Validation result
 */
export function validateBody(
  body: string,
  required: boolean = true,
): ValidationResult {
  const trimmed = body.trim();

  if (required && !trimmed) {
    return { isValid: false, error: "Email body cannot be empty" };
  }

  // Check for reasonable maximum length (5MB in characters)
  if (trimmed.length > 5000000) {
    return { isValid: false, error: "Email body is too long" };
  }

  return { isValid: true };
}

/**
 * Validate multiple email addresses (comma-separated)
 * @param emails - String of comma-separated emails
 * @returns Validation result with invalid emails if any
 */
export function validateMultipleEmails(emails: string): ValidationResult {
  const emailList = emails.split(",").map((e) => e.trim());
  const invalidEmails: string[] = [];

  for (const email of emailList) {
    if (!email) continue;

    const result = validateEmail(email);
    if (!result.isValid) {
      invalidEmails.push(email);
    }
  }

  if (invalidEmails.length > 0) {
    return {
      isValid: false,
      error: `Invalid email address(es): ${invalidEmails.join(", ")}`,
    };
  }

  return { isValid: true };
}

/**
 * Sanitize input to prevent XSS
 * @param input - Input string to sanitize
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/**
 * Validate complete compose form
 * @param to - Recipient email
 * @param subject - Email subject
 * @param body - Email body
 * @returns Validation result
 */
export function validateComposeForm(
  to: string,
  subject: string,
  body: string,
): ValidationResult {
  // Validate recipient
  const toResult = validateEmail(to);
  if (!toResult.isValid) {
    return toResult;
  }

  // Validate subject
  const subjectResult = validateSubject(subject, true);
  if (!subjectResult.isValid) {
    return subjectResult;
  }

  // Validate body
  const bodyResult = validateBody(body, true);
  if (!bodyResult.isValid) {
    return bodyResult;
  }

  return { isValid: true };
}
