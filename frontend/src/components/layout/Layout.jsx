import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header.jsx';
import Sidebar from './Sidebar.jsx';
import Footer from './Footer.jsx';
import { API_SLOW_EVENT, API_AWAKE_EVENT } from '../../api/apiClient.js';

/*
 * The API sleeps on Render's free plan and takes upwards of twenty seconds to
 * wake. Without a word on screen that is indistinguishable from a broken site,
 * so after four seconds we say what is actually happening.
 */
const WakingNotice = () => {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const onSlow = () => setSlow(true);
    const onAwake = () => setSlow(false);
    window.addEventListener(API_SLOW_EVENT, onSlow);
    window.addEventListener(API_AWAKE_EVENT, onAwake);
    return () => {
      window.removeEventListener(API_SLOW_EVENT, onSlow);
      window.removeEventListener(API_AWAKE_EVENT, onAwake);
    };
  }, []);

  if (!slow) return null;

  return (
    <div
      role="status"
      className="border-b border-secondary-200 bg-secondary-50 px-4 py-2 text-center text-sm text-secondary-900"
    >
      Waking the server up. The first request after a quiet spell takes a few seconds.
    </div>
  );
};

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

/*
 * Routes that get the frame but no rail.
 *
 * The sidebar's second group is the signed-in reader's own things, and its
 * first is four ways into the catalogue — neither is any use to someone part
 * way through signing in, and a form is easier to finish centred than pushed
 * against a navigation column.
 */
const BARE_ROUTES = ['/login', '/register', '/password'];

const isBare = (pathname) =>
  BARE_ROUTES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

/*
 * The app in a window, after Trillo: one framed surface on a coloured ground,
 * header across the top, navigation rail down the side, content filling the
 * rest. The frame goes full-bleed below 1500px, so the gradient is a wide-screen
 * flourish and never something a phone pays for.
 */
export const Layout = () => {
  const { pathname } = useLocation();
  const bare = isBare(pathname);

  return (
    <div className="app-frame flex flex-col">
      <ScrollToTop />

      {/*
       * The rail put roughly eight tab stops between the top of the page and
       * the content on every route, on top of the header's search and badges.
       * Same treatment as the portfolio's: invisible until focused, then a real
       * button in the top-left.
       */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-secondary-500 focus:px-4 focus:py-2 focus:font-semibold focus:text-dark-950"
      >
        Skip to content
      </a>

      <Header />
      <WakingNotice />

      <div className="flex flex-1 flex-col lg:flex-row">
        {bare ? null : <Sidebar />}
        <main id="main" tabIndex={-1} className="min-w-0 flex-1 bg-white outline-none dark:bg-dark-950">
          <Outlet />
        </main>
      </div>

      <Footer />
    </div>
  );
};

export default Layout;
