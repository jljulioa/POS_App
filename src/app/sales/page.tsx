
"use client";

import AppLayout from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import type { Sale, SaleItem } from '@/lib/mockData'; // Keep type
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FileDown, Eye, Loader2, AlertTriangle, ShoppingCart, Calendar as CalendarIcon, FilterX, CornerDownLeft, Printer } from 'lucide-react';
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

// Helper function to generate HTML for the sales receipt
const generateSaleReceiptHtml = (sale: Sale | null): string => {
  if (!sale || !sale.items || sale.items.length === 0) {
    return `<div style="width: 280px; padding: 10px; font-family: 'Courier New', Courier, monospace; border: 1px solid #ccc;"><p>No items in receipt or sale data missing.</p></div>`;
  }

  const itemsHtml = sale.items.map(item => `
    <tr>
      <td style="padding: 2px 5px 2px 0; vertical-align: top; font-size: 10px; border-bottom: 1px dotted #ccc; word-break: break-word;">
        ${item.quantity} x ${item.productName || 'N/A Product'}
      </td>
      <td style="text-align: right; vertical-align: top; font-size: 10px; border-bottom: 1px dotted #ccc; padding: 2px 0;">${Number(item.unitPrice).toFixed(2)}</td>
      <td style="text-align: right; vertical-align: top; font-size: 10px; border-bottom: 1px dotted #ccc; padding: 2px 0 2px 5px;">${Number(item.totalPrice).toFixed(2)}</td>
    </tr>
  `).join('');

  const html = `
    <div style="width: 280px; font-family: 'Courier New', Courier, monospace; color: black; background-color: white; padding: 10px; border: 1px solid #eee; box-shadow: 0 0 5px rgba(0,0,0,0.1);">
      <div style="text-align: center; margin-bottom: 8px;">
        <h2 style="font-size: 16px; font-weight: bold; margin: 0 0 2px 0;">MotoFox POS</h2>
        <p style="font-size: 9px; margin:0;">Your Motorcycle Parts Specialist</p>
      </div>
      <hr style="border: none; border-top: 1px dashed #000; margin: 5px 0;" />
      <div style="font-size: 9px;">
        <p style="margin: 0;">Receipt No: ${sale.id}</p>
        <p style="margin: 0;">Date: ${format(new Date(sale.date), 'dd/MM/yyyy HH:mm:ss')}</p>
        ${sale.cashierId ? `<p style="margin: 0;">Cashier: ${sale.cashierId}</p>` : ''}
        ${sale.customerName ? `<p style="margin: 0;">Customer: ${sale.customerName}</p>` : ''}
      </div>
      <hr style="border: none; border-top: 1px dashed #000; margin: 5px 0;" />
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 5px;">
        <thead>
          <tr>
            <th style="text-align: left; padding: 2px 5px 2px 0; border-bottom: 1px solid #ccc; font-size: 10px;">Item</th>
            <th style="text-align: right; padding: 2px 0; border-bottom: 1px solid #ccc; font-size: 10px;">Price</th>
            <th style="text-align: right; padding: 2px 0 2px 5px; border-bottom: 1px solid #ccc; font-size: 10px;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
      <hr style="border: none; border-top: 1px dashed #000; margin: 5px 0;" />
      <div style="text-align: right; margin-top: 8px;">
        <div style="font-size: 14px; font-weight: bold;">TOTAL: $${Number(sale.totalAmount).toFixed(2)}</div>
      </div>
      ${sale.paymentMethod ? `<div style="font-size: 10px; text-align: right; margin-top: 3px;">Payment: ${sale.paymentMethod}</div>` : ''}
      <hr style="border: none; border-top: 1px solid #000; margin: 8px 0;" />
      <div style="text-align: center; margin-top: 10px; font-size: 10px;">
        Thank you for your purchase!
        <br>MotoFox POS - We keep you riding!
      </div>
    </div>
  `;
  return html;
};


