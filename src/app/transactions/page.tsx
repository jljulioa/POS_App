
"use client";

import AppLayout from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRightLeft, Package, Search, Loader2, AlertTriangle } from 'lucide-react';
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import type { InventoryTransactionDB } from '@/app/api/inventory-transactions/route'; // Using DB type from API

const fetchInventoryTransactions = async (): Promise<InventoryTransactionDB[]> => {
  const res = await fetch('/api/inventory-transactions');
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'Network response was not ok' }));
    throw new Error(errorData.message || 'Failed to fetch inventory transactions');
  }
  return res.json();
};

export default function InventoryTransactionsPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: transactions = [], isLoading, error, isError } = useQuery<InventoryTransactionDB[], Error>({
    queryKey: ['inventoryTransactions'],
    queryFn: fetchInventoryTransactions,
  });

  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    const termLower = searchTerm.toLowerCase();
    return transactions.filter(transaction =>
      transaction.product_name.toLowerCase().includes(termLower) ||
      transaction.product_id.toLowerCase().includes(termLower) ||
      (transaction.related_document_id && transaction.related_document_id.toLowerCase().includes(termLower)) ||
      transaction.transaction_type.toLowerCase().includes(termLower)
    );
  }, [searchTerm, transactions]);

  const getBadgeVariant = (type: InventoryTransactionDB['transaction_type']): "default" | "secondary" | "destructive" | "outline" => {
    switch (type) {
      case 'Sale': return 'destructive'; // Stock decreases
      case 'Purchase': return 'default'; // Stock increases (using primary color)
      case 'Return': return 'secondary'; // Stock increases (using secondary color)
      case 'Adjustment': return 'outline';
      default: return 'outline';
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <PageHeader title="Inventory Transactions" description="Loading transaction history..." />
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (isError) {
    return (
      <AppLayout>
        <PageHeader title="Inventory Transactions" description="Error loading transaction data." />
        <div className="bg-destructive/10 border border-destructive text-destructive p-4 rounded-md">
          <div className="flex items-center"><AlertTriangle className="mr-2 h-6 w-6" /> Error</div>
          <p>{error?.message || "An unknown error occurred."}</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader title="Inventory Transactions" description="View all product stock movements.">
        <Input
          placeholder="Search by Product Name, ID, Document, Type..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
          icon={<Search className="h-4 w-4 text-muted-foreground" />}
        />
      </PageHeader>

      <div className="rounded-lg border shadow-sm bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Product ID</TableHead>
              <TableHead>Product Name</TableHead>
              <TableHead className="text-center">Type</TableHead>
              <TableHead className="text-center">Qty Change</TableHead>
              <TableHead className="text-center">Stock Before</TableHead>
              <TableHead className="text-center">Stock After</TableHead>
              <TableHead>Related Document</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell>{format(new Date(transaction.transaction_date), 'PPpp')}</TableCell>
                <TableCell>{transaction.product_id}</TableCell>
                <TableCell className="font-medium">{transaction.product_name}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={getBadgeVariant(transaction.transaction_type)}>
                    {transaction.transaction_type}
                  </Badge>
                </TableCell>
                <TableCell className={`text-center font-semibold ${transaction.quantity_change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {transaction.quantity_change > 0 ? `+${transaction.quantity_change}` : transaction.quantity_change}
                </TableCell>
                <TableCell className="text-center">{transaction.stock_before}</TableCell>
                <TableCell className="text-center">{transaction.stock_after}</TableCell>
                <TableCell>{transaction.related_document_id || 'N/A'}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{transaction.notes || 'N/A'}</TableCell>
              </TableRow>
            ))}
            {filteredTransactions.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">
                  No inventory transactions found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </AppLayout>
  );
}
