import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import useHeaderCounts from '../../hooks/useHeaderCounts.js';

/*
 * Trillo's header, which is three things and no navigation: the mark, one
 * search that owns the middle, and who you are on the right. The section links
 * it would otherwise carry live in the sidebar instead, so there is exactly one
 * place to look for a way through the app.
 */

const BadgeLink = ({ to, label, count, children }) => (
  <Link
    to={to}
    aria-label={count ? `${label} (${count})` : label}
    className="relative flex h-full items-center px-4 text-dark-600 transition-colors hover:bg-dark-100 hover:text-primary-700 dark:text-dark-300 dark:hover:bg-dark-800 dark:hover:text-primary-300"
  >
    {children}
    {count ? (
      <span
        aria-hidden="true"
        className="absolute right-2 top-3 grid h-[1.15rem] min-w-[1.15rem] place-items-center rounded-full bg-primary-600 px-1 text-[0.65rem] font-bold text-white"
      >
        {count > 99 ? '99+' : count}
      </span>
    ) : null}
  </Link>
);

export const Header = () => {
  const { user, logout, isAgent, isAdmin } = useAuth();
  const { saved, unread } = useHeaderCounts();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [menu, setMenu] = useState(false);
  const [term, setTerm] = useState(params.get('search') || '');
  const inputRef = useRef(null);

  // The box mirrors the URL it produced, so arriving on a filtered browse by
  // any other route — a sidebar item, the back button — does not leave a stale
  // term sitting in the field.
  useEffect(() => setTerm(params.get('search') || ''), [params]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setMenu(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const search = (event) => {
    event.preventDefault();
    const q = term.trim();
    navigate(q ? `/listings?search=${encodeURIComponent(q)}` : '/listings');
    inputRef.current?.blur();
  };

  const signOut = async () => {
    await logout();
    setMenu(false);
    navigate('/');
  };

  return (
    <header
      className="flex items-center justify-between gap-2 bg-white max-[36rem]:h-auto max-[36rem]:flex-wrap max-[36rem]:py-2 dark:bg-dark-900"
      style={{ borderBottom: 'var(--line)', height: 'var(--header-h)' }}
    >
      <Link to="/" className="flex shrink-0 items-center gap-2 px-4 sm:px-6">
        <img src="/logo.svg" alt="" width="32" height="32" className="h-8 w-8" />
        <span className="font-heading text-lg font-extrabold tracking-tight text-dark-900 dark:text-white">
          {/* Split for the two-tone wordmark, which also means the brand name
              never appears as one string here. A rename that greps for it will
              miss this line, so it is worth knowing it exists. */}
          Tafuta<span className="text-primary-700 dark:text-primary-300">Keja</span>
        </span>
      </Link>

      {/*
       * The input is laid out narrower than its track and the button is pulled
       * back over its tail, so focus can widen the field to full without the
       * button moving. That negative margin is the whole trick.
       */}
      <form
        onSubmit={search}
        role="search"
        className="flex basis-2/5 items-center justify-center max-[36rem]:order-1 max-[36rem]:mt-2 max-[36rem]:basis-full max-[36rem]:px-4"
      >
        <label htmlFor="site-search" className="sr-only">
          Search properties
        </label>
        <input
          ref={inputRef}
          id="site-search"
          type="search"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search an estate, town or property"
          className="peer w-[90%] rounded-full border-0 bg-dark-100 px-5 py-2 text-sm text-dark-900 transition-all placeholder:text-dark-500 focus:w-full focus:bg-dark-200 focus:ring-0 max-[36rem]:w-full dark:bg-dark-800 dark:text-dark-100 dark:focus:bg-dark-700"
          style={{ marginRight: '-3rem' }}
        />
        <button
          type="submit"
          aria-label="Search"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-dark-500 transition-colors peer-focus:text-primary-700 active:translate-y-px dark:peer-focus:text-primary-300"
        >
          <svg viewBox="0 0 24 24" className="h-[1.15rem] w-[1.15rem]" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
        </button>
      </form>

      <nav aria-label="Account" className="flex h-full shrink-0 items-center self-stretch">
        {user ? (
          <>
            <BadgeLink to="/saved" label="Saved properties" count={saved}>
              <svg viewBox="0 0 24 24" className="h-[1.35rem] w-[1.35rem]" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 4h12a1 1 0 011 1v15l-7-4-7 4V5a1 1 0 011-1z" />
              </svg>
            </BadgeLink>

            <BadgeLink to="/enquiries" label="Messages" count={unread}>
              <svg viewBox="0 0 24 24" className="h-[1.35rem] w-[1.35rem]" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 12a8 8 0 01-8 8H7l-4 3 1.2-4.4A8 8 0 1121 12z" />
              </svg>
            </BadgeLink>

            <div className="relative h-full">
              <button
                type="button"
                onClick={() => setMenu((v) => !v)}
                aria-expanded={menu}
                aria-haspopup="menu"
                className="flex h-full items-center gap-2 px-4 text-sm font-medium transition-colors hover:bg-dark-100 dark:hover:bg-dark-800"
              >
                <span className="grid h-9 w-9 place-items-center rounded-full bg-primary-700 text-xs font-bold text-white">
                  {user.initials || user.name?.[0]?.toUpperCase()}
                </span>
                <span className="hidden sm:inline">{user.name?.split(' ')[0]}</span>
              </button>

              {menu ? (
                <>
                  {/* A click-catcher rather than a document listener: it cannot
                      race with the toggle button's own click. */}
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-hidden="true"
                    className="fixed inset-0 z-30 cursor-default"
                    onClick={() => setMenu(false)}
                  />
                  <div
                    role="menu"
                    className="absolute right-0 z-40 mt-1 w-52 overflow-hidden rounded-xl border border-dark-200 bg-white py-1 shadow-card-hover dark:border-dark-800 dark:bg-dark-900"
                  >
                    {[
                      ['/profile', 'Profile'],
                      ...(isAgent ? [['/agent', 'My listings']] : []),
                      ...(isAdmin ? [['/admin', 'Admin']] : []),
                      ['/about', 'About TafutaKeja'],
                    ].map(([to, label]) => (
                      <Link
                        key={to}
                        to={to}
                        role="menuitem"
                        onClick={() => setMenu(false)}
                        className="block px-4 py-2 text-sm text-dark-700 hover:bg-dark-100 dark:text-dark-200 dark:hover:bg-dark-800"
                      >
                        {label}
                      </Link>
                    ))}
                    <button
                      type="button"
                      role="menuitem"
                      onClick={signOut}
                      className="block w-full border-t border-dark-200 px-4 py-2 text-left text-sm text-dark-700 hover:bg-dark-100 dark:border-dark-800 dark:text-dark-200 dark:hover:bg-dark-800"
                    >
                      Sign out
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 px-4 sm:px-6">
            <Link to="/login" className="btn-ghost hidden sm:inline-flex">
              Sign in
            </Link>
            <Link to="/register" className="btn-primary">
              Get started
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
};

export default Header;
