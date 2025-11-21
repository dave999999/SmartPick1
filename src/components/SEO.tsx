import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  ogType?: string;
  ogImage?: string;
}

export function SEO({
  title = 'SmartPick - Smart Reservations from Local Partners',
  description = 'Reserve exclusive deals from local bakeries, cafes, and restaurants in Georgia. Save with SmartPoints and enjoy fresh products with SmartPick.',
  keywords = 'SmartPick, Georgia, reservations, food deals, bakery, cafe, restaurant, SmartPoints, discount',
  canonical,
  ogType = 'website',
  ogImage = 'https://smartpick.ge/og-image.png',
}: SEOProps) {
  const location = useLocation();

  useEffect(() => {
    // Update document title
    document.title = title;

    // Update or create meta tags
    const updateMetaTag = (name: string, content: string, isProperty = false) => {
      const attribute = isProperty ? 'property' : 'name';
      let element = document.querySelector(`meta[${attribute}="${name}"]`);

      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }

      element.setAttribute('content', content);
    };

    // Standard meta tags
    updateMetaTag('description', description);
    updateMetaTag('keywords', keywords);

    // Open Graph tags
    updateMetaTag('og:title', title, true);
    updateMetaTag('og:description', description, true);
    updateMetaTag('og:type', ogType, true);
    updateMetaTag('og:image', ogImage, true);
    updateMetaTag('og:url', canonical || `https://smartpick.ge${location.pathname}`, true);

    // Twitter Card tags
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', title);
    updateMetaTag('twitter:description', description);
    updateMetaTag('twitter:image', ogImage);

    // Canonical URL
    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = canonical || `https://smartpick.ge${location.pathname}`;

  }, [title, description, keywords, canonical, ogType, ogImage, location.pathname]);

  return null; // This component doesn't render anything
}
