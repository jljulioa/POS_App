
"use client";

import AppLayout from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import type { Customer } from '@/lib/mockData'; // Keep type
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PlusCircle, FileDown, Edit3, Eye, Loader2, AlertTriangle } from 'lucide-react';
import React, { useState, useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

// API fetch function for customers
const fetchCustomers = async (): Promise<Customer[]> => {
  const res = await fetch('/api/customers');
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'Network response was not ok and failed to parse error JSON.' }));
    throw new Error(errorData.message || 'Network response was not ok');
  }
  return res.json();
};

export default function CustomersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const { data: customers = [], isLoading, error, isError } = useQuery<Customer[], Error>({
    queryKey: ['customers'],
    queryFn: fetchCustomers,
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Failed to Load Customers",
        description: err.message || "An unexpected error occurred.",
      });
    }
  });

  const filteredCustomers = useMemo(() => {
    return customers.filter(customer =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (customer.phone && customer.phone.includes(searchTerm))
    );
  }, [searchTerm, customers]);

  const getInitials = (name: string) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  if (isLoading) {
    return (
      <AppLayout>
        <PageHeader title="Customer Management" description="Loading customer data..." />
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (isError) {
    return (
      <AppLayout>
        <PageHeader title="Customer Management" description="Error loading customers." />
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <AlertTriangle className="mr-2 h-6 w-6" />
              Failed to Load Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error?.message || "An unknown error occurred while fetching customer data."}</p>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader title="Customer Management" description="View and manage your customer database.">
        <Button asChild>
          <Link href="/customers/add">
            <PlusCircle className="mr-2 h-4 w-4" /> Add Customer
          </Link>
        </Button>
        <Button variant="outline">
          <FileDown className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </PageHeader>

      <div className="mb-6">
        <Input
          placeholder="Search by name, email, phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="rounded-lg border shadow-sm bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">Avatar</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="text-right">Total Spent</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell>
                  <Avatar>
                    <AvatarImage src={`https://placehold.co/40x40.png?text=${getInitials(customer.name)}`} alt={customer.name} data-ai-hint="profile avatar" />
                    <AvatarFallback>{getInitials(customer.name)}</AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell className="font-medium">{customer.name}</TableCell>
                <TableCell>{customer.email || 'N/A'}</TableCell>
                <TableCell>{customer.phone || 'N/A'}</TableCell>
                <TableCell className="text-right">${Number(customer.totalSpent).toFixed(2)}</TableCell>
                <TableCell className="text-center">
                  <Button variant="ghost" size="icon" className="hover:text-primary" asChild>
                     {/* Placeholder for view, can link to edit or a dedicated view page */}
                    <Link href={`/customers/${customer.id}/edit`}>
                       <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="icon" className="hover:text-accent" asChild>
                    <Link href={`/customers/${customer.id}/edit`}>
                      <Edit3 className="h-4 w-4" />
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filteredCustomers.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No customers found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </AppLayout>
  );
}
