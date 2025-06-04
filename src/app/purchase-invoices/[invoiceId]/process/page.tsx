
"use client";

import AppLayout from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { PurchaseInvoice, PurchaseInvoiceItem, Product } from '@/lib/mockData';
import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useState, useMemo } from 'react';
import { ArrowLeft, CheckCircle, Loader2, AlertTriangle, ShoppingBag, PlusCircle, Trash2, Search as SearchIcon } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCurrency } from '@/contexts/CurrencyContext'; // Import useCurrency

interface ProcessedItem extends Omit<PurchaseInvoiceItem, 'productId' | 'productName' | 'totalCost'> {
  productId: string; 
  productName: string;
  totalCost: number;
  newSellingPrice?: number; 
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

// API fetch function for products
const fetchProducts = async (): Promise<Product[]> => {
  const res = await fetch('/api/products');
  if (!res.ok) throw new Error('Failed to fetch products');
  return res.json();
};

// API mutation function to update/process an invoice
const processInvoiceAPI = async ({ invoiceId, data }: { invoiceId: string; data: Partial<PurchaseInvoice> & { items?: Array<{productId: string; quantity: number; costPrice: number; newSellingPrice?: number}> } }): Promise<PurchaseInvoice> => {
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
  const { formatCurrency } = useCurrency(); // Use currency context
  const invoiceId = params.invoiceId as string;

  const [itemsToProcess, setItemsToProcess] = useState<ProcessedItem[]>([]);
  
  const [productSearchTerm, setProductSearchTerm] = useState<string>("");
  const [selectedProductDetails, setSelectedProductDetails] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState<number | string>(1);
  const [costPrice, setCostPrice] = useState<number | string>(""); 
  const [newSellingPriceInput, setNewSellingPriceInput] = useState<number | string>(""); 

  const { data: invoice, isLoading: isLoadingInvoice, error: invoiceError } = useQuery<PurchaseInvoice, Error>({
    queryKey: ['purchaseInvoice', invoiceId],
    queryFn: () => fetchPurchaseInvoice(invoiceId),
    enabled: !!invoiceId,
  });

  const { data: products = [], isLoading: isLoadingProducts } = useQuery<Product[], Error>({
    queryKey: ['products'],
    queryFn: fetchProducts,
  });
  
  const processMutation = useMutation<PurchaseInvoice, Error, { invoiceId: string; data: Partial<PurchaseInvoice> & { items: Array<{productId: string; quantity: number; costPrice: number; newSellingPrice?: number}> } }>({
    mutationFn: processInvoiceAPI,
    onSuccess: (data) => {
      toast({ title: "Invoice Processed", description: `Invoice ${data.invoiceNumber} has been successfully processed.` });
      queryClient.invalidateQueries({ queryKey: ['purchaseInvoices'] });
      queryClient.invalidateQueries({ queryKey: ['purchaseInvoice', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventoryTransactions']});
      router.push('/purchase-invoices');
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Processing Failed", description: error.message });
    },
  });

  const filteredProductsForSearch = useMemo(() => {
    if (!productSearchTerm.trim()) return [];
    const termLower = productSearchTerm.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(termLower) ||
      p.code.toLowerCase().includes(termLower) ||
      p.reference.toLowerCase().includes(termLower)
    ).slice(0, 5); 
  }, [productSearchTerm, products]);

  const handleProductSelect = (product: Product) => {
    setSelectedProductDetails(product);
    setCostPrice(product.cost); 
    setNewSellingPriceInput(product.price); 
    setProductSearchTerm(""); 
    setQuantity(1); 
  };

  const handleAddItemToProcess = () => {
    if (!selectedProductDetails || Number(quantity) <= 0 || costPrice === "" || Number(costPrice) < 0) {
      toast({ variant: "destructive", title: "Invalid Item", description: "Please select a product and enter valid quantity and cost price." });
      return;
    }

    const newItem: ProcessedItem = {
      productId: selectedProductDetails.id,
      productName: selectedProductDetails.name,
      quantity: Number(quantity),
      costPrice: Number(costPrice),
      totalCost: Number(quantity) * Number(costPrice),
      newSellingPrice: newSellingPriceInput !== "" && Number(newSellingPriceInput) !== selectedProductDetails.price ? Number(newSellingPriceInput) : undefined,
    };

    setItemsToProcess(prev => {
      const existingItemIndex = prev.findIndex(item => item.productId === newItem.productId);
      if (existingItemIndex > -1) {
        const updatedItems = [...prev];
        const existingItem = updatedItems[existingItemIndex];
        existingItem.quantity += newItem.quantity;
        existingItem.costPrice = newItem.costPrice; 
        existingItem.totalCost = existingItem.quantity * existingItem.costPrice;
        if (newItem.newSellingPrice !== undefined) { 
            existingItem.newSellingPrice = newItem.newSellingPrice;
        }
        return updatedItems;
      } else {
        return [...prev, newItem];
      }
    });

    setSelectedProductDetails(null);
    setQuantity(1);
    setCostPrice("");
    setNewSellingPriceInput("");
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
        productId: item.productId,
        quantity: item.quantity,
        costPrice: item.costPrice,
        newSellingPrice: item.newSellingPrice,
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
           <CardContent>
            <h4 className="font-semibold mb-2">Processed Items:</h4>
            {invoice.items && invoice.items.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Name</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-right">Cost/Unit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.items.map(item => (
                      <TableRow key={item.productId}>
                        <TableCell>{item.productName}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.costPrice)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-muted-foreground">No items were recorded for this processed invoice.</p>
            )}
          </CardContent>
          <CardFooter>
            <Button onClick={() => router.push('/purchase-invoices')}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Purchase Invoices
            </Button>
          </CardFooter>
        </Card>
      </AppLayout>
    );
  }

