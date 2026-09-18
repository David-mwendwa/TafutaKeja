import { Link } from 'react-router-dom';
import { site } from '../../data/site.js';

const COLUMNS = [
  {
    title: 'Browse',
    links: [
      ['/listings?purpose=rent', 'Property to let'],
      ['/listings?purpose=sale', 'Property for sale'],
      ['/listings?propertyType=land', 'Land and plots'],
      ['/listings?propertyType=commercial', 'Commercial space'],
    ],
  },
  /*
   * Static, unlike the landing page's area list, which comes from the
   * catalogue. The footer renders on every route including the prerendered
   * ones, and four links are not worth an API call per page view — so these
   * are the four largest markets, which will not empty out. The label is the
   * area alone: the county belongs to the listing, not to the link.
   */
  {
    title: 'Popular areas',
    links: [
      ['/listings?area=Westlands', 'Westlands'],
      ['/listings?area=Kilimani', 'Kilimani'],
      ['/listings?area=Karen', 'Karen'],
      ['/listings?area=Nyali', 'Nyali'],
    ],
  },
  {
    title: 'TafutaKeja',
    links: [
      ['/about', 'About'],
      ['/register?role=agent', 'List your property'],
      ['/login', 'Sign in'],
    ],
  },
];

export const Footer = () => (
  <footer className="mt-16 border-t border-dark-200 bg-white dark:border-dark-800 dark:bg-dark-950">
    <div className="container grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.svg" alt="" width="28" height="28" className="h-7 w-7" />
          <span className="font-heading text-base font-extrabold">TafutaKeja</span>
        </Link>
        <p className="mt-3 max-w-xs text-sm text-dark-600 dark:text-dark-400">{site.tagline}.</p>
      </div>

      {COLUMNS.map((column) => (
        <div key={column.title}>
          <h2 className="mb-3 text-sm font-bold text-dark-900 dark:text-dark-100">{column.title}</h2>
          <ul className="space-y-2">
            {column.links.map(([to, label]) => (
              <li key={to}>
                <Link
                  to={to}
                  className="text-sm text-dark-600 hover:text-primary-700 dark:text-dark-400 dark:hover:text-primary-300"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>

    {/* "Developed by David ↗" is the same treatment as BazaarKE, furniworld,
        TaliiKE and the rest: the portfolio link, not the GitHub profile, and
        the external-link glyph after the name rather than a bare arrow. */}
    <div className="border-t border-dark-200 py-5 dark:border-dark-800">
      <div className="container flex flex-wrap items-center justify-between gap-2 text-xs text-dark-500">
        <p>
          &copy; {new Date().getFullYear()} {site.name}. All rights reserved.
        </p>
        <p className="flex items-center gap-1">
          Developed by
          <a
            href="https://techdave.dev/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-primary-700 transition-colors hover:text-primary-900 dark:text-primary-300 dark:hover:text-primary-200"
          >
            David
            <svg
              viewBox="0 0 24 24"
              className="h-3 w-3"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M7 17L17 7M17 7H7M17 7V17" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;
