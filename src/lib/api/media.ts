import { logger } from '@/lib/logger';
import { supabase, isDemoMode } from '../supabase';
import { 
  ALLOWED_IMAGE_TYPES, 
  MAX_FILE_SIZE_BYTES, 
  ERROR_MESSAGES, 
  IMAGE_CACHE_MAX_AGE,
  MAX_PARTNER_IMAGES 
} from '../constants';

/**
 * Media Module
 * Handles image upload, validation, and URL resolution with security features
 */

/**
 * Verify file content matches claimed MIME type using magic number (file signature)
 * This prevents attacks where malicious files are renamed with image extensions
 */
const verifyImageContent = async (file: File): Promise<boolean> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = (e) => {
      if (!e.target?.result) {
        resolve(false);
        return;
      }
      
      const arr = new Uint8Array(e.target.result as ArrayBuffer).subarray(0, 4);
      let header = '';
      for (let i = 0; i < arr.length; i++) {
        header += arr[i].toString(16).padStart(2, '0');
      }
      
      // Check magic numbers (file signatures) - The REAL file type
      const validHeaders: Record<string, boolean> = {
        'ffd8ffe0': true, // JPEG (JFIF)
        'ffd8ffe1': true, // JPEG (Exif)
        'ffd8ffe2': true, // JPEG (Canon)
        'ffd8ffe3': true, // JPEG (Samsung)
        'ffd8ffe8': true, // JPEG (SPIFF)
        '89504e47': true, // PNG
        '52494646': true, // WebP (starts with RIFF)
      };
      
      resolve(Object.keys(validHeaders).some(sig => header.startsWith(sig)));
    };
    
    reader.onerror = () => resolve(false);
    reader.readAsArrayBuffer(file.slice(0, 4));
  });
};

/**
 * Comprehensive frontend file validation
 */