  const totalCostOfItems = itemsToProcess.reduce((sum, item) => sum + item.totalCost, 0);

  return (
    <AppLayout>
      <PageHeader 
        title={`Process Invoice: ${invoice.invoiceNumber}`} 
        description={`Supplier: ${invoice.supplierName} | Invoice Total: ${formatCurrency(invoice.totalAmount)}`}
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
            <div className="relative">
              <label htmlFor="product-search" className="block text-sm font-medium text-foreground mb-1">Search Product (Code, Name, Ref) *</label>
              <div className="relative">
                <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="product-search"
                  type="text" 
                  value={productSearchTerm} 
                  onChange={e => setProductSearchTerm(e.target.value)} 
                  placeholder="Type to search..."
                  className="pl-8"
                  disabled={!!selectedProductDetails}
                />
              </div>
              {productSearchTerm && filteredProductsForSearch.length > 0 && !selectedProductDetails && (
                <ScrollArea className="absolute z-10 w-full bg-background border rounded-md shadow-lg max-h-48 mt-1">
                  {filteredProductsForSearch.map(p => (
                    <div 
                      key={p.id} 
                      onClick={() => handleProductSelect(p)}
                      className="p-2 hover:bg-accent hover:text-accent-foreground cursor-pointer text-sm"
                    >
                      {p.name} ({p.code}) - Stock: {p.stock}
                    </div>
                  ))}
                </ScrollArea>
              )}
            </div>

            {selectedProductDetails && (
              <Card className="bg-muted/50 p-3 space-y-1">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-sm font-semibold">{selectedProductDetails.name}</p>
                        <p className="text-xs text-muted-foreground">Code: {selectedProductDetails.code} | Ref: {selectedProductDetails.reference}</p>
                    </div>
                    <Button variant="link" size="sm" className="p-0 h-auto text-xs text-destructive" onClick={() => {setSelectedProductDetails(null); setCostPrice(""); setNewSellingPriceInput(""); setQuantity(1); }}>Clear</Button>
                </div>
                <p className="text-xs text-muted-foreground">Current Stock: {selectedProductDetails.stock}</p>
                <p className="text-xs text-muted-foreground">Current Cost: {formatCurrency(selectedProductDetails.cost)}</p>
                <p className="text-xs text-muted-foreground">Current Price: {formatCurrency(selectedProductDetails.price)}</p>
              </Card>
            )}

            {selectedProductDetails && (
              <>
                <div>
                  <label htmlFor="quantity" className="block text-sm font-medium text-foreground mb-1">Quantity Received *</label>
                  <Input id="quantity" type="number" value={quantity} onChange={e => setQuantity(e.target.value === '' ? '' : Number(e.target.value))} placeholder="e.g., 10" min="1"/>
                </div>
                <div>
                  <label htmlFor="costPrice" className="block text-sm font-medium text-foreground mb-1">Cost Price (per unit on Invoice) *</label>
                  <Input id="costPrice" type="number" value={costPrice} onChange={e => setCostPrice(e.target.value)} placeholder="e.g., 25.50" step="0.01" min="0"/>
                </div>
                 <div>
                  <label htmlFor="newSellingPrice" className="block text-sm font-medium text-foreground mb-1">New Selling Price (optional)</label>
                  <Input id="newSellingPrice" type="number" value={newSellingPriceInput} onChange={e => setNewSellingPriceInput(e.target.value)} placeholder={`Current: ${formatCurrency(selectedProductDetails.price)}`} step="0.01" min="0"/>
                </div>
                <Button onClick={handleAddItemToProcess} className="w-full">
                  <ShoppingBag className="mr-2 h-4 w-4"/> Add Item
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 shadow-lg">
          <CardHeader>
            <CardTitle>Items to Process for this Invoice</CardTitle>
            <CardDescription>
              Review items before finalizing. Stock levels, product costs, and optionally selling prices will be updated.
              Items Total: <span className="font-bold">{formatCurrency(totalCostOfItems)}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {itemsToProcess.length > 0 ? (
              <ScrollArea className="rounded-md border max-h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-right">Cost/Unit</TableHead>
                      <TableHead className="text-right">New Price</TableHead>
                      <TableHead className="text-right">Total Cost</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemsToProcess.map((item, index) => (
                      <TableRow key={item.productId + index}>
                        <TableCell className="font-medium text-sm">{item.productName}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.costPrice)}</TableCell>
                        <TableCell className="text-right">{item.newSellingPrice ? formatCurrency(item.newSellingPrice) : 'N/A'}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(item.totalCost)}</TableCell>
                        <TableCell className="text-center">
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive h-8 w-8" onClick={() => handleRemoveItem(index)}>
                            <Trash2 className="h-4 w-4"/>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
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
