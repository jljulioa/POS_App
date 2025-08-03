

"use client";

import AppLayout from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import type { PurchaseInvoice, PurchaseInvoiceItem, PurchaseInvoicePayment } from '@/lib/mockData'; 
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, FileDown, Settings2, Loader2, AlertTriangle, Trash2, ChevronLeft, ChevronRight, Eye, ShoppingCart, Printer, Barcode as BarcodeIcon, DollarSign, Calendar as CalendarIcon, FilterX } from 'lucide-react';
import React, { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { useCurrency } from '@/contexts/CurrencyContext';
import type { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Separator } from '@/components/ui/separator';

// API fetch function for the list of purchase invoices
const fetchPurchaseInvoicesList = async (): Promise<PurchaseInvoice[]> => {
  const res = await fetch('/api/purchase-invoices');
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'Network response was not ok and failed to parse error JSON.' }));
    throw new Error(errorData.message || 'Network response was not ok');
  }
  return res.json();
};

// API fetch function for a single purchase invoice with its items and payments
const fetchSinglePurchaseInvoiceDetails = async (invoiceId: string): Promise<PurchaseInvoice> => {
  if (!invoiceId) throw new Error("Invoice ID is required to fetch details.");
  const res = await fetch(`/api/purchase-invoices/${invoiceId}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'Failed to fetch invoice details.' }));
    throw new Error(errorData.message || 'Failed to fetch invoice details.');
  }
  return res.json();
};


// API delete function
const deletePurchaseInvoiceAPI = async (invoiceId: string): Promise<{ message: string }> => {
  const res = await fetch(`/api/purchase-invoices/${invoiceId}`, { method: 'DELETE' });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'Failed to delete invoice' }));
    throw new Error(errorData.message || 'Failed to delete invoice');
  }
  return res.json();
};

const AddPaymentSchema = z.object({
  amount: z.coerce.number().positive({ message: "El monto debe ser un número positivo." }),
  payment_method: z.string().min(1, "El método de pago es obligatorio."),
  notes: z.string().optional(),
});

type AddPaymentFormValues = z.infer<typeof AddPaymentSchema>;

const addPaymentAPI = async ({ invoiceId, data }: { invoiceId: string; data: AddPaymentFormValues }) => {
    const response = await fetch(`/api/purchase-invoices/${invoiceId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to add payment' }));
        throw new Error(errorData.message || 'Failed to add payment');
    }
    return response.json();
}

interface AddPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: PurchaseInvoice;
}

