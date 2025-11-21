// Strong password validation utility
// Enforces industry-standard security requirements

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

const MIN_LENGTH = 12;
const UPPERCASE_REGEX = /[A-Z]/;
const LOWERCASE_REGEX = /[a-z]/;
const NUMBER_REGEX = /[0-9]/;
const SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;

// Common weak passwords to reject
const COMMON_PASSWORDS = [
  'password', '123456', '12345678', 'qwerty', 'abc123', 'monkey', 
  '1234567', 'letmein', 'trustno1', 'dragon', 'baseball', 'iloveyou',
  'master', 'sunshine', 'ashley', 'bailey', 'passw0rd', 'shadow',
  '123456789', '12345', 'password1', 'password123', 'admin', 'admin123'
];

/**
 * Validates password strength according to security best practices
 * 
 * Requirements:
 * - Minimum 12 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 * - Not a common weak password
 * 
 * @param password - The password to validate
 * @returns PasswordValidationResult with validation status and any errors
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  // Check if password exists
  if (!password || typeof password !== 'string') {
    return {
      isValid: false,
      errors: ['Password is required']
    };
  }

  // Trim to check actual length
  const trimmedPassword = password.trim();

  // Check minimum length
  if (trimmedPassword.length < MIN_LENGTH) {
    errors.push(`Password must be at least ${MIN_LENGTH} characters long`);
  }

  // Check for uppercase letter
  if (!UPPERCASE_REGEX.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  // Check for lowercase letter
  if (!LOWERCASE_REGEX.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  // Check for number
  if (!NUMBER_REGEX.test(password)) {
    errors.push('Password must contain at least one number');
  }

  // Check for special character
  if (!SPECIAL_CHAR_REGEX.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // Check against common passwords (case-insensitive)
  if (COMMON_PASSWORDS.includes(trimmedPassword.toLowerCase())) {
    errors.push('This password is too common. Please choose a stronger password');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Gets a human-readable error message from validation result
 */
export function getPasswordErrorMessage(result: PasswordValidationResult): string {
  if (result.isValid) {
    return '';
  }
  
  return result.errors.join('. ');
}
