
"use client";

import AppLayout from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { mockPurchaseInvoices, PurchaseInvoice } from '@/lib/mockData';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PlusCircle, FileDown, Eye, Edit, Settings2 } from 'lucide-react';
import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function PurchaseInvoicesPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredInvoices = useMemo(() => {
    return mockPurchaseInvoices.filter(invoice => 
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.supplierName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, mockPurchaseInvoices]);

  return (
    <AppLayout>
      <PageHeader title="Purchase Invoices" description="Manage incoming supplier invoices.">
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Purchase Invoice
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
                  <Badge variant={invoice.processed ? 'default' : 'destructive'} className={invoice.processed ? "bg-green-500" : ""}>
                    {invoice.processed ? 'Processed' : 'Not Processed'}
                  </Badge>
                </TableCell>
                <TableCell className="text-center space-x-1">
                  <Button variant="ghost" size="icon" className="hover:text-primary" asChild>
                    <Link href={`/purchase-invoices/${invoice.id}/view`}> {/* Placeholder view link */}
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
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

    