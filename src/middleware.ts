import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  // Supported languages
  locales: ['en', 'ka', 'ru'],

  // Default language
  defaultLocale: 'en'
});

// Apply middleware to all pages except system paths
export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)']
};