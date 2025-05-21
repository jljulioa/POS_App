
"use client";

import AppLayout from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { mockPurchaseInvoices, mockProducts } from '@/lib/mockData';
import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';

export default function ProcessPurchaseInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.invoiceId as string;
  const [invoice, setInvoice] = useState(mockPurchaseInvoices.find(inv => inv.id === invoiceId));

  useEffect(() => {
    const foundInvoice = mockPurchaseInvoices.find(inv => inv.id === invoiceId);
    if (foundInvoice) {
      setInvoice(foundInvoice);
    } else {
      // Handle invoice not found, e.g., redirect or show error
      // router.push('/purchase-invoices');
    }
  }, [invoiceId, router]);

  if (!invoice) {
    return (
      <AppLayout>
        <PageHeader title="Invoice Not Found" />
        <p>The requested purchase invoice could not be found.</p>
        <Button onClick={() => router.push('/purchase-invoices')} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Invoices
        </Button>
      </AppLayout>
    );
  }

  if (invoice.processed) {
     return (
      <AppLayout>
        <PageHeader title={`Invoice ${invoice.invoiceNumber}`} description="This invoice has already been processed." />
         <Card>
          <CardHeader>
            <CardTitle>Invoice Already Processed</CardTitle>
            <CardDescription>
              The items for invoice <span className="font-semibold">{invoice.invoiceNumber}</span> from supplier <span className="font-semibold">{invoice.supplierName}</span> have already been added to inventory.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => router.push('/purchase-invoices')}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Purchase Invoices
            </Button>
          </CardFooter>
        </Card>
      </AppLayout>
    );
  }

  // Placeholder for product input logic
  const handleAddProduct = () => {
    // TODO: Implement product search (by code, name, reference) and quantity input
    // TODO: Update product stock in mockProducts
    // TODO: Update invoice.processed to true
    alert(`Simulate adding products for invoice ${invoice.invoiceNumber}. This feature is under development.`);
  };
  
  const handleFinalizeProcessing = () => {
    // In a real app, this would save changes and mark invoice as processed
    const invoiceIndex = mockPurchaseInvoices.findIndex(inv => inv.id === invoiceId);
    if (invoiceIndex !== -1) {
      // This is a mock update, would be a DB call
      // mockPurchaseInvoices[invoiceIndex].processed = true; 
      alert(`Invoice ${invoice.invoiceNumber} marked as processed (simulated).`);
      router.push('/purchase-invoices');
    }
  };


  return (
    <AppLayout>
      <PageHeader 
        title={`Process Invoice: ${invoice.invoiceNumber}`} 
        description={`Supplier: ${invoice.supplierName} | Total: $${invoice.totalAmount.toFixed(2)}`}
      >
        <Button onClick={() => router.push('/purchase-invoices')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Cancel
        </Button>
      </PageHeader>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Add Products to Inventory</CardTitle>
          <CardDescription>
            Use product code, name, or reference to find and add items from this invoice.
            This is a placeholder for the full product input interface.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            {/* Placeholder for product search and add form */}
            <p className="text-muted-foreground italic">
              Product input form (search by code, name, reference, quantity, cost) will be here.
            </p>
            <Button onClick={handleAddProduct} className="mt-2">Add Product (Simulated)</Button>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Items on Invoice (Example)</h3>
            {/* Placeholder for items list being added */}
            <p className="text-muted-foreground italic">
              A table displaying products added from this invoice will appear here.
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleFinalizeProcessing} className="w-full md:w-auto">
            Finalize and Mark as Processed
          </Button>
        </CardFooter>
      </Card>
    </AppLayout>
  );
}

    