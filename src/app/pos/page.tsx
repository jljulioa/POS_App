
"use client";

import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { Product as ProductType, SaleItem, SalesTicket } from '@/lib/mockData'; // Keep types
import Image from 'next/image';
import { Search, X, Plus, Minus, Save, ShoppingCart, CreditCard, DollarSign, PlusSquare, Trash2, ListFilter, Loader2, AlertTriangle } from 'lucide-react';
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';

// API fetch function for products
const fetchProducts = async (): Promise<ProductType[]> => {
  const res = await fetch('/api/products');
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'Network response was not ok and failed to parse error JSON.' }));
    throw new Error(errorData.message || 'Network response was not ok');
  }
  return res.json();
};

// Helper to generate unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

export default function POSPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const { data: products = [], isLoading: isLoadingProducts, error: productsError, isError: isProductsError } = useQuery<ProductType[], Error>({
    queryKey: ['products'], // Use the same queryKey as inventory if you want shared caching
    queryFn: fetchProducts,
  });

  const initialTicket: SalesTicket = {
    id: generateId(),
    name: 'Ticket 1',
    cart: [],
    status: 'Active',
    createdAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
  };

  const [tickets, setTickets] = useState<SalesTicket[]>([initialTicket]);
  const [activeTicketId, setActiveTicketId] = useState<string>(initialTicket.id);

  const activeTicket = useMemo(() => tickets.find(t => t.id === activeTicketId), [tickets, activeTicketId]);

  const searchResults = useMemo(() => {
    if (!searchTerm.trim() || isLoadingProducts || isProductsError) return [];
    const termLower = searchTerm.toLowerCase();
    return products.filter(product =>
      product.name.toLowerCase().includes(termLower) ||
      product.code.toLowerCase().includes(termLower) ||
      product.reference.toLowerCase().includes(termLower) ||
      (product.barcode && product.barcode.includes(searchTerm))
    ).slice(0, 10);
  }, [searchTerm, products, isLoadingProducts, isProductsError]);

  const updateTicketCart = (ticketId: string, newCart: SaleItem[]) => {
    setTickets(prevTickets =>
      prevTickets.map(ticket =>
        ticket.id === ticketId ? { ...ticket, cart: newCart, lastUpdatedAt: new Date().toISOString() } : ticket
      )
    );
  };

  const addToCart = useCallback((product: ProductType) => {
    if (!activeTicket) return;
    const productInCatalog = products.find(p => p.id === product.id);
    if (!productInCatalog) {
        toast({ variant: "destructive", title: "Product Not Found", description: "This product is no longer available." });
        return;
    }

    if (productInCatalog.stock === 0) {
      toast({ variant: "destructive", title: "Out of Stock", description: `${productInCatalog.name} is currently out of stock.` });
      return;
    }
    
    const existingItem = activeTicket.cart.find(item => item.productId === productInCatalog.id);
    let newCart: SaleItem[];

    if (existingItem) {
      if (existingItem.quantity < productInCatalog.stock) {
        newCart = activeTicket.cart.map(item =>
          item.productId === productInCatalog.id ? { ...item, quantity: item.quantity + 1, totalPrice: (item.quantity + 1) * item.unitPrice } : item
        );
      } else {
        toast({ variant: "destructive", title: "Stock Limit Reached", description: `Cannot add more ${productInCatalog.name}. Available stock: ${productInCatalog.stock}.` });
        newCart = activeTicket.cart;
      }
    } else {
      newCart = [...activeTicket.cart, { productId: productInCatalog.id, productName: productInCatalog.name, quantity: 1, unitPrice: productInCatalog.price, totalPrice: productInCatalog.price }];
    }
    updateTicketCart(activeTicket.id, newCart);
  }, [activeTicket, products, toast]);

  const updateQuantity = useCallback((productId: string, newQuantity: number) => {
    if (!activeTicket) return;
    const productInCatalog = products.find(p => p.id === productId);
    if (!productInCatalog) {
        toast({ variant: "destructive", title: "Product Not Found", description: "This product is no longer available." });
        return;
    }

    let newCart: SaleItem[];
    if (newQuantity <= 0) {
      newCart = activeTicket.cart.filter(item => item.productId !== productId);
    } else if (newQuantity > productInCatalog.stock) {
      toast({ variant: "destructive", title: "Stock Limit Exceeded", description: `Only ${productInCatalog.stock} units of ${productInCatalog.name} available.`});
      newCart = activeTicket.cart.map(item =>
        item.productId === productId ? { ...item, quantity: productInCatalog.stock, totalPrice: productInCatalog.stock * item.unitPrice } : item
      );
    } else {
      newCart = activeTicket.cart.map(item =>
        item.productId === productId ? { ...item, quantity: newQuantity, totalPrice: newQuantity * item.unitPrice } : item
      );
    }
    updateTicketCart(activeTicket.id, newCart);
  }, [activeTicket, products, toast]);

  const removeFromCart = (productId: string) => {
    if (!activeTicket) return;
    const newCart = activeTicket.cart.filter(item => item.productId !== productId);
    updateTicketCart(activeTicket.id, newCart);
  };

  const cartTotal = useMemo(() => {
    return activeTicket?.cart.reduce((sum, item) => sum + item.totalPrice, 0) || 0;
  }, [activeTicket]);

  const createNewTicket = () => {
    const newTicketId = generateId();
    const newTicket: SalesTicket = {
      id: newTicketId,
      name: `Ticket ${tickets.length + 1}`,
      cart: [],
      status: 'Active',
      createdAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
    };
    setTickets(prev => [...prev, newTicket]);
    setActiveTicketId(newTicketId);
    setSearchTerm('');
  };

  const switchTicket = (ticketId: string) => {
    setActiveTicketId(ticketId);
    setSearchTerm('');
  };

  const closeTicket = (ticketId: string) => {
    setTickets(prev => {
      const remainingTickets = prev.filter(t => t.id !== ticketId);
      if (remainingTickets.length === 0) {
        const newDefaultTicket: SalesTicket = {
          id: generateId(), name: 'Ticket 1', cart: [], status: 'Active', createdAt: new Date().toISOString(), lastUpdatedAt: new Date().toISOString()
        };
        setActiveTicketId(newDefaultTicket.id);
        return [newDefaultTicket];
      } else {
        if (activeTicketId === ticketId) {
          setActiveTicketId(remainingTickets[0].id);
        }
        return remainingTickets;
      }
    });
  };
  
  const updateTicketStatus = (ticketId: string, status: SalesTicket['status']) => {
     setTickets(prev => prev.map(t => t.id === ticketId ? {...t, status, lastUpdatedAt: new Date().toISOString()} : t));
  };


  const handleProcessSale = (paymentMethod: 'Cash' | 'Card') => {
    if (!activeTicket || activeTicket.cart.length === 0) {
      toast({ variant: "destructive", title: "Empty Cart", description: "Please add items to the cart before processing." });
      return;
    }
    // TODO: Implement actual sale processing with backend API call
    // This would involve:
    // 1. Sending sale data (activeTicket.cart, totalAmount, customerId, paymentMethod, etc.) to a '/api/sales' POST endpoint.
    // 2. The backend would then:
    //    a. Create a new Sale record.
    //    b. Create SaleItem records for each item in the cart.
    //    c. Update stock levels in the Products table for each item sold (within a transaction).
    //    d. Return a success or error response.
    console.log('Processing sale (mock):', { ticketId: activeTicket.id, cart: activeTicket.cart, total: cartTotal, paymentMethod });
    toast({ title: "Sale Processed (Mock)", description: `Ticket ${activeTicket.name} total: $${cartTotal.toFixed(2)} via ${paymentMethod}. Stock not updated yet.` });
    
    const currentTicketId = activeTicket.id;
    closeTicket(currentTicketId); 
    setSearchTerm('');
  };
  
  const getTicketBadgeVariant = (status: SalesTicket['status']): "default" | "outline" | "secondary" | "destructive" | null | undefined => {
    switch(status) {
      case 'Active': return 'default';
      case 'On Hold': return 'outline';
      case 'Pending Payment': return 'secondary';
      default: return 'default';
    }
  };


  return (
    <AppLayout>
      {/* Tickets Management Bar */}
      <Card className="mb-4 shadow-md">
        <CardHeader className="p-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Active Sales Tickets</CardTitle>
            <Button size="sm" onClick={createNewTicket}>
              <PlusSquare className="mr-2 h-4 w-4" /> New Ticket
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-3">
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex space-x-3 pb-2">
              {tickets.sort((a,b) => new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime()).map(ticket => (
                <div
                  key={ticket.id}
                  className={cn(
                    "flex items-center justify-between rounded-md group text-sm min-h-[2.5rem]", 
                    ticket.id === activeTicketId
                      ? "bg-primary text-primary-foreground px-3 py-2" 
                      : "border bg-card hover:bg-muted text-card-foreground px-[calc(0.75rem-1px)] py-[calc(0.5rem-1px)]" 
                  )}
                >
                  <div
                    className="flex-grow flex items-center cursor-pointer h-full"
                    onClick={() => switchTicket(ticket.id)}
                  >
                    <span className="font-medium mr-2">{ticket.name}</span>
                    <Badge
                      variant={ticket.id === activeTicketId ? 'outline' : getTicketBadgeVariant(ticket.status)}
                      className={cn(
                        "capitalize text-xs",
                        ticket.id === activeTicketId && "border-primary-foreground/70 text-primary-foreground bg-transparent hover:bg-primary-foreground/10"
                      )}
                    >
                      {ticket.status}
                    </Badge>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-7 w-7 opacity-70 group-hover:opacity-100 shrink-0 ml-2",
                          ticket.id === activeTicketId
                            ? "text-primary-foreground hover:bg-primary-foreground/10"
                            : "text-muted-foreground hover:text-accent-foreground hover:bg-accent/80"
                        )}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ListFilter className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>{ticket.name} Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => updateTicketStatus(ticket.id, 'Active')} disabled={ticket.status === 'Active'}>Set Active</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateTicketStatus(ticket.id, 'On Hold')} disabled={ticket.status === 'On Hold'}>Set On Hold</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateTicketStatus(ticket.id, 'Pending Payment')} disabled={ticket.status === 'Pending Payment'}>Set Pending Payment</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => closeTicket(ticket.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                        <Trash2 className="mr-2 h-4 w-4" /> Close Ticket
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
              {tickets.length === 0 && <p className="text-sm text-muted-foreground">No active tickets. Click "New Ticket" to start.</p>}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {activeTicket ? (
        <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-4rem-3rem-10rem)]"> {/* Adjust height for header, ticket bar and padding */}
          {/* Left Panel: Product Search & Results */}
          <Card className="w-full md:w-2/5 flex flex-col shadow-lg">
            <CardHeader>
              <CardTitle>Product Search</CardTitle>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by name, code, reference, barcode..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 py-3 text-base"
                  disabled={isLoadingProducts}
                />
              </div>
            </CardHeader>
            <CardContent className="flex-grow overflow-hidden">
              <ScrollArea className="h-full pr-3">
                {isLoadingProducts && (
                  <div className="flex justify-center items-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ml-2 text-muted-foreground">Loading products...</p>
                  </div>
                )}
                {isProductsError && (
                  <div className="text-destructive p-4 border border-destructive rounded-md">
                    <AlertTriangle className="mr-2 h-5 w-5 inline-block" />
                    Failed to load products: {productsError?.message}
                  </div>
                )}
                {!isLoadingProducts && !isProductsError && searchResults.length > 0 && (
                  <ul className="space-y-2">
                    {searchResults.map(product => (
                      <li key={product.id} className="flex items-center justify-between p-3 rounded-md border bg-card hover:bg-muted transition-colors">
                        <div className="flex items-center gap-3">
                          <Image src={product.imageUrl || `https://placehold.co/40x40.png?text=${product.name.substring(0,2)}`} alt={product.name} width={40} height={40} className="rounded-sm object-cover" data-ai-hint={product.dataAiHint || "motorcycle part"}/>
                          <div>
                            <p className="font-medium text-sm">{product.name}</p>
                            <p className="text-xs text-muted-foreground">Ref: {product.reference} | Code: {product.code} | Stock: {product.stock}</p>
                          </div>
                        </div>
                        <Button size="sm" onClick={() => addToCart(product)} disabled={product.stock === 0}>
                          <Plus className="h-4 w-4 mr-1" /> Add
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
                {!isLoadingProducts && !isProductsError && searchTerm && searchResults.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">No products found for "{searchTerm}".</p>
                )}
                {!isLoadingProducts && !isProductsError && !searchTerm && (
                  <p className="text-center text-muted-foreground py-4">Start typing to search for products.</p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Right Panel: Cart & Payment */}
          <Card className="w-full md:w-3/5 flex flex-col shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Current Sale: {activeTicket.name} 
                  <Badge 
                    variant={activeTicketId === activeTicket.id && activeTicket.status === 'Active' ? 'outline' : getTicketBadgeVariant(activeTicket.status)} 
                    className={cn(
                        "capitalize text-xs ml-2",
                        activeTicketId === activeTicket.id && activeTicket.status === 'Active' && "border-primary-foreground/70 text-primary-foreground bg-transparent",
                        activeTicketId === activeTicket.id && activeTicket.status !== 'Active' && "border-primary-foreground/70 text-primary-foreground bg-transparent" 
                    )}
                  >
                    {activeTicket.status}
                  </Badge>
                </span> 
                <ShoppingCart className="h-6 w-6 text-primary" />
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-grow overflow-hidden">
              <ScrollArea className="h-[calc(100%-8rem)] pr-3">
                {activeTicket.cart.length > 0 ? (
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
                      {activeTicket.cart.map(item => (
                        <TableRow key={item.productId}>
                          <TableCell className="font-medium text-sm">{item.productName}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.productId, item.quantity - 1)}><Minus className="h-3 w-3"/></Button>
                              <Input type="number" value={item.quantity} 
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  if (!isNaN(val)) updateQuantity(item.productId, val);
                                }} 
                                className="h-7 w-12 text-center px-1"/>
                              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.productId, item.quantity + 1)}><Plus className="h-3 w-3"/></Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-sm">${Number(item.unitPrice).toFixed(2)}</TableCell>
                          <TableCell className="text-right font-semibold text-sm">${Number(item.totalPrice).toFixed(2)}</TableCell>
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
                 <Button 
                    size="lg" 
                    variant="outline" 
                    className="text-base py-6" 
                    onClick={() => updateTicketStatus(activeTicket.id, 'On Hold')}
                    disabled={activeTicket.status === 'On Hold' || activeTicket.cart.length === 0}
                  >
                  <Save className="mr-2 h-5 w-5" /> Hold Ticket
                </Button>
                <Button size="lg" className="bg-green-600 hover:bg-green-700 text-base py-6 col-span-1 sm:col-span-1" onClick={() => handleProcessSale('Cash')}  disabled={activeTicket.cart.length === 0}>
                  <DollarSign className="mr-2 h-5 w-5" /> Cash
                </Button>
                <Button size="lg" className="text-base py-6 col-span-1 sm:col-span-1" onClick={() => handleProcessSale('Card')}  disabled={activeTicket.cart.length === 0}>
                  <CreditCard className="mr-2 h-5 w-5" /> Card
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      ) : (
        <div className="flex items-center justify-center h-[calc(100vh-4rem-3rem-10rem)]">
          <p className="text-xl text-muted-foreground">No active ticket selected. Please create or select a ticket.</p>
        </div>
      )}
    </AppLayout>
  );
}

    