function AddPaymentModal({ isOpen, onClose, invoice }: AddPaymentModalProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { formatCurrency } = useCurrency();

    const { data: payments = [], isLoading: isLoadingPayments } = useQuery<PurchaseInvoicePayment[], Error>({
        queryKey: ['invoicePayments', invoice.id],
        queryFn: async () => {
            const res = await fetch(`/api/purchase-invoices/${invoice.id}/payments`);
            if (!res.ok) throw new Error('Error al obtener el historial de pagos');
            return res.json();
        },
        enabled: isOpen,
    });

    const form = useForm<AddPaymentFormValues>({
        resolver: zodResolver(AddPaymentSchema),
        defaultValues: {
            amount: invoice.balanceDue > 0 ? invoice.balanceDue : 0,
            payment_method: 'Transfer',
            notes: '',
        }
    });

    useEffect(() => {
        if (invoice) {
            form.reset({
                amount: invoice.balanceDue > 0 ? invoice.balanceDue : 0,
                payment_method: 'Transfer',
                notes: ''
            });
        }
    }, [invoice, form]);
    
    const addPaymentMutation = useMutation({
        mutationFn: addPaymentAPI,
        onSuccess: () => {
            toast({ title: 'Pago Añadido', description: `El pago para la factura ${invoice.invoiceNumber} ha sido registrado.` });
            queryClient.invalidateQueries({ queryKey: ['purchaseInvoicesList'] });
            queryClient.invalidateQueries({ queryKey: ['purchaseInvoiceDetails', invoice.id] });
            queryClient.invalidateQueries({ queryKey: ['invoicePayments', invoice.id] });
            onClose();
        },
        onError: (error: Error) => {
            toast({ variant: 'destructive', title: 'Error al Añadir Pago', description: error.message });
        }
    });

    const onSubmit = (data: AddPaymentFormValues) => {
        if (data.amount > invoice.balanceDue) {
            form.setError('amount', { type: 'manual', message: `El monto no puede exceder el saldo pendiente de ${formatCurrency(invoice.balanceDue)}` });
            return;
        }
        addPaymentMutation.mutate({
            invoiceId: invoice.id,
            data: data,
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{invoice.balanceDue > 0 ? "Añadir Pago a" : "Historial de Pagos de"} Factura {invoice.invoiceNumber}</DialogTitle>
                    <DialogDescription>Saldo Pendiente: <span className="font-bold">{formatCurrency(invoice.balanceDue)}</span></DialogDescription>
                </DialogHeader>

                <div className="py-2">
                    <h4 className="font-semibold mb-2 text-sm">Historial de Pagos</h4>
                    {isLoadingPayments ? (
                        <div className="flex justify-center items-center h-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                    ) : payments.length > 0 ? (
                        <div className="max-h-[150px] overflow-y-auto rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow><TableHead>Fecha</TableHead><TableHead>Método</TableHead><TableHead className="text-right">Monto</TableHead></TableRow>
                                </TableHeader>
                                <TableBody>
                                    {payments.map((p) => (
                                        <TableRow key={p.id}><TableCell>{format(new Date(p.payment_date), 'PP')}</TableCell><TableCell>{p.payment_method}</TableCell><TableCell className="text-right">{formatCurrency(p.amount)}</TableCell></TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <p className="text-muted-foreground text-sm text-center py-4">No se han registrado pagos.</p>
                    )}
                </div>
                
                {invoice.balanceDue > 0 ? (
                  <>
                    <Separator />
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                            <FormField control={form.control} name="amount" render={({ field }) => (
                                <FormItem><FormLabel>Monto *</FormLabel><FormControl><Input type="number" step="0.01" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                            )} />
                            
                            <FormField control={form.control} name="payment_method" render={({ field }) => (
                                <FormItem><FormLabel>Método de Pago *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione un método" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Cash">Efectivo</SelectItem><SelectItem value="Card">Tarjeta</SelectItem><SelectItem value="Transfer">Transferencia Bancaria</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="notes" render={({ field }) => (
                                <FormItem><FormLabel>Notas</FormLabel><FormControl><Textarea placeholder="Notas opcionales del pago" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <DialogFooter className="mt-4">
                                <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                                <Button type="submit" disabled={addPaymentMutation.isPending}>{addPaymentMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Registrar Pago</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                  </>
                ) : (
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={onClose}>Cerrar</Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}

interface InvoiceRowActionsProps {
  invoice: PurchaseInvoice;
  deleteMutation: UseMutationResult<{ message: string }, Error, string, unknown>;
  onViewDetails: (invoice: PurchaseInvoice) => void;
  onAddPayment: (invoice: PurchaseInvoice) => void;
}

function InvoiceRowActions({ invoice, deleteMutation, onViewDetails, onAddPayment }: InvoiceRowActionsProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleDeleteConfirm = () => {
    deleteMutation.mutate(invoice.id, {
      onSuccess: () => { setIsDeleteDialogOpen(false); },
      onError: () => { setIsDeleteDialogOpen(false); }
    });
  };

  return (
    <div className="flex items-center justify-center space-x-1">
      <Button variant="ghost" size="icon" className="hover:text-primary h-8 w-8 sm:h-auto sm:w-auto" onClick={() => onViewDetails(invoice)}><Eye className="h-4 w-4" /></Button>
      {invoice.paymentTerms === 'Credit' && (
        <Button variant="ghost" size="icon" title={invoice.paymentStatus !== 'Paid' ? "Añadir Pago" : "Ver Pagos"} className="hover:text-green-600 h-8 w-8 sm:h-auto sm:w-auto" onClick={() => onAddPayment(invoice)}><DollarSign className="h-4 w-4" /></Button>
      )}
      {!invoice.processed && (
        <Button variant="ghost" size="icon" title="Procesar Factura" className="hover:text-accent h-8 w-8 sm:h-auto sm:w-auto" asChild>
          <Link href={`/purchase-invoices/${invoice.id}/process`}><Settings2 className="h-4 w-4" /></Link>
        </Button>
      )}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="icon" className="hover:text-destructive h-8 w-8 sm:h-auto sm:w-auto"><Trash2 className="h-4 w-4" /></Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>¿Está absolutamente seguro?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer. Esto eliminará permanentemente la factura de compra <span className="font-semibold">{invoice.invoiceNumber}</span> y todos sus pagos asociados. Esta acción NO revierte ningún cambio de stock si la factura ya fue procesada.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={deleteMutation.isPending && deleteMutation.variables === invoice.id} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">{(deleteMutation.isPending && deleteMutation.variables === invoice.id) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


export default function PurchaseInvoicesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { formatCurrency } = useCurrency();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number | 'all'>(20);

  const [selectedInvoiceForView, setSelectedInvoiceForView] = useState<PurchaseInvoice | null>(null);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<PurchaseInvoice | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isPrintingBarcodes, setIsPrintingBarcodes] = useState(false);

  const { data: invoicesList = [], isLoading: isLoadingList, error: listError, isError: isListError } = useQuery<PurchaseInvoice[], Error>({
    queryKey: ['purchaseInvoicesList'],
    queryFn: fetchPurchaseInvoicesList,
  });

  const { 
    data: detailedInvoice, 
    isLoading: isLoadingDetailedInvoice, 
    refetch: refetchDetailedInvoice,
  } = useQuery<PurchaseInvoice, Error>({
    queryKey: ['purchaseInvoiceDetails', selectedInvoiceForView?.id],
    queryFn: () => {
        if (!selectedInvoiceForView) throw new Error("No invoice selected");
        return fetchSinglePurchaseInvoiceDetails(selectedInvoiceForView.id);
    },
    enabled: !!selectedInvoiceForView && isViewModalOpen, 
    staleTime: 5 * 60 * 1000, 
  });

  const deleteMutation = useMutation<{ message: string }, Error, string>({
    mutationFn: deletePurchaseInvoiceAPI,
    onSuccess: (data) => {
      toast({ title: "Factura de Compra Eliminada", description: data.message });
      queryClient.invalidateQueries({ queryKey: ['purchaseInvoicesList'] });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error al Eliminar Factura", description: error.message });
    },
  });

  const handleViewDetails = (invoice: PurchaseInvoice) => {
    setSelectedInvoiceForView(invoice);
    setIsViewModalOpen(true);
  };

  const handleAddPayment = (invoice: PurchaseInvoice) => {
    setSelectedInvoiceForPayment(invoice);
    setIsPaymentModalOpen(true);
  }
  
  useEffect(() => {
    if (selectedInvoiceForView && isViewModalOpen) {
        refetchDetailedInvoice();
    }
  }, [selectedInvoiceForView, isViewModalOpen, refetchDetailedInvoice]);

    const getPaymentStatusBadgeVariant = (status: PurchaseInvoice['paymentStatus']): "default" | "secondary" | "destructive" | "outline" => {
        switch (status) {
            case 'Paid': return 'default';
            case 'Partially Paid': return 'outline';
            case 'Unpaid': return 'destructive';
            default: return 'secondary';
        }
    };

    const translatePaymentStatus = (status: PurchaseInvoice['paymentStatus']) => {
        switch (status) {
            case 'Paid': return 'Pagado';
            case 'Partially Paid': return 'Parcialmente Pagado';
            case 'Unpaid': return 'No Pagado';
            default: return status;
        }
    };

    const filteredInvoices = useMemo(() => {
        if (!invoicesList) return [];
        return invoicesList.filter(invoice => 
        invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.supplierName.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm, invoicesList]);

    const totalPages = useMemo(() => {
        if (itemsPerPage === 'all' || filteredInvoices.length === 0) return 1;
        return Math.ceil(filteredInvoices.length / Number(itemsPerPage));
    }, [filteredInvoices, itemsPerPage]);

    const displayedInvoices = useMemo(() => {
        if (itemsPerPage === 'all') return filteredInvoices;
        const numericItemsPerPage = Number(itemsPerPage);
        const startIndex = (currentPage - 1) * numericItemsPerPage;
        const endIndex = startIndex + numericItemsPerPage;
        return filteredInvoices.slice(startIndex, endIndex);
    }, [filteredInvoices, currentPage, itemsPerPage]);

    useEffect(() => { setCurrentPage(1); }, [searchTerm, itemsPerPage]);
    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages);
        else if (totalPages === 0 && filteredInvoices.length > 0) setCurrentPage(1);
    }, [filteredInvoices.length, totalPages, currentPage]);

    const handleItemsPerPageChange = (value: string) => { setItemsPerPage(value === 'all' ? 'all' : Number(value)); };
    const paginationStartItem = itemsPerPage === 'all' || filteredInvoices.length === 0 ? (filteredInvoices.length > 0 ? 1 : 0) : (currentPage - 1) * Number(itemsPerPage) + 1;
    const paginationEndItem = itemsPerPage === 'all' ? filteredInvoices.length : Math.min(currentPage * Number(itemsPerPage), filteredInvoices.length);
    const itemsPerPageOptions = [ { value: '20', label: '20' }, { value: '40', label: '40' }, { value: 'all', label: 'Todos' } ];

    const handlePrintBarcodes = async () => {
      if (!detailedInvoice || !detailedInvoice.items || detailedInvoice.items.length === 0) {
        toast({ variant: "destructive", title: "No hay Artículos", description: "Esta factura no tiene artículos para imprimir códigos de barras." });
        return;
      }
      setIsPrintingBarcodes(true);

      const { jsPDF } = await import('jspdf');
      const JsBarcode = (await import('jsbarcode')).default;
      
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
      const pageHeight = doc.internal.pageSize.getHeight();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 10;
      const labelWidth = 36;
      const labelHeight = 25;
      const xSpacing = 3;
      const ySpacing = 5;
      const barcodeHeightMM = 15;
      const textLineHeightMM = 3;
      const textYOffsetFromBarcodeMM = 2;
      const labelsPerRow = 5;
      const labelsPerCol = Math.floor((pageHeight - 2 * margin + ySpacing) / (labelHeight + ySpacing));

      let currentX = margin;
      let currentY = margin;
      let labelsOnPageCount = 0;

      for (const item of detailedInvoice.items) {
          for (let i = 0; i < item.quantity; i++) {
              if (labelsOnPageCount >= labelsPerRow * labelsPerCol) {
                  doc.addPage();
                  currentX = margin;
                  currentY = margin;
                  labelsOnPageCount = 0;
              } else if (labelsOnPageCount > 0 && labelsOnPageCount % labelsPerRow === 0) {
                  currentX = margin;
                  currentY += labelHeight + ySpacing;
              }

              const canvas = document.createElement('canvas');
              try {
                  JsBarcode(canvas, item.productCode, { format: "CODE128", width: 1.5, height: barcodeHeightMM * (72/25.4), displayValue: false, margin: 0 });
                  const barcodeDataUrl = canvas.toDataURL('image/png');
                  const actualBarcodeWidthInMM = canvas.width / (72 / 25.4);
                  const finalPdfImageWidth = Math.min(actualBarcodeWidthInMM, labelWidth - 4);
                  const imageX = currentX + (labelWidth - finalPdfImageWidth) / 2;
                  doc.addImage(barcodeDataUrl, 'PNG', imageX, currentY, finalPdfImageWidth, barcodeHeightMM);
              } catch (e) {
                  doc.text("Error", currentX + labelWidth / 2, currentY + barcodeHeightMM / 2, { align: 'center' });
              }
              
              let productNameText = item.productName;
              const maxNameWidth = labelWidth - 4;
              doc.setFontSize(8);
              doc.setFont('helvetica', 'normal');
              if (doc.getTextWidth(productNameText) > maxNameWidth) {
                  let truncatedName = productNameText;
                  while (doc.getTextWidth(truncatedName + "...") > maxNameWidth && truncatedName.length > 0) {
                      truncatedName = truncatedName.slice(0, -1);
                  }
                  productNameText = truncatedName.length > 0 ? truncatedName + "..." : "...";
              }
              doc.text(productNameText, currentX + labelWidth / 2, currentY + barcodeHeightMM + textYOffsetFromBarcodeMM + textLineHeightMM, { align: 'center' });

              doc.setFontSize(7);
              doc.setFont('helvetica', 'bold');
              doc.text(item.productCode, currentX + labelWidth / 2, currentY + barcodeHeightMM + textYOffsetFromBarcodeMM + (textLineHeightMM * 2), { align: 'center', maxWidth: labelWidth - 2 });
              doc.setFont('helvetica', 'normal');

              currentX += labelWidth + xSpacing;
              labelsOnPageCount++;
          }
      }

      doc.save(`Factura_${detailedInvoice.invoiceNumber}_CodigosDeBarras.pdf`);
      setIsPrintingBarcodes(false);
      toast({ title: "PDF Generado", description: "El PDF de códigos de barras de la factura ha sido descargado." });
  };


  if (isLoadingList) {
    return (
      <AppLayout>
        <PageHeader title="Facturas de Compra" description="Cargando facturas de proveedores..." />
        <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
      </AppLayout>
    );
  }

  if (isListError) {
    return (
      <AppLayout>
        <PageHeader title="Facturas de Compra" description="Error al cargar las facturas." />
        <div className="bg-destructive/10 border border-destructive text-destructive p-4 rounded-md"><div className="flex items-center"><AlertTriangle className="mr-2 h-6 w-6" /> Error</div><p>{listError?.message || "Ocurrió un error desconocido."}</p></div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader title="Facturas de Compra" description="Gestionar facturas de proveedores entrantes.">
        <Button asChild><Link href="/purchase-invoices/add"><PlusCircle className="mr-2 h-4 w-4" /> Añadir Factura</Link></Button>
        <Button variant="outline"><FileDown className="mr-2 h-4 w-4" /> Exportar CSV</Button>
      </PageHeader>

      <div className="mb-6"><Input placeholder="Buscar por Nº de Factura, Proveedor..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full sm:max-w-sm" /></div>

      <div className="rounded-lg border shadow-sm bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nº Factura</TableHead>
              <TableHead className="hidden sm:table-cell">Fecha</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead className="hidden md:table-cell">Términos</TableHead>
              <TableHead className="text-right hidden md:table-cell">Total</TableHead>
              <TableHead className="text-right hidden md:table-cell">Saldo Pendiente</TableHead>
              <TableHead className="text-center">Estado de Pago</TableHead>
              <TableHead className="text-center">Procesado</TableHead>
              <TableHead className="text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedInvoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell className="font-medium text-xs sm:text-sm">{invoice.invoiceNumber}</TableCell>
                <TableCell className="hidden sm:table-cell text-xs sm:text-sm">{format(new Date(invoice.invoiceDate), 'MMM d, yyyy')}</TableCell>
                <TableCell className="text-xs sm:text-sm">{invoice.supplierName}</TableCell>
                <TableCell className="hidden md:table-cell">
                  <Badge variant={invoice.paymentTerms === 'Credit' ? 'outline' : 'secondary'}>{invoice.paymentTerms}</Badge>
                </TableCell>
                <TableCell className="text-right hidden md:table-cell">{formatCurrency(invoice.totalAmount)}</TableCell>
                <TableCell className="text-right hidden md:table-cell font-semibold">{formatCurrency(invoice.balanceDue)}</TableCell>
                <TableCell className="text-center"><Badge variant={getPaymentStatusBadgeVariant(invoice.paymentStatus)} className={invoice.paymentStatus === 'Paid' ? "bg-green-500 hover:bg-green-600" : ""}>{translatePaymentStatus(invoice.paymentStatus)}</Badge></TableCell>
                <TableCell className="text-center"><Badge variant={invoice.processed ? 'default' : 'secondary'} className={invoice.processed ? "bg-green-500 hover:bg-green-600" : ""}>{invoice.processed ? 'Procesado' : 'Pendiente'}</Badge></TableCell>
                <TableCell className="text-center"><InvoiceRowActions invoice={invoice} deleteMutation={deleteMutation} onViewDetails={handleViewDetails} onAddPayment={handleAddPayment} /></TableCell>
              </TableRow>
            ))}
            {displayedInvoices.length === 0 && (<TableRow><TableCell colSpan={9} className="h-24 text-center">No se encontraron facturas de compra.</TableCell></TableRow>)}
          </TableBody>
        </Table>
      </div>
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2"><span className="text-sm text-muted-foreground">Filas por página:</span><Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}><SelectTrigger className="w-[120px] h-9"><SelectValue placeholder="Artículos por página" /></SelectTrigger><SelectContent>{itemsPerPageOptions.map(option => (<SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>))}</SelectContent></Select></div>
        <div className="text-sm text-muted-foreground">{filteredInvoices.length > 0 ? `Mostrando ${paginationStartItem}-${paginationEndItem} de ${filteredInvoices.length} facturas` : "No hay facturas"}</div>
        <div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1 || itemsPerPage === 'all'}><ChevronLeft className="h-4 w-4 mr-1" /> Anterior</Button><span className="text-sm text-muted-foreground">Página {currentPage} de {totalPages}</span><Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages || itemsPerPage === 'all'}>Siguiente <ChevronRight className="h-4 w-4 ml-1" /></Button></div>
      </div>
      
      {selectedInvoiceForPayment && isPaymentModalOpen && (<AddPaymentModal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} invoice={selectedInvoiceForPayment} />)}

      {selectedInvoiceForView && isViewModalOpen && (
        <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
          <DialogContent className="sm:max-w-xl md:max-w-2xl">
            <DialogHeader><DialogTitle className="flex items-center"><ShoppingCart className="mr-2 h-6 w-6 text-primary" />Detalles de la Factura: {selectedInvoiceForView.invoiceNumber}</DialogTitle><DialogDescription>Proveedor: {selectedInvoiceForView.supplierName} | Fecha: {format(new Date(selectedInvoiceForView.invoiceDate), 'PPP')}</DialogDescription></DialogHeader>
            <div className="py-4">
              {isLoadingDetailedInvoice ? (<div className="flex justify-center items-center h-40 md:col-span-2"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>) : detailedInvoice ? (
                <>
                  <div>
                    <h4 className="font-semibold mb-2">Artículos en la Factura:</h4>
                    {detailedInvoice.items && detailedInvoice.items.length > 0 ? (<div className="max-h-[200px] overflow-y-auto rounded-md border"><Table><TableHeader><TableRow><TableHead>Producto</TableHead><TableHead className="text-center">Cant.</TableHead><TableHead className="text-right">Costo/Unidad</TableHead></TableRow></TableHeader><TableBody>{detailedInvoice.items.map((item, index) => (<TableRow key={item.productId + index}><TableCell>{item.productName}</TableCell><TableCell className="text-center">{item.quantity}</TableCell><TableCell className="text-right">{formatCurrency(item.costPrice)}</TableCell></TableRow>))}</TableBody></Table></div>) : (<p className="text-muted-foreground text-sm">No se registraron artículos para esta factura.</p>)}
                  </div>
                  <div className="md:col-span-2 mt-4 text-right space-y-1">
                    <p className="font-bold text-md">Monto Total: {formatCurrency(detailedInvoice.totalAmount)}</p>
                    <p className="font-bold text-lg text-destructive">Saldo Pendiente: {formatCurrency(detailedInvoice.balanceDue)}</p>
                  </div>
                </>
              ) : (<div className="md:col-span-2 text-destructive">Error al cargar los detalles.</div>)}
            </div>
            <DialogFooter className="flex-col sm:flex-row sm:justify-between items-center pt-4">
              <Button
                  variant="outline"
                  onClick={handlePrintBarcodes}
                  disabled={isPrintingBarcodes || !detailedInvoice?.items?.length}
                  className="w-full sm:w-auto"
              >
                  {isPrintingBarcodes ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BarcodeIcon className="mr-2 h-4 w-4" />}
                  Imprimir Códigos de Barras
              </Button>
              <DialogClose asChild>
                <Button type="button" variant="secondary" className="w-full sm:w-auto mt-2 sm:mt-0">Cerrar</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </AppLayout>
  );
}
