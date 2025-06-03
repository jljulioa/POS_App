
"use client";

import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { Product as ProductType, Sale, Customer } from '@/lib/mockData';
import type { SalesTicketDB, SaleItemForTicket } from '@/app/api/sales-tickets/route';
import Image from 'next/image';
import { Search, X, Plus, Minus, Save, ShoppingCart, CreditCard, DollarSign, PlusSquare, ListFilter, Loader2, AlertTriangle, Ticket, UserPlus, UserX, UserRound } from 'lucide-react';
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link'; 

// API fetch function for products
const fetchProducts = async (): Promise<ProductType[]> => {
  const res = await fetch('/api/products');
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'Network response was not ok and failed to parse error JSON.' }));
    throw new Error(errorData.message || 'Network response was not ok');
  }
  return res.json();
};

// API fetch function for customers
const fetchCustomers = async (): Promise<Customer[]> => {
  const res = await fetch('/api/customers');
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'Failed to fetch customers' }));
    throw new Error(errorData.message || 'Failed to fetch customers');
  }
  return res.json();
};

// API mutation function to create a sale
const createSaleAPI = async (saleData: Omit<Sale, 'id' | 'date'> ): Promise<Sale> => {
  const response = await fetch('/api/sales', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(saleData),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to process sale and could not parse error' }));
    throw new Error(errorData.message || 'Failed to process sale');
  }
  return response.json();
};

// API functions for SalesTickets
const fetchSalesTickets = async (): Promise<SalesTicketDB[]> => {
  const res = await fetch('/api/sales-tickets');
  if (!res.ok) throw new Error('Failed to fetch sales tickets');
  return res.json();
};

const createSalesTicketAPI = async (ticketData: Pick<SalesTicketDB, 'name' | 'cart_items' | 'status' | 'customer_id' | 'customer_name'>): Promise<SalesTicketDB> => {
  const res = await fetch('/api/sales-tickets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ticketData),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'Failed to create sales ticket' }));
    throw new Error(errorData.message || 'Failed to create sales ticket');
  }
  return res.json();
};

