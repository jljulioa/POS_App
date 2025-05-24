
"use client";

import AppLayout from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { PurchaseInvoice, PurchaseInvoiceItem, Product } from '@/lib/mockData';
import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle, Loader2, AlertTriangle, ShoppingBag, PlusCircle, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ProcessedItem extends PurchaseInvoiceItem {
  originalProductId: string; // To ensure we map back to a known product for stock updates
}

// API fetch function for a single purchase invoice
const fetchPurchaseInvoice = async (invoiceId: string): Promise<PurchaseInvoice> => {
  const response = await fetch(`/api/purchase-invoices/${invoiceId}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to fetch invoice' }));
    throw new Error(errorData.message || 'Failed to fetch invoice');
  }
  return response.json();
};

// API fetch function for products (to search/select for invoice items)
const fetchProducts = async (): Promise<Product[]> => {
  const res = await fetch('/api/products');
  if (!res.ok) throw new Error('Failed to fetch products');
  return res.json();
};

// API mutation function to update/process an invoice
const processInvoiceAPI = async ({ invoiceId, data }: { invoiceId: string; data: Partial<PurchaseInvoice> & { items?: Array<{productId: string; quantity: number; costPrice: number}> } }): Promise<PurchaseInvoice> => {
  const response = await fetch(`/api/purchase-invoices/${invoiceId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to process invoice' }));
    throw new Error(errorData.message || 'Failed to process invoice');
  }
  return response.json();
};


export default function ProcessPurchaseInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const invoiceId = params.invoiceId as string;

  const [itemsToProcess, setItemsToProcess] = useState<ProcessedItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [quantity, setQuantity] = useState<number | string>(1);
  const [costPrice, setCostPrice] = useState<number | string>(0);

  const { data: invoice, isLoading: isLoadingInvoice, error: invoiceError } = useQuery<PurchaseInvoice, Error>({
    queryKey: ['purchaseInvoice', invoiceId],
    queryFn: () => fetchPurchaseInvoice(invoiceId),
    enabled: !!invoiceId,
  });

  const { data: products = [], isLoading: isLoadingProducts } = useQuery<Product[], Error>({
    queryKey: ['products'],
    queryFn: fetchProducts,
  });
  
  const processMutation = useMutation<PurchaseInvoice, Error, { invoiceId: string; data: Partial<PurchaseInvoice> & { items: Array<{productId: string; quantity: number; costPrice: number}> } }>({
    mutationFn: processInvoiceAPI,
    onSuccess: (data) => {
      toast({ title: "Invoice Processed", description: `Invoice ${data.invoiceNumber} has been successfully processed.` });
      queryClient.invalidateQueries({ queryKey: ['purchaseInvoices'] });
      queryClient.invalidateQueries({ queryKey: ['purchaseInvoice', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['products'] }); // Invalidate products to reflect stock changes
      queryClient.invalidateQueries({ queryKey: ['inventoryTransactions']}); // Invalidate transactions
      router.push('/purchase-invoices');
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Processing Failed", description: error.message });
    },
  });

  useEffect(() => {
    if (invoice && invoice.items && invoice.items.length > 0) {
        // If invoice already has items (e.g., re-opening a partially processed one, though current logic doesn't support this)
        // For now, this assumes items are added fresh.
    }
  }, [invoice]);

  const handleAddItemToProcess = () => {
    if (!selectedProductId || Number(quantity) <= 0 || Number(costPrice) < 0) {
      toast({ variant: "destructive", title: "Invalid Item", description: "Please select a product and enter valid quantity and cost price." });
      return;
    }
    const product = products.find(p => p.id === selectedProductId);
    if (!product) {
      toast({ variant: "destructive", title: "Product Not Found", description: "Selected product does not exist." });
      return;
    }

    const newItem: ProcessedItem = {
      originalProductId: product.id, // original product id
      productId: product.id, // Keep consistent, though in DB it's 'product_id'
      productName: product.name,
      quantity: Number(quantity),
      costPrice: Number(costPrice),
      totalCost: Number(quantity) * Number(costPrice),
    };

    setItemsToProcess(prev => [...prev, newItem]);
    setSelectedProductId("");
    setQuantity(1);
    setCostPrice(0);
  };
  
  const handleRemoveItem = (index: number) => {
    setItemsToProcess(prev => prev.filter((_, i) => i !== index));
  };

  const handleFinalizeProcessing = () => {
    if (!invoice) return;
    if (itemsToProcess.length === 0) {
      toast({ variant: "destructive", title: "No Items", description: "Please add items to process for this invoice." });
      return;
    }
    const itemsForAPI = itemsToProcess.map(item => ({
        productId: item.originalProductId, // Send the actual product ID
        quantity: item.quantity,
        costPrice: item.costPrice,
    }));
    processMutation.mutate({ invoiceId: invoice.id, data: { processed: true, items: itemsForAPI } });
  };

  if (isLoadingInvoice || isLoadingProducts) {
    return (
      <AppLayout>
        <PageHeader title="Process Purchase Invoice" description="Loading invoice details..." />
        <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
      </AppLayout>
    );
  }

  if (invoiceError) {
    return (
      <AppLayout>
        <PageHeader title="Error" />
        <Card><CardContent className="text-destructive p-4"><AlertTriangle className="inline mr-2"/> {invoiceError.message}</CardContent></Card>
      </AppLayout>
    );
  }
  
  if (!invoice) {
    return (
      <AppLayout>
        <PageHeader title="Invoice Not Found" />
        <Card><CardContent className="p-4">The requested purchase invoice could not be found.</CardContent></Card>
        <Button onClick={() => router.push('/purchase-invoices')} className="mt-4"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Invoices</Button>
      </AppLayout>
    );
  }

  if (invoice.processed) {
     return (
      <AppLayout>
        <PageHeader title={`Invoice ${invoice.invoiceNumber}`} description="This invoice has already been processed." />
         <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><CheckCircle className="mr-2 h-6 w-6 text-green-500"/>Invoice Already Processed</CardTitle>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center"><PlusCircle className="mr-2 h-5 w-5"/>Add Item to Invoice</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="product-select" className="block text-sm font-medium text-foreground mb-1">Product *</label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger id="product-select">
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name} (Ref: {p.reference})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="quantity" className="block text-sm font-medium text-foreground mb-1">Quantity *</label>
              <Input id="quantity" type="number" value={quantity} onChange={e => setQuantity(Number(e.target.value))} placeholder="e.g., 10" min="1"/>
            </div>
            <div>
              <label htmlFor="costPrice" className="block text-sm font-medium text-foreground mb-1">Cost Price (per unit) *</label>
              <Input id="costPrice" type="number" value={costPrice} onChange={e => setCostPrice(Number(e.target.value))} placeholder="e.g., 25.50" step="0.01" min="0"/>
            </div>
            <Button onClick={handleAddItemToProcess} className="w-full">
              <ShoppingBag className="mr-2 h-4 w-4"/> Add Item
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 shadow-lg">
          <CardHeader>
            <CardTitle>Items to Process</CardTitle>
            <CardDescription>
              Review items before finalizing. Stock levels and product costs will be updated.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {itemsToProcess.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-center">Quantity</TableHead>
                      <TableHead className="text-right">Cost/Unit</TableHead>
                      <TableHead className="text-right">Total Cost</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemsToProcess.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right">${item.costPrice.toFixed(2)}</TableCell>
                        <TableCell className="text-right">${item.totalCost.toFixed(2)}</TableCell>
                        <TableCell className="text-center">
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleRemoveItem(index)}>
                            <Trash2 className="h-4 w-4"/>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No items added for processing yet.</p>
            )}
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button onClick={handleFinalizeProcessing} disabled={itemsToProcess.length === 0 || processMutation.isPending} className="w-full md:w-auto">
              {processMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CheckCircle className="mr-2 h-4 w-4"/>}
              Finalize and Add to Inventory
            </Button>
          </CardFooter>
        </Card>
      </div>
    </AppLayout>
  );
}

