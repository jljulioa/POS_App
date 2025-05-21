
"use client";

import AppLayout from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import type { Sale } from '@/lib/mockData'; // Keep type
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FileDown, Eye, ExternalLink, Loader2, AlertTriangle } from 'lucide-react';
import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // For error display

// API fetch function for sales
const fetchSales = async (): Promise<Sale[]> => {
  const res = await fetch('/api/sales');
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'Network response was not ok and failed to parse error JSON.' }));
    throw new Error(errorData.message || 'Network response was not ok');
  }
  return res.json();
};


export default function SalesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const { data: sales = [], isLoading, error, isError } = useQuery<Sale[], Error>({
    queryKey: ['sales'],
    queryFn: fetchSales,
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Failed to Load Sales Records",
        description: err.message || "An unexpected error occurred.",
      });
    }
  });

  const filteredSales = useMemo(() => {
    return sales.filter(sale =>
      sale.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sale.customerName && sale.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      sale.items.some(item => item.productName.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [searchTerm, sales]);

  if (isLoading) {
    return (
      <AppLayout>
        <PageHeader title="Sales Records" description="Loading sales history..." />
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (isError) {
     return (
      <AppLayout>
        <PageHeader title="Sales Records" description="Error loading sales data." />
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <AlertTriangle className="mr-2 h-6 w-6" />
              Failed to Load Sales Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error?.message || "An unknown error occurred while fetching sales data."}</p>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader title="Sales Records" description="View and analyze your sales history.">
        <Button variant="outline">
          <FileDown className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </PageHeader>

      <div className="mb-6">
        <Input
          placeholder="Search by Sale ID, Customer, Product..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="rounded-lg border shadow-sm bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sale ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Items</TableHead>
              <TableHead className="text-right">Total Amount</TableHead>
              <TableHead>Payment Method</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSales.map((sale) => (
              <TableRow key={sale.id}>
                <TableCell className="font-medium">{sale.id}</TableCell>
                <TableCell>{format(new Date(sale.date), 'PPpp')}</TableCell>
                <TableCell>{sale.customerName || 'N/A'}</TableCell>
                <TableCell>{sale.items.length}</TableCell>
                <TableCell className="text-right">${Number(sale.totalAmount).toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant={
                    sale.paymentMethod === 'Card' ? 'default' :
                    sale.paymentMethod === 'Cash' ? 'secondary' : 'outline'
                  }>{sale.paymentMethod}</Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Button variant="ghost" size="icon" className="hover:text-primary">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="hover:text-accent">
                    <ExternalLink className="h-4 w-4" /> {/* e.g. View Invoice */}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filteredSales.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No sales records found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </AppLayout>
  );
}
