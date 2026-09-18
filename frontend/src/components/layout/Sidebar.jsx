import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { site } from '../../data/site.js';

/*
 * The app's primary navigation, in Trillo's shape: a dark rail whose items each
 * grow an accent bar from nothing on hover (`.side-nav-item` in index.css).
 *
 * The top group is what you are looking for, not where you are in the app —
 * every item is a real filtered browse, so the rail doubles as the four entry
 * points into the catalogue. The second group only exists once there is an
 * account to hang it on; showing a signed-out visitor a "Saved" link that leads
 * to a login wall is a rail of dead ends.
 */
const ICONS = {
  rent: 'M7 21h10a2 2 0 002-2V9.5L12 4 5 9.5V19a2 2 0 002 2zm3-2v-5h4v5',
  sale: 'M3 12V6a1 1 0 011-1h6l10 10-7 7L3 12zm4.5-4.5h.01',
  land: 'M9 4l6 2 5-2v14l-5 2-6-2-5 2V6l5-2zm0 0v14m6-12v14',
  commercial: 'M4 21h16M6 21V5a1 1 0 011-1h5a1 1 0 011 1v16M13 21V10h4a1 1 0 011 1v10M9 8h.01M9 12h.01M9 16h.01',
  saved: 'M6 4h12a1 1 0 011 1v15l-7-4-7 4V5a1 1 0 011-1z',
  messages: 'M21 12a8 8 0 01-8 8H7l-4 3 1.2-4.4A8 8 0 1121 12z',
  agent: 'M4 19V9m5 10V5m5 14v-7m5 7V8',
  admin: 'M12 3l8 3v6c0 4.5-3.2 7.9-8 9-4.8-1.1-8-4.5-8-9V6l8-3zm-2.5 9l2 2 4-4',
};

const Icon = ({ name }) => (
  <svg
    viewBox="0 0 24 24"
    className="h-5 w-5 shrink-0 sm:h-[1.35rem] sm:w-[1.35rem]"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={ICONS[name]} />
  </svg>
);

/* A browse item is current when the reader is on /listings with that item's own
 * filter applied — `purpose=rent` and `propertyType=land` are different places
 * even though they share a pathname, so matching on pathname alone would light
 * up all four at once. */
const browseItem = (label, icon, key, value) => ({
  label,
  icon,
  to: `/listings?${key}=${value}`,
  isCurrent: (pathname, params) => pathname === '/listings' && params.get(key) === value,
});

const BROWSE = [
  browseItem('To let', 'rent', 'purpose', 'rent'),
  browseItem('For sale', 'sale', 'purpose', 'sale'),
  browseItem('Land', 'land', 'propertyType', 'land'),
  browseItem('Commercial', 'commercial', 'propertyType', 'commercial'),
];

const pathItem = (label, icon, to) => ({
  label,
  icon,
  to,
  isCurrent: (pathname) => pathname === to || pathname.startsWith(`${to}/`),
});

export const Sidebar = ({ onNavigate }) => {
  const { user, isAgent, isAdmin } = useAuth();
  const { pathname, search } = useLocation();
  const params = new URLSearchParams(search);

  const account = user
    ? [
        pathItem('Saved', 'saved', '/saved'),
        pathItem('Messages', 'messages', '/enquiries'),
        ...(isAgent ? [pathItem('My listings', 'agent', '/agent')] : []),
        ...(isAdmin ? [pathItem('Admin', 'admin', '/admin')] : []),
      ]
    : [];

  const renderGroup = (items) =>
    items.map((item) => {
      const current = item.isCurrent(pathname, params);
      return (
        <li key={item.to} className="side-nav-item flex-1 lg:flex-none" data-active={current}>
          <Link
            to={item.to}
            onClick={onNavigate}
            aria-current={current ? 'page' : undefined}
            className="side-nav-link max-lg:flex-col max-lg:justify-center max-lg:gap-1.5 max-lg:px-2 max-lg:py-3 max-lg:text-[0.65rem] max-lg:tracking-normal"
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </Link>
        </li>
      );
    });

  /*
   * The dark column and the navigation inside it are separate elements on
   * purpose. The column is a flex child of the content row, so it stretches to
   * whatever the page beside it is tall — without that the rail stops at one
   * screen and leaves a pale stub under it on every long page. The nav then
   * sticks within that column, and the legal line sits at its foot, which is
   * where Trillo puts it.
   */
  return (
    <div className="flex flex-col bg-primary-950 lg:w-[15rem] lg:shrink-0">
      <nav
        aria-label="Sections"
        className="lg:sticky lg:top-0 lg:max-h-screen lg:overflow-y-auto lg:pt-6"
      >
        <ul className="flex list-none lg:block">{renderGroup(BROWSE)}</ul>

        {account.length ? (
          <ul className="flex list-none border-dark-800 max-lg:border-l lg:mt-6 lg:block lg:border-t lg:pt-6">
            {renderGroup(account)}
          </ul>
        ) : null}
      </nav>

      {/* No room for it once the rail is a horizontal strip on a phone, so it
          is hidden there rather than wrapped under the icons — the footer
          carries the same line for those readers. */}
      <p className="mt-auto hidden px-6 py-8 text-center text-xs text-dark-400 lg:block">
        &copy; {new Date().getFullYear()} {site.name}. All rights reserved.
      </p>
    </div>
  );
};

export default Sidebar;
