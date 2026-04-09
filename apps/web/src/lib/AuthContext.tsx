import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

export interface User {
  id: string;
  email: string;
  role: string;
  name?: string;
}

export interface AuthError {
  type: string;
  message: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  isLoadingPublicSettings: boolean;
  authError: AuthError | null;
  logout: (shouldRedirect?: boolean) => void;
  navigateToLogin: () => void;
  checkUserAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>({ id: '1', email: 'user@example.com', role: 'user' });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(false);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState<boolean>(false);
  const [authError, setAuthError] = useState<AuthError | null>(null);

  useEffect(() => {
    checkUserAuth();
  }, []);

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      setAuthError(null);
      
      // Mock authentication - replace with your backend API call when ready
      // Example backend call:
      // const token = localStorage.getItem('token');
      // if (!token) throw new Error('No token found');
      // const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/me`, {
      //   headers: { 'Authorization': `Bearer ${token}` }
      // });
      // if (!response.ok) throw new Error('Authentication failed');
      // const currentUser: User = await response.json();
      
      setUser({ id: '1', email: 'user@example.com', role: 'user' });
      setIsAuthenticated(true);
    } catch (error: any) {
      console.error('User auth check failed:', error);
      setIsAuthenticated(false);
      setUser(null);
      
      if (error.message !== 'No token found') {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required or session expired'
        });
      }
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('token');
    
    if (shouldRedirect) {
      window.location.href = '/login';
    }
  };

  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      logout,
      navigateToLogin,
      checkUserAuth
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};