
"use client";

import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { mockProducts, Product as ProductType, SaleItem, SalesTicket } from '@/lib/mockData';
import Image from 'next/image';
import { Search, X, Plus, Minus, Save, ShoppingCart, CreditCard, DollarSign, PlusSquare, Trash2, Copy, ListFilter } from 'lucide-react';
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

// Helper to generate unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

export default function POSPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

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
    if (!searchTerm.trim()) return [];
    const termLower = searchTerm.toLowerCase();
    return mockProducts.filter(product =>
      product.name.toLowerCase().includes(termLower) ||
      product.code.toLowerCase().includes(termLower) ||
      product.reference.toLowerCase().includes(termLower) || // Search by reference
      (product.barcode && product.barcode.includes(searchTerm))
    ).slice(0, 10);
  }, [searchTerm]);

  const updateTicketCart = (ticketId: string, newCart: SaleItem[]) => {
    setTickets(prevTickets =>
      prevTickets.map(ticket =>
        ticket.id === ticketId ? { ...ticket, cart: newCart, lastUpdatedAt: new Date().toISOString() } : ticket
      )
    );
  };

  const addToCart = useCallback((product: ProductType) => {
    if (!activeTicket) return;
    if (product.stock === 0) {
      toast({ variant: "destructive", title: "Out of Stock", description: `${product.name} is currently out of stock.` });
      return;
    }
    
    const existingItem = activeTicket.cart.find(item => item.productId === product.id);
    let newCart: SaleItem[];

    if (existingItem) {
      if (existingItem.quantity < product.stock) {
        newCart = activeTicket.cart.map(item =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1, totalPrice: (item.quantity + 1) * item.unitPrice } : item
        );
      } else {
        toast({ variant: "destructive", title: "Stock Limit Reached", description: `Cannot add more ${product.name}. Available stock: ${product.stock}.` });
        newCart = activeTicket.cart;
      }
    } else {
      newCart = [...activeTicket.cart, { productId: product.id, productName: product.name, quantity: 1, unitPrice: product.price, totalPrice: product.price }];
    }
    updateTicketCart(activeTicket.id, newCart);
  }, [activeTicket, toast]);

  const updateQuantity = useCallback((productId: string, newQuantity: number) => {
    if (!activeTicket) return;
    const productInCatalog = mockProducts.find(p => p.id === productId);
    if (!productInCatalog) return;

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
  }, [activeTicket, toast]);

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
    setTickets(prev => prev.filter(t => t.id !== ticketId));
    if (activeTicketId === ticketId) {
      setActiveTicketId(tickets.length > 1 ? tickets.find(t => t.id !== ticketId)!.id : '');
      if (tickets.length === 1) { // if it was the last ticket
         createNewTicket(); // create a new default one
      } else {
        setActiveTicketId(tickets.filter(t=> t.id !== ticketId)[0].id);
      }
    }
  };
  
  const updateTicketStatus = (ticketId: string, status: SalesTicket['status']) => {
     setTickets(prev => prev.map(t => t.id === ticketId ? {...t, status, lastUpdatedAt: new Date().toISOString()} : t));
  };


  const handleProcessSale = (paymentMethod: 'Cash' | 'Card') => {
    if (!activeTicket || activeTicket.cart.length === 0) {
      toast({ variant: "destructive", title: "Empty Cart", description: "Please add items to the cart before processing." });
      return;
    }
    // Mock sale processing
    console.log('Processing sale:', { ticketId: activeTicket.id, cart: activeTicket.cart, total: cartTotal, paymentMethod });
    toast({ title: "Sale Processed", description: `Ticket ${activeTicket.name} total: $${cartTotal.toFixed(2)} via ${paymentMethod}.` });
    
    // Instead of clearing cart, close the ticket and switch or create new
    const currentTicketId = activeTicket.id;
    const remainingTickets = tickets.filter(t => t.id !== currentTicketId);

    if (remainingTickets.length > 0) {
      setTickets(remainingTickets);
      setActiveTicketId(remainingTickets[0].id); // Switch to the next available ticket
    } else {
      const newDefaultTicket: SalesTicket = {
        id: generateId(), name: 'Ticket 1', cart: [], status: 'Active', createdAt: new Date().toISOString(), lastUpdatedAt: new Date().toISOString()
      };
      setTickets([newDefaultTicket]);
      setActiveTicketId(newDefaultTicket.id);
    }
    setSearchTerm('');
  };
  
  const getTicketBadgeVariant = (status: SalesTicket['status']) => {
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
                <Button
                  key={ticket.id}
                  variant={ticket.id === activeTicketId ? "default" : "outline"}
                  onClick={() => switchTicket(ticket.id)}
                  className="relative pr-10 group"
                >
                  {ticket.name} 
                  <Badge variant={getTicketBadgeVariant(ticket.status)} className="ml-2 capitalize text-xs">
                    {ticket.status}
                  </Badge>
                   <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="absolute right-0 top-1/2 -translate-y-1/2 h-6 w-6 opacity-70 group-hover:opacity-100">
                        <ListFilter className="h-3 w-3" />
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
                </Button>
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
                            <p className="text-xs text-muted-foreground">Ref: {product.reference} | Code: {product.code} | Stock: {product.stock}</p>
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
                <span>Current Sale: {activeTicket.name} <Badge variant={getTicketBadgeVariant(activeTicket.status)} className="capitalize text-xs">{activeTicket.status}</Badge></span> <ShoppingCart className="h-6 w-6 text-primary" />
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
                 <Button 
                    size="lg" 
                    variant="outline" 
                    className="text-base py-6" 
                    onClick={() => updateTicketStatus(activeTicket.id, 'On Hold')}
                    disabled={activeTicket.status === 'On Hold'}
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

    