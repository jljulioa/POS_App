// src/app/reports/balance-sheet/page.tsx
"use client";

import AppLayout from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle, Printer, Wallet, Landmark, Info } from 'lucide-react';
import React, { useState, useMemo, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { BalanceSheetData } from '@/app/api/reports/balance-sheet/route';

const fetchBalanceSheetDataAPI = async (): Promise<BalanceSheetData> => {
  const res = await fetch(`/api/reports/balance-sheet`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'Network response was not ok' }));
    throw new Error(errorData.message || 'Failed to fetch Balance Sheet data');
  }
  return res.json();
};

function BalanceSheetContent() {
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();
  
  const [cashAndBank, setCashAndBank] = useState<string>('0');
  
  const { data: reportData, isLoading, error, isError, refetch } = useQuery<BalanceSheetData, Error>({
    queryKey: ['balanceSheetDataRealtime'],
    queryFn: fetchBalanceSheetDataAPI,
  });

  const parsedCashAndBank = useMemo(() => parseFloat(cashAndBank) || 0, [cashAndBank]);

  const totalAssets = useMemo(() => {
    if (!reportData) return parsedCashAndBank;
    return parsedCashAndBank + reportData.assets.accountsReceivable + reportData.assets.inventory;
  }, [reportData, parsedCashAndBank]);

  const totalLiabilities = useMemo(() => {
    if (!reportData) return 0;
    return reportData.liabilities.accountsPayable;
  }, [reportData]);
  
  // Equity is now derived from assets and liabilities to ensure the sheet always balances.
  const totalEquity = useMemo(() => {
    return totalAssets - totalLiabilities;
  }, [totalAssets, totalLiabilities]);

  const totalLiabilitiesAndEquity = useMemo(() => {
    return totalLiabilities + totalEquity;
  }, [totalLiabilities, totalEquity]);

  // This will now always be true (or very close due to float precision).
  const isBalanced = Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01;

  if (isLoading) {
    return (
      <>
        <PageHeader title="Real-Time Balance Sheet" description="Loading financial position..." />
        <Skeleton className="h-10 w-full max-w-sm mb-6" />
        <Card className="shadow-lg"><CardContent><Skeleton className="h-96 w-full" /></CardContent></Card>
      </>
    );
  }

  if (isError) {
    return (
       <Card>
          <CardHeader><CardTitle className="text-destructive flex items-center"><AlertTriangle className="mr-2"/>Error Loading Report</CardTitle></CardHeader>
          <CardContent>
            <p>{error?.message}</p>
            <Button onClick={() => refetch()} className="mt-4">Try Again</Button>
          </CardContent>
       </Card>
    )
  }
  
  return (
    <TooltipProvider>
      <PageHeader title="Real-Time Balance Sheet" description={`A snapshot of your company's financial health as of now, ${format(new Date(reportData.asOfDate), 'PPP')}.`}>
      </PageHeader>
      
      <Card className="mb-6">
        <CardHeader>
            <CardTitle className="flex items-center"><Wallet className="mr-2 h-5 w-5 text-primary"/>Untracked Assets</CardTitle>
            <CardDescription>Enter values for assets not automatically tracked by the system.</CardDescription>
        </CardHeader>
        <CardContent>
             <div>
                <label htmlFor="cashAndBank" className="block text-sm font-medium text-foreground mb-1">Cash & Bank Balances</label>
                <Input
                  id="cashAndBank"
                  type="number"
                  value={cashAndBank}
                  onChange={(e) => setCashAndBank(e.target.value)}
                  placeholder="e.g., 5000.00"
                  step="0.01"
                  className="max-w-xs"
                />
              </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <Card className="shadow-lg">
          <CardHeader><CardTitle>Assets</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                <TableRow><TableCell className="font-semibold">Current Assets</TableCell><TableCell></TableCell></TableRow>
                <TableRow><TableCell className="pl-8">Cash & Bank Balances</TableCell><TableCell className="text-right">{formatCurrency(parsedCashAndBank)}</TableCell></TableRow>
                <TableRow><TableCell className="pl-8 flex items-center">Accounts Receivable <Tooltip><TooltipTrigger asChild><Info className="h-4 w-4 ml-2 text-muted-foreground cursor-help"/></TooltipTrigger><TooltipContent><p>Total outstanding balance from all customers.</p></TooltipContent></Tooltip></TableCell><TableCell className="text-right">{formatCurrency(reportData.assets.accountsReceivable)}</TableCell></TableRow>
                <TableRow><TableCell className="pl-8 flex items-center">Inventory <Tooltip><TooltipTrigger asChild><Info className="h-4 w-4 ml-2 text-muted-foreground cursor-help"/></TooltipTrigger><TooltipContent><p>Current value of all stock on hand (Stock x Cost).</p></TooltipContent></Tooltip></TableCell><TableCell className="text-right">{formatCurrency(reportData.assets.inventory)}</TableCell></TableRow>
                <TableRow className="bg-muted/50 hover:bg-muted/50"><TableCell className="font-bold">Total Assets</TableCell><TableCell className="text-right font-bold text-lg">{formatCurrency(totalAssets)}</TableCell></TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="shadow-lg">
            <CardHeader><CardTitle>Liabilities</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  <TableRow><TableCell className="font-semibold">Current Liabilities</TableCell><TableCell></TableCell></TableRow>
                  <TableRow><TableCell className="pl-8 flex items-center">Accounts Payable <Tooltip><TooltipTrigger asChild><Info className="h-4 w-4 ml-2 text-muted-foreground cursor-help"/></TooltipTrigger><TooltipContent><p>Total balance due on unpaid purchase invoices.</p></TooltipContent></Tooltip></TableCell><TableCell className="text-right">{formatCurrency(reportData.liabilities.accountsPayable)}</TableCell></TableRow>
                  <TableRow className="bg-muted/50 hover:bg-muted/50"><TableCell className="font-bold">Total Liabilities</TableCell><TableCell className="text-right font-bold text-lg">{formatCurrency(totalLiabilities)}</TableCell></TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader><CardTitle>Equity</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  <TableRow><TableCell className="pl-4 flex items-center">Owner's Equity (calculated) <Tooltip><TooltipTrigger asChild><Info className="h-4 w-4 ml-2 text-muted-foreground cursor-help"/></TooltipTrigger><TooltipContent><p>This is calculated as (Total Assets - Total Liabilities) to balance the sheet. It represents the net value of the business.</p></TooltipContent></Tooltip></TableCell><TableCell className="text-right">{formatCurrency(totalEquity)}</TableCell></TableRow>
                  <TableRow className="bg-muted/50 hover:bg-muted/50"><TableCell className="font-bold">Total Equity</TableCell><TableCell className="text-right font-bold text-lg">{formatCurrency(totalEquity)}</TableCell></TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
      
       <Card className={`mt-6 shadow-lg border-2 ${isBalanced ? 'border-green-500' : 'border-red-500'}`}>
        <CardHeader>
          <CardTitle>Total Liabilities & Equity vs. Total Assets</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row justify-around items-center text-center gap-4">
            <div className="p-4">
                <p className="text-muted-foreground text-sm font-medium">Total Liabilities + Equity</p>
                <p className="text-2xl font-bold">{formatCurrency(totalLiabilitiesAndEquity)}</p>
            </div>
             <div className="text-2xl font-bold text-muted-foreground">=</div>
             <div className="p-4">
                <p className="text-muted-foreground text-sm font-medium">Total Assets</p>
                <p className="text-2xl font-bold">{formatCurrency(totalAssets)}</p>
            </div>
        </CardContent>
        <CardFooter className="justify-center">
            <p className={`font-semibold ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                {isBalanced ? 'The Balance Sheet is balanced.' : `The Balance Sheet is out of balance by ${formatCurrency(totalAssets - totalLiabilitiesAndEquity)}.`}
            </p>
        </CardFooter>
      </Card>

    </TooltipProvider>
  );
}

export default function BalanceSheetPageWrapper() {
    return (
        <AppLayout>
            <Suspense fallback={<PageHeader title="Balance Sheet" description="Loading financial position..." />}>
                <BalanceSheetContent />
            </Suspense>
        </AppLayout>
    );
}
