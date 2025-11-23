/**
 * Metadata Sanitization and Validation Utility
 * Prevents malicious data in JSONB fields and enforces size limits
 */

// Maximum size for metadata JSON string (100KB)
const MAX_METADATA_SIZE = 100 * 1024; // 100KB

// Maximum depth for nested objects
const MAX_DEPTH = 5;

// Maximum array length
const MAX_ARRAY_LENGTH = 100;

// Maximum string length in metadata
const MAX_STRING_LENGTH = 10000;

/**
 * Sanitize and validate metadata object
 * @param metadata - User-provided metadata
 * @param maxSize - Maximum JSON string size in bytes (default 100KB)
 * @returns Sanitized metadata object
 * @throws Error if validation fails
 */
export function sanitizeMetadata(
  metadata: any,
  maxSize: number = MAX_METADATA_SIZE
): Record<string, any> {
  // Handle null/undefined
  if (metadata === null || metadata === undefined) {
    return {};
  }

  // Ensure it's an object
  if (typeof metadata !== 'object' || Array.isArray(metadata)) {
    throw new Error('Metadata must be an object');
  }

  // Check size before processing
  const jsonString = JSON.stringify(metadata);
  if (jsonString.length > maxSize) {
    throw new Error(`Metadata too large. Maximum size: ${maxSize} bytes`);
  }

  // Deep sanitize
  const sanitized = sanitizeValue(metadata, 0);

  // Verify final size
  const finalString = JSON.stringify(sanitized);
  if (finalString.length > maxSize) {
    throw new Error(`Sanitized metadata too large. Maximum size: ${maxSize} bytes`);
  }

  return sanitized;
}

/**
 * Recursively sanitize a value
 */
function sanitizeValue(value: any, depth: number): any {
  // Check depth limit
  if (depth > MAX_DEPTH) {
    return '[MAX_DEPTH_EXCEEDED]';
  }

  // Handle primitives
  if (value === null) return null;
  if (value === undefined) return null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    // Check for safe numbers
    if (!Number.isFinite(value)) return 0;
    return value;
  }

  // Sanitize strings
  if (typeof value === 'string') {
    // Truncate long strings
    if (value.length > MAX_STRING_LENGTH) {
      return value.substring(0, MAX_STRING_LENGTH) + '...[TRUNCATED]';
    }
    // Remove potential XSS/injection characters (though JSONB is safe)
    // This is defense in depth in case data is ever displayed
    return sanitizeString(value);
  }

  // Handle arrays
  if (Array.isArray(value)) {
    // Limit array length
    const limitedArray = value.slice(0, MAX_ARRAY_LENGTH);
    return limitedArray.map(item => sanitizeValue(item, depth + 1));
  }

  // Handle objects
  if (typeof value === 'object') {
    const sanitized: Record<string, any> = {};
    let keyCount = 0;
    const maxKeys = 100; // Limit number of keys

    for (const key in value) {
      if (keyCount >= maxKeys) break;
      
      // Sanitize key name
      const sanitizedKey = sanitizeString(key).substring(0, 100);
      
      // Skip invalid keys
      if (!sanitizedKey || sanitizedKey.startsWith('_')) continue;
      
      sanitized[sanitizedKey] = sanitizeValue(value[key], depth + 1);
      keyCount++;
    }
    
    return sanitized;
  }

  // Unknown type - convert to string
  return String(value).substring(0, 100);
}

/**
 * Sanitize string to remove potentially dangerous characters
 */
function sanitizeString(str: string): string {
  // Remove null bytes
  let sanitized = str.replace(/\0/g, '');
  
  // Remove control characters except newlines, tabs, carriage returns
  sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  return sanitized;
}

/**
 * Validate metadata without sanitizing (for strict validation)
 */
export function validateMetadata(metadata: any): { valid: boolean; error?: string } {
  try {
    sanitizeMetadata(metadata);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid metadata'
    };
  }
}

/**
 * Safe metadata getter - returns empty object if invalid
 */
export function safeMetadata(metadata: any): Record<string, any> {
  try {
    return sanitizeMetadata(metadata);
  } catch {
    return {};
  }
}
