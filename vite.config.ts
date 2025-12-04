import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'
import fs from 'fs'

/**
 * Plugin to inject build version into service worker and index.html
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

    // Transform service-worker.js during build
    transform(code: string, id: string) {
      if (id.includes('service-worker.js')) {
        const transformed = code.replace(/__BUILD_VERSION__/g, buildVersion);
        console.log('✅ Injected version into service-worker.js');
        return transformed;
      }
      return null;
    },

    // Also update the public/service-worker.js in dist after build
    closeBundle() {
      const swPath = path.resolve(__dirname, 'dist/service-worker.js');

      if (fs.existsSync(swPath)) {
        let content = fs.readFileSync(swPath, 'utf-8');
        content = content.replace(/__BUILD_VERSION__/g, buildVersion);
        fs.writeFileSync(swPath, content, 'utf-8');
        console.log('✅ Updated service-worker.js in dist with version:', buildVersion);
      }

      // Update index.html version meta tag
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
  plugins: [
    react(),
    injectBuildVersion()
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
          
          // Leaflet - map library (152 KB!)
          if (id.includes('leaflet')) {
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
