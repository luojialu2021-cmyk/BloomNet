import React, { createContext, useContext, useState, useEffect } from 'react';

export interface AuthUser {
  user_id: string;
  email: string;
  name: string;
  full_name?: string;
  role: 'user' | 'sitter' | 'admin';
  profile_image?: string;
}

interface AuthContextType {
  // Owner authentication
  ownerUser: AuthUser | null;
  ownerToken: string | null;
  isOwnerAuthenticated: boolean;
  
  // Sitter authentication  
  sitterUser: AuthUser | null;
  sitterToken: string | null;
  isSitterAuthenticated: boolean;
  
  // Login/logout functions
  loginOwner: (token: string, user: AuthUser) => void;
  loginSitter: (token: string, user: AuthUser) => void;
  logoutOwner: () => void;
  logoutSitter: () => void;
  logoutAll: () => void;
  
  // Loading state
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ownerUser, setOwnerUser] = useState<AuthUser | null>(null);
  const [ownerToken, setOwnerToken] = useState<string | null>(null);
  const [sitterUser, setSitterUser] = useState<AuthUser | null>(null);
  const [sitterToken, setSitterToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load auth state from localStorage on mount
  useEffect(() => {
    // Load owner auth
    const storedOwnerToken = localStorage.getItem('owner_auth_token');
    const storedOwnerUser = localStorage.getItem('owner_user_info');
    
    if (storedOwnerToken && storedOwnerUser) {
      try {
        const parsedUser: AuthUser = JSON.parse(storedOwnerUser);
        setOwnerToken(storedOwnerToken);
        setOwnerUser(parsedUser);
      } catch (error) {
        console.error('Error loading owner auth from localStorage:', error);
        localStorage.removeItem('owner_auth_token');
        localStorage.removeItem('owner_user_info');
      }
    }

    // Load sitter auth
    const storedSitterToken = localStorage.getItem('sitter_auth_token');
    const storedSitterUser = localStorage.getItem('sitter_user_info');
    
    if (storedSitterToken && storedSitterUser) {
      try {
        const parsedUser: AuthUser = JSON.parse(storedSitterUser);
        setSitterToken(storedSitterToken);
        setSitterUser(parsedUser);
      } catch (error) {
        console.error('Error loading sitter auth from localStorage:', error);
        localStorage.removeItem('sitter_auth_token');
        localStorage.removeItem('sitter_user_info');
      }
    }
    
    setIsLoading(false);
  }, []);

  const loginOwner = (newToken: string, newUser: AuthUser) => {
    console.log('loginOwner called with:', { newToken: newToken.substring(0, 20) + '...', newUser }); // Debug log
    setOwnerToken(newToken);
    setOwnerUser(newUser);
    localStorage.setItem('owner_auth_token', newToken);
    localStorage.setItem('owner_user_info', JSON.stringify(newUser));
    localStorage.setItem('owner_auth_email', newUser.email);
    localStorage.setItem('owner_auth_username', newUser.name);
    localStorage.setItem('owner_auth_user_id', newUser.user_id);
    localStorage.setItem('auth_token', newToken);
    localStorage.setItem('auth_email', newUser.email);
    localStorage.setItem('auth_username', newUser.name);
    localStorage.setItem('auth_user_id', newUser.user_id);
    localStorage.setItem('auth_role', 'owner');
    console.log('Owner login state updated'); // Debug log
  };

  const loginSitter = (newToken: string, newUser: AuthUser) => {
    setSitterToken(newToken);
    setSitterUser(newUser);
    localStorage.setItem('sitter_auth_token', newToken);
    localStorage.setItem('sitter_user_info', JSON.stringify(newUser));
    localStorage.setItem('sitter_auth_email', newUser.email);
    localStorage.setItem('sitter_auth_username', newUser.name);
    localStorage.setItem('sitter_auth_user_id', newUser.user_id);
    localStorage.setItem('auth_token', newToken);
    localStorage.setItem('auth_email', newUser.email);
    localStorage.setItem('auth_username', newUser.name);
    localStorage.setItem('auth_user_id', newUser.user_id);
    localStorage.setItem('auth_role', 'sitter');
  };

  const logoutOwner = () => {
    const currentOwnerToken = ownerToken;
    setOwnerToken(null);
    setOwnerUser(null);
    localStorage.removeItem('owner_auth_token');
    localStorage.removeItem('owner_user_info');
    localStorage.removeItem('owner_auth_email');
    localStorage.removeItem('owner_auth_username');
    localStorage.removeItem('owner_auth_user_id');
    if (localStorage.getItem('auth_token') === currentOwnerToken) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_email');
      localStorage.removeItem('auth_username');
      localStorage.removeItem('auth_user_id');
      localStorage.removeItem('auth_role');
    }
  };

  const logoutSitter = () => {
    const currentSitterToken = sitterToken;
    setSitterToken(null);
    setSitterUser(null);
    localStorage.removeItem('sitter_auth_token');
    localStorage.removeItem('sitter_user_info');
    localStorage.removeItem('sitter_auth_email');
    localStorage.removeItem('sitter_auth_username');
    localStorage.removeItem('sitter_auth_user_id');
    if (localStorage.getItem('auth_token') === currentSitterToken) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_email');
      localStorage.removeItem('auth_username');
      localStorage.removeItem('auth_user_id');
      localStorage.removeItem('auth_role');
    }
  };

  const logoutAll = () => {
    logoutOwner();
    logoutSitter();
  };

  const value = {
    ownerUser,
    ownerToken,
    isOwnerAuthenticated: !!ownerToken && !!ownerUser,
    sitterUser,
    sitterToken,
    isSitterAuthenticated: !!sitterToken && !!sitterUser,
    loginOwner,
    loginSitter,
    logoutOwner,
    logoutSitter,
    logoutAll,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Convenience hooks for specific user types
export const useOwnerAuth = () => {
  const { ownerUser, ownerToken, isOwnerAuthenticated, loginOwner, logoutOwner, isLoading } = useAuth();
  return {
    user: ownerUser,
    token: ownerToken,
    isAuthenticated: isOwnerAuthenticated,
    login: loginOwner,
    logout: logoutOwner,
    isLoading,
  };
};

export const useSitterAuth = () => {
  const { sitterUser, sitterToken, isSitterAuthenticated, loginSitter, logoutSitter, isLoading } = useAuth();
  return {
    user: sitterUser,
    token: sitterToken,
    isAuthenticated: isSitterAuthenticated,
    login: loginSitter,
    logout: logoutSitter,
    isLoading,
  };
};
