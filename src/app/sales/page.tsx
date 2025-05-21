
"use client";

import AppLayout from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { mockSales, Sale } from '@/lib/mockData';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FileDown, Eye, ExternalLink } from 'lucide-react';
import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

export default function SalesPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSales = useMemo(() => {
    return mockSales.filter(sale => 
      sale.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sale.customerName && sale.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      sale.items.some(item => item.productName.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [searchTerm]);

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
                <TableCell className="text-right">${sale.totalAmount.toFixed(2)}</TableCell>
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
