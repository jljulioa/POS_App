
"use client";

import AppLayout from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import type { Sale, SaleItem } from '@/lib/mockData';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Printer, Loader2, AlertTriangle, ShoppingCart, TrendingUp, TrendingDown, DollarSign, PieChart, CornerDownLeft } from 'lucide-react';
import React, { useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { z } from 'zod';

// API fetch function for today's sales
const fetchTodaysSales = async (): Promise<Sale[]> => {
  const res = await fetch('/api/sales?period=today'); 
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'Network response was not ok' }));
    throw new Error(errorData.message || 'Network response was not ok');
  }
  return res.json();
};

// Define ReturnItemFormValues type (can be moved to a shared types file if used elsewhere)
type ReturnItemFormValues = {
  [productId: string]: {
    quantity: number;
    unitPrice: number;
    maxQuantity: number;
  };
};

// Zod schemas for return processing (consistent with /api/returns and /sales page)
const ReturnItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().min(1, "Return quantity must be at least 1."), // Ensure quantity is positive
  unitPrice: z.number(),
});

const ProcessReturnSchema = z.object({
  saleId: z.string(),
  itemsToReturn: z.array(ReturnItemSchema).min(1, "At least one item must be selected for return."),
});

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


export default function TodaysSalesReportPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const reportContentRef = useRef<HTMLDivElement>(null);

  const [selectedSaleForReturn, setSelectedSaleForReturn] = useState<Sale | null>(null);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnItems, setReturnItems] = useState<ReturnItemFormValues>({});


  const { data: sales = [], isLoading, error, isError } = useQuery<Sale[], Error>({
    queryKey: ['todaysSales'],
    queryFn: fetchTodaysSales,
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Failed to Load Today's Sales",
        description: err.message || "An unexpected error occurred.",
      });
    }
  });

  const reportData = useMemo(() => {
    let totalRevenue = 0;
    let totalCogs = 0;
    const revenueByCategory: { [key: string]: number } = {};

    sales.forEach(sale => {
      totalRevenue += sale.totalAmount;
      sale.items.forEach(item => {
        totalCogs += (item.costPrice || 0) * item.quantity;
        if (item.category) {
          revenueByCategory[item.category] = (revenueByCategory[item.category] || 0) + item.totalPrice;
        } else {
          revenueByCategory['Uncategorized'] = (revenueByCategory['Uncategorized'] || 0) + item.totalPrice;
        }
      });
    });
    const grossProfit = totalRevenue - totalCogs;
    return { totalRevenue, totalCogs, grossProfit, numberOfSales: sales.length, revenueByCategory };
  }, [sales]);


  const handlePrint = async () => {
    const element = reportContentRef.current;
    if (element) {
      try {
        const html2pdf = (await import('html2pdf.js')).default;
        const opt = {
          margin:       0.5,
          filename:     `Todays_Sales_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`,
          image:        { type: 'jpeg', quality: 0.98 },
          html2canvas:  { scale: 2, useCORS: true, logging: false },
          jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
        };
        html2pdf().from(element).set(opt).save();
      } catch (error) {
        console.error("Error generating PDF:", error);
        toast({ variant: "destructive", title: "Error de Impresión", description: (error as Error).message });
      }
    } else {
      toast({
        variant: "destructive",
        title: "Error Generating PDF",
        description: "Report content not found.",
      });
    }
  };

  const handleOpenReturnModal = (sale: Sale) => {
    setSelectedSaleForReturn(sale);
    const initialReturnItems: ReturnItemFormValues = {};
    sale.items.forEach(item => {
      initialReturnItems[item.productId] = { quantity: 0, unitPrice: item.unitPrice, maxQuantity: item.quantity };
    });
    setReturnItems(initialReturnItems);
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
      queryClient.invalidateQueries({ queryKey: ['todaysSales'] }); 
      setIsReturnModalOpen(false);
      setSelectedSaleForReturn(null);
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
    if (!selectedSaleForReturn) return;

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
      saleId: selectedSaleForReturn.id,
      itemsToReturn: itemsToSubmit,
    });

    if (!validation.success) {
      toast({ variant: "destructive", title: "Invalid Return Data", description: validation.error.flatten().fieldErrors.itemsToReturn?.join(', ') || "Please check return quantities." });
      return;
    }
    processReturnMutation.mutate(validation.data);
  };

  if (isLoading) {
    return (
      <AppLayout>
        <PageHeader title="Today's Sales Report" description="Loading sales data for today..." />
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (isError) {
     return (
      <AppLayout>
        <PageHeader title="Today's Sales Report" description="Error loading today's sales." />
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <AlertTriangle className="mr-2 h-6 w-6" />
              Failed to Load Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error?.message || "An unknown error occurred."}</p>
          </CardContent>
           <CardFooter>
            <Button variant="outline" asChild>
              <Link href="/sales">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Sales
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader title="Today's Sales Report" description={`Sales for ${format(new Date(), 'PPP')}`}>
        <Button onClick={handlePrint} variant="outline">
          <Printer className="mr-2 h-4 w-4" /> Generate PDF
        </Button>
        <Button variant="outline" asChild>
          <Link href="/sales">
            <ArrowLeft className="mr-2 h-4 w-4" /> All Sales Records
          </Link>
        </Button>
      </PageHeader>

      <div id="report-content" ref={reportContentRef}>
        {sales.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No sales recorded for today yet.
            </CardContent>
          </Card>
        )}

        {sales.map((sale) => (
          <Card key={sale.id} className="mb-6 shadow-lg break-inside-avoid-page">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between sm:items-start">
                <div>
                  <CardTitle className="flex items-center">
                    <ShoppingCart className="mr-3 h-6 w-6 text-primary" />
                    Sale ID: {sale.id}
                  </CardTitle>
                  <CardDescription>
                    Date: {format(new Date(sale.date), 'Pp')} | Customer: {sale.customerName || 'N/A'} | Cashier: {sale.cashierId}
                  </CardDescription>
                </div>
                <div className="mt-2 sm:mt-0 flex flex-col items-start sm:items-end">
                   <Badge variant={
                      sale.paymentMethod === 'Card' ? 'default' :
                      sale.paymentMethod === 'Cash' ? 'secondary' : 'outline'
                    } className="text-sm mb-1">
                      {sale.paymentMethod}
                    </Badge>
                  <p className="text-2xl font-bold text-primary">${Number(sale.totalAmount).toFixed(2)}</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => handleOpenReturnModal(sale)}
                  >
                    <CornerDownLeft className="mr-2 h-4 w-4" /> Return Items
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <h4 className="text-md font-semibold mb-2 text-foreground">Items Sold:</h4>
              {sale.items && sale.items.length > 0 ? (
                <ScrollArea className="rounded-md border max-h-60">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-center">Qty</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Item Cost</TableHead>
                        <TableHead className="text-right">Total Price</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sale.items.map((item: SaleItem, index: number) => (
                        <TableRow key={item.productId + index}>
                          <TableCell>{item.productName}</TableCell>
                          <TableCell>{item.category || 'N/A'}</TableCell>
                          <TableCell className="text-center">{item.quantity}</TableCell>
                          <TableCell className="text-right">${Number(item.unitPrice).toFixed(2)}</TableCell>
                          <TableCell className="text-right text-muted-foreground">${Number(item.costPrice || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-right font-medium">${Number(item.totalPrice).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              ) : (
                <p className="text-muted-foreground text-sm">No items found for this sale.</p>
              )}
            </CardContent>
          </Card>
        ))}
        
        {sales.length > 0 && (
          <>
            <Card className="mt-8 shadow-xl break-inside-avoid-page">
              <CardHeader>
                <CardTitle className="text-xl flex items-center"><PieChart className="mr-3 h-6 w-6 text-indigo-500"/>Revenue by Category (Today)</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(reportData.revenueByCategory).length > 0 ? (
                  <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Total Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(reportData.revenueByCategory)
                        .sort(([, a], [, b]) => b - a) // Sort by revenue descending
                        .map(([category, revenue]) => (
                        <TableRow key={category}>
                          <TableCell className="font-medium">{category}</TableCell>
                          <TableCell className="text-right font-semibold">${Number(revenue).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No category data available for today's sales.</p>
                )}
              </CardContent>
            </Card>

            <Card className="mt-8 shadow-xl break-inside-avoid-page">
              <CardHeader>
                <CardTitle className="text-xl">Today's Financial Summary</CardTitle>
                <CardDescription>Across {reportData.numberOfSales} transaction(s).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-md border bg-muted/30">
                  <div className="flex items-center">
                    <DollarSign className="mr-3 h-6 w-6 text-green-500" />
                    <span className="font-medium">Total Revenue</span>
                  </div>
                  <span className="text-2xl font-bold text-green-600">${reportData.totalRevenue.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-md border bg-muted/30">
                  <div className="flex items-center">
                    <TrendingDown className="mr-3 h-6 w-6 text-red-500" />
                    <span className="font-medium">Total Cost of Goods Sold (COGS)</span>
                  </div>
                  <span className="text-xl font-semibold text-red-600">${reportData.totalCogs.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-md border bg-muted/30">
                  <div className="flex items-center">
                    <TrendingUp className="mr-3 h-6 w-6 text-blue-500" />
                    <span className="font-medium">Gross Profit</span>
                  </div>
                  <span className="text-2xl font-bold text-blue-600">${reportData.grossProfit.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

       {/* Return Items Modal */}
      {selectedSaleForReturn && isReturnModalOpen && (
        <Dialog open={isReturnModalOpen} onOpenChange={(open) => {
            if (!open) {
                setIsReturnModalOpen(false);
                setSelectedSaleForReturn(null);
            }
        }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <CornerDownLeft className="mr-2 h-6 w-6 text-primary" />
                Return Items from Sale: {selectedSaleForReturn.id}
              </DialogTitle>
              <DialogDescription>
                Specify quantities to return. Max quantity is what was originally purchased.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-3">
              {selectedSaleForReturn.items.map(item => (
                <div key={item.productId} className="grid grid-cols-3 items-center gap-3 p-2 border rounded-md">
                  <div className="col-span-2">
                    <p className="font-medium text-sm">{item.productName}</p>
                    <p className="text-xs text-muted-foreground">Purchased: {item.quantity} @ ${item.unitPrice.toFixed(2)}</p>
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
              <div className="text-right font-semibold text-lg pt-3">
                Total Refund Amount: ${totalReturnAmount.toFixed(2)}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {setIsReturnModalOpen(false); setSelectedSaleForReturn(null);}}>Cancel</Button>
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

