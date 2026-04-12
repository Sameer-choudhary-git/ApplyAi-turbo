import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { supabase } from '../supabaseClient';
import { User as SupabaseUser } from '@supabase/supabase-js';

export interface AuthError {
  type: string;
  message: string;
}

interface AuthContextType {
  user: SupabaseUser | null;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  authError: AuthError | null;
  logout: (shouldRedirect?: boolean) => Promise<void>;
  navigateToLogin: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true); 
  const [authError, setAuthError] = useState<AuthError | null>(null);

  useEffect(() => {
    const isOAuthCallback = window.location.hash.includes('access_token') || window.location.search.includes('code=');

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
        setUser(session?.user ?? null);
        setIsAuthenticated(!!session?.user);
        setIsLoadingAuth(false);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
      }
    });

    if (!isOAuthCallback) {
      supabase.auth.getSession().then(({ data: { session }, error }) => {
        if (error) setAuthError({ type: 'auth_required', message: error.message });
        setUser(session?.user ?? null);
        setIsAuthenticated(!!session?.user);
        setIsLoadingAuth(false);
      });
    }

    return () => subscription.unsubscribe();
  }, []);

  const logout = async (shouldRedirect = true) => {
    await supabase.auth.signOut();
    if (shouldRedirect) window.location.href = '/login';
  };

  const navigateToLogin = () => {
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, isAuthenticated, isLoadingAuth, authError, logout, navigateToLogin
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};