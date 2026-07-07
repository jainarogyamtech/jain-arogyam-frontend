
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: '.', // Ensures Vite treats the root as the project folder
  build: {
    outDir: 'dist', // Output folder (relative to the project root)
    emptyOutDir: true, // Clears the output directory before building
  },
  server: {
    historyApiFallback: true, // Ensures that SPA routing (React Router) works on page reload
    // proxy: {
    //   '/api': {
    //     target: 'http://localhost:5001',
    //     changeOrigin: true, 
    //     rewrite: (path) => path.replace(/^\/api/, ''), 
    //   },
    // },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  base: '/', // Set the base path (adjust if needed for subdirectories)
});
