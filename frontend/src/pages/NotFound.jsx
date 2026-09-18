import { Link } from 'react-router-dom';
import usePageMeta from '../hooks/usePageMeta.js';

export const NotFound = () => {
  usePageMeta({
    title: 'Page not found',
    description: 'That page does not exist.',
    robots: 'noindex, follow',
  });

  return (
    <div className="container grid min-h-[60vh] place-items-center py-16 text-center">
      <div>
        <p className="font-heading text-6xl font-extrabold text-primary-700 dark:text-primary-300">404</p>
        <h1 className="mt-4 font-heading text-2xl font-extrabold">We could not find that page</h1>
        <p className="mx-auto mt-2 max-w-md text-dark-600 dark:text-dark-400">
          The link may be out of date, or the property may have been taken off the market.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/" className="btn-outline">Go home</Link>
          <Link to="/listings" className="btn-primary">Browse properties</Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
