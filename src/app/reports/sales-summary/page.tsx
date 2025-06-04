
"use client";

import AppLayout from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import type { Sale, SaleItem, TaxSetting } from '@/lib/mockData'; // Added TaxSetting
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Printer, Loader2, AlertTriangle, ShoppingCart, TrendingUp, TrendingDown, DollarSign, PieChart, FilterX, Calendar as CalendarIcon, Percent } from 'lucide-react';
import React, { useMemo, useState, useEffect } from 'react';
import { format, parseISO, isValid, startOfDay, endOfDay } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useSearchParams, useRouter } from 'next/navigation';
import type { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { useCurrency } from '@/contexts/CurrencyContext';

// API fetch function for sales with date range
const fetchSalesSummaryData = async (startDate?: Date, endDate?: Date, period?: string): Promise<Sale[]> => {
  const params = new URLSearchParams();
  if (period) {
    params.append('period', period);
  } else {
    if (startDate) {
      params.append('startDate', format(startDate, 'yyyy-MM-dd'));
    }
    if (endDate) {
      params.append('endDate', format(endOfDay(endDate), 'yyyy-MM-dd'));
    }
  }
  const res = await fetch(`/api/sales?${params.toString()}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'Network response was not ok' }));
    throw new Error(errorData.message || 'Network response was not ok');
  }
  return res.json();
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

// Function to generate PDF report using jsPDF
const generateSalesReportPdf = async (sales: Sale[], reportData: any, taxSettings: TaxSetting | null, formatCurrencyFn: (value: number, currencyCode?: string) => string, globalCurrencyCode: string, startDate?: Date, endDate?: Date) => {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter'
  });

  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;
  const margin = 40;
  let yPos = margin;

  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text("Sales Summary Report", pageWidth / 2, yPos, { align: 'center' });
  yPos += 20;
  doc.setFontSize(12);
  doc.setFont(undefined, 'normal');
  let dateRangeText = "All Time";
  if (startDate && endDate) {
    if (format(startDate, 'yyyy-MM-dd') === format(endDate, 'yyyy-MM-dd')) {
      dateRangeText = `Date: ${format(startDate, 'PPP')}`;
    } else {
      dateRangeText = `Period: ${format(startDate, 'PPP')} - ${format(endDate, 'PPP')}`;
    }
  } else if (startDate) {
    dateRangeText = `From: ${format(startDate, 'PPP')}`;
  } else if (endDate) {
     dateRangeText = `Until: ${format(endDate, 'PPP')}`;
  }
  
  doc.text(dateRangeText, pageWidth / 2, yPos, { align: 'center' });
  yPos += 30;

  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text("Financial Summary", margin, yPos);
  yPos += 15;

  const financialSummaryBody = [
      ['Total Pre-Tax Revenue', formatCurrencyFn(reportData.totalPreTaxRevenue, globalCurrencyCode)],
      ['Total Tax Collected', formatCurrencyFn(reportData.totalTaxCollected, globalCurrencyCode)],
      ['Total Revenue (Incl. Tax)', formatCurrencyFn(reportData.totalRevenue, globalCurrencyCode)],
      ['Total COGS', formatCurrencyFn(reportData.totalCogs, globalCurrencyCode)],
      ['Gross Profit (Pre-Tax Revenue - COGS)', formatCurrencyFn(reportData.grossProfit, globalCurrencyCode)],
      ['Number of Sales', reportData.numberOfSales.toString()],
    ];
  if (taxSettings && taxSettings.taxPercentage > 0) {
    financialSummaryBody.splice(1,0, [`${taxSettings.taxName || 'Tax'} Rate Applied`, `${taxSettings.taxPercentage}%`]);
  }


  autoTable(doc, {
    startY: yPos,
    head: [['Metric', 'Value']],
    body: financialSummaryBody,
    theme: 'striped',
    headStyles: { fillColor: [75, 85, 99] },
    margin: { left: margin, right: margin },
    tableWidth: pageWidth - (margin * 2),
  });
  yPos = (doc as any).lastAutoTable.finalY + 20;

  if (Object.keys(reportData.revenueByCategory).length > 0) {
    if (yPos + 60 > pageHeight - margin) {
      doc.addPage();
      yPos = margin;
    }
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text("Pre-Tax Revenue by Category", margin, yPos);
    yPos += 15;
    autoTable(doc, {
      startY: yPos,
      head: [['Category', 'Total Pre-Tax Revenue']],
      body: Object.entries(reportData.revenueByCategory)
                   .sort(([, a], [, b]) => (b as number) - (a as number))
                   .map(([category, revenue]) => [category, formatCurrencyFn(revenue as number, globalCurrencyCode)]),
      theme: 'grid',
      headStyles: { fillColor: [75, 85, 99] },
      margin: { left: margin, right: margin },
      tableWidth: pageWidth - (margin * 2),
    });
    yPos = (doc as any).lastAutoTable.finalY + 20;
  }

  if (sales.length > 0) {
    if (yPos + 40 > pageHeight - margin) {
      doc.addPage();
      yPos = margin;
    }
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text("Detailed Sales Transactions", margin, yPos);
    yPos += 20;

    sales.forEach((sale, saleIndex) => {
      if (yPos + 80 > pageHeight - margin) {
          doc.addPage();
          yPos = margin;
      }
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text(`Sale ID: ${sale.id}`, margin, yPos);
      yPos += 15;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(
        `Date: ${format(new Date(sale.date), 'Pp')} | Customer: ${sale.customerName || 'N/A'} | Cashier: ${sale.cashierId} | Payment: ${sale.paymentMethod}`,
        margin, yPos, { maxWidth: pageWidth - (margin * 2) }
      );
      yPos += smallLineSpacing;
      doc.text(
        `Subtotal: ${formatCurrencyFn(sale.subtotal, globalCurrencyCode)} | Tax: ${formatCurrencyFn(sale.taxAmount, globalCurrencyCode)} | Total: ${formatCurrencyFn(sale.totalAmount, globalCurrencyCode)}`,
        margin, yPos, { maxWidth: pageWidth - (margin * 2)}
      );
      yPos += 15;

      autoTable(doc, {
        startY: yPos,
        head: [['Product', 'Category', 'Qty', 'Unit Price', 'Item COGS', 'Line Total (Pre-Tax)']],
        body: sale.items.map(item => [
          item.productName,
          item.category || 'N/A',
          item.quantity.toString(),
          formatCurrencyFn(item.unitPrice, globalCurrencyCode),
          formatCurrencyFn(item.costPrice || 0, globalCurrencyCode),
          formatCurrencyFn(item.totalPrice, globalCurrencyCode) // totalPrice on SaleItem is pre-tax
        ]),
        theme: 'striped',
        headStyles: { fillColor: [156, 163, 175], fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        margin: { left: margin, right: margin },
        tableWidth: pageWidth - (margin * 2),
      });
      yPos = (doc as any).lastAutoTable.finalY + 15;

      if (saleIndex < sales.length - 1) {
        if (yPos + 20 > pageHeight - margin) {
            doc.addPage();
            yPos = margin;
        }
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 15;
      }
    });
  }

  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - margin + 10, { align: 'right' });
  }

  const reportTitleSafe = `Sales_Summary_Report_${format(new Date(), 'yyyy-MM-dd')}`;
  doc.save(`${reportTitleSafe}.pdf`);
};

export default function SalesSummaryReportPage() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParamsHook = useSearchParams();
  const { formatCurrency, currency: globalCurrency } = useCurrency();

  const [startDate, setStartDate] = useState<Date | undefined>(() => {
    const period = searchParamsHook.get('period');
    return period === 'today' ? startOfDay(new Date()) : undefined;
  });
  const [endDate, setEndDate] = useState<Date | undefined>(() => {
    const period = searchParamsHook.get('period');
    return period === 'today' ? endOfDay(new Date()) : undefined;
  });
  
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    const periodParam = searchParamsHook.get('period');
    if (periodParam === 'today') {
      const today = new Date();
      setStartDate(startOfDay(today));
      setEndDate(endOfDay(today));
    }
  }, [searchParamsHook]);

  const queryKey = useMemo(() => ['salesSummary', startDate, endDate, searchParamsHook.get('period')], [startDate, endDate, searchParamsHook]);

  const { data: sales = [], isLoading, error, isError, refetch } = useQuery<Sale[], Error>({
    queryKey: queryKey,
    queryFn: () => {
        const period = searchParamsHook.get('period');
        if (period === 'today' && !startDate && !endDate) {
             return fetchSalesSummaryData(startOfDay(new Date()), endOfDay(new Date()), undefined);
        }
        return fetchSalesSummaryData(startDate, endDate, period && !startDate && !endDate ? period : undefined);
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Failed to Load Sales Summary",
        description: err.message || "An unexpected error occurred.",
      });
    }
  });

  const { data: taxSettings, isLoading: isLoadingTaxSettings } = useQuery<TaxSetting, Error>({
    queryKey: ['taxSettings'],
    queryFn: fetchTaxSettingsAPI,
  });

  const reportData = useMemo(() => {
    let totalRevenue = 0; // This will be Grand Total (tax-inclusive)
    let totalPreTaxRevenue = 0;
    let totalTaxCollected = 0;
    let totalCogs = 0;
    const revenueByCategory: { [key: string]: number } = {}; // Based on item.totalPrice (pre-tax)

    sales.forEach(sale => {
      totalRevenue += sale.totalAmount;
      totalPreTaxRevenue += sale.subtotal;
      totalTaxCollected += sale.taxAmount;
      sale.items.forEach(item => {
        totalCogs += (item.costPrice || 0) * item.quantity;
        // item.totalPrice on SaleItem is pre-tax line total
        if (item.category) {
          revenueByCategory[item.category] = (revenueByCategory[item.category] || 0) + item.totalPrice;
        } else {
          revenueByCategory['Uncategorized'] = (revenueByCategory['Uncategorized'] || 0) + item.totalPrice;
        }
      });
    });
    const grossProfit = totalPreTaxRevenue - totalCogs;
    return { totalRevenue, totalPreTaxRevenue, totalTaxCollected, totalCogs, grossProfit, numberOfSales: sales.length, revenueByCategory };
  }, [sales]);


  const handleGeneratePdf = async () => {
    if (sales.length === 0) {
      toast({ title: "No Data", description: "There are no sales to report for the selected period." });
      return;
    }
    setIsGeneratingPdf(true);
    try {
      await generateSalesReportPdf(sales, reportData, taxSettings || null, formatCurrency, globalCurrency, startDate, endDate);
      toast({ title: "Report Generated", description: "Sales summary report PDF has been downloaded." });
    } catch (error) {
      console.error("Error generating PDF report:", error);
      toast({ variant: "destructive", title: "PDF Generation Error", description: (error as Error).message });
    } finally {
      setIsGeneratingPdf(false);
    }
  };
  
  const handleFilterApply = () => {
    const newParams = new URLSearchParams();
    if (startDate) newParams.set('startDate', format(startDate, 'yyyy-MM-dd'));
    if (endDate) newParams.set('endDate', format(endDate, 'yyyy-MM-dd'));
    router.push(`/reports/sales-summary?${newParams.toString()}`);
  };

  const handleClearFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    router.push('/reports/sales-summary');
  };
  
  const pageTitle = useMemo(() => {
    if (startDate && endDate) {
      if (format(startDate, 'yyyy-MM-dd') === format(endDate, 'yyyy-MM-dd')) {
         return `Sales Summary for ${format(startDate, 'PPP')}`;
      }
      return `Sales Summary from ${format(startDate, 'PPP')} to ${format(endDate, 'PPP')}`;
    }
    return "Sales Summary Report (All Time)";
  }, [startDate, endDate]);


  if ((isLoading || isLoadingTaxSettings) && sales.length === 0) {
    return (
      <AppLayout>
        <PageHeader title="Sales Summary Report" description="Loading sales data..." />
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (isError) {
     return (
      <AppLayout>
        <PageHeader title="Sales Summary Report" description="Error loading sales data." />
        <Card className="shadow-md">
          <CardHeader><CardTitle className="flex items-center text-destructive"><AlertTriangle className="mr-2 h-6 w-6" />Failed to Load Report</CardTitle></CardHeader>
          <CardContent><p>{error?.message || "An unknown error occurred."}</p></CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader title={pageTitle} description="Analyze sales performance for the selected period.">
        <div className="flex flex-wrap items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={"outline"} className={cn("w-[180px] justify-start text-left font-normal",!startDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP") : <span>Start Date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus /></PopoverContent>
            </Popover>
             <Popover>
              <PopoverTrigger asChild>
                <Button variant={"outline"} className={cn("w-[180px] justify-start text-left font-normal",!endDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "PPP") : <span>End Date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={endDate} onSelect={setEndDate} disabled={startDate ? { before: startDate } : undefined} initialFocus /></PopoverContent>
            </Popover>
            <Button onClick={handleFilterApply} disabled={isLoading || isLoadingTaxSettings}>
                {(isLoading || isLoadingTaxSettings) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Apply Filters
            </Button>
            {(startDate || endDate) && (
              <Button variant="ghost" size="icon" onClick={handleClearFilters} className="text-muted-foreground hover:text-destructive">
                <FilterX className="h-5 w-5" /><span className="sr-only">Clear Filters</span>
              </Button>
            )}
            <Button onClick={handleGeneratePdf} variant="outline" disabled={isGeneratingPdf || sales.length === 0 || isLoadingTaxSettings}>
              {isGeneratingPdf || isLoadingTaxSettings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
              {isGeneratingPdf ? 'Generating...' : 'PDF Report'}
            </Button>
        </div>
      </PageHeader>

      <div>
        {sales.length === 0 && !isLoading && (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No sales recorded for the selected period.
            </CardContent>
          </Card>
        )}

        {sales.map((sale) => (
          <Card key={sale.id} className="mb-6 shadow-lg">
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
                   <Badge variant={sale.paymentMethod === 'Card' ? 'default' : sale.paymentMethod === 'Cash' ? 'secondary' : 'outline'} className="text-sm mb-1">
                      {sale.paymentMethod}
                    </Badge>
                  <p className="text-xs text-muted-foreground">Subtotal: {formatCurrency(sale.subtotal)}</p>
                  <p className="text-xs text-muted-foreground">Tax: {formatCurrency(sale.taxAmount)}</p>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(sale.totalAmount)}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <h4 className="text-md font-semibold mb-2 text-foreground">Items Sold:</h4>
              {sale.items && sale.items.length > 0 ? (
                <div className="rounded-md border max-h-60 overflow-y-auto">
                  <Table>
                    <TableHeader><TableRow><TableHead>Product Name</TableHead><TableHead>Category</TableHead><TableHead className="text-center">Qty</TableHead><TableHead className="text-right">Unit Price</TableHead><TableHead className="text-right">Item COGS</TableHead><TableHead className="text-right">Line Total (Pre-Tax)</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {sale.items.map((item: SaleItem, index: number) => (
                        <TableRow key={item.productId + index}>
                          <TableCell>{item.productName}</TableCell>
                          <TableCell>{item.category || 'N/A'}</TableCell>
                          <TableCell className="text-center">{item.quantity}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{formatCurrency(item.costPrice || 0)}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(item.totalPrice)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No items found for this sale.</p>
              )}
            </CardContent>
          </Card>
        ))}
        
        {sales.length > 0 && (
          <>
            <Card className="mt-8 shadow-xl">
              <CardHeader><CardTitle className="text-xl flex items-center"><PieChart className="mr-3 h-6 w-6 text-indigo-500"/>Revenue by Category (Pre-Tax)</CardTitle></CardHeader>
              <CardContent>
                {Object.keys(reportData.revenueByCategory).length > 0 ? (
                  <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow><TableHead>Category</TableHead><TableHead className="text-right">Total Pre-Tax Revenue</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {Object.entries(reportData.revenueByCategory).sort(([, a], [, b]) => (b as number) - (a as number)).map(([category, revenue]) => (
                        <TableRow key={category}><TableCell className="font-medium">{category}</TableCell><TableCell className="text-right font-semibold">{formatCurrency(revenue as number)}</TableCell></TableRow>
                      ))}
                    </TableBody>
                  </Table></div>
                ) : (<p className="text-muted-foreground">No category data available for this period.</p>)}
              </CardContent>
            </Card>

            <Card className="mt-8 shadow-xl">
              <CardHeader><CardTitle className="text-xl">Financial Summary</CardTitle><CardDescription>Across {reportData.numberOfSales} transaction(s) for the selected period.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-md border bg-muted/30"><div className="flex items-center"><DollarSign className="mr-3 h-6 w-6 text-blue-500" /><span className="font-medium">Total Pre-Tax Revenue</span></div><span className="text-xl font-semibold text-blue-600">{formatCurrency(reportData.totalPreTaxRevenue)}</span></div>
                {taxSettings && taxSettings.taxPercentage > 0 && (
                  <div className="flex items-center justify-between p-3 rounded-md border bg-muted/30"><div className="flex items-center"><Percent className="mr-3 h-6 w-6 text-orange-500" /><span className="font-medium">Total {taxSettings.taxName || 'Tax'} Collected ({taxSettings.taxPercentage}%)</span></div><span className="text-xl font-semibold text-orange-600">{formatCurrency(reportData.totalTaxCollected)}</span></div>
                )}
                <div className="flex items-center justify-between p-3 rounded-md border bg-muted/30"><div className="flex items-center"><DollarSign className="mr-3 h-6 w-6 text-green-500" /><span className="font-medium">Total Revenue (Incl. Tax)</span></div><span className="text-2xl font-bold text-green-600">{formatCurrency(reportData.totalRevenue)}</span></div>
                <div className="flex items-center justify-between p-3 rounded-md border bg-muted/30"><div className="flex items-center"><TrendingDown className="mr-3 h-6 w-6 text-red-500" /><span className="font-medium">Total Cost of Goods Sold (COGS)</span></div><span className="text-xl font-semibold text-red-600">{formatCurrency(reportData.totalCogs)}</span></div>
                <div className="flex items-center justify-between p-3 rounded-md border bg-muted/30"><div className="flex items-center"><TrendingUp className="mr-3 h-6 w-6 text-teal-500" /><span className="font-medium">Gross Profit (Pre-Tax Revenue - COGS)</span></div><span className="text-2xl font-bold text-teal-600">{formatCurrency(reportData.grossProfit)}</span></div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
