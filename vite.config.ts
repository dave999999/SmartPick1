import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

// Vite defaults already produce hashed asset filenames and sensible caching.
// Keep config minimal to avoid clashes with hosting/CDN behavior.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
