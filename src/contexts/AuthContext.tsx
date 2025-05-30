
"use client";

import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase/client'; // Import Supabase client
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
    if (!user || !user.email) {
      setAppUser(null);
      return;
    }
    try {
      const response = await fetch(`/api/users/by-email/${encodeURIComponent(user.email)}`);
      if (response.ok) {
        const userData: AppUser = await response.json();
        setAppUser(userData);
        console.log("App user fetched:", userData);
      } else {
        console.warn(`User ${user.email} authenticated with Supabase but not found or inactive in app DB.`);
        setAppUser(null);
        // Potentially redirect or show a message if app user is required.
      }
    } catch (error) {
      console.error("Failed to fetch app user data:", error);
      setAppUser(null);
    }
  }, []);

  useEffect(() => {
    const getSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        setSupabaseUser(session?.user ?? null);
        if (session?.user) {
            await fetchAppUser(session.user);
        }
        setIsLoading(false);
    };
    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSupabaseUser(session?.user ?? null);
      if (session?.user) {
        await fetchAppUser(session.user);
      } else {
        setAppUser(null);
        if (pathname !== '/login') {
          router.push('/login');
        }
      }
      // Moved setIsLoading(false) to getSession to avoid flicker on initial load
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [fetchAppUser, router, pathname]);


  useEffect(() => {
    if (!isLoading && !supabaseUser && pathname !== '/login') {
      router.push('/login');
    }
  }, [supabaseUser, isLoading, router, pathname]);


  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: pass,
      });

      if (error) {
        throw error;
      }

      // onAuthStateChange will handle setting supabaseUser and calling fetchAppUser
      toast({
        title: "Login Successful",
        description: "Welcome back!",
      });
      router.push('/'); // Redirect to dashboard
    } catch (error: any) {
      console.error("Supabase login error:", error);
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message || "Invalid email or password.",
      });
      // setIsLoading(false); // onAuthStateChange will eventually set loading to false
      throw error; // Re-throw so the login page can catch it if needed
    } finally {
        // Delay setting isLoading to false to allow onAuthStateChange to process
        // This is tricky; ideally, loading state management is more nuanced
        // For now, onAuthStateChange handles the final setIsLoading(false)
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setSupabaseUser(null);
      setAppUser(null);
      router.push('/login');
    } catch (error: any) {
      console.error("Supabase logout error:", error);
      toast({
        variant: "destructive",
        title: "Logout Failed",
        description: error.message || "Could not log out. Please try again.",
      });
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
