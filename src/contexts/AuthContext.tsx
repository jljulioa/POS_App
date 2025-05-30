
"use client";

import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import type { User as AppUser, UserRole } from '@/lib/mockData';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  supabaseUser: SupabaseUser | null;
  appUser: AppUser | null;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  userRole: UserRole | null;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const fetchAppUser = useCallback(async (user: SupabaseUser) => {
    if (!user || !user.id) {
      setAppUser(null);
      console.log("AuthContext: No Supabase user or user ID, cannot fetch app user.");
      return;
    }
    try {
      console.log(`AuthContext: Fetching app user with Supabase ID: ${user.id}`);
      const response = await fetch(`/api/users/by-supabase-id/${user.id}`);
      if (response.ok) {
        const userData: AppUser = await response.json();
        setAppUser(userData);
        console.log("AuthContext: App user fetched:", userData);
      } else {
        const errorData = await response.json().catch(() => ({ message: "Unknown error fetching app user" }));
        console.warn(`AuthContext: App user not found or inactive for Supabase ID ${user.id}. Status: ${response.status}. Message: ${errorData.message}`);
        setAppUser(null);
      }
    } catch (error) {
      console.error("AuthContext: Failed to fetch app user data by Supabase ID:", error);
      setAppUser(null);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    console.log("AuthContext useEffect: Initializing authentication state...");

    if (!supabase) {
      console.error("AuthContext useEffect: `supabase` module (from @/lib/supabase/client) is not loaded/imported correctly. This is a critical error.");
      setIsLoading(false);
      return;
    }

    let clientAuth;
    try {
      // Attempt to access supabase.client, which will trigger the getter in client.ts
      // If initialization failed there, the getter should throw.
      const client = supabase.client;
      if (!client) {
        // This case should ideally be caught by the getter in client.ts throwing an error.
        // If we reach here, it means supabase.client returned null/undefined without throwing.
        console.error("AuthContext useEffect: supabase.client is null or undefined. Supabase initialization in client.ts likely failed silently or returned null.");
        setIsLoading(false);
        return;
      }
      clientAuth = client.auth;
    } catch (error) {
      // This catch block will execute if the supabase.client getter throws an error (e.g., due to initializationError in client.ts)
      console.error("AuthContext useEffect: Error accessing supabase.client. This indicates Supabase client initialization failed:", (error as Error).message);
      setIsLoading(false);
      return;
    }

    if (!clientAuth || typeof clientAuth.onAuthStateChange !== 'function') {
      console.error("AuthContext useEffect: supabase.client.auth object or its onAuthStateChange method is not available. Supabase client might be partially initialized or an unexpected object structure was returned.");
      console.log("AuthContext useEffect: Current value of clientAuth:", clientAuth);
      setIsLoading(false);
      return;
    }

    console.log("AuthContext useEffect: Supabase client and auth appear valid. Setting up onAuthStateChange listener.");
    const { data: authListener } = clientAuth.onAuthStateChange(async (_event, session) => {
      console.log("AuthContext onAuthStateChange: Event triggered.");
      setIsLoading(true);
      const newSupabaseUser = session?.user ?? null;
      setSupabaseUser(newSupabaseUser);
      if (newSupabaseUser) {
        await fetchAppUser(newSupabaseUser);
      } else {
        setAppUser(null);
      }
      setIsLoading(false);
      console.log("AuthContext onAuthStateChange: State update complete.");
    });

    // Initial session check
    (async () => {
      try {
        console.log("AuthContext useEffect: Fetching initial session.");
        const { data: { session } } = await clientAuth.getSession();
        const initialSupabaseUser = session?.user ?? null;
        setSupabaseUser(initialSupabaseUser);
        if (initialSupabaseUser) {
          await fetchAppUser(initialSupabaseUser);
        }
        console.log("AuthContext useEffect: Initial session fetched successfully.");
      } catch (error) {
        console.error("AuthContext useEffect: Error fetching initial session:", error);
      } finally {
        setIsLoading(false);
        console.log("AuthContext useEffect: Initial loading process finished.");
      }
    })();

    return () => {
      console.log("AuthContext useEffect: Cleaning up auth listener.");
      authListener?.subscription.unsubscribe();
    };
  }, [fetchAppUser]);


  useEffect(() => {
    if (!isLoading && !supabaseUser && !appUser && pathname !== '/login') {
      console.log("AuthContext Navigation Guard: Not authenticated and not on login page, redirecting to /login.");
      router.push('/login');
    }
  }, [supabaseUser, appUser, isLoading, router, pathname]);


  const login = async (email: string, pass: string) => {
    if (!supabase || !supabase.client || !supabase.client.auth) {
      console.error("AuthContext login: Supabase client or auth object not available.");
      toast({ variant: "destructive", title: "Login System Error", description: "Authentication system is not properly initialized." });
      throw new Error("Supabase client/auth not initialized for login.");
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.client.auth.signInWithPassword({
        email: email,
        password: pass,
      });
      if (error) throw error;
      // onAuthStateChange handles setting user and fetching appUser
      toast({ title: "Login Successful", description: "Welcome back!" });
      router.push('/');
    } catch (error: any) {
      console.error("AuthContext login: Supabase login error:", error);
      toast({ variant: "destructive", title: "Login Failed", description: error.message || "Invalid email or password." });
      setIsLoading(false);
      throw error;
    }
    // setIsLoading(false) is handled by onAuthStateChange or error block
  };

  const logout = async () => {
    if (!supabase || !supabase.client || !supabase.client.auth) {
      console.error("AuthContext logout: Supabase client or auth object not available.");
      // Attempt to clear local state anyway and redirect
      setSupabaseUser(null);
      setAppUser(null);
      router.push('/login');
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.client.auth.signOut();
      if (error) throw error;
      // onAuthStateChange handles clearing user states
      router.push('/login');
    } catch (error: any) {
      console.error("AuthContext logout: Supabase logout error:", error);
      toast({ variant: "destructive", title: "Logout Failed", description: error.message || "Could not log out." });
    } finally {
      setIsLoading(false);
    }
  };

  const isAuthenticated = !!supabaseUser && !!appUser && appUser.is_active === true;
  const userRole = appUser?.role || null;

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, supabaseUser, appUser, login, logout, userRole }}>
      {children}
    </AuthContext.Provider>
  );
};

