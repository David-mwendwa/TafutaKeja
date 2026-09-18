import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { shouldHydrate } from './lib/hydration.js';
import './index.css';

const container = document.getElementById('root');

const tree = (
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);

/*
 * A non-empty #root is NOT permission to hydrate.
 *
 * Netlify answers any path it has no file for with the SPA fallback, which is
 * index.html — the prerendered *landing page*, markup and all. So a plain
 * `hasChildNodes()` check reconciles the landing page against whatever route
 * the reader actually asked for: React throws the document away and logs error
 * #418 on every non-prerendered route, silently undoing the prerender it was
 * meant to exploit.
 *
 * The prerender stamps each file with the path it was rendered for, and the
 * markup is only adopted when that matches where we actually are.
 */
if (
  shouldHydrate(
    container.dataset.prerendered,
    window.location.pathname,
    container.hasChildNodes()
  )
) {
  hydrateRoot(container, tree);
} else {
  createRoot(container).render(tree);
}
