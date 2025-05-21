
"use client";

import AppLayout from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { mockProducts, Product as ProductType, SaleItem } from '@/lib/mockData';
import Image from 'next/image';
import { Search, X, Plus, Minus, Save, ShoppingCart, CreditCard, DollarSign } from 'lucide-react';
import React, { useState, useMemo, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function POSPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<SaleItem[]>([]);
  const { toast } = useToast();

  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    return mockProducts.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.barcode && product.barcode.includes(searchTerm))
    ).slice(0, 10); // Limit results for performance
  }, [searchTerm]);

  const addToCart = useCallback((product: ProductType) => {
    if (product.stock === 0) {
      toast({ variant: "destructive", title: "Out of Stock", description: `${product.name} is currently out of stock.` });
      return;
    }
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.productId === product.id);
      if (existingItem) {
        if (existingItem.quantity < product.stock) {
          return prevCart.map(item =>
            item.productId === product.id ? { ...item, quantity: item.quantity + 1, totalPrice: (item.quantity + 1) * item.unitPrice } : item
          );
        } else {
          toast({ variant: "destructive", title: "Stock Limit Reached", description: `Cannot add more ${product.name}. Available stock: ${product.stock}.` });
          return prevCart;
        }
      } else {
        return [...prevCart, { productId: product.id, productName: product.name, quantity: 1, unitPrice: product.price, totalPrice: product.price }];
      }
    });
  }, [toast]);

  const updateQuantity = useCallback((productId: string, newQuantity: number) => {
    const productInCatalog = mockProducts.find(p => p.id === productId);
    if (!productInCatalog) return;

    if (newQuantity <= 0) {
      setCart(prevCart => prevCart.filter(item => item.productId !== productId));
    } else if (newQuantity > productInCatalog.stock) {
      toast({ variant: "destructive", title: "Stock Limit Exceeded", description: `Only ${productInCatalog.stock} units of ${productInCatalog.name} available.`});
      setCart(prevCart => prevCart.map(item =>
        item.productId === productId ? { ...item, quantity: productInCatalog.stock, totalPrice: productInCatalog.stock * item.unitPrice } : item
      ));
    }
    else {
      setCart(prevCart => prevCart.map(item =>
        item.productId === productId ? { ...item, quantity: newQuantity, totalPrice: newQuantity * item.unitPrice } : item
      ));
    }
  }, [toast]);

  const removeFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.productId !== productId));
  };

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [cart]);

  const handleProcessSale = (paymentMethod: 'Cash' | 'Card') => {
    if (cart.length === 0) {
      toast({ variant: "destructive", title: "Empty Cart", description: "Please add items to the cart before processing." });
      return;
    }
    // Mock sale processing
    console.log('Processing sale:', { cart, total: cartTotal, paymentMethod });
    toast({ title: "Sale Processed", description: `Total: $${cartTotal.toFixed(2)} via ${paymentMethod}.` });
    setCart([]); // Clear cart
    setSearchTerm('');
  };

  return (
    <AppLayout>
      <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-4rem-3rem)] md:h-[calc(100vh-4rem-3rem-1px)]"> {/* Adjust height for header and padding */}
        {/* Left Panel: Product Search & Results */}
        <Card className="w-full md:w-2/5 flex flex-col shadow-lg">
          <CardHeader>
            <CardTitle>Product Search</CardTitle>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by name, code, barcode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 py-3 text-base"
              />
            </div>
          </CardHeader>
          <CardContent className="flex-grow overflow-hidden">
            <ScrollArea className="h-full pr-3">
              {searchResults.length > 0 ? (
                <ul className="space-y-2">
                  {searchResults.map(product => (
                    <li key={product.id} className="flex items-center justify-between p-3 rounded-md border bg-card hover:bg-muted transition-colors">
                      <div className="flex items-center gap-3">
                        <Image src={product.imageUrl} alt={product.name} width={40} height={40} className="rounded-sm object-cover" data-ai-hint={product.dataAiHint || "motorcycle part"}/>
                        <div>
                          <p className="font-medium text-sm">{product.name}</p>
                          <p className="text-xs text-muted-foreground">Code: {product.code} | Stock: {product.stock}</p>
                        </div>
                      </div>
                      <Button size="sm" onClick={() => addToCart(product)} disabled={product.stock === 0}>
                        <Plus className="h-4 w-4 mr-1" /> Add
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : searchTerm ? (
                <p className="text-center text-muted-foreground py-4">No products found for "{searchTerm}".</p>
              ) : (
                 <p className="text-center text-muted-foreground py-4">Start typing to search for products.</p>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Right Panel: Cart & Payment */}
        <Card className="w-full md:w-3/5 flex flex-col shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Current Sale</span> <ShoppingCart className="h-6 w-6 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-grow overflow-hidden">
            <ScrollArea className="h-[calc(100%-8rem)] pr-3"> {/* Adjust height based on footer */}
              {cart.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="w-[120px] text-center">Quantity</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.map(item => (
                      <TableRow key={item.productId}>
                        <TableCell className="font-medium text-sm">{item.productName}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.productId, item.quantity - 1)}><Minus className="h-3 w-3"/></Button>
                            <Input type="number" value={item.quantity} onChange={(e) => updateQuantity(item.productId, parseInt(e.target.value))} className="h-7 w-12 text-center px-1"/>
                            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.productId, item.quantity + 1)}><Plus className="h-3 w-3"/></Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-sm">${item.unitPrice.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-semibold text-sm">${item.totalPrice.toFixed(2)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeFromCart(item.productId)}><X className="h-4 w-4"/></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-10">Cart is empty. Add products from the left.</p>
              )}
            </ScrollArea>
          </CardContent>
          <Separator />
          <CardFooter className="flex flex-col gap-4 pt-6">
            <div className="flex justify-between items-center w-full text-xl font-bold">
              <span>Total:</span>
              <span>${cartTotal.toFixed(2)}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
              <Button size="lg" variant="outline" className="text-base py-6" onClick={() => { /* Implement hold sale */ toast({ title: "Sale Held", description: "Current sale has been put on hold."}) }}>
                <Save className="mr-2 h-5 w-5" /> Hold Sale
              </Button>
              <Button size="lg" className="bg-green-600 hover:bg-green-700 text-base py-6 col-span-1 sm:col-span-1" onClick={() => handleProcessSale('Cash')}>
                <DollarSign className="mr-2 h-5 w-5" /> Cash
              </Button>
              <Button size="lg" className="text-base py-6 col-span-1 sm:col-span-1" onClick={() => handleProcessSale('Card')}>
                <CreditCard className="mr-2 h-5 w-5" /> Card
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </AppLayout>
  );
}
