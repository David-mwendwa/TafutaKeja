const TONES = {
  error: 'border-red-200 bg-red-50 text-red-800',
  success: 'border-primary-200 bg-primary-50 text-primary-900',
  info: 'border-secondary-200 bg-secondary-50 text-secondary-900',
};

export const Alert = ({ tone = 'error', children, className = '' }) =>
  children ? (
    <div
      // Errors are announced; a success note is not urgent enough to interrupt
      // whatever a screen reader is currently saying.
      role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-lg border px-4 py-3 text-sm ${TONES[tone]} ${className}`}
    >
      {children}
    </div>
  ) : null;

export default Alert;