export default function SalesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnItems, setReturnItems] = useState<ReturnItemFormValues>({});
  
  const [isPrintingReceipt, setIsPrintingReceipt] = useState(false);
  const receiptHtmlRef = useRef<HTMLDivElement>(null);

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
    } else if (quantity === "" || numQuantity < 0 ) {
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
        description: `${data.message}. Total Refund: $${data.totalRefundAmount.toFixed(2)}`,
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


  const handleClearFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  };
  
  const handlePrintSaleReceipt = async (saleToPrint: Sale | null) => {
    if (!saleToPrint || isPrintingReceipt || !receiptHtmlRef.current) {
      toast({ variant: 'destructive', title: 'Print Error', description: 'No sale selected, print already in progress, or print area not ready.' });
      return;
    }

    setIsPrintingReceipt(true);
    console.log("Printing sale:", JSON.stringify(saleToPrint));
    const htmlContent = generateSaleReceiptHtml(saleToPrint);
    receiptHtmlRef.current.innerHTML = htmlContent;
    console.log("Generated HTML for receipt:", htmlContent.substring(0, 300) + "...");
    console.log("receiptHtmlRef.current.innerHTML (after set):", receiptHtmlRef.current.innerHTML.substring(0, 300) + "...");


    // Delay to allow browser to render the injected HTML
    setTimeout(async () => {
      if (!receiptHtmlRef.current || receiptHtmlRef.current.innerHTML.trim() === "" || !receiptHtmlRef.current.hasChildNodes()) {
        console.error("Printable element is empty or not found after timeout. Sale data for render:", JSON.stringify(saleToPrint));
        toast({
          variant: 'destructive',
          title: 'Print Error',
          description: 'Failed to prepare receipt content for printing. Please try again.',
        });
        setIsPrintingReceipt(false);
        if (receiptHtmlRef.current) receiptHtmlRef.current.innerHTML = ''; // Clear on error too
        return;
      }
      
      console.log("Element to print innerHTML (before html2pdf):", receiptHtmlRef.current.innerHTML.substring(0, 300) + "...");

      try {
        const html2pdf = (await import('html2pdf.js')).default;
        const options = {
          margin: [2, 2, 2, 2], // mm
          filename: `receipt_${saleToPrint.id}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: {
            scale: 3, // Higher scale for better quality
            logging: true, // Enable for debugging html2canvas issues
            useCORS: true,
            width: 280, // Explicit width in pixels, matching the receipt HTML style
            windowWidth: 280, // Explicit window width
          },
          jsPDF: {
            unit: 'mm',
            format: [76, 'auto'], // Approx 3-inch width receipt, auto height
            orientation: 'portrait',
          },
        };
        await html2pdf().from(receiptHtmlRef.current).set(options).save();
      } catch (error) {
        console.error('Error generating PDF with html2pdf.js:', error);
        toast({
          variant: 'destructive',
          title: 'Print Error',
          description: (error as Error).message || "Unknown error during PDF generation.",
        });
      } finally {
        setIsPrintingReceipt(false);
        if (receiptHtmlRef.current) {
          receiptHtmlRef.current.innerHTML = ''; // Clear the div
        }
      }
    }, 300); // Increased delay
  };


  useEffect(() => {
  }, [startDate, endDate, refetch]);


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
                  disabled={(date) => startDate && date < startDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
        </div>
         {(startDate || endDate) && (
            <Button variant="ghost" onClick={handleClearFilters} size="sm">
              <FilterX className="mr-2 h-4 w-4" /> Clear Dates
            </Button>
          )}
      </div>

      {isLoading && <div className="flex justify-center py-4"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}

      {!isLoading && (
        <div className="rounded-lg border shadow-sm bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sale ID</TableHead>
                <TableHead className="hidden sm:table-cell">Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-center hidden md:table-cell">Items</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="hidden md:table-cell">Payment</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell className="font-medium text-xs sm:text-sm">{sale.id}</TableCell>
                  <TableCell className="hidden sm:table-cell text-xs sm:text-sm">{format(new Date(sale.date), 'PPpp')}</TableCell>
                  <TableCell className="text-xs sm:text-sm">{sale.customerName || 'N/A'}</TableCell>
                  <TableCell className="text-center hidden md:table-cell">{sale.items.length}</TableCell>
                  <TableCell className="text-right text-xs sm:text-sm">${Number(sale.totalAmount).toFixed(2)}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant={
                      sale.paymentMethod === 'Card' ? 'default' :
                      sale.paymentMethod === 'Cash' ? 'secondary' : 'outline'
                    }>{sale.paymentMethod}</Badge>
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
                  <TableCell colSpan={7} className="h-24 text-center">
                    No sales records found for the selected criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Sale Details Modal */}
      {selectedSale && (
        <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
          <DialogContent className="sm:max-w-md md:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center text-lg md:text-xl">
                <ShoppingCart className="mr-2 h-5 w-5 md:h-6 md:w-6 text-primary" />
                Sale Details: {selectedSale.id}
              </DialogTitle>
              <DialogDescription className="text-xs md:text-sm">
                Date: {format(new Date(selectedSale.date), 'PPpp')}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-3 md:gap-4 py-3 md:py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs md:text-sm">
                <div><span className="font-semibold">Customer:</span> {selectedSale.customerName || 'N/A'}</div>
                <div><span className="font-semibold">Payment Method:</span> {selectedSale.paymentMethod}</div>
                <div><span className="font-semibold">Cashier:</span> {selectedSale.cashierId}</div>
                <div className="text-md md:text-lg font-bold"><span className="font-semibold">Total:</span> ${Number(selectedSale.totalAmount).toFixed(2)}</div>
              </div>
              
              <div className="flex justify-between items-center mt-2">
                <h3 className="font-semibold text-sm md:text-md">Items Sold:</h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleOpenReturnModal(selectedSale)}>
                    <CornerDownLeft className="mr-2 h-3 w-3 md:h-4 md:w-4" /> Return Items
                  </Button>
                   <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handlePrintSaleReceipt(selectedSale)}
                    disabled={isPrintingReceipt}
                  >
                    {isPrintingReceipt ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
                    Print Receipt
                  </Button>
                </div>
              </div>

              {selectedSale.items && selectedSale.items.length > 0 ? (
                <div className="rounded-md border max-h-48 sm:max-h-60 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs md:text-sm">Product Name</TableHead>
                        <TableHead className="text-center text-xs md:text-sm">Quantity</TableHead>
                        <TableHead className="text-right text-xs md:text-sm">Unit Price</TableHead>
                        <TableHead className="text-right text-xs md:text-sm">Total Price</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedSale.items.map((item: SaleItem, index: number) => (
                        <TableRow key={item.productId + index}>
                          <TableCell className="text-xs md:text-sm">{item.productName}</TableCell>
                          <TableCell className="text-center text-xs md:text-sm">{item.quantity}</TableCell>
                          <TableCell className="text-right text-xs md:text-sm">${Number(item.unitPrice).toFixed(2)}</TableCell>
                          <TableCell className="text-right font-medium text-xs md:text-sm">${Number(item.totalPrice).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted-foreground text-xs md:text-sm">No items found for this sale.</p>
              )}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Close
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

       {/* Return Items Modal */}
      {selectedSale && isReturnModalOpen && (
        <Dialog open={isReturnModalOpen} onOpenChange={(open) => {
            if (!open) {
                setIsReturnModalOpen(false);
            }
        }}>
          <DialogContent className="sm:max-w-md md:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center text-lg md:text-xl">
                <CornerDownLeft className="mr-2 h-5 w-5 md:h-6 md:w-6 text-primary" />
                Return Items from Sale: {selectedSale.id}
              </DialogTitle>
              <DialogDescription className="text-xs md:text-sm">
                Specify quantities to return. Max quantity is what was originally purchased.
              </DialogDescription>
            </DialogHeader>
            <div className="py-3 md:py-4 space-y-3">
              {selectedSale.items.map(item => (
                <div key={item.productId} className="grid grid-cols-3 items-center gap-2 md:gap-3 p-2 border rounded-md">
                  <div className="col-span-2">
                    <p className="font-medium text-xs md:text-sm">{item.productName}</p>
                    <p className="text-xs text-muted-foreground">Purchased: {item.quantity} @ ${item.unitPrice.toFixed(2)}</p>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    max={item.quantity}
                    value={returnItems[item.productId]?.quantity || 0}
                    onChange={(e) => handleReturnQuantityChange(item.productId, e.target.value)}
                    className="h-8 md:h-9 text-center text-xs md:text-sm"
                    placeholder="Qty"
                  />
                </div>
              ))}
              <div className="text-right font-semibold text-md md:text-lg pt-3">
                Total Refund Amount: ${totalReturnAmount.toFixed(2)}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {setIsReturnModalOpen(false); }}>Cancel</Button>
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
      {/* Hidden div for printing receipts */}
      <div ref={receiptHtmlRef} style={{ position: 'absolute', left: '-9999px', top: '-9999px', zIndex: -100 }} />
    </AppLayout>
  );
}

    