const validateFile = async (file: File): Promise<void> => {
  // 1. Check file type (can be spoofed, but first line of defense)
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as any)) {
    throw new Error(ERROR_MESSAGES.INVALID_FILE_TYPE);
  }

  // 2. Check file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(ERROR_MESSAGES.FILE_TOO_LARGE);
  }
  
  // 3. Minimum file size (prevent 0-byte or corrupt files)
  if (file.size < 100) {
    throw new Error('File is too small or corrupt');
  }

  // 4. Additional security: Check for double extensions (e.g., .php.jpg)
  const fileName = file.name.toLowerCase();
  const suspiciousExtensions = ['.php', '.exe', '.sh', '.bat', '.cmd', '.js', '.html', '.svg'];
  for (const ext of suspiciousExtensions) {
    if (fileName.includes(ext)) {
      throw new Error('Invalid file name. Please rename the file and try again.');
    }
  }
  
  // 5. Check for suspicious characters in filename
  const suspiciousPattern = /[<>:"|?*\x00-\x1f]|\.{2,}/;
  if (suspiciousPattern.test(fileName)) {
    throw new Error('Invalid characters in filename');
  }
  
  // 6. CRITICAL: Verify actual file content (magic number check)
  const isValidImage = await verifyImageContent(file);
  if (!isValidImage) {
    throw new Error('File content does not match image format. File may be corrupted or malicious.');
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

/**
 * Upload partner images to their personal gallery with full security checks
 * @param file - Image file to upload
 * @param partnerId - Partner's database ID
 * @returns Object with success status, URL, and optional error
 */
export const uploadPartnerImage = async (
  file: File,
  partnerId: string
): Promise<{ success: boolean; url?: string; error?: string }> => {
  if (isDemoMode) {
    return { success: false, error: 'Demo mode: uploads disabled' };
  }

  try {
    // 1. Comprehensive validation (includes magic number check)
    await validateFile(file);

    // 2. Check partner's current quota
    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .select('id, image_quota_used, image_quota_max, status')
      .eq('id', partnerId)
      .single();

    if (partnerError || !partner) {
      throw new Error('Partner not found');
    }

    if (partner.status !== 'APPROVED') {
      throw new Error('Only approved partners can upload images');
    }

    // 3. Check quota limit
    if (partner.image_quota_used >= partner.image_quota_max) {
      await supabase.rpc('create_security_alert', {
        p_partner_id: partnerId,
        p_alert_type: 'QUOTA_EXCEEDED',
        p_description: `Partner attempted upload at quota limit (${partner.image_quota_used}/${partner.image_quota_max})`,
        p_severity: 'low',
        p_metadata: { file_size: file.size, file_type: file.type }
      });
      
      return { 
        success: false, 
        error: `Image quota exceeded. You have ${partner.image_quota_used}/${partner.image_quota_max} images. Please delete some images first.` 
      };
    }

    // 4. Check rate limiting
    const { data: rateLimitOk } = await supabase.rpc('check_upload_rate_limit', {
      p_partner_id: partnerId
    });

    if (!rateLimitOk) {
      await supabase.rpc('create_security_alert', {
        p_partner_id: partnerId,
        p_alert_type: 'RATE_LIMIT_EXCEEDED',
        p_description: 'Partner exceeded upload rate limit (10 per hour)',
        p_severity: 'medium',
        p_metadata: { file_size: file.size }
      });
      
      return { 
        success: false, 
        error: 'Upload rate limit exceeded. Please try again in a few minutes.' 
      };
    }

    // 5. Generate secure filename
    const ext = getExtensionFromMimeType(file.type);
    const timestamp = Date.now();
    const randomId = crypto.randomUUID().replace(/-/g, '').substring(0, 13);
    const fileName = `${partnerId}/${timestamp}-${randomId}.${ext}`;

    // 6. Ensure correct content type (fallback if file.type is empty)
    let contentType = file.type;
    if (!contentType || contentType === '' || contentType === 'application/octet-stream') {
      const extMap: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'webp': 'image/webp'
      };
      contentType = extMap[ext] || 'image/jpeg';
    }

    // 7. Convert file to ArrayBuffer to avoid multipart form boundary corruption
    const arrayBuffer = await file.arrayBuffer();

    // 8. Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('partner-images')
      .upload(fileName, arrayBuffer, {
        cacheControl: String(IMAGE_CACHE_MAX_AGE),
        upsert: false,
        contentType: contentType,
      });

    if (uploadError) {
      // Log failed upload
      await supabase.rpc('log_upload_attempt', {
        p_partner_id: partnerId,
        p_file_name: fileName,
        p_file_size: file.size,
        p_file_type: file.type,
        p_bucket_name: 'partner-images',
        p_success: false,
        p_error_message: uploadError.message
      });
      
      throw uploadError;
    }

    // 9. Fix MIME type in storage metadata (Supabase JS ignores contentType param)
    await supabase.rpc('fix_storage_mime_type', {
      p_bucket_id: 'partner-images',
      p_file_name: fileName,
      p_correct_mime_type: contentType
    });

    // 10. Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('partner-images')
      .getPublicUrl(fileName);

    // 11. Log successful upload
    await supabase.rpc('log_upload_attempt', {
      p_partner_id: partnerId,
      p_file_name: fileName,
      p_file_size: file.size,
      p_file_type: file.type,
      p_bucket_name: 'partner-images',
      p_success: true,
      p_error_message: null
    });

    // 12. Increment quota counter
    await supabase.rpc('increment_image_quota', {
      p_partner_id: partnerId
    });

    return { success: true, url: publicUrl };

  } catch (error: any) {
    logger.error('Upload error:', error);
    
    // Log failed attempt if we have partner ID
    if (partnerId) {
      try {
        await supabase.rpc('log_upload_attempt', {
          p_partner_id: partnerId,
          p_file_name: file.name,
          p_file_size: file.size,
          p_file_type: file.type,
          p_bucket_name: 'partner-images',
          p_success: false,
          p_error_message: error.message || 'Unknown error'
        });
      } catch (logError) {
        logger.error('Failed to log upload attempt:', logError);
      }
    }
    
    return { 
      success: false, 
      error: error.message || 'Upload failed. Please try again.' 
    };
  }
};

/**
 * Delete partner image and decrement quota
 */
export const deletePartnerImage = async (
  imageUrl: string,
  partnerId: string
): Promise<{ success: boolean; error?: string }> => {
  if (isDemoMode) {
    return { success: false, error: 'Demo mode: deletions disabled' };
  }

  try {
    // Remove query parameters from URL (like ?t=timestamp)
    const cleanUrl = imageUrl.split('?')[0];
    
    // Extract file path from URL
    const urlParts = cleanUrl.split('/');
    const bucketIndex = urlParts.findIndex(part => part === 'partner-images');
    if (bucketIndex === -1) {
      throw new Error('Invalid image URL');
    }
    
    const filePath = urlParts.slice(bucketIndex + 1).join('/');

    logger.debug('Deleting image from storage:', filePath); // Debug log

    // Delete from storage
    const { error: deleteError } = await supabase.storage
      .from('partner-images')
      .remove([filePath]);

    if (deleteError) {
      logger.error('Storage delete error:', deleteError);
      throw deleteError;
    }

    // Remove from partner's images array if it exists
    const { data: partner } = await supabase
      .from('partners')
      .select('images')
      .eq('id', partnerId)
      .single();

    if (partner?.images && Array.isArray(partner.images)) {
      const updatedImages = partner.images.filter((img: string) => img !== imageUrl);
      await supabase
        .from('partners')
        .update({ images: updatedImages })
        .eq('id', partnerId);
    }

    // Also check if this image is used in any offers and remove it
    const { data: offers } = await supabase
      .from('offers')
      .select('id, images')
      .eq('partner_id', partnerId);

    if (offers && offers.length > 0) {
      for (const offer of offers) {
        if (offer.images && Array.isArray(offer.images) && offer.images.includes(imageUrl)) {
          const updatedOfferImages = offer.images.filter((img: string) => img !== imageUrl);
          await supabase
            .from('offers')
            .update({ images: updatedOfferImages })
            .eq('id', offer.id);
        }
      }
    }

    // If this was the cover image, clear it
    const { data: partnerData } = await supabase
      .from('partners')
      .select('cover_image_url')
      .eq('id', partnerId)
      .single();

    if (partnerData?.cover_image_url === imageUrl) {
      await supabase
        .from('partners')
        .update({ cover_image_url: null })
        .eq('id', partnerId);
    }

    // Decrement quota
    await supabase.rpc('decrement_image_quota', {
      p_partner_id: partnerId
    });

    return { success: true };

  } catch (error: any) {
    logger.error('Delete error:', error);
    return { 
      success: false, 
      error: error.message || 'Delete failed. Please try again.' 
    };
  }
};

/**
 * Get partner's uploaded images
 */
export const getPartnerImages = async (
  partnerId: string
): Promise<{ images: string[]; quota_used: number; quota_max: number }> => {
  if (isDemoMode) {
    return { images: [], quota_used: 0, quota_max: MAX_PARTNER_IMAGES };
  }

  try {
    // Get quota info
    const { data: partner } = await supabase
      .from('partners')
      .select('image_quota_used, image_quota_max')
      .eq('id', partnerId)
      .single();

    // List images from storage
    const { data: fileList, error } = await supabase.storage
      .from('partner-images')
      .list(partnerId, {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (error) throw error;

    const images = (fileList || []).map(file => {
      const { data: { publicUrl } } = supabase.storage
        .from('partner-images')
        .getPublicUrl(`${partnerId}/${file.name}`);
      // Add cache-busting timestamp to ensure fresh images load
      return `${publicUrl}?t=${Date.now()}`;
    });

    return {
      images,
      quota_used: partner?.image_quota_used || 0,
      quota_max: partner?.image_quota_max || MAX_PARTNER_IMAGES
    };

  } catch (error) {
    logger.error('Error fetching partner images:', error);
    return { images: [], quota_used: 0, quota_max: MAX_PARTNER_IMAGES };
  }
};

/**
 * Set a gallery image as the partner's cover photo
 * @param partnerId - Partner's ID
 * @param imageUrl - Full URL of the image to set as cover
 */
export const setCoverImage = async (partnerId: string, imageUrl: string): Promise<{ success: boolean; error?: string }> => {
  if (isDemoMode) {
    return { success: false, error: 'Demo mode: Cannot set cover image' };
  }

  try {
    // Remove cache-busting timestamp if present
    const cleanUrl = imageUrl.split('?')[0];

    // Update partner's cover_image_url
    const { error } = await supabase
      .from('partners')
      .update({ cover_image_url: cleanUrl })
      .eq('id', partnerId);

    if (error) {
      logger.error('Error setting cover image:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    logger.error('Exception setting cover image:', error);
    return { success: false, error: 'Failed to set cover image' };
  }
};

export const uploadImages = async (files: File[], bucket: string): Promise<string[]> => {
  if (isDemoMode) {
    return [];
  }

  const urls: string[] = [];

  for (const file of files) {
    // Validate file before upload
    await validateFile(file);

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
