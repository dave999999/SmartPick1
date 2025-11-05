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
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Ensure clean builds - remove old chunks
    emptyOutDir: true,
    // Generate unique hashes for all assets
    rollupOptions: {
      output: {
        // More aggressive chunk hashing
        entryFileNames: `assets/[name]-[hash].js`,
        chunkFileNames: `assets/[name]-[hash].js`,
        assetFileNames: `assets/[name]-[hash].[ext]`
      }
    }
  }
})
