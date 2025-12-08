/**
 * Sitemap Generator for SmartPick
 * 
 * Generates sitemap.xml with:
 * - Static pages (homepage, terms, privacy, contact, partner-application)
 * - Dynamic offer pages (top 50 active offers)
 * 
 * Run: node scripts/generate-sitemap.js
 * 
 * For production: Run this as part of build process or via cron job
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ggzhtpaxnhwcilomswtm.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key-here';
const supabase = createClient(supabaseUrl, supabaseKey);

const BASE_URL = 'https://smartpick.ge';
const OUTPUT_PATH = path.join(__dirname, '../public/sitemap.xml');

// Static pages configuration
const staticPages = [
  { url: '/', changefreq: 'daily', priority: '1.0' },
  { url: '/partner-application', changefreq: 'weekly', priority: '0.9' },
  { url: '/contact', changefreq: 'monthly', priority: '0.6' },
  { url: '/terms', changefreq: 'monthly', priority: '0.5' },
  { url: '/privacy', changefreq: 'monthly', priority: '0.5' },
];

/**
 * Format date as YYYY-MM-DD for sitemap
 */
function formatDate(date) {
  return new Date(date).toISOString().split('T')[0];
}

/**
 * Fetch top active offers for dynamic sitemap entries
 */
async function fetchActiveOffers() {
  try {
    const { data: offers, error } = await supabase
      .from('offers')
      .select('id, updated_at')
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false })
      .limit(50); // Top 50 offers for sitemap

    if (error) {
      console.warn('⚠️  Could not fetch offers for sitemap:', error.message);
      return [];
    }

    return offers || [];
  } catch (err) {
    console.warn('⚠️  Error fetching offers:', err.message);
    return [];
  }
}

/**
 * Generate sitemap XML content
 */
async function generateSitemap() {
  console.log('🗺️  Generating sitemap...');

  const now = formatDate(new Date());
  const offers = await fetchActiveOffers();

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">

  <!-- Static Pages -->\n`;

  // Add static pages
  for (const page of staticPages) {
    xml += `  <url>
    <loc>${BASE_URL}${page.url}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>\n`;
  }

  // Add dynamic offer pages (if you implement /offer/[id] routes)
  if (offers.length > 0) {
    xml += `\n  <!-- Dynamic Offer Pages -->\n`;
    for (const offer of offers) {
      const lastmod = formatDate(offer.updated_at || now);
      xml += `  <url>
    <loc>${BASE_URL}/offer/${offer.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>\n`;
    }
  }

  xml += `\n</urlset>`;

  return xml;
}

/**
 * Write sitemap to public directory
 */
async function writeSitemap() {
  try {
    const xml = await generateSitemap();
    fs.writeFileSync(OUTPUT_PATH, xml, 'utf8');
    console.log('✅ Sitemap generated successfully:', OUTPUT_PATH);
    console.log(`📊 Total URLs: ${(xml.match(/<url>/g) || []).length}`);
  } catch (error) {
    console.error('❌ Error generating sitemap:', error);
    process.exit(1);
  }
}

// Run
writeSitemap();
