
"use client";

import AppLayout from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import type { Sale, SaleItem, InvoiceSettings, TaxSetting } from '@/lib/mockData';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FileDown, Eye, Loader2, AlertTriangle, ShoppingCart, Calendar as CalendarIcon, FilterX, CornerDownLeft, Printer, Percent } from 'lucide-react';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { z } from 'zod';
import type { jsPDF } from 'jspdf'; 
import 'jspdf-autotable';
import { useCurrency } from '@/contexts/CurrencyContext';


// API fetch function for sales
const fetchSales = async (startDate?: Date, endDate?: Date): Promise<Sale[]> => {
  const params = new URLSearchParams();
  if (startDate) {
    params.append('startDate', format(startDate, 'yyyy-MM-dd'));
  }
  if (endDate) {
    params.append('endDate', format(endDate, 'yyyy-MM-dd'));
  }
  const res = await fetch(`/api/sales?${params.toString()}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'Network response was not ok and failed to parse error JSON.' }));
    throw new Error(errorData.message || 'Network response was not ok');
  }
  return res.json();
};

const ReturnItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().min(0, "Return quantity cannot be negative."),
  unitPrice: z.number(),
});

const ProcessReturnSchema = z.object({
  saleId: z.string(),
  itemsToReturn: z.array(ReturnItemSchema).min(1, "At least one item must be selected for return."),
});

type ReturnItemFormValues = {
  [productId: string]: {
    quantity: number;
    unitPrice: number;
    maxQuantity: number;
  };
};

// API mutation function for processing returns
const processReturnAPI = async (returnData: z.infer<typeof ProcessReturnSchema>): Promise<{ message: string; totalRefundAmount: number }> => {
  const response = await fetch('/api/returns', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(returnData),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to process return' }));
    throw new Error(errorData.message || 'Failed to process return');
  }
  return response.json();
};

const fetchInvoiceSettingsAPI = async (): Promise<InvoiceSettings> => {
  const response = await fetch('/api/settings/invoice');
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to fetch settings' }));
    throw new Error(errorData.message || 'Failed to fetch settings');
  }
  return response.json();
};

// API fetch function for tax settings
const fetchTaxSettingsAPI = async (): Promise<TaxSetting> => {
  const response = await fetch('/api/settings/taxes');
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to fetch tax settings' }));
    throw new Error(errorData.message || 'Failed to fetch tax settings');
  }
  return response.json();
};


const defaultInvoiceSettings: InvoiceSettings = {
  companyName: 'MotoFox POS',
  nit: 'N/A',
  address: 'Your Store Address',
  footerMessage: 'Thank you for your business!',
};

// Function to generate PDF receipt using jsPDF
const generateSaleReceiptPdf = async (sale: Sale, settings: InvoiceSettings, taxSettings: TaxSetting | null, formatCurrencyFn: (value: number, currencyCode?: string) => string, globalCurrencyCode: string) => {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [76, 210] 
  });

  let yPos = 10;
  const lineSpacing = 5;
  const smallLineSpacing = 3.5;
  const leftMargin = 5;
  const contentWidth = 76 - (leftMargin * 2);

  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  const companyNameText = settings.companyName || defaultInvoiceSettings.companyName;
  const companyNameWidth = doc.getTextWidth(companyNameText);
  doc.text(companyNameText, (76 - companyNameWidth) / 2, yPos);
  yPos += lineSpacing;

  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  const addressText = settings.address || defaultInvoiceSettings.address;
  const addressLines = doc.splitTextToSize(addressText, contentWidth);
  addressLines.forEach((line: string) => {
    const lineWidth = doc.getTextWidth(line);
    doc.text(line, (76 - lineWidth) / 2, yPos);
    yPos += smallLineSpacing;
  });

  const nitText = `NIT: ${settings.nit || defaultInvoiceSettings.nit}`;
  const nitWidth = doc.getTextWidth(nitText);
  doc.text(nitText, (76 - nitWidth) / 2, yPos);
  yPos += lineSpacing;
  
  doc.text('-------------------------------------', leftMargin, yPos); 
  yPos += smallLineSpacing;

  doc.text(`Receipt No: ${sale.id}`, leftMargin, yPos);
  yPos += smallLineSpacing;
  doc.text(`Date: ${format(new Date(sale.date), 'dd/MM/yyyy HH:mm')}`, leftMargin, yPos);
  yPos += smallLineSpacing;
  if (sale.cashierId) {
    doc.text(`Cashier: ${sale.cashierId}`, leftMargin, yPos);
    yPos += smallLineSpacing;
  }
  if (sale.customerName) {
    doc.text(`Customer: ${sale.customerName}`, leftMargin, yPos);
    yPos += smallLineSpacing;
  }
  yPos += smallLineSpacing; 

  const tableColumn = [
    { header: 'Item', dataKey: 'name' },
    { header: 'Qty', dataKey: 'qty' },
    { header: 'Price', dataKey: 'unit' }, // This should be the price based on how it was entered (incl/excl tax)
    { header: 'Total', dataKey: 'total' }, // This should be the line total based on how it was entered
  ];
  const tableRows = sale.items.map(item => ({
    name: item.productName,
    qty: item.quantity.toString(),
    // For item.unitPrice and item.totalPrice, we use the values as stored
    // as they reflect Product.price (which is either tax-inclusive or tax-exclusive based on catalog entry)
    unit: formatCurrencyFn(item.unitPrice, globalCurrencyCode).replace(globalCurrencyCode, '').trim(),
    total: formatCurrencyFn(item.totalPrice, globalCurrencyCode).replace(globalCurrencyCode, '').trim(),
  }));

  autoTable(doc, {
    columns: tableColumn,
    body: tableRows,
    startY: yPos,
    theme: 'plain',
    styles: {
      fontSize: 7,
      cellPadding: { top: 0.5, right: 0.5, bottom: 0.5, left: 0.5 },
      halign: 'left',
      valign: 'middle',
      overflow: 'linebreak',
    },
    columnStyles: {
      name: { cellWidth: 30 },
      qty: { cellWidth: 8, halign: 'center' },
      unit: { cellWidth: 15, halign: 'right' },
      total: { cellWidth: 15, halign: 'right' },
    },
    headStyles: { fontSize: 7.5, fontStyle: 'bold', halign: 'center' },
    margin: { left: leftMargin, right: leftMargin },
  });

  yPos = (doc as any).lastAutoTable.finalY + lineSpacing;
  
  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.text('Subtotal:', leftMargin + 35, yPos, { align: 'right' });
  doc.text(formatCurrencyFn(sale.subtotal, globalCurrencyCode).replace(globalCurrencyCode, '').trim(), 76 - leftMargin, yPos, { align: 'right' });
  yPos += smallLineSpacing;

  if (taxSettings && sale.taxAmount > 0) {
    doc.text(`${taxSettings.taxName || 'Tax'} (${taxSettings.taxPercentage}%):`, leftMargin + 35, yPos, { align: 'right' });
    doc.text(formatCurrencyFn(sale.taxAmount, globalCurrencyCode).replace(globalCurrencyCode, '').trim(), 76 - leftMargin, yPos, { align: 'right' });
    yPos += smallLineSpacing;
  }
  
  doc.text('-------------------------------------', leftMargin + 30, yPos, {align: 'right'});
  yPos += smallLineSpacing;


  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.text('TOTAL:', leftMargin + 35, yPos, { align: 'right' }); 
  doc.text(formatCurrencyFn(sale.totalAmount, globalCurrencyCode), 76 - leftMargin, yPos, { align: 'right' });
  yPos += lineSpacing;

  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.text(`Payment: ${sale.paymentMethod}`, leftMargin, yPos);
  yPos += lineSpacing;

  doc.text('-------------------------------------', leftMargin, yPos); 
  yPos += smallLineSpacing;
  
  const footerText = settings.footerMessage || defaultInvoiceSettings.footerMessage;
  if (footerText) {
    doc.setFontSize(7.5);
    const footerLines = doc.splitTextToSize(footerText, contentWidth);
    footerLines.forEach((line: string) => {
      const lineWidth = doc.getTextWidth(line);
      doc.text(line, (76 - lineWidth) / 2, yPos);
      yPos += smallLineSpacing;
    });
  }
  
  doc.save(`Receipt_${sale.id.replace(/\s+/g, '_')}.pdf`);
};


export default function SalesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { formatCurrency, currency: globalCurrency } = useCurrency();

  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnItems, setReturnItems] = useState<ReturnItemFormValues>({});
  const [isPrintingReceipt, setIsPrintingReceipt] = useState(false);
  
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const { data: sales = [], isLoading, error, isError, refetch } = useQuery<Sale[], Error>({
    queryKey: ['sales', startDate, endDate],
    queryFn: () => fetchSales(startDate, endDate),
    enabled: true, 
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Failed to Load Sales Records",
        description: err.message || "An unexpected error occurred.",
      });
    }
  });

  const { data: invoiceSettings, isLoading: isLoadingInvoiceSettings } = useQuery<InvoiceSettings, Error>({
    queryKey: ['invoiceSettings'], 
    queryFn: fetchInvoiceSettingsAPI,
    staleTime: 10 * 60 * 1000, 
  });
  
  const { data: taxSettings, isLoading: isLoadingTaxSettings } = useQuery<TaxSetting, Error>({
    queryKey: ['taxSettings'],
    queryFn: fetchTaxSettingsAPI,
    staleTime: 10 * 60 * 1000,
  });


  const filteredSales = useMemo(() => {
    return sales.filter(sale =>
      sale.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sale.customerName && sale.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      sale.items.some(item => item.productName.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [searchTerm, sales]);

  const handleViewSale = (sale: Sale) => {
    setSelectedSale(sale);
    setIsViewModalOpen(true);
  };

  const handleOpenReturnModal = (sale: Sale) => {
    setSelectedSale(sale);
    const initialReturnItems: ReturnItemFormValues = {};
    sale.items.forEach(item => {
      initialReturnItems[item.productId] = { quantity: 0, unitPrice: item.unitPrice, maxQuantity: item.quantity };
    });
    setReturnItems(initialReturnItems);
    setIsViewModalOpen(false); 
    setIsReturnModalOpen(true);
  };

  const handleReturnQuantityChange = (productId: string, quantity: string) => {
    const numQuantity = parseInt(quantity, 10);
    const itemConf = returnItems[productId];
    if (!itemConf) return;

    if (!isNaN(numQuantity) && numQuantity >= 0 && numQuantity <= itemConf.maxQuantity) {
      setReturnItems(prev => ({
        ...prev,
        [productId]: { ...prev[productId], quantity: numQuantity },
      }));
    } else if (quantity === "" || numQuantity < 0) {
      setReturnItems(prev => ({
        ...prev,
        [productId]: { ...prev[productId], quantity: 0 },
      }));
    } else if (numQuantity > itemConf.maxQuantity) {
      setReturnItems(prev => ({
        ...prev,
        [productId]: { ...prev[productId], quantity: itemConf.maxQuantity },
      }));
    }
  };

  const totalReturnAmount = useMemo(() => {
    return Object.values(returnItems).reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  }, [returnItems]);


  const processReturnMutation = useMutation<
    { message: string; totalRefundAmount: number },
    Error,
    z.infer<typeof ProcessReturnSchema>
  >({
    mutationFn: processReturnAPI,
    onSuccess: (data) => {
      toast({
        title: "Return Processed Successfully",
        description: `${data.message}. Total Refund: ${formatCurrency(data.totalRefundAmount)}`,
      });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['sales', startDate, endDate] });
      queryClient.invalidateQueries({ queryKey: ['todaysSales']});
      queryClient.invalidateQueries({ queryKey: ['inventoryTransactions']});
      setIsReturnModalOpen(false);
      setSelectedSale(null);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to Process Return",
        description: error.message,
      });
    },
  });

  const handleSubmitReturn = () => {
    if (!selectedSale) return;

    const itemsToSubmit = Object.entries(returnItems)
      .filter(([, itemDetails]) => itemDetails.quantity > 0)
      .map(([productId, itemDetails]) => ({
        productId,
        quantity: itemDetails.quantity,
        unitPrice: itemDetails.unitPrice,
      }));

    if (itemsToSubmit.length === 0) {
      toast({ variant: "destructive", title: "No Items to Return", description: "Please specify a quantity greater than 0 for at least one item." });
      return;
    }

    const validation = ProcessReturnSchema.safeParse({
      saleId: selectedSale.id,
      itemsToReturn: itemsToSubmit,
    });

    if (!validation.success) {
      console.error("Return validation error:", validation.error.format());
      toast({ variant: "destructive", title: "Invalid Return Data", description: validation.error.flatten().fieldErrors.itemsToReturn?.join(', ') || "Please check return quantities." });
      return;
    }
    processReturnMutation.mutate(validation.data);
  };

  const handlePrintSaleReceipt = async (saleToPrint: Sale | null) => {
    if (!saleToPrint) {
      toast({ variant: 'destructive', title: 'Print Error', description: 'No sale selected for printing.' });
      return;
    }
    if (isPrintingReceipt) return;
    if (isLoadingInvoiceSettings || isLoadingTaxSettings) {
        toast({ variant: 'outline', title: 'Please wait', description: 'Loading settings...' });
        return;
    }

    setIsPrintingReceipt(true);
    const settingsToUse = invoiceSettings || defaultInvoiceSettings;
    const taxSettingsToUse = taxSettings || null;

    try {
      await generateSaleReceiptPdf(saleToPrint, settingsToUse, taxSettingsToUse, formatCurrency, globalCurrency);
      toast({ title: 'Receipt Downloaded', description: `Receipt for sale ${saleToPrint.id} has been generated.` });
    } catch (error) {
      console.error('Error generating PDF receipt:', error);
      toast({
        variant: 'destructive',
        title: 'Print Error',
        description: (error as Error).message || "Unknown error during PDF generation.",
      });
    } finally {
      setIsPrintingReceipt(false);
    }
  };

  const handleClearFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  };

  useEffect(() => {
  }, [startDate, endDate]);


  if (isLoading && !sales.length) {
    return (
      <AppLayout>
        <PageHeader title="Sales Records" description="Loading sales history..." />
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (isError) {
    return (
      <AppLayout>
        <PageHeader title="Sales Records" description="Error loading sales data." />
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <AlertTriangle className="mr-2 h-6 w-6" />
              Failed to Load Sales Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error?.message || "An unknown error occurred while fetching sales data."}</p>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader title="Sales Records" description="View and analyze your sales history.">
        <Button variant="outline">
          <FileDown className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </PageHeader>

      <div className="mb-6 flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-4 items-center">
        <Input
          placeholder="Search by Sale ID, Customer, Product..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:max-w-xs md:max-w-sm"
        />
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full sm:w-[180px] justify-start text-left font-normal",
                  !startDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "PPP") : <span>Start Date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full sm:w-[180px] justify-start text-left font-normal",
                  !endDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "PPP") : <span>End Date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                disabled={startDate ? { before: startDate } : undefined}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        {(startDate || endDate) && (
          <Button variant="ghost" size="icon" onClick={handleClearFilters} className="text-muted-foreground hover:text-destructive">
            <FilterX className="h-5 w-5" />
            <span className="sr-only">Clear Date Filters</span>
          </Button>
        )}
        {isLoading && <Loader2 className="h-5 w-5 animate-spin text-primary ml-2" />}
      </div>

      <div className="rounded-lg border shadow-sm bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sale ID</TableHead>
              <TableHead className="hidden sm:table-cell">Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="hidden md:table-cell">Items</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
              <TableHead className="text-right">Tax</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-center hidden sm:table-cell">Payment</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSales.map((sale) => (
              <TableRow key={sale.id}>
                <TableCell className="font-medium text-xs sm:text-sm">{sale.id}</TableCell>
                <TableCell className="hidden sm:table-cell text-xs sm:text-sm">{format(parseISO(sale.date), 'PPp')}</TableCell>
                <TableCell className="text-xs sm:text-sm">{sale.customerName || 'N/A'}</TableCell>
                <TableCell className="hidden md:table-cell text-xs">{sale.items.length}</TableCell>
                <TableCell className="text-right">{formatCurrency(sale.subtotal)}</TableCell>
                <TableCell className="text-right">{formatCurrency(sale.taxAmount)}</TableCell>
                <TableCell className="text-right font-semibold">{formatCurrency(sale.totalAmount)}</TableCell>
                <TableCell className="text-center hidden sm:table-cell">
                  <Badge variant={
                    sale.paymentMethod === 'Card' ? 'default' :
                      sale.paymentMethod === 'Cash' ? 'secondary' : 'outline'
                  }>
                    {sale.paymentMethod}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Button variant="ghost" size="icon" className="hover:text-primary h-8 w-8 sm:h-auto sm:w-auto" onClick={() => handleViewSale(sale)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filteredSales.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">
                  No sales records found for the selected criteria.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {selectedSale && isViewModalOpen && (
        <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
          <DialogContent className="sm:max-w-xl md:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <ShoppingCart className="mr-2 h-6 w-6 text-primary" />
                Sale Details: {selectedSale.id}
              </DialogTitle>
              <DialogDescription>
                Date: {format(parseISO(selectedSale.date), 'PPPp')} <br />
                Customer: {selectedSale.customerName || 'N/A'} | Payment: {selectedSale.paymentMethod} | Cashier: {selectedSale.cashierId}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <h4 className="font-semibold mb-2">Items Sold:</h4>
              <div className="max-h-[300px] overflow-y-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedSale.items.map(item => (
                      <TableRow key={item.productId}>
                        <TableCell>{item.productName}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.totalPrice)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4 space-y-1 text-right">
                <p className="text-sm text-muted-foreground">Subtotal: {formatCurrency(selectedSale.subtotal)}</p>
                <p className="text-sm text-muted-foreground">Tax: {formatCurrency(selectedSale.taxAmount)}</p>
                <p className="font-bold text-lg">Grand Total: {formatCurrency(selectedSale.totalAmount)}</p>
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row sm:justify-between items-center">
               <div className="flex gap-2 mt-2 sm:mt-0 flex-wrap">
                 <Button
                  variant="outline"
                  onClick={() => handlePrintSaleReceipt(selectedSale)}
                  disabled={isPrintingReceipt || !selectedSale || isLoadingInvoiceSettings || isLoadingTaxSettings}
                  className="w-full sm:w-auto"
                >
                  {isPrintingReceipt || isLoadingInvoiceSettings || isLoadingTaxSettings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
                  Print Receipt
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleOpenReturnModal(selectedSale)}
                  className="w-full sm:w-auto"
                >
                  <CornerDownLeft className="mr-2 h-4 w-4" /> Return Items
                </Button>
              </div>
              <DialogClose asChild>
                <Button type="button" variant="secondary" className="w-full sm:w-auto mt-2 sm:mt-0">Close</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {selectedSale && isReturnModalOpen && (
        <Dialog open={isReturnModalOpen} onOpenChange={(open) => {
          if (!open) {
            setIsReturnModalOpen(false);
            setSelectedSale(null); 
          }
        }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <CornerDownLeft className="mr-2 h-6 w-6 text-primary" />
                Return Items from Sale: {selectedSale.id}
              </DialogTitle>
              <DialogDescription>
                Specify quantities to return. Max quantity is what was originally purchased.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {selectedSale.items.map(item => (
                  <div key={item.productId} className="grid grid-cols-3 items-center gap-3 p-2 border rounded-md">
                    <div className="col-span-2">
                      <p className="font-medium text-sm">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">Purchased: {item.quantity} @ {formatCurrency(item.unitPrice)}</p>
                    </div>
                    <Input
                      type="number"
                      min="0"
                      max={item.quantity}
                      value={returnItems[item.productId]?.quantity ?? 0}
                      onChange={(e) => handleReturnQuantityChange(item.productId, e.target.value)}
                      className="h-9 text-center"
                      placeholder="Qty"
                    />
                  </div>
                ))}
              </div>
              <div className="text-right font-semibold text-lg pt-3">
                Total Refund Amount: {formatCurrency(totalReturnAmount)}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsReturnModalOpen(false); setSelectedSale(null); }}>Cancel</Button>
              <Button
                onClick={handleSubmitReturn}
                disabled={processReturnMutation.isPending || totalReturnAmount === 0}
              >
                {processReturnMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Confirm Return
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </AppLayout>
  );
}
