
"use client";

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { auth } from '@/lib/firebase/config'; // Import Firebase auth instance
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  firebaseUser: FirebaseUser | null; // Store the Firebase user object
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  userRole: string | null; // We'll simplify this for now
  // Potentially add a function here to fetch app-specific user data/role
  // fetchAppUserRole: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null); // App-specific role
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setIsLoading(false);
      if (user) {
        // For now, let's assume a basic role or leave it null.
        // In a real app, you'd fetch the role from your 'Users' table
        // based on user.uid or user.email.
        // For simplicity, if a user is logged in via Firebase, let's assign a default role for now.
        // This is a placeholder and should be replaced with proper role fetching.
        // Example: fetch user role from your DB using user.uid
        // setUserRole('cashier'); // Placeholder
        // TODO: Implement fetching user role from your DB
        // For demo purposes, if email contains 'admin', set role to admin
        if (user.email && user.email.includes('admin')) {
            setUserRole('admin');
        } else {
            setUserRole('cashier'); // Default role
        }

      } else {
        setUserRole(null);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isLoading && !firebaseUser && pathname !== '/login') {
      router.push('/login');
    }
  }, [firebaseUser, isLoading, router, pathname]);


  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      // onAuthStateChanged will handle setting the firebaseUser and redirecting
      // You might want to fetch app-specific user data here after login
      // For now, user role is set in onAuthStateChanged effect
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
      // Re-throw to handle in login page if needed, or just show toast
      throw error;
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await signOut(auth);
      // onAuthStateChanged will handle clearing firebaseUser
      setFirebaseUser(null);
      setUserRole(null);
      router.push('/login'); // Redirect to login after logout
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
  
  const isAuthenticated = !!firebaseUser;

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, firebaseUser, login, logout, userRole }}>
      {children}
    </AuthContext.Provider>
  );
};
