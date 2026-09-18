import { titleCase } from '../../lib/format.js';

/*
 * Keyed by the same strings the API uses. A status the design has no colour
 * for still renders — as a neutral chip — rather than falling through to no
 * background at all, which is how a new status quietly becomes invisible.
 *
 * Teal for let and sold because they are the only states that mean "this is
 * over": they need to be legible as a group and unmistakable against the navy
 * that every live listing wears.
 */
const STATUS_CLASS = {
  draft: 'bg-dark-200 text-dark-700',
  pending: 'bg-secondary-100 text-secondary-800',
  published: 'bg-primary-100 text-primary-800',
  rejected: 'bg-red-100 text-red-800',
  let: 'bg-teal-100 text-teal-800',
  sold: 'bg-teal-100 text-teal-800',
  archived: 'bg-dark-200 text-dark-600',
};

const LABEL = { let: 'Let agreed', sold: 'Sold', pending: 'In review' };

export const StatusBadge = ({ status, className = '' }) => (
  <span
    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
      STATUS_CLASS[status] || 'bg-dark-200 text-dark-700'
    } ${className}`}
  >
    {LABEL[status] || titleCase(status)}
  </span>
);

export const Badge = ({ children, tone = 'neutral', className = '' }) => {
  const tones = {
    neutral: 'bg-dark-100 text-dark-700 dark:bg-dark-800 dark:text-dark-200',
    primary: 'bg-primary-100 text-primary-800',
    secondary: 'bg-secondary-100 text-secondary-900',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
};

export default Badge;
