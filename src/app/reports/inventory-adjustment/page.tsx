
"use client";

import React, { useState, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle, Search, PackageCheck, Save, PackageSearch } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Product as ProductType } from '@/lib/mockData';
import { useCurrency } from '@/contexts/CurrencyContext';

// API fetch function for products
const fetchProductsAPI = async (): Promise<ProductType[]> => {
  const res = await fetch('/api/products');
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'Failed to fetch products' }));
    throw new Error(errorData.message || 'Failed to fetch products');
  }
  return res.json();
};

// API mutation function for inventory adjustment
const adjustInventoryAPI = async (adjustmentData: { productId: string; newPhysicalCount: number; notes?: string }): Promise<any> => {
  const response = await fetch('/api/inventory/adjust', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(adjustmentData),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to adjust inventory' }));
    throw new Error(errorData.message || 'Failed to adjust inventory');
  }
  return response.json();
};


export default function InventoryAdjustmentPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { formatCurrency } = useCurrency();

  const [productCodeSearch, setProductCodeSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<ProductType | null>(null);
  const [newPhysicalCount, setNewPhysicalCount] = useState<string>('');
  const [adjustmentNotes, setAdjustmentNotes] = useState('');
  
  const { data: allProducts = [], isLoading: isLoadingProducts, error: productsError } = useQuery<ProductType[], Error>({
    queryKey: ['allProductsForAdjustment'],
    queryFn: fetchProductsAPI,
  });

  const adjustmentMutation = useMutation({
    mutationFn: adjustInventoryAPI,
    onSuccess: (data) => {
      toast({
        title: "Inventory Adjusted",
        description: `${data.productName} (ID: ${data.productId}) stock updated from ${data.stockBefore} to ${data.stockAfter}. Change: ${data.quantityChange}.`,
      });
      queryClient.invalidateQueries({ queryKey: ['allProductsForAdjustment'] }); // Refetch products to update stock display
      queryClient.invalidateQueries({ queryKey: ['products'] }); // Invalidate general product list if used elsewhere
      queryClient.invalidateQueries({ queryKey: ['inventoryTransactions']});
      // Reset form state
      setSelectedProduct(null);
      setProductCodeSearch('');
      setNewPhysicalCount('');
      setAdjustmentNotes('');
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Adjustment Failed",
        description: error.message,
      });
    },
  });

  const handleProductSearch = () => {
    if (!productCodeSearch.trim()) {
      toast({ variant: 'destructive', title: 'Empty Search', description: 'Please enter a product code.' });
      setSelectedProduct(null);
      setNewPhysicalCount('');
      return;
    }
    const foundProduct = allProducts.find(p => p.code.toLowerCase() === productCodeSearch.trim().toLowerCase());
    if (foundProduct) {
      setSelectedProduct(foundProduct);
      setNewPhysicalCount(foundProduct.stock.toString()); // Pre-fill with current stock
    } else {
      toast({ variant: 'destructive', title: 'Product Not Found', description: `No product found with code: ${productCodeSearch}` });
      setSelectedProduct(null);
      setNewPhysicalCount('');
    }
  };
  
  const handleProductCodeSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleProductSearch();
    }
  };


  const handleAdjustStock = () => {
    if (!selectedProduct) {
      toast({ variant: 'destructive', title: 'No Product Selected', description: 'Please search and select a product first.' });
      return;
    }
    const count = parseInt(newPhysicalCount, 10);
    if (isNaN(count) || count < 0) {
      toast({ variant: 'destructive', title: 'Invalid Count', description: 'New physical count must be a non-negative number.' });
      return;
    }
    adjustmentMutation.mutate({
      productId: selectedProduct.id,
      newPhysicalCount: count,
      notes: adjustmentNotes,
    });
  };

  if (isLoadingProducts) {
    return (
      <AppLayout>
        <PageHeader title="Inventory Adjustment" description="Loading products..." />
        <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary"/></div>
      </AppLayout>
    );
  }

  if (productsError) {
    return (
      <AppLayout>
        <PageHeader title="Inventory Adjustment" description="Error loading products." />
        <Card><CardContent className="p-4 text-destructive"><AlertTriangle className="inline mr-2"/>{productsError.message}</CardContent></Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader title="Inventory Adjustment Tool" description="Adjust stock levels based on physical inventory counts. Search by Product Code." />
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center"><PackageSearch className="mr-2 h-6 w-6 text-primary"/>Find Product by Code</CardTitle>
            <div className="flex gap-2 mt-2">
              <Input
                placeholder="Enter Product Code"
                value={productCodeSearch}
                onChange={(e) => setProductCodeSearch(e.target.value)}
                onKeyDown={handleProductCodeSearchKeyDown}
                className="flex-grow"
              />
              <Button onClick={handleProductSearch} disabled={!productCodeSearch.trim()}>
                <Search className="mr-2 h-4 w-4"/> Search
              </Button>
            </div>
          </CardHeader>

          {selectedProduct && (
            <>
              <CardContent className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-1">{selectedProduct.name}</h3>
                <p className="text-sm text-muted-foreground">Code: {selectedProduct.code} | Ref: {selectedProduct.reference}</p>
                <p className="text-sm text-muted-foreground">Category: {selectedProduct.category} | Brand: {selectedProduct.brand}</p>
                <p className="text-lg font-bold mt-3">Current Stock: <span className="text-primary">{selectedProduct.stock}</span> units</p>
                <p className="text-sm text-muted-foreground">Min Stock: {selectedProduct.minStock} | Max Stock: {selectedProduct.maxStock}</p>
                <p className="text-sm text-muted-foreground">Cost: {formatCurrency(selectedProduct.cost)} | Price: {formatCurrency(selectedProduct.price)}</p>
                
                <div className="mt-6 space-y-4">
                  <div>
                    <label htmlFor="newPhysicalCount" className="block text-sm font-medium text-foreground mb-1">New Physical Count *</label>
                    <Input
                      id="newPhysicalCount"
                      type="number"
                      value={newPhysicalCount}
                      onChange={(e) => setNewPhysicalCount(e.target.value)}
                      placeholder="Enter actual quantity on hand"
                      min="0"
                    />
                  </div>
                  <div>
                    <label htmlFor="adjustmentNotes" className="block text-sm font-medium text-foreground mb-1">Adjustment Notes (Optional)</label>
                    <Textarea
                      id="adjustmentNotes"
                      value={adjustmentNotes}
                      onChange={(e) => setAdjustmentNotes(e.target.value)}
                      placeholder="e.g., Physical inventory count discrepancy, Damaged items found, etc."
                      rows={3}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-6">
                <Button onClick={handleAdjustStock} disabled={adjustmentMutation.isPending || !newPhysicalCount.trim()} className="w-full">
                  {adjustmentMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                  ) : (
                    <Save className="mr-2 h-4 w-4"/>
                  )}
                  Adjust Stock & Record Transaction
                </Button>
              </CardFooter>
            </>
          )}
           {!selectedProduct && productCodeSearch && !isLoadingProducts && (
            <CardContent>
              <p className="text-center text-muted-foreground py-4">
                Product with code "{productCodeSearch}" not found, or no search performed yet.
              </p>
            </CardContent>
          )}
          {!selectedProduct && !productCodeSearch && (
             <CardContent>
              <p className="text-center text-muted-foreground py-4">
                Enter a product code above and click "Search" to begin.
              </p>
            </CardContent>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
