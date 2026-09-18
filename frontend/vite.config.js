import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/*
 * The shell's comments explain the tags under them and are worth keeping in the
 * repo — but they are markup, so Vite hands index.html to the browser verbatim
 * and they show up in view-source and the Elements panel. The build already
 * strips them on the way into `dist`; this runs in dev as well, so what is
 * inspected on localhost is what ships.
 *
 * Only the shell, and never a conditional comment: `<!--[if ...]>` is a
 * directive to the browser, not a note to a developer.
 */
const stripShellComments = () => ({
  name: 'strip-shell-comments',
  transformIndexHtml: {
    order: 'pre',
    handler: (html) =>
      html.replace(/\n?[ \t]*<!--(?!\[if)[\s\S]*?-->/g, '').replace(/\n{3,}/g, '\n\n'),
  },
});

export default defineConfig({
  plugins: [react(), stripShellComments()],
  server: {
    // Pinned so the backend's CORS allowlist has a stable origin to match, and
    // kept clear of 5000, which macOS AirPlay Receiver holds. Change this and
    // FRONTEND_URL in backend/.env together, or every request fails as a CORS
    // error that reads like an application bug.
    port: 5013,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Leaflet is only ever drawn on the listing page and the map search.
          // Left unsplit it rides along in the entry chunk, so every reader who
          // never opens a map still downloads the whole mapping library.
          if (id.includes('leaflet')) return 'leaflet';
          if (id.includes('react-router')) return 'router';
          if (id.includes('node_modules/react')) return 'react';
          return undefined;
        },
      },
    },
  },
});
