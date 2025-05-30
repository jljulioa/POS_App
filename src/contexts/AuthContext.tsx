
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
    if (!user || !user.id) { // Now using user.id (Supabase UUID)
      setAppUser(null);
      console.log("No Supabase user or user ID, cannot fetch app user.");
      return;
    }
    try {
      console.log(`Fetching app user with Supabase ID: ${user.id}`);
      const response = await fetch(`/api/users/by-supabase-id/${user.id}`);
      if (response.ok) {
        const userData: AppUser = await response.json();
        setAppUser(userData);
        console.log("App user fetched by Supabase ID:", userData);
      } else {
        const errorData = await response.json().catch(() => ({ message: "Unknown error fetching app user" }));
        console.warn(`App user not found or inactive for Supabase ID ${user.id}. Status: ${response.status}. Message: ${errorData.message}`);
        setAppUser(null);
        // Consider what to do if the Supabase user exists but has no corresponding app user
        // For now, they won't be considered fully authenticated in the app.
      }
    } catch (error) {
      console.error("Failed to fetch app user data by Supabase ID:", error);
      setAppUser(null);
    }
  }, []);

  useEffect(() => {
    const getSession = async () => {
        setIsLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        setSupabaseUser(session?.user ?? null);
        if (session?.user) {
            await fetchAppUser(session.user);
        }
        setIsLoading(false);
    };
    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setIsLoading(true); // Set loading true during auth state change processing
      const newSupabaseUser = session?.user ?? null;
      setSupabaseUser(newSupabaseUser);
      if (newSupabaseUser) {
        await fetchAppUser(newSupabaseUser);
      } else {
        setAppUser(null);
        // No automatic redirect here; let navigation guard handle it if needed
      }
      setIsLoading(false); // Set loading false after processing
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [fetchAppUser]);


  useEffect(() => {
    // Navigation guard: If not loading and not authenticated, redirect to login (unless already there).
    // This is a common pattern but ensure it doesn't conflict with Supabase's own potential redirect mechanisms.
    if (!isLoading && !supabaseUser && pathname !== '/login') {
      console.log("Not authenticated, redirecting to login.");
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
      
      // onAuthStateChange will handle setting supabaseUser and calling fetchAppUser.
      // It will also set isLoading to false eventually.
      // No explicit setSupabaseUser or fetchAppUser here.
      
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
      setIsLoading(false); // Ensure loading is false on login failure
      throw error; 
    }
    // setIsLoading(false) is handled by onAuthStateChange or the error block
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      // onAuthStateChange will set supabaseUser and appUser to null
      // No explicit setSupabaseUser or setAppUser here.
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
