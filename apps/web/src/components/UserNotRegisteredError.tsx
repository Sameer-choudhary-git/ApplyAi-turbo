import React from 'react';
import { useAuth } from '@/lib/AuthContext';

const UserNotRegisteredError = () => {
  const { logout } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <div className="max-w-md w-full p-8 glass border-shimmer rounded-2xl shadow-2xl relative z-10">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-destructive/10 border border-destructive/20">
            <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-4">Access Restricted</h1>
          <p className="text-muted-foreground mb-8">
            Your agent account has not been fully provisioned yet. Please complete registration or contact support.
          </p>
          <button 
            onClick={() => logout()}
            className="w-full gradient-primary glow-sm text-primary-foreground font-semibold py-3 rounded-lg hover:opacity-90 transition-all"
          >
            Return to Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserNotRegisteredError;