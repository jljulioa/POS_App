
"use client";

import AppLayout from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import type { PurchaseInvoice } from '@/lib/mockData'; // Keep type
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PlusCircle, FileDown, Settings2, Loader2, AlertTriangle, Trash2 } from 'lucide-react';
import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// API fetch function for purchase invoices
const fetchPurchaseInvoices = async (): Promise<PurchaseInvoice[]> => {
  const res = await fetch('/api/purchase-invoices');
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'Network response was not ok and failed to parse error JSON.' }));
    throw new Error(errorData.message || 'Network response was not ok');
  }
  return res.json();
};

// API delete function
const deletePurchaseInvoiceAPI = async (invoiceId: string): Promise<{ message: string }> => {
  const res = await fetch(`/api/purchase-invoices/${invoiceId}`, { method: 'DELETE' });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'Failed to delete invoice' }));
    throw new Error(errorData.message || 'Failed to delete invoice');
  }
  return res.json();
};

interface InvoiceRowActionsProps {
  invoice: PurchaseInvoice;
  deleteMutation: UseMutationResult<{ message: string }, Error, string, unknown>;
}

function InvoiceRowActions({ invoice, deleteMutation }: InvoiceRowActionsProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleDeleteConfirm = () => {
    deleteMutation.mutate(invoice.id, {
      onSuccess: () => {
        setIsDeleteDialogOpen(false);
      },
      onError: () => {
        setIsDeleteDialogOpen(false);
      }
    });
  };

  return (
    <div className="flex items-center justify-center space-x-1">
      {!invoice.processed ? (
        <Button variant="ghost" size="icon" className="hover:text-accent" asChild>
          <Link href={`/purchase-invoices/${invoice.id}/process`}>
            <Settings2 className="h-4 w-4" />
          </Link>
        </Button>
      ) : (
          <Button variant="ghost" size="icon" disabled>
            <Settings2 className="h-4 w-4 opacity-50" />
          </Button>
      )}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="icon" className="hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the purchase invoice
              <span className="font-semibold"> {invoice.invoiceNumber}</span>.
              This action does NOT revert any stock changes if the invoice was already processed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending && deleteMutation.variables === invoice.id}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {(deleteMutation.isPending && deleteMutation.variables === invoice.id) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


export default function PurchaseInvoicesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: invoices = [], isLoading, error, isError } = useQuery<PurchaseInvoice[], Error>({
    queryKey: ['purchaseInvoices'],
    queryFn: fetchPurchaseInvoices,
  });

  const deleteMutation = useMutation<{ message: string }, Error, string>({
    mutationFn: deletePurchaseInvoiceAPI,
    onSuccess: (data) => {
      toast({ title: "Purchase Invoice Deleted", description: data.message });
      queryClient.invalidateQueries({ queryKey: ['purchaseInvoices'] });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Failed to Delete Invoice", description: error.message });
    },
  });

  const filteredInvoices = useMemo(() => {
    if (!invoices) return [];
    return invoices.filter(invoice => 
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.supplierName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, invoices]);


  if (isLoading) {
    return (
      <AppLayout>
        <PageHeader title="Purchase Invoices" description="Loading supplier invoices..." />
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (isError) {
    return (
      <AppLayout>
        <PageHeader title="Purchase Invoices" description="Error loading invoices." />
        <div className="bg-destructive/10 border border-destructive text-destructive p-4 rounded-md">
          <div className="flex items-center"><AlertTriangle className="mr-2 h-6 w-6" /> Error</div>
          <p>{error?.message || "An unknown error occurred."}</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader title="Purchase Invoices" description="Manage incoming supplier invoices.">
        <Button asChild>
          <Link href="/purchase-invoices/add">
            <PlusCircle className="mr-2 h-4 w-4" /> Add Purchase Invoice
          </Link>
        </Button>
        <Button variant="outline">
          <FileDown className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </PageHeader>

      <div className="mb-6">
        <Input 
          placeholder="Search by Invoice #, Supplier..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="rounded-lg border shadow-sm bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Invoice Date</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead className="text-right">Total Amount</TableHead>
              <TableHead>Payment Terms</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInvoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                <TableCell>{format(new Date(invoice.invoiceDate), 'MMM d, yyyy')}</TableCell>
                <TableCell>{invoice.supplierName}</TableCell>
                <TableCell className="text-right">${invoice.totalAmount.toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant={invoice.paymentTerms === 'Credit' ? 'outline' : 'secondary'}>
                    {invoice.paymentTerms}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={invoice.processed ? 'default' : 'destructive'} className={invoice.processed ? "bg-green-500 hover:bg-green-600" : "hover:bg-destructive/90"}>
                    {invoice.processed ? 'Processed' : 'Not Processed'}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <InvoiceRowActions invoice={invoice} deleteMutation={deleteMutation} />
                </TableCell>
              </TableRow>
            ))}
            {filteredInvoices.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No purchase invoices found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </AppLayout>
  );
}
