import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Spinner from './ui/Spinner.jsx';

/**
 * Gates a branch of the route tree.
 *
 * `loading` is handled here rather than in the provider on purpose: holding the
 * whole app behind the session check blanks every public page until it answers,
 * which on a cold-started API is twenty seconds of nothing and makes every
 * public route prerender to an empty document.
 */
export const ProtectedRoute = ({ roles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Only wait when there is no cached user to go on. With one, the page renders
  // straight away and the revalidation either confirms it or signs them out.
  if (loading && !user) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
