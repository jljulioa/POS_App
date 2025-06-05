
"use client";

import AppLayout from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import type { User } from '@/lib/mockData'; // User type
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit3, Trash2, Loader2, AlertTriangle, ShieldCheck, ShieldAlert, UserCog } from 'lucide-react';
import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

// API fetch function for users
const fetchUsers = async (): Promise<User[]> => {
  const res = await fetch('/api/users');
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'Network response was not ok and failed to parse error JSON.' }));
    throw new Error(errorData.message || 'Network response was not ok');
  }
  return res.json();
};

export default function UsersPage() {
  const { toast } = useToast();

  const { data, isLoading, error, isError } = useQuery({
    queryKey: ['appUsers'], // Changed queryKey to avoid conflict if 'users' is used elsewhere for Supabase users
    queryFn: fetchUsers,
  });

  const users: User[] = (data as User[]) || [];

  if (isLoading) {
    return (
      <AppLayout>
        <PageHeader title="User Management" description="Loading user data..." />
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (isError) {
    return (
      <AppLayout>
        <PageHeader title="User Management" description="Error loading users." />
        <div className="bg-destructive/10 border border-destructive text-destructive p-4 rounded-md">
          <div className="flex items-center">
            <AlertTriangle className="mr-2 h-6 w-6" />
            <h3 className="font-semibold">Failed to Load Users</h3>
          </div>
          <p>{error?.message || "An unknown error occurred while fetching user data."}</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader title="User Management" description="View and manage application users.">
        <Button disabled> {/* User creation would require a secure backend form with password hashing */}
          <PlusCircle className="mr-2 h-4 w-4" /> Add User (Not Implemented)
        </Button>
      </PageHeader>

      <div className="rounded-lg border shadow-sm bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Full Name</TableHead>
              <TableHead className="text-center">Role</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.email}</TableCell>
                <TableCell>{user.full_name || 'N/A'}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="capitalize">
                    {user.role === 'admin' ? <ShieldCheck className="inline-block mr-1 h-3.5 w-3.5" /> : <UserCog className="inline-block mr-1 h-3.5 w-3.5" />}
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={user.is_active ? 'outline' : 'destructive'} className={user.is_active ? 'border-green-500 text-green-600' : ''}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell>{user.created_at ? format(new Date(user.created_at), 'PP') : 'N/A'}</TableCell>
                <TableCell className="text-center">
                  <Button variant="ghost" size="icon" className="hover:text-accent" disabled> {/* Edit action placeholder */}
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="hover:text-destructive" disabled> {/* Delete action placeholder */}
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No users found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </AppLayout>
  );
}
