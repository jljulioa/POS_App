
"use client";

import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { Product as ProductType, Sale } from '@/lib/mockData'; // SaleItem removed as it's defined locally
import type { SalesTicketDB } from '@/app/api/sales-tickets/route';
import Image from 'next/image';
import { Search, X, Plus, Minus, Save, ShoppingCart, CreditCard, DollarSign, PlusSquare, ListFilter, Loader2, AlertTriangle, Ticket, Printer, Percent } from 'lucide-react';
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { format } from 'date-fns';
// Dynamic import for html2pdf.js
// import html2pdf from 'html2pdf.js'; // Remove static import

// Local SaleItem type for POS, including discount fields
interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number; // Effective/discounted unit price
  originalUnitPrice: number; // Price before any discount
  costPrice: number;
  discountPercentage: number;
  totalPrice: number; // Effective total price
}


// API fetch function for products
const fetchProducts = async (): Promise<ProductType[]> => {
  const res = await fetch('/api/products');
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'Network response was not ok and failed to parse error JSON.' }));
    throw new Error(errorData.message || 'Network response was not ok');
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

const createSalesTicketAPI = async (ticketData: Pick<SalesTicketDB, 'name' | 'cart_items' | 'status'>): Promise<SalesTicketDB> => {
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

const updateSalesTicketAPI = async ({ ticketId, data }: { ticketId: string; data: Partial<Pick<SalesTicketDB, 'name' | 'cart_items' | 'status'>> }): Promise<SalesTicketDB> => {
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

interface PrintableTicketProps {
  sale: Sale | null;
}

const PrintableTicket: React.FC<PrintableTicketProps> = ({ sale }) => {
  if (!sale) return null;

  return (
    <div className="p-2 font-mono text-xs" style={{ width: '300px', color: 'black', backgroundColor: 'white', border: '1px solid #ccc' }}>
      <div className="text-center mb-1">
        <h2 className="font-bold text-sm">MotoFox POS</h2>
        <p>Thank you for your purchase!</p>
      </div>
      <Separator className="my-0.5 bg-black" />
      <p>Receipt: {sale.id}</p>
      <p>Date: {format(new Date(sale.date), 'dd/MM/yyyy HH:mm:ss')}</p>
      {sale.customerName && <p>Customer: {sale.customerName}</p>}
      <p>Cashier: {sale.cashierId}</p>
      <Separator className="my-0.5 bg-black" />
      <h3 className="font-bold my-0.5 text-xs">Items:</h3>
      <table className="w-full text-left text-xs">
        <thead>
          <tr>
            <th className="py-0.5 pr-1">Product</th>
            <th className="py-0.5 px-0.5 text-center">Qty</th>
            <th className="py-0.5 px-0.5 text-right">Price</th>
            <th className="py-0.5 pl-1 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {sale.items.map((item) => (
            <tr key={item.productId}>
              <td className="py-0.5 pr-1">{item.productName}</td>
              <td className="py-0.5 px-0.5 text-center">{item.quantity}</td>
              <td className="py-0.5 px-0.5 text-right">${Number(item.unitPrice).toFixed(2)}</td>
              <td className="py-0.5 pl-1 text-right">${Number(item.totalPrice).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Separator className="my-0.5 bg-black" />
      <div className="text-right mt-1">
        <p className="font-bold text-sm">TOTAL: ${Number(sale.totalAmount).toFixed(2)}</p>
      </div>
      <p className="text-center mt-1 text-xs">
        Payment Method: {sale.paymentMethod}
      </p>
    </div>
  );
};


export default function POSPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { userRole } = useAuth();
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);

  const [saleToPrint, setSaleToPrint] = useState<Sale | null>(null);
  const [isPrintConfirmOpen, setIsPrintConfirmOpen] = useState(false);
  const printableTicketRef = useRef<HTMLDivElement>(null);


  const { data: products = [], isLoading: isLoadingProducts, error: productsError, isError: isProductsError } = useQuery<ProductType[], Error>({
    queryKey: ['products'],
    queryFn: fetchProducts,
  });

  const { data: salesTickets = [], isLoading: isLoadingSalesTickets, refetch: refetchSalesTickets } = useQuery<SalesTicketDB[], Error>({
    queryKey: ['salesTickets'],
    queryFn: fetchSalesTickets,
  });
  
  const createTicketMutation = useMutation<SalesTicketDB, Error, Pick<SalesTicketDB, 'name' | 'cart_items' | 'status'>>({
    mutationFn: createSalesTicketAPI,
    onSuccess: (newTicket) => {
      queryClient.setQueryData(['salesTickets'], (oldData: SalesTicketDB[] | undefined) =>
        oldData ? [...oldData, newTicket] : [newTicket]
      );
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
    const nextTicketNumber = currentTickets.length > 0
        ? Math.max(...currentTickets.map(t => {
            const nameMatch = t.name.match(/Ticket (\d+)/);
            return nameMatch ? parseInt(nameMatch[1], 10) : 0;
          })) + 1
        : 1;
    const newTicketName = `Ticket ${nextTicketNumber}`;

    createTicketMutation.mutate({
      name: newTicketName,
      cart_items: [],
      status: 'Active',
    });
    setSearchTerm('');
  }, [createTicketMutation, queryClient]);

  useEffect(() => {
    if (!isLoadingSalesTickets && salesTickets) {
      if (salesTickets.length === 0) {
        if (!createTicketMutation.isPending && !activeTicketId) { 
            handleCreateNewTicket(true);
        }
      } else if (!activeTicketId || !salesTickets.find(t => t.id === activeTicketId)) {
        const sortedTickets = [...salesTickets].sort((a, b) => new Date(b.last_updated_at).getTime() - new Date(a.last_updated_at).getTime());
        if (sortedTickets.length > 0) {
            setActiveTicketId(sortedTickets[0].id);
        }
      }
    }
  }, [salesTickets, isLoadingSalesTickets, activeTicketId, createTicketMutation.isPending, handleCreateNewTicket]);


  const updateTicketMutation = useMutation<SalesTicketDB, Error, { ticketId: string; data: Partial<Pick<SalesTicketDB, 'name' | 'cart_items' | 'status'>> }>({
    mutationFn: updateSalesTicketAPI,
    onSuccess: (updatedTicket) => {
      queryClient.setQueryData(['salesTickets'], (oldData: SalesTicketDB[] | undefined) =>
        oldData ? oldData.map(t => t.id === updatedTicket.id ? updatedTicket : t) : []
      );
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Error Updating Ticket', description: error.message });
      refetchSalesTickets();
    },
  });

  const deleteTicketMutation = useMutation<{ message: string }, Error, string>({
    mutationFn: deleteSalesTicketAPI,
    onSuccess: (data, deletedTicketId) => {
       toast({ title: 'Ticket Closed', description: `The ticket has been closed.` });
      queryClient.setQueryData(['salesTickets'], (oldData: SalesTicketDB[] | undefined) =>
        oldData ? oldData.filter(t => t.id !== deletedTicketId) : []
      );
      queryClient.invalidateQueries({ queryKey: ['salesTickets'] }).then(() => {
        const currentTickets = queryClient.getQueryData<SalesTicketDB[]>(['salesTickets']) || [];
        if (activeTicketId === deletedTicketId) {
            if (currentTickets.length > 0) {
                const sortedTickets = [...currentTickets].sort((a, b) => new Date(b.last_updated_at).getTime() - new Date(a.last_updated_at).getTime());
                setActiveTicketId(sortedTickets[0].id);
            } else {
                setTimeout(() => handleCreateNewTicket(true), 0);
            }
        } else if (currentTickets.length === 0) {
            setTimeout(() => handleCreateNewTicket(true), 0);
        }
      });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Error Closing Ticket', description: error.message });
    },
  });

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

  const activeTicket = useMemo(() => {
    return salesTickets?.find(ticket => ticket.id === activeTicketId);
  }, [salesTickets, activeTicketId]);

  const addToCart = useCallback((product: ProductType) => {
    if (!activeTicket) return;
    const productInCatalog = products.find(p => p.id === product.id);
    if (!productInCatalog) {
        toast({ variant: "destructive", title: "Product Not Found", description: "This product is no longer available." });
        return;
    }

    const itemCostPrice = Number(productInCatalog.cost);
    if (typeof itemCostPrice !== 'number' || isNaN(itemCostPrice)) {
        toast({
        variant: "destructive",
        title: "Product Data Error",
        description: `The cost for "${productInCatalog.name}" is invalid. Please check product data in inventory.`
        });
        return;
    }

    if (productInCatalog.stock === 0) {
      toast({ variant: "destructive", title: "Out of Stock", description: `${productInCatalog.name} is currently out of stock.` });
      return;
    }

    const existingItem = activeTicket.cart_items.find(item => item.productId === productInCatalog.id);
    let newCartItemsClient: SaleItem[];

    if (existingItem) {
      if (existingItem.quantity < productInCatalog.stock) {
        newCartItemsClient = activeTicket.cart_items.map(item =>
          item.productId === productInCatalog.id ? { 
            ...item, 
            quantity: item.quantity + 1, 
            totalPrice: (item.quantity + 1) * item.unitPrice // unitPrice is already potentially discounted
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
        originalUnitPrice: productInCatalog.price,
        unitPrice: productInCatalog.price, // Initially, unitPrice is originalUnitPrice
        costPrice: itemCostPrice,
        discountPercentage: 0,
        totalPrice: productInCatalog.price,
      }];
    }
    
    updateTicketMutation.mutate({ ticketId: activeTicket.id, data: { cart_items: newCartItemsClient } });
    setSearchTerm('');
  }, [activeTicket, products, toast, updateTicketMutation]);

  const updateQuantity = useCallback((productId: string, newQuantity: number) => {
    if (!activeTicket) return;
    const productInCatalog = products.find(p => p.id === productId);
    if (!productInCatalog) {
        toast({ variant: "destructive", title: "Product Not Found", description: "This product is no longer available." });
        return;
    }

    let newCartItemsClient: SaleItem[];
    if (newQuantity <= 0) {
      newCartItemsClient = activeTicket.cart_items.filter(item => item.productId !== productId);
    } else if (newQuantity > productInCatalog.stock) {
      toast({ variant: "destructive", title: "Stock Limit Exceeded", description: `Only ${productInCatalog.stock} units of ${productInCatalog.name} available.`});
      newCartItemsClient = activeTicket.cart_items.map(item =>
        item.productId === productId ? { ...item, quantity: productInCatalog.stock, totalPrice: productInCatalog.stock * item.unitPrice } : item
      );
    } else {
      newCartItemsClient = activeTicket.cart_items.map(item =>
        item.productId === productId ? { ...item, quantity: newQuantity, totalPrice: newQuantity * item.unitPrice } : item
      );
    }
    updateTicketMutation.mutate({ ticketId: activeTicket.id, data: { cart_items: newCartItemsClient } });
  }, [activeTicket, products, toast, updateTicketMutation]);

  const handleDiscountChange = useCallback((productId: string, discountStr: string) => {
    if (!activeTicket) return;
    
    const discountPercentage = parseFloat(discountStr);
    if (isNaN(discountPercentage) || discountPercentage < 0 || discountPercentage > 100) {
        // Optionally show a toast for invalid discount percentage
        // For now, let's assume it resets or keeps previous if invalid, or treat as 0 if empty
        // Or, let the input field's min/max attributes handle direct user input mostly
        // A more robust way would be to validate and provide feedback
    }

    const newCartItemsClient = activeTicket.cart_items.map(item => {
      if (item.productId === productId) {
        const currentDiscount = isNaN(discountPercentage) || discountPercentage < 0 || discountPercentage > 100 ? item.discountPercentage : discountPercentage;
        const newUnitPrice = item.originalUnitPrice * (1 - (currentDiscount / 100));
        return {
          ...item,
          discountPercentage: currentDiscount,
          unitPrice: parseFloat(newUnitPrice.toFixed(2)), // Keep 2 decimal places
          totalPrice: parseFloat((newUnitPrice * item.quantity).toFixed(2)),
        };
      }
      return item;
    });
    updateTicketMutation.mutate({ ticketId: activeTicket.id, data: { cart_items: newCartItemsClient } });
  }, [activeTicket, updateTicketMutation]);


  const removeFromCart = (productId: string) => {
    if (!activeTicket) return;
    const newCartItemsClient = activeTicket.cart_items.filter(item => item.productId !== productId);
    updateTicketMutation.mutate({ ticketId: activeTicket.id, data: { cart_items: newCartItemsClient } });
  };

  const cartTotal = useMemo(() => {
    return activeTicket?.cart_items.reduce((sum, item) => sum + item.totalPrice, 0) || 0;
  }, [activeTicket]);


  const switchTicket = (ticketId: string) => {
    setActiveTicketId(ticketId);
    setSearchTerm('');
  };

  const handleManualCloseTicket = (ticketId: string) => {
    const currentTickets = queryClient.getQueryData<SalesTicketDB[]>(['salesTickets']) || [];
    if(currentTickets.length <= 1){
      toast({ variant: 'destructive', title: 'Cannot Close Last Ticket', description: "You must have at least one active ticket. Process the sale or create a new ticket first." });
      return;
    }
    deleteTicketMutation.mutate(ticketId);
  };

  const handleUpdateTicketStatus = (ticketId: string, status: SalesTicketDB['status']) => {
     updateTicketMutation.mutate({ ticketId, data: { status } });
  };

  const saleApiMutation = useMutation<Sale, Error, Omit<Sale, 'id' | 'date'>>({
    mutationFn: createSaleAPI,
    onSuccess: (data) => {
      setSaleToPrint(data);
      setIsPrintConfirmOpen(true); 
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to Process Sale",
        description: error.message || "An unexpected error occurred.",
      });
    },
  });

  const handleProcessSale = (paymentMethod: 'Cash' | 'Card' | 'Transfer' | 'Combined') => {
    if (!activeTicket || activeTicket.cart_items.length === 0) {
      toast({ variant: "destructive", title: "Empty Cart", description: "Please add items to the cart before processing." });
      return;
    }

    const saleData = {
      items: activeTicket.cart_items.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice) || 0, // Effective discounted price
          costPrice: Number(item.costPrice) || 0,
          totalPrice: Number(item.totalPrice) || 0, // Effective discounted total
      })),
      totalAmount: cartTotal,
      paymentMethod: paymentMethod,
      cashierId: userRole || 'system', 
    };
    saleApiMutation.mutate(saleData);
  };

  const handlePrintTicket = async () => {
    if (!printableTicketRef.current || !saleToPrint) {
        toast({ variant: "destructive", title: "Print Error", description: "No sale data to print or print element not ready."});
        handleClosePrintDialog();
        return;
    }

    setTimeout(async () => {
        try {
            const html2pdf = (await import('html2pdf.js')).default; // Dynamic import
            const element = printableTicketRef.current;
            if (!element) {
                throw new Error("Element to print not found in DOM.");
            }
            const options = {
                margin: 0.1,
                filename: `receipt_${saleToPrint.id}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 3, logging: false, useCORS: true, width: 300 },
                jsPDF: { unit: 'in', format: [3.15, 8], orientation: 'portrait' }
            };
            html2pdf().from(element).set(options).save();
        } catch (error) {
            console.error("Error generating PDF:", error);
            toast({ variant: "destructive", title: "Print Error", description: (error as Error).message });
        } finally {
            handleClosePrintDialog();
        }
    }, 100); 
  };

  const handleClosePrintDialog = () => {
    if (saleToPrint) {
        toast({
            title: "Sale Processed Successfully",
            description: `Sale ID: ${saleToPrint.id} completed. Total: $${saleToPrint.totalAmount.toFixed(2)}.`,
        });
    }
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['sales'] });
    queryClient.invalidateQueries({ queryKey: ['todaysSales'] });
    
    if (activeTicket && saleToPrint) { // Ensure activeTicket is checked before calling mutate
      deleteTicketMutation.mutate(activeTicket.id);
    }
    setIsPrintConfirmOpen(false);
    setSaleToPrint(null);
    setSearchTerm('');
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
  const isCurrentlyLoadingData = isLoadingSalesTickets || isLoadingProducts;


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
                      ? "bg-primary text-primary-foreground px-3 py-2 shadow-md"
                      : "bg-card hover:bg-muted text-card-foreground px-[calc(0.75rem-1px)] py-[calc(0.5rem-1px)] hover:shadow-sm"
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
                      <DropdownMenuItem onClick={() => handleManualCloseTicket(ticket.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10" disabled={isProcessingAnyTicketAction || isProcessingSale || (salesTickets && salesTickets.length <= 1) }>
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
                {!isLoadingProducts && !isProductsError && searchResults.length > 0 && (
                  <ul className="space-y-2">
                    {searchResults.map(product => (
                      <li key={product.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 sm:p-3 rounded-md border bg-card hover:bg-muted transition-colors">
                        <div className="flex items-center gap-2 sm:gap-3 flex-grow mb-2 sm:mb-0">
                          <Image src={product.imageUrl || `https://placehold.co/40x40.png?text=${product.name.substring(0,2)}`} alt={product.name} width={40} height={40} className="rounded-sm object-cover" data-ai-hint={product.dataAiHint || "motorcycle part"}/>
                          <div className="flex-grow">
                            <p className="font-medium text-xs sm:text-sm line-clamp-1">{product.name}</p>
                            <p className="text-xs text-muted-foreground">Stock: {product.stock} | Price: ${product.price.toFixed(2)}</p>
                          </div>
                        </div>
                        <Button size="sm" onClick={() => addToCart(product)} disabled={product.stock === 0 || isProcessingAnyTicketAction || isProcessingSale} className="w-full sm:w-auto text-xs sm:text-sm">
                          <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" /> Add
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
                {!isLoadingProducts && !isProductsError && searchTerm && searchResults.length === 0 && (
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
              <CardTitle className="flex items-center justify-between text-base sm:text-lg">
                <span>Current Sale: {activeTicket.name}
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
                </span>
                <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-grow overflow-hidden p-0 sm:p-3">
              <ScrollArea className="h-full pr-0 sm:pr-3">
                {activeTicket.cart_items.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs sm:text-sm">Product</TableHead>
                        <TableHead className="w-[80px] text-center text-xs sm:text-sm">Disc. %</TableHead>
                        <TableHead className="w-[100px] sm:w-[120px] text-center text-xs sm:text-sm">Quantity</TableHead>
                        <TableHead className="text-right text-xs sm:text-sm">Unit Price</TableHead>
                        <TableHead className="text-right text-xs sm:text-sm">Total</TableHead>
                        <TableHead className="w-[40px] sm:w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeTicket.cart_items.map(item => (
                        <TableRow key={item.productId}>
                          <TableCell className="font-medium text-xs sm:text-sm line-clamp-1">
                            {item.productName}
                            <div className="text-xs text-muted-foreground">Original: ${item.originalUnitPrice.toFixed(2)}</div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Input
                                type="number"
                                min="0"
                                max="100"
                                value={item.discountPercentage}
                                onChange={(e) => handleDiscountChange(item.productId, e.target.value)}
                                className="h-7 w-16 text-center px-1 text-xs sm:text-sm"
                                disabled={isProcessingAnyTicketAction || isProcessingSale}
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
                          <TableCell className="text-right text-xs sm:text-sm">${Number(item.unitPrice).toFixed(2)}</TableCell>
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
                    onClick={() => handleUpdateTicketStatus(activeTicket.id, 'On Hold')}
                    disabled={activeTicket.status === 'On Hold' || activeTicket.cart_items.length === 0 || isProcessingAnyTicketAction || isProcessingSale}
                  >
                  <Save className="mr-2 h-4 w-4 sm:h-5 sm:w-5" /> Hold Ticket
                </Button>
                <Button size="lg" className="bg-green-600 hover:bg-green-700 text-xs sm:text-base py-3 sm:py-6 col-span-1 sm:col-span-1" onClick={() => handleProcessSale('Cash')}  disabled={activeTicket.cart_items.length === 0 || isProcessingAnyTicketAction || isProcessingSale}>
                  {isProcessingSale && saleApiMutation.variables?.paymentMethod === 'Cash' ? <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" /> : <DollarSign className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />}
                  {isProcessingSale && saleApiMutation.variables?.paymentMethod === 'Cash' ? 'Processing...' : 'Cash'}
                </Button>
                <Button size="lg" className="text-xs sm:text-base py-3 sm:py-6 col-span-1 sm:col-span-1" onClick={() => handleProcessSale('Card')}  disabled={activeTicket.cart_items.length === 0 || isProcessingAnyTicketAction || isProcessingSale}>
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

      <AlertDialog open={isPrintConfirmOpen} onOpenChange={(open) => {if (!open) handleClosePrintDialog()}}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Print Receipt?</AlertDialogTitle>
            <AlertDialogDescription>
              The sale has been processed. Would you like to print a receipt for this sale?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleClosePrintDialog}>No, Thanks</AlertDialogCancel>
            <AlertDialogAction onClick={handlePrintTicket}>
              <Printer className="mr-2 h-4 w-4"/> Yes, Print
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div ref={printableTicketRef} style={{ position: 'absolute', left: '-9999px', top: '-9999px', zIndex: -1, border: '1px solid black' }}>
         {saleToPrint && <PrintableTicket sale={saleToPrint} />}
      </div>

    </AppLayout>
  );
}
