
"use client";

import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { Product as ProductType, SaleItem, Sale } from '@/lib/mockData';
import type { SalesTicketDB } from '@/app/api/sales-tickets/route';
import Image from 'next/image';
import { Search, X, Plus, Minus, Save, ShoppingCart, CreditCard, DollarSign, PlusSquare, Trash2, ListFilter, Loader2, AlertTriangle, Ticket, Printer } from 'lucide-react';
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
const createSaleAPI = async (saleData: Omit<Sale, 'id' | 'date' | 'items'> & { items: SaleItem[] }): Promise<Sale> => {
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
  sale: Sale;
}

const PrintableTicket: React.FC<PrintableTicketProps> = ({ sale }) => {
  if (!sale) return null;

  return (
    <div className="p-4 font-mono text-xs" style={{ width: '300px', color: 'black', backgroundColor: 'white' }}>
      <div className="text-center mb-2">
        <h2 className="font-bold text-base">MotoFox POS</h2>
        <p>Gracias por su compra!</p>
      </div>
      <Separator className="my-1 bg-black" />
      <p>Recibo: {sale.id}</p>
      <p>Fecha: {format(new Date(sale.date), 'dd/MM/yyyy HH:mm:ss')}</p>
      {sale.customerName && <p>Cliente: {sale.customerName}</p>}
      <p>Cajero: {sale.cashierId}</p>
      <Separator className="my-1 bg-black" />
      <h3 className="font-bold my-1">Artículos:</h3>
      <table className="w-full text-left">
        <thead>
          <tr>
            <th className="py-0.5">Producto</th>
            <th className="py-0.5 text-center">Cant.</th>
            <th className="py-0.5 text-right">Precio</th>
            <th className="py-0.5 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {sale.items.map((item) => (
            <tr key={item.productId}>
              <td className="py-0.5">{item.productName}</td>
              <td className="py-0.5 text-center">{item.quantity}</td>
              <td className="py-0.5 text-right">${Number(item.unitPrice).toFixed(2)}</td>
              <td className="py-0.5 text-right">${Number(item.totalPrice).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Separator className="my-1 bg-black" />
      <div className="text-right mt-2">
        <p className="font-bold text-sm">TOTAL: ${Number(sale.totalAmount).toFixed(2)}</p>
      </div>
      <p className="text-center mt-2 text-xs">
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
    refetchOnWindowFocus: false,
  });

  const createTicketMutation = useMutation<SalesTicketDB, Error, Pick<SalesTicketDB, 'name' | 'cart_items' | 'status'>>({
    mutationFn: createSalesTicketAPI,
    onSuccess: (newTicket) => {
      queryClient.setQueryData(['salesTickets'], (oldData: SalesTicketDB[] | undefined) => 
        oldData ? [...oldData, newTicket] : [newTicket]
      );
      setActiveTicketId(newTicket.id); 
      toast({ title: 'Ticket Creado', description: `${newTicket.name} ha sido creado.` });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Error al Crear Ticket', description: error.message });
    },
  });

  const updateTicketMutation = useMutation<SalesTicketDB, Error, { ticketId: string; data: Partial<Pick<SalesTicketDB, 'name' | 'cart_items' | 'status'>> }>({
    mutationFn: updateSalesTicketAPI,
    onSuccess: (updatedTicket) => {
      queryClient.setQueryData(['salesTickets'], (oldData: SalesTicketDB[] | undefined) =>
        oldData ? oldData.map(t => t.id === updatedTicket.id ? updatedTicket : t) : []
      );
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Error al Actualizar Ticket', description: error.message });
      refetchSalesTickets(); 
    },
  });

  const deleteTicketMutation = useMutation<{ message: string }, Error, string>({
    mutationFn: deleteSalesTicketAPI,
    onSuccess: (data, deletedTicketId) => {
      queryClient.setQueryData(['salesTickets'], (oldData: SalesTicketDB[] | undefined) =>
        oldData ? oldData.filter(t => t.id !== deletedTicketId) : []
      );
      
      const currentTickets = queryClient.getQueryData<SalesTicketDB[]>(['salesTickets']) || [];
      if (activeTicketId === deletedTicketId) {
        if (currentTickets.length > 0) {
          const sortedTickets = [...currentTickets].sort((a,b) => new Date(b.last_updated_at).getTime() - new Date(a.last_updated_at).getTime());
          setActiveTicketId(sortedTickets[0].id);
        } else {
          handleCreateNewTicket(true); 
        }
      } else if (currentTickets.length === 0) {
        handleCreateNewTicket(true); 
      }
      // toast({ title: 'Ticket Cerrado', description: data.message }); // Toast moved to after print dialog
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Error al Cerrar Ticket', description: error.message });
    },
  });

  const activeTicket = useMemo(() => salesTickets?.find(t => t.id === activeTicketId), [salesTickets, activeTicketId]);

  useEffect(() => {
    if (!isLoadingSalesTickets && salesTickets) {
      if (salesTickets.length === 0) {
        if (!createTicketMutation.isPending) {
            handleCreateNewTicket(true);
        }
      } else if (!activeTicketId || !salesTickets.find(t => t.id === activeTicketId)) {
        const sortedTickets = [...salesTickets].sort((a, b) => new Date(b.last_updated_at).getTime() - new Date(a.last_updated_at).getTime());
        setActiveTicketId(sortedTickets[0].id);
      }
    }
  }, [salesTickets, isLoadingSalesTickets, activeTicketId, createTicketMutation.isPending]);


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


  const addToCart = useCallback((product: ProductType) => {
    if (!activeTicket) return;
    const productInCatalog = products.find(p => p.id === product.id);
    if (!productInCatalog) {
        toast({ variant: "destructive", title: "Producto No Encontrado", description: "Este producto ya no está disponible." });
        return;
    }
    if (productInCatalog.stock === 0) {
      toast({ variant: "destructive", title: "Agotado", description: `${productInCatalog.name} está actualmente agotado.` });
      return;
    }
    
    const existingItem = activeTicket.cart_items.find(item => item.productId === productInCatalog.id);
    let newCartItems: SaleItem[];

    if (existingItem) {
      if (existingItem.quantity < productInCatalog.stock) {
        newCartItems = activeTicket.cart_items.map(item =>
          item.productId === productInCatalog.id ? { ...item, quantity: item.quantity + 1, totalPrice: (item.quantity + 1) * item.unitPrice } : item
        );
      } else {
        toast({ variant: "destructive", title: "Límite de Stock Alcanzado", description: `No se puede agregar más ${productInCatalog.name}. Stock disponible: ${productInCatalog.stock}.` });
        newCartItems = activeTicket.cart_items;
      }
    } else {
      newCartItems = [...activeTicket.cart_items, { productId: productInCatalog.id, productName: productInCatalog.name, quantity: 1, unitPrice: productInCatalog.price, totalPrice: productInCatalog.price }];
    }
    updateTicketMutation.mutate({ ticketId: activeTicket.id, data: { cart_items: newCartItems } });
  }, [activeTicket, products, toast, updateTicketMutation]);

  const updateQuantity = useCallback((productId: string, newQuantity: number) => {
    if (!activeTicket) return;
    const productInCatalog = products.find(p => p.id === productId);
    if (!productInCatalog) {
        toast({ variant: "destructive", title: "Producto No Encontrado", description: "Este producto ya no está disponible." });
        return;
    }

    let newCartItems: SaleItem[];
    if (newQuantity <= 0) {
      newCartItems = activeTicket.cart_items.filter(item => item.productId !== productId);
    } else if (newQuantity > productInCatalog.stock) {
      toast({ variant: "destructive", title: "Límite de Stock Excedido", description: `Solo hay ${productInCatalog.stock} unidades de ${productInCatalog.name} disponibles.`});
      newCartItems = activeTicket.cart_items.map(item =>
        item.productId === productId ? { ...item, quantity: productInCatalog.stock, totalPrice: productInCatalog.stock * item.unitPrice } : item
      );
    } else {
      newCartItems = activeTicket.cart_items.map(item =>
        item.productId === productId ? { ...item, quantity: newQuantity, totalPrice: newQuantity * item.unitPrice } : item
      );
    }
    updateTicketMutation.mutate({ ticketId: activeTicket.id, data: { cart_items: newCartItems } });
  }, [activeTicket, products, toast, updateTicketMutation]);

  const removeFromCart = (productId: string) => {
    if (!activeTicket) return;
    const newCartItems = activeTicket.cart_items.filter(item => item.productId !== productId);
    updateTicketMutation.mutate({ ticketId: activeTicket.id, data: { cart_items: newCartItems } });
  };

  const cartTotal = useMemo(() => {
    return activeTicket?.cart_items.reduce((sum, item) => sum + item.totalPrice, 0) || 0;
  }, [activeTicket]);

  const handleCreateNewTicket = (forceCreate: boolean = false) => {
    if (createTicketMutation.isPending && !forceCreate) return;
    const currentTickets = queryClient.getQueryData<SalesTicketDB[]>(['salesTickets']) || [];
    const nextTicketNumber = currentTickets.length + 1;
    const newTicketName = `Ticket ${nextTicketNumber}`;
    createTicketMutation.mutate({
      name: newTicketName,
      cart_items: [],
      status: 'Active',
    });
    setSearchTerm('');
  };
  
  const switchTicket = (ticketId: string) => {
    setActiveTicketId(ticketId);
    setSearchTerm('');
  };

  const handleCloseTicket = (ticketId: string) => {
    const currentTickets = queryClient.getQueryData<SalesTicketDB[]>(['salesTickets']) || [];
    if(currentTickets.length <= 1){
      toast({ variant: 'destructive', title: 'No se puede cerrar el último ticket', description: "Debe tener al menos un ticket activo. Procese la venta o cree un nuevo ticket primero." });
      return;
    }
    deleteTicketMutation.mutate(ticketId);
  };
  
  const handleUpdateTicketStatus = (ticketId: string, status: SalesTicketDB['status']) => {
     updateTicketMutation.mutate({ ticketId, data: { status } });
  };

  const saleApiMutation = useMutation<Sale, Error, Omit<Sale, 'id' | 'date' | 'items'> & { items: SaleItem[] }>({
    mutationFn: createSaleAPI,
    onSuccess: (data) => {
      setSaleToPrint(data);
      setIsPrintConfirmOpen(true);
      // Toast and ticket closing moved to handleClosePrintDialog
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Fallo al Procesar Venta",
        description: error.message || "Ocurrió un error inesperado.",
      });
    },
  });

  const handleProcessSale = (paymentMethod: 'Cash' | 'Card' | 'Transfer' | 'Combined') => {
    if (!activeTicket || activeTicket.cart_items.length === 0) {
      toast({ variant: "destructive", title: "Carrito Vacío", description: "Por favor, agregue artículos al carrito antes de procesar." });
      return;
    }

    const saleData = {
      items: activeTicket.cart_items.map(item => ({ 
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
      })),
      totalAmount: cartTotal,
      paymentMethod: paymentMethod,
      cashierId: userRole || 'system', 
    };
    saleApiMutation.mutate(saleData);
  };

  const handlePrintTicket = async () => {
    if (!saleToPrint || !printableTicketRef.current) {
      toast({ variant: "destructive", title: "Error de Impresión", description: "No hay datos de venta para imprimir."});
      handleClosePrintDialog();
      return;
    }
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const options = {
        margin: 0.1,
        filename: `recibo_${saleToPrint.id}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 3, logging: false, useCORS: true, width: 300 }, // Approximate width for 80mm receipt paper
        jsPDF: { unit: 'in', format: [3.15, 8], orientation: 'portrait' } // 80mm width, arbitrary long height
      };
      html2pdf().from(printableTicketRef.current).set(options).save();
    } catch (error) {
      console.error("Error al generar PDF:", error);
      toast({ variant: "destructive", title: "Error de Impresión", description: (error as Error).message });
    } finally {
      handleClosePrintDialog();
    }
  };

  const handleClosePrintDialog = () => {
    if (saleToPrint) { // Ensure saleToPrint is not null before toasting
        toast({
            title: "Venta Procesada Exitosamente",
            description: `Venta ID: ${saleToPrint.id} completada. Total: $${saleToPrint.totalAmount.toFixed(2)}.`,
        });
    }
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['sales'] });    
    
    if (activeTicket && saleToPrint) { // Only close ticket if sale was processed (saleToPrint is set)
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


  if (isCurrentlyLoadingData && (!salesTickets || salesTickets.length === 0) && !createTicketMutation.isPending) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-[calc(100vh-8rem)]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-3 text-lg text-muted-foreground">Cargando POS...</p>
        </div>
      </AppLayout>
    );
  }
  
  return (
    <AppLayout>
      <Card className="mb-4 shadow-md">
        <CardHeader className="p-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center"><Ticket className="mr-2 h-5 w-5 text-primary"/>Tickets de Venta Activos</CardTitle>
            <Button size="sm" onClick={() => handleCreateNewTicket()} disabled={isProcessingAnyTicketAction || isProcessingSale}>
              <PlusSquare className="mr-2 h-4 w-4" /> Nuevo Ticket
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
                        disabled={isProcessingAnyTicketAction || isProcessingSale}
                      >
                        <ListFilter className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>{ticket.name} Acciones</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleUpdateTicketStatus(ticket.id, 'Active')} disabled={ticket.status === 'Active' || isProcessingAnyTicketAction || isProcessingSale}>Marcar Activo</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleUpdateTicketStatus(ticket.id, 'On Hold')} disabled={ticket.status === 'On Hold' || isProcessingAnyTicketAction || isProcessingSale}>Marcar En Espera</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleUpdateTicketStatus(ticket.id, 'Pending Payment')} disabled={ticket.status === 'Pending Payment' || isProcessingAnyTicketAction || isProcessingSale}>Marcar Pendiente de Pago</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleCloseTicket(ticket.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10" disabled={isProcessingAnyTicketAction || isProcessingSale || (salesTickets && salesTickets.length <= 1) }>
                        <Trash2 className="mr-2 h-4 w-4" /> Cerrar Ticket
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
              {salesTickets && salesTickets.length === 0 && !isLoadingSalesTickets && !createTicketMutation.isPending && (
                <p className="text-sm text-muted-foreground p-2">No hay tickets activos. Click "Nuevo Ticket" para empezar.</p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {activeTicket ? (
        <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-4rem-3rem-10rem)]"> {/* Adjusted height calculation */}
          <Card className="w-full md:w-2/5 flex flex-col shadow-lg">
            <CardHeader>
              <CardTitle>Búsqueda de Producto</CardTitle>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Buscar por nombre, código, referencia, código de barras..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 py-3 text-base"
                  disabled={isLoadingProducts || isProcessingAnyTicketAction || isProcessingSale}
                />
              </div>
            </CardHeader>
            <CardContent className="flex-grow overflow-hidden">
              <ScrollArea className="h-full pr-3">
                {isLoadingProducts && (
                  <div className="flex justify-center items-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ml-2 text-muted-foreground">Cargando productos...</p>
                  </div>
                )}
                {isProductsError && (
                  <div className="text-destructive p-4 border border-destructive rounded-md">
                    <AlertTriangle className="mr-2 h-5 w-5 inline-block" />
                    Error al cargar productos: {productsError?.message}
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
                            <p className="text-xs text-muted-foreground">Ref: {product.reference} | Código: {product.code} | Stock: {product.stock}</p>
                          </div>
                        </div>
                        <Button size="sm" onClick={() => addToCart(product)} disabled={product.stock === 0 || isProcessingAnyTicketAction || isProcessingSale}>
                          <Plus className="h-4 w-4 mr-1" /> Añadir
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
                {!isLoadingProducts && !isProductsError && searchTerm && searchResults.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">No se encontraron productos para "{searchTerm}".</p>
                )}
                {!isLoadingProducts && !isProductsError && !searchTerm && (
                  <p className="text-center text-muted-foreground py-4">Empieza a escribir para buscar productos.</p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="w-full md:w-3/5 flex flex-col shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Venta Actual: {activeTicket.name} 
                  <Badge 
                    variant={activeTicketId === activeTicket.id && activeTicket.status === 'Active' ? 'outline' : getTicketBadgeVariant(activeTicket.status)} 
                    className={cn(
                        "capitalize text-xs ml-2",
                        activeTicketId === activeTicket.id && "border-primary-foreground/70 text-primary-foreground bg-primary-foreground/10"
                    )}
                  >
                    {activeTicket.status}
                  </Badge>
                </span> 
                <ShoppingCart className="h-6 w-6 text-primary" />
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-grow overflow-hidden">
              <ScrollArea className="h-full pr-3"> 
                {activeTicket.cart_items.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead className="w-[120px] text-center">Cantidad</TableHead>
                        <TableHead className="text-right">Precio</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeTicket.cart_items.map(item => (
                        <TableRow key={item.productId}>
                          <TableCell className="font-medium text-sm">{item.productName}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.productId, item.quantity - 1)} disabled={isProcessingAnyTicketAction || isProcessingSale}><Minus className="h-3 w-3"/></Button>
                              <Input type="number" value={item.quantity} 
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  if (!isNaN(val)) updateQuantity(item.productId, val);
                                }} 
                                className="h-7 w-12 text-center px-1"
                                disabled={isProcessingAnyTicketAction || isProcessingSale}/>
                              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.productId, item.quantity + 1)} disabled={isProcessingAnyTicketAction || isProcessingSale}><Plus className="h-3 w-3"/></Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-sm">${Number(item.unitPrice).toFixed(2)}</TableCell>
                          <TableCell className="text-right font-semibold text-sm">${Number(item.totalPrice).toFixed(2)}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeFromCart(item.productId)} disabled={isProcessingAnyTicketAction || isProcessingSale}><X className="h-4 w-4"/></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-muted-foreground py-10">Carrito vacío. Añade productos desde la izquierda.</p>
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
                    onClick={() => handleUpdateTicketStatus(activeTicket.id, 'On Hold')}
                    disabled={activeTicket.status === 'On Hold' || activeTicket.cart_items.length === 0 || isProcessingAnyTicketAction || isProcessingSale}
                  >
                  <Save className="mr-2 h-5 w-5" /> Guardar Ticket
                </Button>
                <Button size="lg" className="bg-green-600 hover:bg-green-700 text-base py-6 col-span-1 sm:col-span-1" onClick={() => handleProcessSale('Cash')}  disabled={activeTicket.cart_items.length === 0 || isProcessingAnyTicketAction || isProcessingSale}>
                  {isProcessingSale ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <DollarSign className="mr-2 h-5 w-5" />}
                  {isProcessingSale ? 'Procesando...' : 'Efectivo'}
                </Button>
                <Button size="lg" className="text-base py-6 col-span-1 sm:col-span-1" onClick={() => handleProcessSale('Card')}  disabled={activeTicket.cart_items.length === 0 || isProcessingAnyTicketAction || isProcessingSale}>
                  {isProcessingSale ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CreditCard className="mr-2 h-5 w-5" />}
                  {isProcessingSale ? 'Procesando...' : 'Tarjeta'}
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
            <p className="text-xl text-muted-foreground">No hay ticket activo seleccionado. Por favor, cree o seleccione un ticket.</p>
          )}
        </div>
      )}

      {/* Print Confirmation Dialog */}
      <AlertDialog open={isPrintConfirmOpen} onOpenChange={setIsPrintConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Imprimir Ticket?</AlertDialogTitle>
            <AlertDialogDescription>
              La venta ha sido procesada. ¿Desea imprimir un recibo para esta venta?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleClosePrintDialog}>No, Gracias</AlertDialogCancel>
            <AlertDialogAction onClick={handlePrintTicket}>
              <Printer className="mr-2 h-4 w-4"/> Sí, Imprimir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Hidden div for printable ticket content */}
      {saleToPrint && (
        <div ref={printableTicketRef} style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
          <PrintableTicket sale={saleToPrint} />
        </div>
      )}

    </AppLayout>
  );
}
    

      