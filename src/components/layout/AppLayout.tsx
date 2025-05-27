
"use client";

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarTrigger } from '@/components/ui/sidebar';
import { SidebarNav } from '@/components/navigation/SidebarNav';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { LogOut, UserCircle, Loader2 } from 'lucide-react'; // Added Loader2
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ThemeToggle } from "@/components/ThemeToggle";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, logout, userRole, firebaseUser } = useAuth(); // Added firebaseUser
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && pathname !== '/login') {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router, pathname]);

  if (isLoading || (!isAuthenticated && pathname !== '/login')) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        {/* <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div> */}
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (pathname === '/login') {
     return <>{children}</>;
  }

  return (
    <SidebarProvider defaultOpen>
      <Sidebar collapsible="icon" className="border-r border-sidebar-border">
        <SidebarHeader className="p-4">
          <Logo />
        </SidebarHeader>
        <SidebarContent className="p-2">
          <SidebarNav />
        </SidebarContent>
        <SidebarFooter className="p-4 mt-auto">
          {/* User profile / logout button could go here */}
        </SidebarFooter>
      </Sidebar>
      <div className="flex flex-col flex-1 min-h-screen">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-card px-4 sm:px-6 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-4">
             <SidebarTrigger className="md:hidden" /> {/* Only show on mobile */}
             <h1 className="text-lg sm:text-xl font-semibold capitalize">{pathname.substring(1) || 'Dashboard'}</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-full">
                  <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
                    <AvatarImage src={firebaseUser?.photoURL || "https://placehold.co/40x40.png"} alt={firebaseUser?.displayName || "User"} data-ai-hint="profile avatar" />
                    <AvatarFallback>{firebaseUser?.email ? firebaseUser.email.substring(0,2).toUpperCase() : "MF"}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{firebaseUser?.displayName || "MotoFox User"}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {firebaseUser?.email || (userRole ? `${userRole}@motofox.com` : 'user@motofox.com')}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 bg-background">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
