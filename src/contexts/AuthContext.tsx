
"use client";

import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase/client'; // Ensure this is the correct path to your Supabase client
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import type { User as AppUser, UserRole } from '@/lib/mockData';

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes in milliseconds

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
  const inactivityTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    if (supabaseUser) { // Only set timer if user is logged in
      inactivityTimerRef.current = setTimeout(() => {
        console.log("AuthContext: Inactivity timeout reached, logging out.");
        logout(); // Call the logout function
      }, INACTIVITY_TIMEOUT_MS);
    }
  }, [supabaseUser]); // Depend on supabaseUser to ensure timer is only active when logged in

  const handleActivity = useCallback(() => {
    resetInactivityTimer();
  }, [resetInactivityTimer]);

  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      console.log("AuthContext: Tab/window hidden, pausing inactivity timer.");
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    } else {
      console.log("AuthContext: Tab/window visible, resuming inactivity timer.");
      resetInactivityTimer();
    }
  }, [resetInactivityTimer]);

  const fetchAppUser = useCallback(async (user: SupabaseUser) => {
    if (!user || !user.id) {
      setAppUser(null);
      console.log("AuthContext fetchAppUser: No Supabase user or user ID, cannot fetch app user.");
      return;
    }
    console.log(`AuthContext fetchAppUser: Fetching app user with Supabase ID: ${user.id}`);
    try {
      const response = await fetch(`/api/users/by-supabase-id/${user.id}`);
      if (response.ok) {
        const userData: AppUser = await response.json();
        setAppUser(userData);
        console.log("AuthContext fetchAppUser: App user fetched successfully:", userData);
      } else {
        const errorData = await response.json().catch(() => ({ message: "Unknown error fetching app user details" }));
        console.warn(`AuthContext fetchAppUser: App user not found or API error for Supabase ID ${user.id}. Status: ${response.status}. Message: ${errorData.message}`);
        setAppUser(null); // Ensure appUser is null if not found or error
      }
    } catch (error) {
      console.error("AuthContext fetchAppUser: Network or other error fetching app user by Supabase ID:", error);
      setAppUser(null);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    console.log("AuthContext: Initializing authentication state...");

    let clientAuth;
    try {
      clientAuth = supabase.client.auth; // Access client.auth
    } catch (error) {
      console.error("AuthContext: Critical error accessing supabase.client. Supabase client likely failed to initialize.", error);
      setIsLoading(false);
      return;
    }

    if (!clientAuth || typeof clientAuth.onAuthStateChange !== 'function') {
      console.error("AuthContext: supabase.client.auth or onAuthStateChange is not available.");
      setIsLoading(false);
      return;
    }
    console.log("AuthContext: Supabase client and auth appear valid. Setting up onAuthStateChange listener.");

    // Initial session check
    (async () => {
      try {
        console.log("AuthContext: Fetching initial session.");
        const { data: { session }, error: sessionError } = await clientAuth.getSession();
        if (sessionError) {
          console.error("AuthContext: Error fetching initial session:", sessionError);
        }
        const initialSupabaseUser = session?.user ?? null;
        setSupabaseUser(initialSupabaseUser);
        if (initialSupabaseUser) {
          await fetchAppUser(initialSupabaseUser);
        } else {
          setAppUser(null);
        }
        console.log("AuthContext: Initial session check complete. Supabase user:", initialSupabaseUser ? initialSupabaseUser.id : "None");
      } catch (error) {
        console.error("AuthContext: Exception during initial session check:", error);
      } finally {
        setIsLoading(false);
        console.log("AuthContext: Initial loading process finished.");
      }
    })();
    
    const { data: authListener } = clientAuth.onAuthStateChange(async (_event, session) => {
      console.log("AuthContext onAuthStateChange: Event triggered.", _event);
      setIsLoading(true); 
      const newSupabaseUser = session?.user ?? null;
      setSupabaseUser(newSupabaseUser);
      if (newSupabaseUser) {
        console.log("AuthContext onAuthStateChange: New Supabase user found, fetching app user. Supabase User ID:", newSupabaseUser.id);
        await fetchAppUser(newSupabaseUser);
      } else {
        console.log("AuthContext onAuthStateChange: No Supabase user in session, clearing app user.");
        setAppUser(null);
      }
      setIsLoading(false);
      console.log("AuthContext onAuthStateChange: State update complete. Current appUser:", appUser ? appUser.full_name : "None");
    });

    return () => {
      console.log("AuthContext: Cleaning up auth listener.");
      authListener?.subscription.unsubscribe();
    };
  }, [fetchAppUser]); // fetchAppUser is stable due to useCallback

  useEffect(() => {
    // Set up global activity listeners
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('scroll', handleActivity);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initial reset of the timer when component mounts or user state changes
    resetInactivityTimer();

    return () => {
      // Clean up global activity listeners
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [handleActivity, handleVisibilityChange, resetInactivityTimer, supabaseUser]); // Re-run if handlers or supabaseUser change

  useEffect(() => {
    // Navigation guard
    if (!isLoading && !supabaseUser && pathname !== '/login') {
      console.log("AuthContext Navigation Guard: Not authenticated (no supabaseUser) and not on login page, redirecting to /login.");
      router.push('/login');
    } else if (!isLoading && supabaseUser && !appUser && pathname !== '/login') {
      // This case means Supabase user is logged in, but appUser couldn't be fetched (e.g. not in Users table or inactive)
      // You might want to handle this differently, e.g., redirect to a specific page or show a message.
      // For now, if appUser is required for authenticated routes, this effectively blocks access
      // until appUser is loaded, or keeps them on login if appUser can't be found.
      console.warn("AuthContext State: Supabase user authenticated, but no corresponding appUser found or appUser is inactive. User role will be null.");
    }
  }, [supabaseUser, appUser, isLoading, router, pathname]);


  const login = async (email: string, pass: string) => {
    if (!supabase || !supabase.client || !supabase.client.auth) {
      console.error("AuthContext login: Supabase client/auth not available.");
      toast({ variant: "destructive", title: "Login System Error", description: "Authentication system is not properly initialized." });
      throw new Error("Supabase client/auth not initialized for login.");
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.client.auth.signInWithPassword({
        email: email,
        password: pass,
      });
      if (error) throw error;
      // onAuthStateChange handles setting user, fetching appUser, and final isLoading=false
      toast({ title: "Login Successful", description: "Welcome back!" });
      router.push('/'); // Redirect to dashboard after login attempt
    } catch (error: any) {
      console.error("AuthContext login: Supabase login error:", error);
      toast({ variant: "destructive", title: "Login Failed", description: error.message || "Invalid email or password." });
      setIsLoading(false); // Ensure loading is false on error
      throw error;
    } finally {
      resetInactivityTimer(); // Reset timer on successful login
    }
  };

  const logout = async () => {
     if (!supabase || !supabase.client || !supabase.client.auth) {
      console.error("AuthContext logout: Supabase client/auth not available.");
      setSupabaseUser(null);
      setAppUser(null);
      router.push('/login');
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.client.auth.signOut();
      if (error) throw error;
      // onAuthStateChange will clear supabaseUser and trigger appUser to be cleared.
      // It will also handle isLoading.
      router.push('/login');
    } catch (error: any) {
      console.error("AuthContext logout: Supabase logout error:", error);
      toast({ variant: "destructive", title: "Logout Failed", description: error.message || "Could not log out." });
      setIsLoading(false); // Ensure loading is false on error
    } finally {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current); // Clear timer on logout
      }
      setSupabaseUser(null); // Explicitly clear user state on logout
      setAppUser(null);
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