const updateSalesTicketAPI = async ({ ticketId, data }: { ticketId: string; data: Partial<Pick<SalesTicketDB, 'name' | 'cart_items' | 'status' | 'customer_id' | 'customer_name'>> }): Promise<SalesTicketDB> => {
  const res = await fetch(`/api/sales-tickets/${ticketId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
   if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'Failed to update sales ticket' }));
    throw new Error(errorData.message || 'Failed to update sales ticket');
  }
  return res.json();
};

const deleteSalesTicketAPI = async (ticketId: string): Promise<{ message: string }> => {
  const res = await fetch(`/api/sales-tickets/${ticketId}`, { method: 'DELETE' });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'Failed to delete sales ticket' }));
    throw new Error(errorData.message || 'Failed to delete sales ticket');
  }
  return res.json();
};


export default function POSPage() {
  const [searchTerm, setSearchTerm] = useState(''); 
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { appUser, supabaseUser } = useAuth(); 
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const finalizedTicketIdRef = useRef<string | null>(null); 
  
  const [customerSearchTerm, setCustomerSearchTerm] = useState(''); 

  const [editableUnitPrices, setEditableUnitPrices] = useState<Record<string, string>>({});
  const [editableDiscountPercentages, setEditableDiscountPercentages] = useState<Record<string, string>>({});


  const { data: products = [], isLoading: isLoadingProducts, error: productsError, isError: isProductsError } = useQuery<ProductType[], Error>({
    queryKey: ['products'],
    queryFn: fetchProducts,
  });

  const { data: customers = [], isLoading: isLoadingCustomers, error: customersError, isError: isCustomersError } = useQuery<Customer[], Error>({
    queryKey: ['customers'],
    queryFn: fetchCustomers,
  });

  const { data: salesTickets = [], isLoading: isLoadingSalesTickets, refetch: refetchSalesTickets } = useQuery<SalesTicketDB[], Error>({
    queryKey: ['salesTickets'],
    queryFn: fetchSalesTickets,
  });
  
  const createTicketMutation = useMutation<SalesTicketDB, Error, Pick<SalesTicketDB, 'name' | 'cart_items' | 'status' | 'customer_id' | 'customer_name'>>({
    mutationFn: createSalesTicketAPI,
    onSuccess: (newTicket) => {
      queryClient.setQueryData(['salesTickets'], (oldData: SalesTicketDB[] = []) => [...oldData, newTicket] );
      queryClient.invalidateQueries({ queryKey: ['salesTickets'] });
      setActiveTicketId(newTicket.id);
      toast({ title: 'Ticket Created', description: `${newTicket.name} has been created.` });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Error Creating Ticket', description: error.message });
    },
  });

  const handleCreateNewTicket = useCallback((forceCreate: boolean = false) => {
    if (createTicketMutation.isPending && !forceCreate) return;

    const currentTickets = queryClient.getQueryData<SalesTicketDB[]>(['salesTickets']) || [];
    let nextTicketNumber = 1;
    if (currentTickets.length > 0) {
        const existingNumbers = currentTickets.map(t => {
            const nameMatch = t.name.match(/Ticket (\d+)/i);
            return nameMatch ? parseInt(nameMatch[1], 10) : 0;
        });
        nextTicketNumber = Math.max(0, ...existingNumbers) + 1;
    }
    const newTicketName = `Ticket ${nextTicketNumber}`;

    createTicketMutation.mutate({
      name: newTicketName,
      cart_items: [],
      status: 'Active',
      customer_id: null,
      customer_name: null,
    });
    setSearchTerm('');
    setCustomerSearchTerm('');
  }, [queryClient, createTicketMutation]);


  useEffect(() => {
    if (!isLoadingSalesTickets && salesTickets) {
      if (salesTickets.length === 0) {
        if (!createTicketMutation.isPending && !activeTicketId) { 
            setTimeout(() => handleCreateNewTicket(true), 260); 
        }
      } else if (!activeTicketId || !salesTickets.find(t => t.id === activeTicketId)) {
        const sortedTickets = [...salesTickets].sort((a, b) => new Date(b.last_updated_at).getTime() - new Date(a.last_updated_at).getTime());
        if (sortedTickets.length > 0) {
            setActiveTicketId(sortedTickets[0].id);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salesTickets, isLoadingSalesTickets, activeTicketId, createTicketMutation.isPending]); 


  const updateTicketMutation = useMutation<SalesTicketDB, Error, { ticketId: string; data: Partial<Pick<SalesTicketDB, 'name' | 'cart_items' | 'status' | 'customer_id' | 'customer_name'>> }>({
    mutationFn: updateSalesTicketAPI,
    onSuccess: (updatedTicket) => {
      queryClient.setQueryData(['salesTickets'], (oldData: SalesTicketDB[] | undefined) =>
        oldData ? oldData.map(t => t.id === updatedTicket.id ? updatedTicket : t) : []
      );
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Failed to Update Sales Ticket', description: error.message });
      refetchSalesTickets(); 
    },
  });

  const deleteTicketMutation = useMutation<{ message: string }, Error, string>({
    mutationFn: deleteSalesTicketAPI,
    onSuccess: (data, deletedTicketId) => {
      toast({ title: 'Ticket Closed', description: `The ticket has been closed.` });
       if (finalizedTicketIdRef.current === deletedTicketId) {
           finalizedTicketIdRef.current = null;
      }
      queryClient.setQueryData(['salesTickets'], (oldData: SalesTicketDB[] | undefined) =>
        oldData ? oldData.filter(t => t.id !== deletedTicketId) : []
      );
      queryClient.invalidateQueries({ queryKey: ['salesTickets'] }).then(() => {
        const currentTickets = queryClient.getQueryData<SalesTicketDB[]>(['salesTickets']) || [];
        if (activeTicketId === deletedTicketId) { 
            if (currentTickets.length > 0) {
                const sortedTickets = [...currentTickets].sort((a, b) => new Date(b.last_updated_at).getTime() - new Date(a.last_updated_at).getTime());
                 setTimeout(() => setActiveTicketId(sortedTickets[0].id), 270); 
            } else {
                setTimeout(() => handleCreateNewTicket(true), 280); 
            }
        } else if (currentTickets.length === 0) { 
             setTimeout(() => handleCreateNewTicket(true), 290); 
        }
      });
      setSearchTerm(''); 
      setCustomerSearchTerm('');
    },
    onError: (error, variables_ticketIdAttempted) => {
      toast({ variant: 'destructive', title: 'Error Closing Ticket', description: error.message });
       if (finalizedTicketIdRef.current === variables_ticketIdAttempted) {
          finalizedTicketIdRef.current = null;
      }
    },
  });

  const productSearchResults = useMemo(() => {
    if (!searchTerm.trim() || isLoadingProducts || isProductsError) return [];
    const termLower = searchTerm.toLowerCase();
    return products.filter(product =>
      product.name.toLowerCase().includes(termLower) ||
      product.code.toLowerCase().includes(termLower) ||
      product.reference.toLowerCase().includes(termLower) ||
      (product.barcode && product.barcode.includes(searchTerm))
    ).slice(0, 20);
  }, [searchTerm, products, isLoadingProducts, isProductsError]);

  const customerSearchResults = useMemo(() => {
    if (!customerSearchTerm.trim() || isLoadingCustomers || isCustomersError) return [];
    const termLower = customerSearchTerm.toLowerCase();
    return customers.filter(customer =>
      customer.name.toLowerCase().includes(termLower) ||
      (customer.identificationNumber && customer.identificationNumber.toLowerCase().includes(termLower))
    ).slice(0, 10);
  }, [customerSearchTerm, customers, isLoadingCustomers, isCustomersError]);

  const activeTicket = useMemo(() => {
    return salesTickets?.find(ticket => ticket.id === activeTicketId);
  }, [salesTickets, activeTicketId]);

  useEffect(() => {
    if (activeTicket?.cart_items) {
      const newEditablePrices: Record<string, string> = {};
      const newEditableDiscounts: Record<string, string> = {};
      activeTicket.cart_items.forEach(item => {
        newEditablePrices[item.productId] = item.unitPrice.toString();
        newEditableDiscounts[item.productId] = item.discountPercentage.toString();
      });
      setEditableUnitPrices(newEditablePrices);
      setEditableDiscountPercentages(newEditableDiscounts);
    } else {
      setEditableUnitPrices({});
      setEditableDiscountPercentages({});
    }
  }, [activeTicket?.cart_items]);


  const handleSelectCustomer = (customer: Customer) => {
    if (!activeTicket) return;
    updateTicketMutation.mutate({ 
      ticketId: activeTicket.id, 
      data: { 
        customer_id: customer.id, // Using customer's primary key
        customer_name: customer.name 
      } 
    });
    setCustomerSearchTerm('');
  };

  const handleClearCustomer = () => {
    if (!activeTicket) return;
    updateTicketMutation.mutate({
      ticketId: activeTicket.id,
      data: { customer_id: null, customer_name: null }
    });
  };


  const addToCart = useCallback((productToAdd: ProductType) => {
    if (!activeTicket) return;
    const productInCatalog = products.find(p => p.id === productToAdd.id);
    if (!productInCatalog) {
        toast({ variant: "destructive", title: "Product Not Found", description: "This product is no longer available." });
        return;
    }
    
    const itemCostPrice = Number(productInCatalog.cost);
    if (typeof itemCostPrice !== 'number' || isNaN(itemCostPrice)) {
        toast({
        variant: "destructive",
        title: "Product Data Error",
        description: `The cost for "${productInCatalog.name}" is invalid or missing. Please check product data.`
        });
        return;
    }

    if (productInCatalog.stock === 0) {
      toast({ variant: "destructive", title: "Out of Stock", description: `${productInCatalog.name} is currently out of stock.` });
      return;
    }

    const existingItem = activeTicket.cart_items.find(item => item.productId === productInCatalog.id);
    let newCartItemsClient: SaleItemForTicket[];

    if (existingItem) {
      if (existingItem.quantity < productInCatalog.stock) {
        newCartItemsClient = activeTicket.cart_items.map(item =>
          item.productId === productInCatalog.id ? { 
            ...item, 
            quantity: item.quantity + 1, 
            totalPrice: parseFloat(((item.quantity + 1) * item.unitPrice).toFixed(2))
          } : item
        );
      } else {
        toast({ variant: "destructive", title: "Stock Limit Reached", description: `Cannot add more ${productInCatalog.name}. Stock available: ${productInCatalog.stock}.` });
        newCartItemsClient = activeTicket.cart_items; 
      }
    } else {
      newCartItemsClient = [...activeTicket.cart_items, {
        productId: productInCatalog.id,
        productName: productInCatalog.name,
        quantity: 1,
        originalUnitPrice: Number(productInCatalog.price) || 0,
        unitPrice: Number(productInCatalog.price) || 0,
        costPrice: itemCostPrice, 
        discountPercentage: 0,
        totalPrice: Number(productInCatalog.price) || 0,
      }];
    }
    
    const cartItemsForAPI = newCartItemsClient.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        originalUnitPrice: Number(item.originalUnitPrice) || 0,
        unitPrice: Number(item.unitPrice) || 0,
        costPrice: Number(item.costPrice) || 0,
        discountPercentage: Number(item.discountPercentage) || 0,
        totalPrice: Number(item.totalPrice) || 0,
    }));
    updateTicketMutation.mutate({ ticketId: activeTicket.id, data: { cart_items: cartItemsForAPI } });
    setSearchTerm('');
  }, [activeTicket, products, toast, updateTicketMutation]);

  const updateQuantity = useCallback((productId: string, newQuantity: number) => {
    if (!activeTicket) return;
    const productInCatalog = products.find(p => p.id === productId);
    if (!productInCatalog) {
        toast({ variant: "destructive", title: "Product Not Found", description: "This product is no longer available." });
        return;
    }

    let newCartItemsClient: SaleItemForTicket[];
    if (newQuantity <= 0) {
      newCartItemsClient = activeTicket.cart_items.filter(item => item.productId !== productId);
    } else if (newQuantity > productInCatalog.stock) {
      toast({ variant: "destructive", title: "Stock Limit Exceeded", description: `Only ${productInCatalog.stock} units of ${productInCatalog.name} available.`});
      newCartItemsClient = activeTicket.cart_items.map(item =>
        item.productId === productId ? { ...item, quantity: productInCatalog.stock, totalPrice: parseFloat((productInCatalog.stock * item.unitPrice).toFixed(2)) } : item
      );
    } else {
      newCartItemsClient = activeTicket.cart_items.map(item =>
        item.productId === productId ? { ...item, quantity: newQuantity, totalPrice: parseFloat((newQuantity * item.unitPrice).toFixed(2)) } : item
      );
    }
    const cartItemsForAPI = newCartItemsClient.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        originalUnitPrice: Number(item.originalUnitPrice) || 0,
        unitPrice: Number(item.unitPrice) || 0,
        costPrice: Number(item.costPrice) || 0,
        discountPercentage: Number(item.discountPercentage) || 0,
        totalPrice: Number(item.totalPrice) || 0,
    }));
    updateTicketMutation.mutate({ ticketId: activeTicket.id, data: { cart_items: cartItemsForAPI } });
  }, [activeTicket, products, toast, updateTicketMutation]);

  const handleDiscountChange = useCallback((productId: string, discountStr: string) => {
    if (!activeTicket) return;
    
    const currentItem = activeTicket.cart_items.find(item => item.productId === productId);
    if (!currentItem) return;

    let newDisc = currentItem.discountPercentage; 
    let newUnitPrice = currentItem.unitPrice;

    if (discountStr === "") {
        newDisc = 0;
        newUnitPrice = parseFloat(currentItem.originalUnitPrice.toFixed(2));
    } else {
        const parsedDiscount = parseFloat(discountStr);
        if (!isNaN(parsedDiscount) && parsedDiscount >= 0 && parsedDiscount <= 100) {
            newDisc = parsedDiscount;
            newUnitPrice = parseFloat((currentItem.originalUnitPrice * (1 - (newDisc / 100))).toFixed(2));
        } else if (!isNaN(parsedDiscount)) {
            newDisc = Math.max(0, Math.min(100, parsedDiscount));
            newUnitPrice = parseFloat((currentItem.originalUnitPrice * (1 - (newDisc / 100))).toFixed(2));
        }
    }

    const newCartItemsClient = activeTicket.cart_items.map(item => 
      item.productId === productId ? {
        ...item,
        discountPercentage: newDisc,
        unitPrice: newUnitPrice,
        totalPrice: parseFloat((newUnitPrice * item.quantity).toFixed(2)),
      } : item
    );
    const cartItemsForAPI = newCartItemsClient.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        originalUnitPrice: Number(item.originalUnitPrice) || 0,
        unitPrice: Number(item.unitPrice) || 0,
        costPrice: Number(item.costPrice) || 0,
        discountPercentage: Number(item.discountPercentage) || 0,
        totalPrice: Number(item.totalPrice) || 0,
    }));
    updateTicketMutation.mutate({ ticketId: activeTicket.id, data: { cart_items: cartItemsForAPI } });
  }, [activeTicket, updateTicketMutation]);

  const handleUnitPriceChange = useCallback((productId: string, newPriceStr: string) => {
    if (!activeTicket) return;
    
    const currentItem = activeTicket.cart_items.find(item => item.productId === productId);
    if (!currentItem) return;

    let newUnitPriceValue = currentItem.unitPrice;
    let newDiscountPercentage = currentItem.discountPercentage;

    if (newPriceStr === "") {
        newUnitPriceValue = currentItem.originalUnitPrice;
        newDiscountPercentage = 0;
    } else {
        const parsedPrice = parseFloat(newPriceStr);
        if (!isNaN(parsedPrice) && parsedPrice >= 0) {
            newUnitPriceValue = parsedPrice;
            if (currentItem.originalUnitPrice > 0) {
                newDiscountPercentage = parseFloat(
                  (((currentItem.originalUnitPrice - newUnitPriceValue) / currentItem.originalUnitPrice) * 100).toFixed(2)
                );
            } else {
                newDiscountPercentage = 0; 
            }
        }
    }
    
    const newCartItemsClient = activeTicket.cart_items.map(item => {
      if (item.productId === productId) {
        return {
          ...item,
          unitPrice: newUnitPriceValue,
          discountPercentage: newDiscountPercentage,
          totalPrice: parseFloat((newUnitPriceValue * item.quantity).toFixed(2)),
        };
      }
      return item;
    });
    const cartItemsForAPI = newCartItemsClient.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        originalUnitPrice: Number(item.originalUnitPrice) || 0,
        unitPrice: Number(item.unitPrice) || 0,
        costPrice: Number(item.costPrice) || 0,
        discountPercentage: Number(item.discountPercentage) || 0,
        totalPrice: Number(item.totalPrice) || 0,
    }));
    updateTicketMutation.mutate({ ticketId: activeTicket.id, data: { cart_items: cartItemsForAPI } });
  }, [activeTicket, updateTicketMutation]);


  const removeFromCart = (productId: string) => {
    if (!activeTicket) return;
    const newCartItemsClient = activeTicket.cart_items.filter(item => item.productId !== productId);
     const cartItemsForAPI = newCartItemsClient.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        originalUnitPrice: Number(item.originalUnitPrice) || 0,
        unitPrice: Number(item.unitPrice) || 0,
        costPrice: Number(item.costPrice) || 0,
        discountPercentage: Number(item.discountPercentage) || 0,
        totalPrice: Number(item.totalPrice) || 0,
    }));
    updateTicketMutation.mutate({ ticketId: activeTicket.id, data: { cart_items: cartItemsForAPI } });
  };

  const cartTotal = useMemo(() => {
    return activeTicket?.cart_items.reduce((sum, item) => sum + item.totalPrice, 0) || 0;
  }, [activeTicket]);


  const switchTicket = (ticketId: string) => {
    setActiveTicketId(ticketId);
    setSearchTerm('');
    setCustomerSearchTerm('');
  };

  const handleCloseTicket = (ticketId: string) => {
    const currentTickets = queryClient.getQueryData<SalesTicketDB[]>(['salesTickets']) || [];
    if(currentTickets.length <= 1){
      toast({ variant: 'destructive', title: 'Cannot Close Last Ticket', description: "You must have at least one active ticket. Process the sale or create a new ticket first." });
      return;
    }
    deleteTicketMutation.mutate(ticketId);
  };

  const handleUpdateTicketStatus = (ticketId: string, status: SalesTicketDB['status']) => {
     if (!activeTicket) return; 
     updateTicketMutation.mutate({ ticketId, data: { status } });
  };

  const saleApiMutation = useMutation<Sale, Error, Omit<Sale, 'id' | 'date'>>({
    mutationFn: createSaleAPI,
    onSuccess: (completedSale) => {
        toast({
            title: "Sale Processed Successfully",
            description: `Sale ID: ${completedSale.id} completed. Total: $${completedSale.totalAmount.toFixed(2)}.`,
        });
        queryClient.invalidateQueries({ queryKey: ['products'] });
        queryClient.invalidateQueries({ queryKey: ['sales'] }); 
        queryClient.invalidateQueries({ queryKey: ['todaysSales']}); 
        queryClient.invalidateQueries({ queryKey: ['inventoryTransactions']});
        
        const ticketIdToDelete = finalizedTicketIdRef.current;
        if (ticketIdToDelete) {
            deleteTicketMutation.mutate(ticketIdToDelete);
        }
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to Process Sale",
        description: error.message || "An unexpected error occurred.",
      });
      finalizedTicketIdRef.current = null; 
    },
  });
  

  const handleProcessSale = (paymentMethod: 'Cash' | 'Card' | 'Transfer' | 'Combined') => {
    if (!activeTicket || activeTicket.cart_items.length === 0) {
      toast({ variant: "destructive", title: "Empty Cart", description: "Please add items to the cart before processing." });
      return;
    }
    finalizedTicketIdRef.current = activeTicket.id; 

    const currentCashierName = appUser?.full_name || supabaseUser?.email || 'System';

    const saleData = {
      items: activeTicket.cart_items.map(item => ({ 
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice) || 0, 
          costPrice: Number(item.costPrice) || 0, 
          totalPrice: Number(item.totalPrice) || 0, 
      })),
      totalAmount: cartTotal,
      customerId: activeTicket.customer_id || null, 
      customerName: activeTicket.customer_name || null,
      paymentMethod: paymentMethod,
      cashierId: currentCashierName, 
    };
    saleApiMutation.mutate(saleData);
  };
  
  const getTicketBadgeVariant = (status: SalesTicketDB['status']): "default" | "outline" | "secondary" | "destructive" | null | undefined => {
    switch(status) {
      case 'Active': return 'default';
      case 'On Hold': return 'secondary';
      case 'Pending Payment': return 'outline';
      default: return 'default';
    }
  };

  const isProcessingAnyTicketAction = createTicketMutation.isPending || updateTicketMutation.isPending || deleteTicketMutation.isPending;
  const isProcessingSale = saleApiMutation.isPending;
  const isCurrentlyLoadingData = isLoadingSalesTickets || isLoadingProducts || isLoadingCustomers;


  if (isCurrentlyLoadingData && (!salesTickets || salesTickets.length === 0) && !createTicketMutation.isPending && !activeTicketId ) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-[calc(100vh-8rem)]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-3 text-lg text-muted-foreground">Loading POS...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Card className="mb-4 shadow-md">
        <CardHeader className="p-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <CardTitle className="text-lg flex items-center"><Ticket className="mr-2 h-5 w-5 text-primary"/>Active Sales Tickets</CardTitle>
            <Button size="sm" onClick={() => handleCreateNewTicket()} disabled={isProcessingAnyTicketAction || isProcessingSale}>
              <PlusSquare className="mr-2 h-4 w-4" /> New Ticket
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-3">
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex space-x-3 pb-2">
              {salesTickets && salesTickets.sort((a,b) => new Date(b.last_updated_at).getTime() - new Date(a.last_updated_at).getTime()).map(ticket => (
                <div
                  key={ticket.id}
                  className={cn(
                    "flex items-center justify-between rounded-md group text-sm min-h-[2.5rem] border transition-all",
                    ticket.id === activeTicketId
                      ? "bg-primary text-primary-foreground shadow-md" 
                      : "bg-card hover:bg-muted text-card-foreground hover:shadow-sm",
                     "px-3 py-2" 
                  )}
                >
                  <div
                    className="flex-grow flex items-center cursor-pointer h-full"
                    onClick={() => !(isProcessingAnyTicketAction || isProcessingSale) && switchTicket(ticket.id)}
                  >
                    <span className="font-medium mr-2">{ticket.name}</span>
                    <Badge
                      variant={ticket.id === activeTicketId ? 'outline' : getTicketBadgeVariant(ticket.status)}
                      className={cn(
                        "capitalize text-xs",
                        ticket.id === activeTicketId && "border-primary-foreground/70 text-primary-foreground bg-primary-foreground/10 hover:bg-primary-foreground/20"
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
                        disabled={isProcessingAnyTicketAction || isProcessingSale}
                      >
                        <ListFilter className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>{ticket.name} Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleUpdateTicketStatus(ticket.id, 'Active')} disabled={ticket.status === 'Active' || isProcessingAnyTicketAction || isProcessingSale}>Mark Active</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleUpdateTicketStatus(ticket.id, 'On Hold')} disabled={ticket.status === 'On Hold' || isProcessingAnyTicketAction || isProcessingSale}>Mark On Hold</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleUpdateTicketStatus(ticket.id, 'Pending Payment')} disabled={ticket.status === 'Pending Payment' || isProcessingAnyTicketAction || isProcessingSale}>Mark Pending Payment</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleCloseTicket(ticket.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10" disabled={isProcessingAnyTicketAction || isProcessingSale || (salesTickets && salesTickets.length <= 1) }>
                        Close Ticket
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
              {salesTickets && salesTickets.length === 0 && !isLoadingSalesTickets && !createTicketMutation.isPending && (
                <p className="text-sm text-muted-foreground p-2">No active tickets. Click "New Ticket" to start.</p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {activeTicket ? (
        <div className="flex flex-col md:flex-row gap-4 sm:gap-6 h-[calc(100vh-4rem-3rem-10rem)]"> 
          <Card className="w-full md:w-2/5 flex flex-col shadow-lg">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Product Search</CardTitle>
              <div className="relative mt-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by name, code, reference..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 py-2 text-sm sm:text-base"
                  disabled={isLoadingProducts || isProcessingAnyTicketAction || isProcessingSale}
                />
              </div>
            </CardHeader>
            <CardContent className="flex-grow overflow-hidden p-2 sm:p-3">
              <ScrollArea className="h-full pr-2 sm:pr-3">
                {isLoadingProducts && (
                  <div className="flex justify-center items-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ml-2 text-muted-foreground text-sm">Loading products...</p>
                  </div>
                )}
                {isProductsError && (
                  <div className="text-destructive p-3 border border-destructive rounded-md text-sm">
                    <AlertTriangle className="mr-2 h-5 w-5 inline-block" />
                    Error loading products: {productsError?.message}
                  </div>
                )}
                {!isLoadingProducts && !isProductsError && productSearchResults.length > 0 && (
                  <ul className="space-y-2">
                    {productSearchResults.map(product => (
                      <li key={product.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 sm:p-3 rounded-md border bg-card hover:bg-muted transition-colors">
                        <div className="flex items-center gap-2 sm:gap-3 flex-grow mb-2 sm:mb-0">
                          <Image src={product.imageUrl || `https://placehold.co/40x40.png?text=${product.name.substring(0,2)}`} alt={product.name} width={40} height={40} className="rounded-sm object-cover" data-ai-hint={product.dataAiHint || "motorcycle part"}/>
                          <div className="flex-grow">
                            <p className="font-medium text-xs sm:text-sm line-clamp-1">{product.name}</p>
                            <p className="text-xs text-muted-foreground">Stock: {product.stock} | Price: ${Number(product.price).toFixed(2)}</p>
                          </div>
                        </div>
                        <Button size="sm" onClick={() => addToCart(product)} disabled={product.stock === 0 || isProcessingAnyTicketAction || isProcessingSale} className="w-full sm:w-auto text-xs sm:text-sm">
                          <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" /> Add
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
                {!isLoadingProducts && !isProductsError && searchTerm && productSearchResults.length === 0 && (
                  <p className="text-center text-muted-foreground py-4 text-sm">No products found for "{searchTerm}".</p>
                )}
                {!isLoadingProducts && !isProductsError && !searchTerm && (
                  <p className="text-center text-muted-foreground py-4 text-sm">Start typing to search for products.</p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="w-full md:w-3/5 flex flex-col shadow-lg">
            <CardHeader className="p-4 sm:p-6">
               <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div className="flex items-center">
                    <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6 text-primary mr-2" />
                    <span className="text-base sm:text-lg font-semibold">{activeTicket.name}</span>
                     <Badge
                      variant={activeTicketId === activeTicket.id ? 'outline' : getTicketBadgeVariant(activeTicket.status)}
                      className={cn(
                          "capitalize text-xs ml-2",
                          activeTicketId === activeTicket.id && activeTicket.status === 'Active' && "border-primary text-primary bg-primary/10",
                          activeTicketId === activeTicket.id && activeTicket.status !== 'Active' && "border-primary-foreground/70 text-primary-foreground bg-primary-foreground/10 hover:bg-primary-foreground/20"
                      )}
                    >
                      {activeTicket.status}
                    </Badge>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="shrink-0 w-full sm:w-auto text-xs sm:text-sm" disabled={isProcessingAnyTicketAction || isProcessingSale || isLoadingCustomers}>
                        <UserRound className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
                        {activeTicket.customer_name ? 
                          <span className="truncate max-w-[100px] sm:max-w-[150px]">{activeTicket.customer_name} (ID: {activeTicket.customer_id})</span> : 
                          "Assign Customer"
                        }
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-64 sm:w-72" align="end">
                      <DropdownMenuLabel>Manage Customer</DropdownMenuLabel>
                      <div className="px-2 py-1">
                        <Input 
                          placeholder="Search Name/ID..." 
                          value={customerSearchTerm}
                          onChange={(e) => setCustomerSearchTerm(e.target.value)}
                          className="h-8 text-sm"
                          disabled={isLoadingCustomers}
                        />
                      </div>
                      {isLoadingCustomers ? (
                        <DropdownMenuItem disabled><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Loading...</DropdownMenuItem>
                      ) : customerSearchResults.length > 0 ? (
                        <ScrollArea className="max-h-40">
                          {customerSearchResults.map(cust => (
                            <DropdownMenuItem key={cust.id} onSelect={() => handleSelectCustomer(cust)}>
                              {cust.name} <span className="text-xs text-muted-foreground ml-1">({cust.identificationNumber || cust.id})</span>
                            </DropdownMenuItem>
                          ))}
                        </ScrollArea>
                      ) : customerSearchTerm && !isLoadingCustomers ? (
                        <DropdownMenuItem disabled>No customers found.</DropdownMenuItem>
                      ) : null}
                      <DropdownMenuSeparator />
                      {activeTicket.customer_id && (
                        <DropdownMenuItem onSelect={handleClearCustomer} className="text-destructive focus:text-destructive">
                          <UserX className="mr-2 h-4 w-4"/>Clear Assigned Customer
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem asChild>
                        <Link href="/customers/add" target="_blank">
                          <UserPlus className="mr-2 h-4 w-4"/> Add New Customer
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
            </CardHeader>
            <CardContent className="flex-grow overflow-hidden p-0 sm:p-3">
              <ScrollArea className="h-full pr-0 sm:pr-3">
                {activeTicket.cart_items.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs sm:text-sm">Product</TableHead>
                        <TableHead className="w-[80px] text-center text-xs sm:text-sm">Disc. %</TableHead>
                        <TableHead className="w-[100px] text-center text-xs sm:text-sm">Unit Price</TableHead>
                        <TableHead className="w-[100px] sm:w-[120px] text-center text-xs sm:text-sm">Quantity</TableHead>
                        <TableHead className="text-right text-xs sm:text-sm">Total</TableHead>
                        <TableHead className="w-[40px] sm:w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeTicket.cart_items.map(item => (
                        <TableRow key={item.productId}>
                          <TableCell className="font-medium text-xs sm:text-sm">
                            <p className="line-clamp-1">{item.productName}</p>
                          </TableCell>
                          <TableCell className="text-center">
                            <Input
                                type="text"
                                value={editableDiscountPercentages[item.productId] ?? ''}
                                onChange={(e) => setEditableDiscountPercentages(prev => ({ ...prev, [item.productId]: e.target.value }))}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleDiscountChange(item.productId, e.currentTarget.value); }}}
                                onBlur={(e) => handleDiscountChange(item.productId, e.target.value)}
                                className="h-7 w-16 text-center px-1 text-xs sm:text-sm"
                                disabled={isProcessingAnyTicketAction || isProcessingSale}
                                placeholder={item.discountPercentage.toString()}
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Input
                                type="text"
                                value={editableUnitPrices[item.productId] ?? ''}
                                onChange={(e) => setEditableUnitPrices(prev => ({ ...prev, [item.productId]: e.target.value }))}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleUnitPriceChange(item.productId, e.currentTarget.value); }}}
                                onBlur={(e) => handleUnitPriceChange(item.productId, e.target.value)}
                                className="h-7 w-20 text-center px-1 text-xs sm:text-sm"
                                disabled={isProcessingAnyTicketAction || isProcessingSale}
                                placeholder={item.unitPrice.toString()}
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button variant="outline" size="icon" className="h-6 w-6 sm:h-7 sm:w-7" onClick={() => updateQuantity(item.productId, item.quantity - 1)} disabled={isProcessingAnyTicketAction || isProcessingSale}><Minus className="h-3 w-3"/></Button>
                              <Input type="number" value={item.quantity}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  if (!isNaN(val)) updateQuantity(item.productId, val);
                                }}
                                className="h-6 w-10 sm:h-7 sm:w-12 text-center px-1 text-xs sm:text-sm"
                                disabled={isProcessingAnyTicketAction || isProcessingSale}/>
                              <Button variant="outline" size="icon" className="h-6 w-6 sm:h-7 sm:w-7" onClick={() => updateQuantity(item.productId, item.quantity + 1)} disabled={isProcessingAnyTicketAction || isProcessingSale}><Plus className="h-3 w-3"/></Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-xs sm:text-sm">${Number(item.totalPrice).toFixed(2)}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-6 w-6 sm:h-7 sm:w-7 text-destructive hover:text-destructive" onClick={() => removeFromCart(item.productId)} disabled={isProcessingAnyTicketAction || isProcessingSale}><X className="h-3 w-3 sm:h-4 sm:w-4"/></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-muted-foreground py-10 text-sm">Cart empty. Add products from the left.</p>
                )}
              </ScrollArea>
            </CardContent>
            <Separator />
            <CardFooter className="flex flex-col gap-3 sm:gap-4 pt-4 sm:pt-6 p-3 sm:p-6">
              <div className="flex justify-between items-center w-full text-lg sm:text-xl font-bold">
                <span>Total:</span>
                <span>${cartTotal.toFixed(2)}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 w-full">
                 <Button
                    size="lg"
                    variant="outline"
                    className="text-xs sm:text-base py-3 sm:py-6"
                    onClick={() => activeTicket && handleUpdateTicketStatus(activeTicket.id, 'On Hold')}
                    disabled={!activeTicket || activeTicket.status === 'On Hold' || activeTicket.cart_items.length === 0 || isProcessingAnyTicketAction || isProcessingSale}
                  >
                  <Save className="mr-2 h-4 w-4 sm:h-5 sm:w-5" /> Hold Ticket
                </Button>
                <Button size="lg" className="bg-green-600 hover:bg-green-700 text-xs sm:text-base py-3 sm:py-6 col-span-1 sm:col-span-1" onClick={() => handleProcessSale('Cash')}  disabled={!activeTicket || activeTicket.cart_items.length === 0 || isProcessingAnyTicketAction || isProcessingSale}>
                  {isProcessingSale && saleApiMutation.variables?.paymentMethod === 'Cash' ? <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" /> : <DollarSign className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />}
                  {isProcessingSale && saleApiMutation.variables?.paymentMethod === 'Cash' ? 'Processing...' : 'Cash'}
                </Button>
                <Button size="lg" className="text-xs sm:text-base py-3 sm:py-6 col-span-1 sm:col-span-1" onClick={() => handleProcessSale('Card')}  disabled={!activeTicket || activeTicket.cart_items.length === 0 || isProcessingAnyTicketAction || isProcessingSale}>
                  {isProcessingSale && saleApiMutation.variables?.paymentMethod === 'Card' ? <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />}
                  {isProcessingSale && saleApiMutation.variables?.paymentMethod === 'Card' ? 'Processing...' : 'Card'}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      ) : (
        <div className="flex items-center justify-center h-[calc(100vh-4rem-3rem-10rem)]"> 
          {isLoadingSalesTickets || createTicketMutation.isPending ? (
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          ) : (
            <p className="text-lg sm:text-xl text-muted-foreground">No active ticket selected. Please create or select a ticket.</p>
          )}
        </div>
      )}
    </AppLayout>
  );
}
