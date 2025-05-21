
"use client";

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (role?: string) => void;
  logout: () => void;
  userRole: string | null;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    try {
      const storedRole = localStorage.getItem('userRole');
      if (storedRole) {
        setUserRole(storedRole);
        setIsAuthenticated(true);
      }
    } catch (error) {
      // localStorage might not be available (e.g. SSR, private browsing)
      console.warn("Could not access localStorage for auth state:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = (role: string = 'cashier') => {
    try {
      localStorage.setItem('userRole', role);
    } catch (error) {
      console.warn("Could not set userRole in localStorage:", error);
    }
    setUserRole(role);
    setIsAuthenticated(true);
    router.push('/'); // Redirect to dashboard after login
  };

  const logout = () => {
    try {
      localStorage.removeItem('userRole');
    } catch (error) {
      console.warn("Could not remove userRole from localStorage:", error);
    }
    setUserRole(null);
    setIsAuthenticated(false);
    router.push('/login'); // Redirect to login after logout
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout, userRole }}>
      {children}
    </AuthContext.Provider>
  );
};
