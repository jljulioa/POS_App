
"use client";

import AppLayout from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import type { InvoiceSettings } from '@/lib/mockData';
import type { InventoryTransactionDB } from '@/app/api/inventory-transactions/route';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Printer, Loader2, AlertTriangle, TrendingUp, TrendingDown, PackageSearch, Calendar as CalendarIcon, FilterX, BarChart3, Info } from 'lucide-react';
import React, { useMemo, useState, Suspense } from 'react';
import { format, parseISO, isValid, startOfDay, endOfDay } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useRouter } from 'next/navigation';
import type { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


// API fetch function for adjustment transactions with date range
const fetchAdjustmentTransactions = async (startDate?: Date, endDate?: Date): Promise<InventoryTransactionDB[]> => {
  const params = new URLSearchParams();
  params.append('type', 'Adjustment');
  if (startDate) {
    params.append('startDate', format(startOfDay(startDate), 'yyyy-MM-dd'));
  }
  if (endDate) {
    params.append('endDate', format(endOfDay(endDate), 'yyyy-MM-dd'));
  }
  const res = await fetch(`/api/inventory-transactions?${params.toString()}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'Network response was not ok' }));
    throw new Error(errorData.message || 'Failed to fetch adjustment transactions');
  }
  return res.json();
};

const fetchInvoiceSettingsAPI = async (): Promise<InvoiceSettings> => {
  const response = await fetch('/api/settings/invoice');
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to fetch invoice settings' }));
    throw new Error(errorData.message || 'Failed to fetch invoice settings');
  }
  return response.json();
};

const generateAdjustmentReportPdf = async (transactions: InventoryTransactionDB[], reportData: any, invoiceSettings: InvoiceSettings | null, formatCurrencyFn: (value: number) => string, startDate?: Date, endDate?: Date) => {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter'
  });

  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;
  const margin = 30; // Reduced margin for more space
  let yPos = margin;

  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text("Inventory Adjustment Report", pageWidth / 2, yPos, { align: 'center' });
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
  yPos += 20;

  if (invoiceSettings?.companyName) {
    doc.setFontSize(10);
    doc.text(`Company: ${invoiceSettings.companyName}`, margin, yPos);
    yPos += 15;
  }
  
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text("Summary of Adjustments", margin, yPos);
  yPos += 15;

  const summaryBody = [
    ['Total Positive Adjustments (Units)', reportData.totalPositiveAdjustments.toString()],
    ['Total Negative Adjustments (Units)', reportData.totalNegativeAdjustments.toString()],
    ['Net Change in Quantity (Units)', reportData.netChange.toString()],
    ['Cost of Positive Adjustments', formatCurrencyFn(reportData.totalPositiveAdjustmentCostValue)],
    ['Cost of Negative Adjustments', formatCurrencyFn(reportData.totalNegativeAdjustmentCostValue)],
    ['Net Cost Impact', formatCurrencyFn(reportData.netCostImpactValue)],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [['Metric', 'Value']],
    body: summaryBody,
    theme: 'striped',
    headStyles: { fillColor: [75, 85, 99] }, 
    margin: { left: margin, right: margin },
    tableWidth: pageWidth - (margin * 2),
  });
  yPos = (doc as any).lastAutoTable.finalY + 20;

  if (transactions.length > 0) {
    if (yPos + 60 > pageHeight - margin) { 
      doc.addPage();
      yPos = margin;
    }
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text("Detailed Adjustment Transactions", margin, yPos);
    yPos += 15;

    const tableHead = [['Date', 'Product Name', 'Qty Change', 'Cost/Unit', 'Cost Impact', 'Stock Before', 'Stock After', 'Notes']];
    const tableBody = transactions.map(t => [
      format(new Date(t.transaction_date), 'PPp'),
      t.product_name,
      t.quantity_change > 0 ? `+${t.quantity_change}` : t.quantity_change.toString(),
      t.cost_price !== undefined ? formatCurrencyFn(t.cost_price) : 'N/A',
      t.cost_price !== undefined ? formatCurrencyFn(t.quantity_change * t.cost_price) : 'N/A',
      t.stock_before.toString(),
      t.stock_after.toString(),
      t.notes || 'N/A'
    ]);

    autoTable(doc, {
      startY: yPos,
      head: tableHead,
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [75, 85, 99], fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 70 }, // Date
        1: { cellWidth: 'auto' }, // Product Name
        2: { halign: 'right', cellWidth: 40 }, // Qty Change
        3: { halign: 'right', cellWidth: 50 }, // Cost/Unit
        4: { halign: 'right', cellWidth: 60 }, // Cost Impact
        5: { halign: 'right', cellWidth: 40 }, // Stock Before
        6: { halign: 'right', cellWidth: 40 }, // Stock After
        7: { cellWidth: 'auto' }, // Notes
      },
      margin: { left: margin, right: margin },
      tableWidth: pageWidth - (margin * 2),
    });
    yPos = (doc as any).lastAutoTable.finalY + 20;
  }

  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - margin + 10, { align: 'right' });
  }

  const reportTitleSafe = `Inventory_Adjustment_Report_${format(new Date(), 'yyyy-MM-dd')}`;
  doc.save(`${reportTitleSafe}.pdf`);
};


function InventoryAdjustmentSummaryContentLoading() {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row flex-wrap items-center gap-2">
          <Skeleton className="h-10 w-[180px]" />
          <Skeleton className="h-10 w-[180px]" />
          <Skeleton className="h-10 w-[120px]" />
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-10 w-[150px]" />
        </div>
        <Card className="shadow-lg">
          <CardHeader><Skeleton className="h-8 w-3/4" /><Skeleton className="h-4 w-1/2 mt-2" /></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
          </CardContent>
        </Card>
        <Card className="shadow-xl">
          <CardHeader><Skeleton className="h-7 w-1/2" /></CardHeader>
          <CardContent><Skeleton className="h-40 w-full" /></CardContent>
        </Card>
      </div>
    );
  }


function InventoryAdjustmentSummaryContent() {
  const { toast } = useToast();
  const router = useRouter();
  const { formatCurrency } = useCurrency();

  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const queryKey = useMemo(() => ['adjustmentTransactions', startDate, endDate], [startDate, endDate]);

  const { data: transactions = [], isLoading, error, isError } = useQuery<InventoryTransactionDB[], Error>({
    queryKey: queryKey,
    queryFn: () => fetchAdjustmentTransactions(startDate, endDate),
  });

  const { data: invoiceSettings, isLoading: isLoadingInvoiceSettings } = useQuery<InvoiceSettings, Error>({
    queryKey: ['invoiceSettings'],
    queryFn: fetchInvoiceSettingsAPI,
  });

  const reportData = useMemo(() => {
    let totalPositiveAdjustments = 0;
    let totalNegativeAdjustments = 0;
    let totalPositiveAdjustmentCostValue = 0;
    let totalNegativeAdjustmentCostValue = 0;

    transactions.forEach(transaction => {
      const cost = transaction.cost_price ?? 0;
      if (transaction.quantity_change > 0) {
        totalPositiveAdjustments += transaction.quantity_change;
        totalPositiveAdjustmentCostValue += transaction.quantity_change * cost;
      } else {
        totalNegativeAdjustments += transaction.quantity_change; // This will be negative
        totalNegativeAdjustmentCostValue += Math.abs(transaction.quantity_change) * cost; // Cost is absolute
      }
    });
    const netChange = totalPositiveAdjustments + totalNegativeAdjustments;
    const netCostImpactValue = totalPositiveAdjustmentCostValue - totalNegativeAdjustmentCostValue; // If pos is gain, neg is loss
    return { 
        totalPositiveAdjustments, 
        totalNegativeAdjustments, 
        netChange,
        totalPositiveAdjustmentCostValue,
        totalNegativeAdjustmentCostValue,
        netCostImpactValue
    };
  }, [transactions]);

  const handleGeneratePdf = async () => {
    if (transactions.length === 0) {
      toast({ title: "No Data", description: "There are no adjustment transactions to report for the selected period." });
      return;
    }
    setIsGeneratingPdf(true);
    try {
      await generateAdjustmentReportPdf(transactions, reportData, invoiceSettings || null, formatCurrency, startDate, endDate);
      toast({ title: "Report Generated", description: "Inventory Adjustment Report PDF has been downloaded." });
    } catch (pdfError) {
      console.error("Error generating PDF report:", pdfError);
      toast({ variant: "destructive", title: "PDF Generation Error", description: (pdfError as Error).message });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleClearFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    router.push('/reports/inventory-adjustment-summary'); 
  };

  const pageTitle = useMemo(() => {
    if (startDate && endDate) {
      if (format(startDate, 'yyyy-MM-dd') === format(endDate, 'yyyy-MM-dd')) {
         return `Inventory Adjustments for ${format(startDate, 'PPP')}`;
      }
      return `Inventory Adjustments from ${format(startDate, 'PPP')} to ${format(endDate, 'PPP')}`;
    }
    return "Inventory Adjustment Report (All Time)";
  }, [startDate, endDate]);

  if (isLoading) {
    return <InventoryAdjustmentSummaryContentLoading />;
  }

  if (isError) {
    return (
      <>
        <PageHeader title="Inventory Adjustment Report" description="Error loading adjustment data." />
        <Card className="shadow-md"><CardHeader><CardTitle className="flex items-center text-destructive"><AlertTriangle className="mr-2 h-6 w-6" />Failed to Load Report</CardTitle></CardHeader><CardContent><p>{error?.message || "An unknown error occurred."}</p></CardContent></Card>
      </>
    );
  }
  
  return (
    <TooltipProvider>
      <PageHeader title={pageTitle} description="Review inventory adjustments, track discrepancies, and analyze net quantity and cost changes.">
        <div className="flex flex-wrap items-center gap-2">
          <Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("w-[180px] justify-start text-left font-normal",!startDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{startDate ? format(startDate, "PPP") : <span>Start Date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus /></PopoverContent></Popover>
          <Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("w-[180px] justify-start text-left font-normal",!endDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{endDate ? format(endDate, "PPP") : <span>End Date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={endDate} onSelect={setEndDate} disabled={startDate ? { before: startDate } : undefined} initialFocus /></PopoverContent></Popover>
          {(startDate || endDate) && (<Button variant="ghost" size="icon" onClick={handleClearFilters} className="text-muted-foreground hover:text-destructive"><FilterX className="h-5 w-5" /><span className="sr-only">Clear Filters</span></Button>)}
          <Button onClick={handleGeneratePdf} variant="outline" disabled={isGeneratingPdf || transactions.length === 0 || isLoadingInvoiceSettings}>{isGeneratingPdf || isLoadingInvoiceSettings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}{isGeneratingPdf ? 'Generating...' : 'Download PDF'}</Button>
        </div>
      </PageHeader>

      <Card className="mb-6 shadow-lg">
        <CardHeader><CardTitle className="text-lg flex items-center"><BarChart3 className="mr-2 h-5 w-5 text-primary"/>Summary of Adjustments</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-900/30"><p className="text-sm font-medium text-green-700 dark:text-green-400">Total Positive Adjustments (Units)</p><p className="text-2xl font-bold text-green-600 dark:text-green-300">+{reportData.totalPositiveAdjustments} units</p></div>
          <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-900/30"><p className="text-sm font-medium text-red-700 dark:text-red-400">Total Negative Adjustments (Units)</p><p className="text-2xl font-bold text-red-600 dark:text-red-300">{reportData.totalNegativeAdjustments} units</p></div>
          <div className={`p-4 border rounded-lg ${reportData.netChange >= 0 ? 'bg-blue-50 dark:bg-blue-900/30' : 'bg-yellow-50 dark:bg-yellow-900/30'}`}><p className={`text-sm font-medium ${reportData.netChange >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-yellow-700 dark:text-yellow-400'}`}>Net Change in Quantity (Units)</p><p className={`text-2xl font-bold ${reportData.netChange >= 0 ? 'text-blue-600 dark:text-blue-300' : 'text-yellow-600 dark:text-yellow-300'}`}>{reportData.netChange > 0 ? '+' : ''}{reportData.netChange} units</p></div>
          
          <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-900/30"><p className="text-sm font-medium text-green-700 dark:text-green-400">Cost of Positive Adjustments</p><p className="text-2xl font-bold text-green-600 dark:text-green-300">{formatCurrency(reportData.totalPositiveAdjustmentCostValue)}</p></div>
          <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-900/30">
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-red-700 dark:text-red-400">Cost of Negative Adjustments</p>
                 <Tooltip>
                    <TooltipTrigger asChild><Info className="h-4 w-4 text-red-500 cursor-help"/></TooltipTrigger>
                    <TooltipContent><p>Represents the cost value of units removed/decreased.</p></TooltipContent>
                </Tooltip>
            </div>
            <p className="text-2xl font-bold text-red-600 dark:text-red-300">{formatCurrency(reportData.totalNegativeAdjustmentCostValue)}</p>
          </div>
          <div className={`p-4 border rounded-lg ${reportData.netCostImpactValue >= 0 ? 'bg-blue-50 dark:bg-blue-900/30' : 'bg-yellow-50 dark:bg-yellow-900/30'}`}>
            <div className="flex items-center justify-between">
                <p className={`text-sm font-medium ${reportData.netCostImpactValue >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-yellow-700 dark:text-yellow-400'}`}>Net Cost Impact</p>
                <Tooltip>
                    <TooltipTrigger asChild><Info className="h-4 w-4 text-gray-500 cursor-help"/></TooltipTrigger>
                    <TooltipContent><p>Positive value indicates net increase in inventory cost; negative indicates net decrease.</p></TooltipContent>
                </Tooltip>
            </div>
            <p className={`text-2xl font-bold ${reportData.netCostImpactValue >= 0 ? 'text-blue-600 dark:text-blue-300' : 'text-yellow-600 dark:text-yellow-300'}`}>{reportData.netCostImpactValue >= 0 ? '+' : ''}{formatCurrency(reportData.netCostImpactValue)}</p>
          </div>
        </CardContent>
      </Card>
      
      <Card className="shadow-xl">
        <CardHeader><CardTitle className="text-lg flex items-center"><PackageSearch className="mr-2 h-5 w-5 text-indigo-500"/>Detailed Adjustment Transactions</CardTitle><CardDescription>Showing {transactions.length} adjustment transaction(s) for the selected period.</CardDescription></CardHeader>
        <CardContent>
          {transactions.length > 0 ? (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Product Name</TableHead><TableHead>Product ID</TableHead><TableHead className="text-center">Qty Change</TableHead><TableHead className="text-right">Cost/Unit</TableHead><TableHead className="text-right">Cost Impact</TableHead><TableHead className="text-center">Stock Before</TableHead><TableHead className="text-center">Stock After</TableHead><TableHead>Notes</TableHead></TableRow></TableHeader>
                <TableBody>
                  {transactions.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="whitespace-nowrap">{format(new Date(t.transaction_date), 'PPp')}</TableCell>
                      <TableCell className="font-medium">{t.product_name}</TableCell>
                      <TableCell>{t.product_id}</TableCell>
                      <TableCell className={`text-center font-semibold ${t.quantity_change > 0 ? 'text-green-600' : 'text-red-600'}`}>{t.quantity_change > 0 ? `+${t.quantity_change}` : t.quantity_change}</TableCell>
                      <TableCell className="text-right">{t.cost_price !== undefined ? formatCurrency(t.cost_price) : <span className="text-muted-foreground text-xs">N/A</span>}</TableCell>
                      <TableCell className="text-right font-semibold">{t.cost_price !== undefined ? formatCurrency(t.quantity_change * t.cost_price) : <span className="text-muted-foreground text-xs">N/A</span>}</TableCell>
                      <TableCell className="text-center">{t.stock_before}</TableCell>
                      <TableCell className="text-center">{t.stock_after}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{t.notes || 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (<p className="text-center text-muted-foreground py-6">No adjustment transactions found for the selected period.</p>)}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

export default function InventoryAdjustmentSummaryPageWrapper() {
  return (
    <AppLayout>
      <Suspense fallback={<InventoryAdjustmentSummaryContentLoading />}>
        <InventoryAdjustmentSummaryContent />
      </Suspense>
    </AppLayout>
  );
}

