import { Link } from 'react-router-dom';

/*
 * Stroke paths on a 24px grid, drawn to the same weight as the navigation
 * rail's so the two sets read as one family.
 */
const ICONS = {
  edit: 'M4 20h4L18.5 9.5a2.12 2.12 0 00-3-3L5 17v3zM14.5 7.5l2 2',
  view: 'M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12zm10 2.2a2.2 2.2 0 100-4.4 2.2 2.2 0 000 4.4z',
  submit: 'M12 15.5V4m0 0L8 8m4-4l4 4M4 16v3a2 2 0 002 2h12a2 2 0 002-2v-3',
  draft: 'M9 14.5L4 9.5l5-5M4 9.5h11a5 5 0 010 10h-3',
  let: 'M20 7.5a4 4 0 11-5.4 3.7L9 16.8V19H6v-3l3.2-3.2A4 4 0 0120 7.5zm-2.6-.1h.01',
  sold: 'M20.6 13.4l-7.2 7.2a2 2 0 01-2.8 0l-7.2-7.2A2 2 0 013 12V5a2 2 0 012-2h7a2 2 0 011.4.6l7.2 7.2a2 2 0 010 2.8zM7.6 7.6h.01',
  archive: 'M3 6.5h18v3.5H3V6.5zm2 3.5V19a1 1 0 001 1h12a1 1 0 001-1v-9M9.5 13.5h5',
  delete: 'M4 7h16M9.5 7V5.2a1 1 0 011-1h3a1 1 0 011 1V7M6 7v12a1.8 1.8 0 001.8 1.8h8.4A1.8 1.8 0 0018 19V7M10 11v6M14 11v6',
  approve: 'M12 21a9 9 0 100-18 9 9 0 000 18zm-3.6-9.3l2.5 2.5 4.7-4.7',
  reject: 'M12 21a9 9 0 100-18 9 9 0 000 18zM9.2 9.2l5.6 5.6m0-5.6l-5.6 5.6',
  verify: 'M12 3l8 3v6c0 4.5-3.2 7.9-8 9-4.8-1.1-8-4.5-8-9V6l8-3zm-2.6 8.9l2.1 2.1 4.1-4.1',
  unverify: 'M12 3l8 3v6c0 4.5-3.2 7.9-8 9-4.8-1.1-8-4.5-8-9V6l8-3zM9.6 9.6l4.8 4.8m0-4.8l-4.8 4.8',
  promote: 'M14 20v-1a4 4 0 00-4-4H6a4 4 0 00-4 4v1M8 11.5a3.8 3.8 0 100-7.6 3.8 3.8 0 000 7.6zM18.5 8.5v6M21.5 11.5h-6',
  demote: 'M14 20v-1a4 4 0 00-4-4H6a4 4 0 00-4 4v1M8 11.5a3.8 3.8 0 100-7.6 3.8 3.8 0 000 7.6zM21.5 11.5h-6',
};

const TONE = { default: '', primary: 'icon-btn--primary', danger: 'icon-btn--danger' };

/**
 * An action reduced to its icon, with the words one hover or one tab away.
 *
 * Row actions were six text buttons stacked beside every listing, which read as
 * a wall rather than as controls. The label does not disappear when the text
 * does: it is the `aria-label`, so a screen reader announces exactly what it
 * announced before, and it is the tooltip, which is shown on focus as well as
 * on hover so it is reachable without a mouse.
 *
 * Anything whose icon cannot carry the whole meaning on its own still opens a
 * dialog that names the action in words before it happens, which is the real
 * safety net on a touch screen where there is no hover at all.
 */
export const IconButton = ({
  icon,
  label,
  tone = 'default',
  to,
  onClick,
  disabled,
  className = '',
}) => {
  const body = (
    <>
      <svg
        viewBox="0 0 24 24"
        className="h-[1.15rem] w-[1.15rem]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={ICONS[icon]} />
      </svg>
      {/* Hidden from the accessibility tree: the button already carries the
          same words as its name, and announcing them twice is worse than not
          styling them at all. */}
      <span className="icon-btn__tip" aria-hidden="true">
        {label}
      </span>
    </>
  );

  const classes = `icon-btn ${TONE[tone] || ''} ${className}`;

  if (to) {
    return (
      <Link to={to} aria-label={label} className={classes}>
        {body}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} className={classes}>
      {body}
    </button>
  );
};

export default IconButton;
