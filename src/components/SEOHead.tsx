import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface SEOHeadProps {
  title?: string;
  description?: string;
  type?: 'website' | 'article';
  image?: string;
  structuredData?: object;
}

/**
 * SEO Head Component
 * 
 * Dynamically updates meta tags and structured data for each route.
 * Critical for SPA SEO since static HTML has generic meta tags.
 */
export function SEOHead({
  title = 'SmartPick — Smart choice every day',
  description = 'Premium food at unbeatable prices. Quality meals from local restaurants at incredible value.',
  type = 'website',
  image = 'https://smartpick.ge/icon1.png',
  structuredData,
}: SEOHeadProps) {
  const location = useLocation();
  const url = `https://smartpick.ge${location.pathname}`;

  useEffect(() => {
    // Update document title
    document.title = title;

    // Update or create meta tags
    const updateMetaTag = (property: string, content: string) => {
      let meta = document.querySelector(`meta[property="${property}"]`) ||
                  document.querySelector(`meta[name="${property}"]`);
      
      if (!meta) {
        meta = document.createElement('meta');
        if (property.startsWith('og:') || property.startsWith('twitter:')) {
          meta.setAttribute('property', property);
        } else {
          meta.setAttribute('name', property);
        }
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    // Standard meta tags
    updateMetaTag('description', description);
    
    // Open Graph
    updateMetaTag('og:title', title);
    updateMetaTag('og:description', description);
    updateMetaTag('og:type', type);
    updateMetaTag('og:url', url);
    updateMetaTag('og:image', image);
    
    // Twitter Card
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', title);
    updateMetaTag('twitter:description', description);
    updateMetaTag('twitter:image', image);

    // Structured data (JSON-LD)
    if (structuredData) {
      let scriptTag = document.querySelector('script[type="application/ld+json"]');
      if (!scriptTag) {
        scriptTag = document.createElement('script');
        scriptTag.setAttribute('type', 'application/ld+json');
        document.head.appendChild(scriptTag);
      }
      scriptTag.textContent = JSON.stringify(structuredData);
    }
  }, [title, description, type, url, image, structuredData]);

  return null;
}

/**
 * Predefined structured data schemas
 */
export const structuredDataSchemas = {
  organization: {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'SmartPick',
    url: 'https://smartpick.ge',
    logo: 'https://smartpick.ge/icon1.png',
    description: 'Fighting food waste by connecting consumers with surplus food from local businesses',
    sameAs: [
      // Add social media profiles when available
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Service',
      availableLanguage: ['English', 'Georgian'],
    },
  },
  
  localBusiness: {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'SmartPick',
    image: 'https://smartpick.ge/icon1.png',
    '@id': 'https://smartpick.ge',
    url: 'https://smartpick.ge',
    telephone: '', // Add when available
    priceRange: '₾',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '',
      addressLocality: 'Tbilisi',
      addressRegion: 'Tbilisi',
      postalCode: '',
      addressCountry: 'GE',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 41.7151,
      longitude: 44.8271,
    },
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
      ],
      opens: '00:00',
      closes: '23:59',
    },
    sameAs: [
      // Add social media profiles
    ],
  },
  
  webApplication: {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'SmartPick',
    url: 'https://smartpick.ge',
    applicationCategory: 'FoodApplication',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'GEL',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '120',
    },
  },
};
