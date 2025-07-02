// src/app/reports/profit-loss/page.tsx
"use client";

import AppLayout from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import type { InvoiceSettings } from '@/lib/mockData';
import type { ProfitLossData } from '@/app/api/reports/profit-loss/route';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Printer, Loader2, AlertTriangle, TrendingUp, TrendingDown, DollarSign, PieChart, FilterX, Calendar as CalendarIcon, BarChart3, ArrowLeft, Info } from 'lucide-react';
import React, { useState, useMemo, Suspense } from 'react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


// API fetch function for P&L data
const fetchProfitLossData = async (startDate: Date, endDate: Date): Promise<ProfitLossData> => {
  const params = new URLSearchParams({
    startDate: format(startDate, 'yyyy-MM-dd'),
    endDate: format(endDate, 'yyyy-MM-dd'),
  });
  const res = await fetch(`/api/reports/profit-loss?${params.toString()}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'Network response was not ok' }));
    throw new Error(errorData.message || 'Failed to fetch P&L data');
  }
  return res.json();
};

// API fetch function for invoice settings (for PDF header)
const fetchInvoiceSettingsAPI = async (): Promise<InvoiceSettings> => {
  const response = await fetch('/api/settings/invoice');
  if (!response.ok) throw new Error('Failed to fetch invoice settings');
  return response.json();
};

const generatePdfReport = async (reportData: ProfitLossData, settings: InvoiceSettings | null, formatCurrencyFn: (value: number) => string) => {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });

  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;
  const margin = 40;
  let yPos = margin;

  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text("Profit & Loss Statement", pageWidth / 2, yPos, { align: 'center' });
  yPos += 20;
  doc.setFontSize(12);
  doc.setFont(undefined, 'normal');
  const dateRangeText = `For the period: ${format(new Date(reportData.startDate!), 'PPP')} - ${format(new Date(reportData.endDate!), 'PPP')}`;
  doc.text(dateRangeText, pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;
  if (settings?.companyName) {
    doc.setFontSize(10);
    doc.text(`Company: ${settings.companyName}`, margin, yPos);
    yPos += 15;
  }
  yPos += 10;

  // Main P&L Summary
  const inventoryChange = reportData.totalPurchases - reportData.totalCogs;
  const pnlBody = [
    ['Total Revenue', formatCurrencyFn(reportData.totalRevenue)],
    ['Cost of Goods Sold (COGS)', `(${formatCurrencyFn(reportData.totalCogs)})`],
    ['Gross Profit', formatCurrencyFn(reportData.grossProfit)],
    ['', ''], // Spacer
    ['Total Purchases (for period)', formatCurrencyFn(reportData.totalPurchases)],
    ['Change in Inventory Value (est.)', formatCurrencyFn(inventoryChange)],
    ['', ''], // Spacer
    ['Total Operating Expenses', `(${formatCurrencyFn(reportData.totalExpenses)})`],
    ['Net Profit / (Loss)', formatCurrencyFn(reportData.netProfit)],
  ];
  autoTable(doc, {
    startY: yPos,
    body: pnlBody,
    theme: 'plain',
    styles: { fontSize: 11, cellPadding: { top: 5, bottom: 5 } },
    columnStyles: { 1: { halign: 'right' } },
    didDrawCell: (data) => {
        if (data.row.index === 2 || data.row.index === 8) { // Gross Profit & Net Profit rows
          doc.setFont(undefined, 'bold');
          doc.setLineWidth(1.5);
          doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
          if(data.row.index === 8) {
             doc.line(data.cell.x, data.cell.y + data.cell.height + 2, data.cell.x + data.cell.width, data.cell.y + data.cell.height + 2);
          }
        }
    },
  });
  yPos = (doc as any).lastAutoTable.finalY + 25;
  
  // Expenses Breakdown
  if (reportData.expensesByCategory.length > 0) {
    if (yPos + 60 > pageHeight - margin) { doc.addPage(); yPos = margin; }
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text("Operating Expenses Breakdown", margin, yPos);
    yPos += 15;
    autoTable(doc, {
      startY: yPos,
      head: [['Expense Category', 'Amount']],
      body: reportData.expensesByCategory.map(e => [e.category, formatCurrencyFn(e.total)]),
      theme: 'striped',
      headStyles: { fillColor: [75, 85, 99] },
      columnStyles: { 1: { halign: 'right' } },
    });
    yPos = (doc as any).lastAutoTable.finalY + 15;
  }

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - margin + 10, { align: 'right' });
  }

  doc.save(`Profit_Loss_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};


function ProfitLossContent() {
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();
  const today = new Date();
  const [startDate, setStartDate] = useState<Date>(startOfMonth(today));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(today));
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const queryKey = useMemo(() => ['profitLossData', format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')], [startDate, endDate]);

  const { data: reportData, isLoading, error, isError } = useQuery<ProfitLossData, Error>({
    queryKey,
    queryFn: () => fetchProfitLossData(startDate, endDate),
  });

  const { data: invoiceSettings, isLoading: isLoadingSettings } = useQuery<InvoiceSettings, Error>({
    queryKey: ['invoiceSettings'],
    queryFn: fetchInvoiceSettingsAPI,
  });

  const handleSetDateRange = (start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
  };
  
  const handleGeneratePdf = async () => {
    if (!reportData) {
      toast({ title: "No Data", description: "Cannot generate report, no data available." });
      return;
    }
    setIsGeneratingPdf(true);
    try {
      await generatePdfReport(reportData, invoiceSettings || null, formatCurrency);
      toast({ title: "Report Generated", description: "P&L Report PDF has been downloaded." });
    } catch (pdfError) {
      toast({ variant: "destructive", title: "PDF Generation Error", description: (pdfError as Error).message });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const netProfitClass = reportData && reportData.netProfit >= 0 ? 'text-green-600' : 'text-red-600';
  const grossProfitClass = reportData && reportData.grossProfit >= 0 ? 'text-green-600' : 'text-red-600';
  
  const inventoryChange = useMemo(() => {
    if (!reportData) return 0;
    return reportData.totalPurchases - reportData.totalCogs;
  }, [reportData]);
  const inventoryChangeClass = inventoryChange >= 0 ? 'text-blue-600' : 'text-orange-600';

  if (isLoading) {
    return (
        <div className="space-y-6">
            <PageHeader title="Profit & Loss Statement" description="Calculating financial performance..." />
            <Skeleton className="h-10 w-full max-w-sm" />
            <Card className="shadow-lg">
                <CardHeader><Skeleton className="h-8 w-3/4" /><Skeleton className="h-4 w-1/2 mt-2" /></CardHeader>
                <CardContent className="space-y-4">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </CardContent>
            </Card>
        </div>
    );
  }

  if (isError) {
    return (
       <Card>
          <CardHeader><CardTitle className="text-destructive flex items-center"><AlertTriangle className="mr-2"/>Error Loading Report</CardTitle></CardHeader>
          <CardContent><p>{error?.message}</p></CardContent>
       </Card>
    )
  }

  return (
    <TooltipProvider>
      <PageHeader title="Profit & Loss Statement" description={`Financial performance from ${format(startDate, 'PPP')} to ${format(endDate, 'PPP')}`}>
        <div className="flex flex-wrap items-center gap-2">
            <Popover><PopoverTrigger asChild><Button variant={"outline"}><CalendarIcon className="mr-2 h-4 w-4" /> Date Range</Button></PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                    <Calendar mode="range" selected={{ from: startDate, to: endDate }} onSelect={(range) => { if(range?.from && range?.to) { setStartDate(range.from); setEndDate(range.to); }}} />
                </PopoverContent>
            </Popover>
            <Button onClick={() => handleSetDateRange(startOfMonth(today), endOfMonth(today))}>This Month</Button>
            <Button onClick={() => handleSetDateRange(startOfMonth(subMonths(today, 1)), endOfMonth(subMonths(today, 1)))} variant="outline">Last Month</Button>
            <Button onClick={handleGeneratePdf} disabled={isGeneratingPdf || isLoadingSettings}>{isGeneratingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Printer className="mr-2 h-4 w-4" />}Download PDF</Button>
        </div>
      </PageHeader>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-lg">
            <CardHeader><CardTitle className="flex items-center"><BarChart3 className="mr-2 h-5 w-5 text-primary"/>P&L Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-lg">
              <div className="flex justify-between items-center"><span className="text-muted-foreground">Total Revenue</span><span className="font-bold">{formatCurrency(reportData.totalRevenue)}</span></div>
              <div className="flex justify-between items-center"><span className="text-muted-foreground">Cost of Goods Sold (COGS)</span><span className="font-semibold text-orange-600">({formatCurrency(reportData.totalCogs)})</span></div>
              <div className="flex justify-between items-center border-t pt-3 mt-2"><span className="font-semibold">Gross Profit</span><span className={`font-bold ${grossProfitClass}`}>{formatCurrency(reportData.grossProfit)}</span></div>
              
              <div className="flex justify-between items-center border-t pt-3 mt-2">
                <span className="text-muted-foreground flex items-center">
                  Total Purchases
                  <Tooltip><TooltipTrigger asChild><Info className="ml-2 h-4 w-4 text-muted-foreground cursor-help"/></TooltipTrigger><TooltipContent><p>Total value of inventory purchased in this period.</p></TooltipContent></Tooltip>
                </span>
                <span className="font-semibold">{formatCurrency(reportData.totalPurchases)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center">
                  Change in Inventory (est.)
                  <Tooltip><TooltipTrigger asChild><Info className="ml-2 h-4 w-4 text-muted-foreground cursor-help"/></TooltipTrigger><TooltipContent><p>Purchases - COGS. A positive value indicates inventory has likely increased.</p></TooltipContent></Tooltip>
                </span>
                <span className={`font-semibold ${inventoryChangeClass}`}>
                  {inventoryChange >= 0 ? '+' : ''}{formatCurrency(inventoryChange)}
                </span>
              </div>

              <div className="flex justify-between items-center border-t pt-3 mt-2"><span className="text-muted-foreground">Total Operating Expenses</span><span className="font-semibold text-red-600">({formatCurrency(reportData.totalExpenses)})</span></div>
              <div className="flex justify-between items-center border-t-2 border-b-2 py-3 my-2"><span className="font-bold text-xl">Net Profit</span><span className={`font-extrabold text-xl ${netProfitClass}`}>{formatCurrency(reportData.netProfit)}</span></div>
            </CardContent>
          </Card>
        </div>
        
        <div className="lg:col-span-1">
          <Card className="shadow-lg">
            <CardHeader><CardTitle className="flex items-center"><PieChart className="mr-2 h-5 w-5 text-indigo-500"/>Expenses Breakdown</CardTitle></CardHeader>
            <CardContent>
              {reportData.expensesByCategory.length > 0 ? (
                <div className="rounded-md border max-h-96 overflow-y-auto">
                    <Table>
                        <TableHeader><TableRow><TableHead>Category</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {reportData.expensesByCategory.map(e => (<TableRow key={e.category}><TableCell>{e.category}</TableCell><TableCell className="text-right">{formatCurrency(e.total)}</TableCell></TableRow>))}
                        </TableBody>
                    </Table>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">No expenses recorded for this period.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  )
}

export default function ProfitLossPageWrapper() {
    return (
      <AppLayout>
          <Suspense fallback={<PageHeader title="Profit & Loss Statement" description="Calculating financial performance..." />}>
            <ProfitLossContent />
          </Suspense>
      </AppLayout>
    );
}
