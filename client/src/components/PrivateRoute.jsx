import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function PrivateRoute({
  children,
  superAdminOnly,
  orgAdminOnly,
  adminOnly,
  memberOnly,
  requiredRole,
}) {
  const { user, loading, isSuperAdmin, isOrgAdmin, isMember } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-500">
        Loading…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check requiredRole if provided
  if (requiredRole) {
    if (requiredRole === 'superAdmin' && !isSuperAdmin) {
      return <Navigate to="/dashboard" replace />;
    }
    if (requiredRole === 'admin' && !isOrgAdmin) {
      return <Navigate to="/dashboard" replace />;
    }
    if (requiredRole === 'member' && !isMember) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  // Legacy props for backward compatibility
  if (superAdminOnly && !isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (orgAdminOnly && !isOrgAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // FIX #5: Correct operator precedence — wrap the OR in parens
  if (adminOnly && !(isSuperAdmin || isOrgAdmin)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (memberOnly && !isMember) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
