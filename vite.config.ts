import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import fs from 'fs'

// SSG mode detection - enable with `pnpm build:ssg`
const isSsgBuild = process.env.VITE_SSG === 'true'

/**
 * Plugin to inject build version into index.html
 * This ensures cache invalidation on every deployment
 */
function injectBuildVersion(): Plugin {
  // Generate version: YYYYMMDDHHmmss format
  const buildVersion = new Date()
    .toISOString()
    .replace(/[-:T]/g, '')
    .slice(0, 14);

  console.log(`🔧 Build version: ${buildVersion}`);

  return {
    name: 'inject-build-version',

    // Update index.html version meta tag
    closeBundle() {
      const htmlPath = path.resolve(__dirname, 'dist/index.html');
      if (fs.existsSync(htmlPath)) {
        let html = fs.readFileSync(htmlPath, 'utf-8');
        html = html.replace(
          /<meta name="version" content="[^"]*" \/>/,
          `<meta name="version" content="${buildVersion}" />`
        );
        fs.writeFileSync(htmlPath, html, 'utf-8');
        console.log('✅ Updated index.html version meta tag to:', buildVersion);
      }
    }
  };
}

export default defineConfig({
  // SSG mode uses vite-ssg's preset, standard mode uses custom plugins
  ssgOptions: isSsgBuild ? {
    script: 'async',
    formatting: 'prettify',
    crittersOptions: {
      reduceInlineStyles: false,
    },
    // Only prerender public pages (no auth required)
    includedRoutes: [
      '/',
      '/terms',
      '/privacy',
      '/contact',
      '/partner-application',
    ],
    onBeforePageRender: (_route: string, _indexHTML: string, { transformState }: any) => {
      // Clear any auth state before SSG
      transformState((state: any) => {
        delete state?.user
        delete state?.isAuthenticated
        return state
      })
    },
  } : undefined,
  plugins: [
    react(),
    injectBuildVersion(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'grain.png'],
      manifest: {
        name: 'SmartPick - Save Money on Food',
        short_name: 'SmartPick',
        description: 'Discover surplus food deals from local restaurants and shops',
        theme_color: '#10b981',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: '/apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,svg,woff,woff2}'],
        globIgnores: ['**/1.png', '**/grain.png'], // Exclude large images
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3MB limit
        runtimeCaching: [
          {
            // Supabase API - Network First (fresh data priority)
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 // 1 hour
              },
              cacheableResponse: {
                statuses: [0, 200]
              },
              networkTimeoutSeconds: 10
            }
          },
          {
            // Google Maps API - Cache First (tiles rarely change)
            urlPattern: /^https:\/\/maps\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-maps-api',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 1 week
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Google Maps tiles - Cache First (static images)
            urlPattern: /^https:\/\/maps\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-maps-tiles',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Image assets - Cache First with fallback
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 1 week
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Font files - Cache First (static)
            urlPattern: /\.(?:woff|woff2|ttf|otf)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'font-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ],
        navigateFallback: null, // Let app handle routing
        cleanupOutdatedCaches: true
      },
      devOptions: {
        enabled: false // Disable in development for faster reload
      }
    })
  ],
  optimizeDeps: {
    exclude: ['@marsidev/react-turnstile'],
    include: ['maplibre-gl'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Explicitly specify public directory (default is 'public', but being explicit helps)
  publicDir: 'public',
  server: {
    proxy: {
      '/api': {
        target: 'https://smartpick.ge',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    // Ensure clean builds - remove old chunks
    emptyOutDir: true,
    // Increase chunk size warning limit (we're splitting properly)
    chunkSizeWarningLimit: 600,
    // Fix for MapLibre GL mixed ES modules
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    // Generate unique hashes for all assets
    rollupOptions: {
      output: {
        // More aggressive chunk hashing
        entryFileNames: `assets/[name]-[hash].js`,
        chunkFileNames: `assets/[name]-[hash].js`,
        assetFileNames: `assets/[name]-[hash].[ext]`,
        // Manual chunks for optimal code splitting
        manualChunks(id) {
          // Charts - lazy loaded for analytics (check first to avoid react-chartjs-2 going to react-vendor)
          if (id.includes('chart.js') || id.includes('react-chartjs-2')) {
            return 'chart-vendor';
          }
          
          // Lucide icons - large icon library (check before react)
          if (id.includes('lucide-react')) {
            return 'icons-vendor';
          }
          
          // React Query - data fetching (check before react)
          if (id.includes('@tanstack/react-query')) {
            return 'query-vendor';
          }
          
          // Core React libraries - only core packages
          if (id.includes('node_modules/react/') || 
              id.includes('node_modules/react-dom/') || 
              id.includes('node_modules/react-router-dom/') ||
              id.includes('node_modules/react-router/')) {
            return 'react-vendor';
          }
          
          // Radix UI components - large UI library
          if (id.includes('@radix-ui')) {
            return 'ui-vendor';
          }
          
          // Supabase - database client
          if (id.includes('@supabase')) {
            return 'supabase-vendor';
          }
          
          // Leaflet - map library (152 KB!) - ONLY pure leaflet, not react-leaflet
          if (id.includes('leaflet') && !id.includes('react-leaflet')) {
            return 'leaflet-vendor';
          }
          
          // Google Maps clustering
          if (id.includes('@googlemaps')) {
            return 'maps-vendor';
          }
          
          // Framer Motion - animations
          if (id.includes('framer-motion')) {
            return 'animation-vendor';
          }
          
          // Zod validation
          if (id.includes('zod')) {
            return 'validation-vendor';
          }
          
          // Date utilities
          if (id.includes('date-fns')) {
            return 'date-vendor';
          }
        }
      }
    },
    // Remove console.log from production builds
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,  // Remove all console.* calls
        drop_debugger: true,  // Remove debugger statements
        pure_funcs: ['console.log', 'console.debug', 'console.info']  // Specific removal
      }
    }
  }
})
