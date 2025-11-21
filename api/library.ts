import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readdir } from 'fs/promises';
import { join } from 'path';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Set CORS headers to allow requests from the frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { category } = req.query;

    // Validate category parameter
    if (!category || typeof category !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid category parameter',
        message: 'Please provide a category query parameter (e.g., ?category=BAKERY)'
      });
    }

    // Sanitize category to prevent directory traversal attacks
    const sanitizedCategory = category.replace(/[^a-zA-Z0-9_-]/g, '');

    // Valid categories based on SmartPick business types
    const validCategories = ['BAKERY', 'RESTAURANT', 'CAFE', 'GROCERY', 'ALCOHOL', 'FAST_FOOD'];

    if (!validCategories.includes(sanitizedCategory.toUpperCase())) {
      return res.status(400).json({
        error: 'Invalid category',
        message: `Category must be one of: ${validCategories.join(', ')}`,
        provided: sanitizedCategory
      });
    }

    // Construct path to the library directory
    // In Vercel, the working directory is the project root
    const libraryPath = join(process.cwd(), 'public', 'library', sanitizedCategory.toUpperCase());

    // Read directory contents
    let files: string[];
    try {
      files = await readdir(libraryPath);
    } catch (error) {
      // Directory doesn't exist or can't be read
      return res.status(404).json({
        error: 'Category directory not found',
        message: `No images found for category: ${sanitizedCategory.toUpperCase()}`,
        category: sanitizedCategory.toUpperCase(),
        images: []
      });
    }

    // Filter for image files only (jpg, jpeg, png, webp, svg)
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif'];
    const imageFiles = files.filter(file => {
      const ext = file.toLowerCase().substring(file.lastIndexOf('.'));
      return imageExtensions.includes(ext);
    });

    // Sort files alphabetically
    imageFiles.sort();

    // Convert to full URLs
    const imageUrls = imageFiles.map(file =>
      `/library/${sanitizedCategory.toUpperCase()}/${file}`
    );

    // Return success response
    return res.status(200).json({
      success: true,
      category: sanitizedCategory.toUpperCase(),
      count: imageUrls.length,
      images: imageUrls
    });

  } catch (error) {
    console.error('Error reading library directory:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to read library directory',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
