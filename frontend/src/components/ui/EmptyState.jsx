export const EmptyState = ({ title, children, action }) => (
  <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
    <p className="font-heading text-lg font-bold text-dark-800 dark:text-dark-100">{title}</p>
    {children ? (
      <p className="max-w-md text-sm text-dark-600 dark:text-dark-400">{children}</p>
    ) : null}
    {action}
  </div>
);

export default EmptyState;
