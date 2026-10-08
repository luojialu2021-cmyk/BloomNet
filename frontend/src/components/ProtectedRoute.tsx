import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'user' | 'sitter' | 'admin';
  redirectTo?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole,
  redirectTo 
}) => {
  const { isOwnerAuthenticated, isSitterAuthenticated, isLoading, ownerUser, sitterUser } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 border-4 rounded-full border-amber-500 border-t-transparent animate-spin"></div>
          <p className="text-sm text-slate-600">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // If requiredRole is not specified, allow either owner or sitter
  // If requiredRole is specified, check that specific role
  let isAuthenticated: boolean;
  let user: any;
  
  if (requiredRole === 'sitter') {
    isAuthenticated = isSitterAuthenticated;
    user = sitterUser;
  } else if (requiredRole === 'user') {
    isAuthenticated = isOwnerAuthenticated;
    user = ownerUser;
  } else {
    // No required role specified - allow either owner or sitter
    isAuthenticated = isOwnerAuthenticated || isSitterAuthenticated;
    user = ownerUser || sitterUser;
  }

  console.log('ProtectedRoute check:', { 
    requiredRole, 
    isOwnerAuthenticated, 
    isSitterAuthenticated, 
    ownerUser: ownerUser?.email, 
    sitterUser: sitterUser?.email,
    isAuthenticated,
    user: user?.email
  }); // Debug log

  // If not authenticated, redirect to appropriate login page
  if (!isAuthenticated || !user) {
    // If specific role required, redirect to that role's login
    // Otherwise redirect to owner login (default)
    const loginPath = requiredRole === 'sitter' ? '/sitter/login' : '/login';
    console.log('Not authenticated, redirecting to:', loginPath); // Debug log
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  // If role is specified and user doesn't have the required role
  if (requiredRole && user.role !== requiredRole && user.role !== 'sitter' && requiredRole !== 'user') {
    // Redirect based on user's actual role
    const redirectPath = redirectTo || (user.role === 'sitter' ? '/sitter/dashboard' : '/dashboard');
    console.log('Role mismatch, redirecting to:', redirectPath); // Debug log
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
