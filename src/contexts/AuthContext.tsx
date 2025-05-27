
"use client";

import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { auth } from '@/lib/firebase/config'; // Import Firebase auth instance
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import type { User as AppUser, UserRole } from '@/lib/mockData'; // Your app-specific User type

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  firebaseUser: FirebaseUser | null;
  appUser: AppUser | null; // Store your app-specific user data
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  userRole: UserRole | null;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const fetchAppUser = useCallback(async (fbUser: FirebaseUser) => {
    if (!fbUser || !fbUser.email) {
      setAppUser(null);
      return;
    }
    try {
      const response = await fetch(`/api/users/by-email/${encodeURIComponent(fbUser.email)}`);
      if (response.ok) {
        const userData: AppUser = await response.json();
        setAppUser(userData);
      } else {
        // User authenticated with Firebase but not found in your Users table or inactive
        // This could be a new Firebase user not yet synced, or an issue.
        console.warn(`User ${fbUser.email} authenticated with Firebase but not found or inactive in app DB.`);
        setAppUser(null); // Or handle as a partially authenticated user
        // You might want to redirect them to a profile creation page or show a message
        // For now, they won't have an app-specific role from the DB.
      }
    } catch (error) {
      console.error("Failed to fetch app user data:", error);
      setAppUser(null);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        await fetchAppUser(user);
      } else {
        setAppUser(null);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [fetchAppUser]);

  useEffect(() => {
    if (!isLoading && !firebaseUser && pathname !== '/login') {
      router.push('/login');
    }
  }, [firebaseUser, isLoading, router, pathname]);


  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      // onAuthStateChanged will handle setting firebaseUser and calling fetchAppUser
      toast({
        title: "Login Successful",
        description: "Welcome back!",
      });
      router.push('/'); // Redirect to dashboard
    } catch (error: any) {
      console.error("Firebase login error:", error);
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message || "Invalid email or password.",
      });
      setIsLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await signOut(auth);
      setFirebaseUser(null);
      setAppUser(null);
      router.push('/login');
    } catch (error) {
      console.error("Firebase logout error:", error);
      toast({
        variant: "destructive",
        title: "Logout Failed",
        description: "Could not log out. Please try again.",
      });
    } finally {
        setIsLoading(false);
    }
  };
  
  const isAuthenticated = !!firebaseUser && !!appUser && appUser.is_active === true;
  // Derive userRole from appUser if available, otherwise fallback or null
  const userRole = appUser?.role || null;
   // If you want a default role if appUser is null but firebaseUser exists:
   // const userRole = appUser?.role || (firebaseUser ? 'cashier' : null);


  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, firebaseUser, appUser, login, logout, userRole }}>
      {children}
    </AuthContext.Provider>
  );
};
