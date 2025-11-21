import { supabase, isDemoMode } from '../supabase';
import { 
  ALLOWED_IMAGE_TYPES, 
  MAX_FILE_SIZE_BYTES, 
  ERROR_MESSAGES, 
  IMAGE_CACHE_MAX_AGE 
} from '../constants';

/**
 * Media Module
 * Handles image upload, validation, and URL resolution
 */

const validateFile = (file: File): void => {
  // Check file type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as any)) {
    throw new Error(ERROR_MESSAGES.INVALID_FILE_TYPE);
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(ERROR_MESSAGES.FILE_TOO_LARGE);
  }

  // Additional security: Check for double extensions (e.g., .php.jpg)
  const fileName = file.name.toLowerCase();
  const suspiciousExtensions = ['.php', '.exe', '.sh', '.bat', '.cmd', '.js', '.html'];
  for (const ext of suspiciousExtensions) {
    if (fileName.includes(ext)) {
      throw new Error('Invalid file name. Please rename the file and try again.');
    }
  }
};

/**
 * Get safe file extension from MIME type
 */
const getExtensionFromMimeType = (mimeType: string): string => {
  const mimeToExt: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  return mimeToExt[mimeType] || 'jpg';
};

export const uploadImages = async (files: File[], bucket: string): Promise<string[]> => {
  if (isDemoMode) {
    return [];
  }

  const urls: string[] = [];

  for (const file of files) {
    // Validate file before upload
    validateFile(file);

    // Use MIME type for extension (more secure than trusting filename)
    const ext = getExtensionFromMimeType(file.type);
    const timestamp = Date.now();
    const randomId = crypto.randomUUID().replace(/-/g, '').substring(0, 13);
    const fileName = `${timestamp}-${randomId}.${ext}`;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: String(IMAGE_CACHE_MAX_AGE),
        upsert: false,
        contentType: file.type, // Explicitly set content type
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    urls.push(publicUrl);
  }

  return urls;
};

// Partner custom image upload functions removed per user request
// Partners can only use library images now

/**
 * Resolve an offer image URL that might be a bare filename or a full URL
 * @param url - Image URL or filename
 * @param category - Offer category for library images
 * @param options - Image transformation options
 */
export const resolveOfferImageUrl = (
  url?: string, 
  category?: string,
  options?: { width?: number; height?: number; quality?: number; format?: 'webp' | 'jpg' | 'png' }
): string => {
  if (!url) return '';

  const trimmed = url.trim();

  // Basic sanitization: prevent directory traversal attempts
  if (trimmed.includes('..')) {
    return '';
  }

  // Build transformation params for optimized images
  const transformParams = new URLSearchParams();
  if (options?.width) transformParams.set('width', options.width.toString());
  if (options?.height) transformParams.set('height', options.height.toString());
  if (options?.quality) transformParams.set('quality', options.quality.toString());
  if (options?.format) transformParams.set('format', options.format);
  const queryString = transformParams.toString() ? `?${transformParams}` : '';

  // Absolute URLs (already public) - add transformations if from Supabase
  if (/^https?:\/\//i.test(trimmed)) {
    // For Supabase storage URLs, add transformation params
    if (trimmed.includes('supabase.co/storage')) {
      return `${trimmed}${queryString}`;
    }
    return trimmed;
  }

  // Public assets served from the app (e.g. from /public/library/...)
  if (trimmed.startsWith('/')) return trimmed; // already root-relative, local files
  if (trimmed.toLowerCase().startsWith('library/')) return `/${trimmed}`;
  if (trimmed.toLowerCase().startsWith('public/library/')) return `/${trimmed.slice('public/'.length)}`;

  // Bare filename coming from library selection (e.g., "xinkali.jpg")
  if (!trimmed.includes('/') && category) {
    return `/library/${category.toUpperCase()}/${trimmed}`;
  }

  // Otherwise treat as Supabase Storage path (e.g., partners/... or offer-images/...)
  try {
    const path = trimmed.replace(/^\/+/, '');
    const { data: { publicUrl } } = supabase.storage
      .from('offer-images')
      .getPublicUrl(path);
    return `${publicUrl}${queryString}` || trimmed;
  } catch {
    return trimmed;
  }
};
