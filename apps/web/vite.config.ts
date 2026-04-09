import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    // Optional: Setup a proxy here later when your local backend is ready
    // proxy: {
    //   '/api': 'http://localhost:3000' 
    // }
  }
});