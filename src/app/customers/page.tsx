
"use client";

import AppLayout from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { mockCustomers, Customer } from '@/lib/mockData';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PlusCircle, FileDown, Edit3, Eye } from 'lucide-react';
import React, { useState, useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function CustomersPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCustomers = useMemo(() => {
    return mockCustomers.filter(customer => 
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (customer.phone && customer.phone.includes(searchTerm))
    );
  }, [searchTerm]);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  return (
    <AppLayout>
      <PageHeader title="Customer Management" description="View and manage your customer database.">
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Customer
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
                <TableCell className="text-right">${customer.totalSpent.toFixed(2)}</TableCell>
                <TableCell className="text-center">
                  <Button variant="ghost" size="icon" className="hover:text-primary">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="hover:text-accent">
                    <Edit3 className="h-4 w-4" />
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
