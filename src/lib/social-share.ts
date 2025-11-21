import { Offer } from './types';
import { resolveOfferImageUrl } from './api';

/**
 * Updates Open Graph meta tags for social sharing
 */
export function updateMetaTags(offer: Offer) {
  const baseUrl = window.location.origin;
  let imageUrl = offer.images && offer.images.length > 0
    ? resolveOfferImageUrl(offer.images[0], offer.category, { width: 800, quality: 85 })
    : `${baseUrl}/icon1.png`;

  // Make sure the image URL is absolute
  if (imageUrl && !imageUrl.startsWith('http')) {
    imageUrl = `${baseUrl}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
  }

  const savings = ((1 - offer.smart_price / offer.original_price) * 100).toFixed(0);
  const title = `${offer.title} - Save ${savings}% | SmartPick`;
  const description = `${offer.description} | Original: ${offer.original_price} GEL → Smart Price: ${offer.smart_price} GEL at ${offer.partner?.business_name || 'SmartPick'}`;

  // Update or create meta tags
  const metaTags = [
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:image', content: imageUrl },
    { property: 'og:type', content: 'product' },
    { property: 'og:url', content: window.location.href },
    { property: 'og:site_name', content: 'SmartPick' },
    { property: 'product:price:amount', content: offer.smart_price.toString() },
    { property: 'product:price:currency', content: 'GEL' },
    { property: 'product:original_price:amount', content: offer.original_price.toString() },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    { name: 'twitter:image', content: imageUrl },
  ];

  metaTags.forEach(({ property, name, content }) => {
    const selector = property ? `meta[property="${property}"]` : `meta[name="${name}"]`;
    let element = document.querySelector(selector);

    if (!element) {
      element = document.createElement('meta');
      if (property) {
        element.setAttribute('property', property);
      } else if (name) {
        element.setAttribute('name', name);
      }
      document.head.appendChild(element);
    }

    element.setAttribute('content', content);
  });
}

/**
 * Generate share URLs for social media
 */
export function generateShareUrls(offer: Offer, currentUrl: string) {
  const savings = ((1 - offer.smart_price / offer.original_price) * 100).toFixed(0);

  // Encode URL
  const encodedUrl = encodeURIComponent(currentUrl);

  // Facebook
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;

  // Twitter with custom text
  const twitterText = encodeURIComponent(
    `🔥 Amazing deal on SmartPick! ${offer.title}\n` +
    `💰 Save ${savings}%: ${offer.original_price} GEL → ${offer.smart_price} GEL\n` +
    `📍 ${offer.partner?.business_name || 'Local partner'}`
  );
  const twitterUrl = `https://twitter.com/intent/tweet?text=${twitterText}&url=${encodedUrl}`;

  // WhatsApp
  const whatsappText = encodeURIComponent(
    `Check out this deal on SmartPick!\n\n` +
    `${offer.title}\n` +
    `Original: ${offer.original_price} GEL\n` +
    `Smart Price: ${offer.smart_price} GEL (Save ${savings}%!)\n\n` +
    currentUrl
  );
  const whatsappUrl = `https://wa.me/?text=${whatsappText}`;

  return {
    facebook: facebookUrl,
    twitter: twitterUrl,
    whatsapp: whatsappUrl,
  };
}
