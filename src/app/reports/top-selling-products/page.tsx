"use client";

import AppLayout from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle, Printer, Trophy } from 'lucide-react';
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCurrency } from '@/contexts/CurrencyContext';
import type { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import type { InvoiceSettings } from '@/lib/mockData';

// Type for the data returned by our new API endpoint
interface TopSellingProduct {
  product_id: string;
  product_name: string;
  product_code: string;
  total_quantity_sold: number;
  total_revenue: number;
}

// API fetch function
const fetchTopSellingProductsAPI = async (): Promise<TopSellingProduct[]> => {
  const res = await fetch('/api/reports/top-selling-products');
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'Failed to fetch top selling products' }));
    throw new Error(errorData.message || 'Failed to fetch top selling products');
  }
  return res.json();
};

const fetchInvoiceSettingsAPI = async (): Promise<InvoiceSettings> => {
  const response = await fetch('/api/settings/invoice');
  if (!response.ok) throw new Error('Failed to fetch invoice settings');
  return response.json();
};

const generateTopProductsPdf = async (
  products: TopSellingProduct[],
  settings: InvoiceSettings | null,
  formatCurrencyFn: (value: number) => string
) => {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
  
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;
  const margin = 40;
  let yPos = margin;

  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text("Top 20 Selling Products Report", pageWidth / 2, yPos, { align: 'center' });
  yPos += 20;

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(`Report Generated: ${format(new Date(), 'PPP')}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 25;
  
  if (settings?.companyName) {
    doc.text(`Company: ${settings.companyName}`, margin, yPos);
    yPos += 15;
  }

  const tableHead = [['Rank', 'Product Name', 'Product Code', 'Total Qty Sold', 'Total Revenue']];
  const tableBody = products.map((p, index) => [
    (index + 1).toString(),
    p.product_name,
    p.product_code,
    p.total_quantity_sold.toString(),
    formatCurrencyFn(p.total_revenue),
  ]);

  autoTable(doc, {
    startY: yPos,
    head: tableHead,
    body: tableBody,
    theme: 'striped',
    headStyles: { fillColor: [75, 85, 99] }, // Gray-500
    columnStyles: {
      0: { halign: 'center', cellWidth: 40 }, // Rank
      1: { cellWidth: 'auto' }, // Name
      2: { cellWidth: 100 }, // Code
      3: { halign: 'right', cellWidth: 80 }, // Qty
      4: { halign: 'right', cellWidth: 100 }, // Revenue
    },
    margin: { left: margin, right: margin },
    tableWidth: pageWidth - (margin * 2),
  });

  doc.save(`Top_Selling_Products_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};

export default function TopSellingProductsPage() {
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const { data: topProducts = [], isLoading, error } = useQuery<TopSellingProduct[], Error>({
    queryKey: ['topSellingProducts'],
    queryFn: fetchTopSellingProductsAPI,
  });

  const { data: invoiceSettings, isLoading: isLoadingSettings } = useQuery<InvoiceSettings, Error>({
    queryKey: ['invoiceSettings'],
    queryFn: fetchInvoiceSettingsAPI,
  });

  const handleGeneratePdf = async () => {
    if (topProducts.length === 0) {
      toast({ title: "No Data", description: "There are no products to report." });
      return;
    }
    setIsGeneratingPdf(true);
    try {
      await generateTopProductsPdf(topProducts, invoiceSettings || null, formatCurrency);
      toast({ title: "Report Generated", description: "Top selling products PDF has been downloaded." });
    } catch (pdfError) {
      console.error("Error generating PDF:", pdfError);
      toast({ variant: "destructive", title: "PDF Generation Error", description: (pdfError as Error).message });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <PageHeader title="Top Selling Products Report" description="Loading data..." />
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <PageHeader title="Error" description="Failed to load the report." />
        <Card>
          <CardContent className="p-4 text-destructive"><AlertTriangle className="inline mr-2" />{error.message}</CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader title="Top Selling Products Report" description="A ranked list of your top 20 best-selling products by quantity.">
        <Button onClick={handleGeneratePdf} disabled={isGeneratingPdf || topProducts.length === 0 || isLoadingSettings}>
          {isGeneratingPdf || isLoadingSettings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
          Download PDF
        </Button>
      </PageHeader>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><Trophy className="mr-2 h-5 w-5 text-yellow-500" />Top 20 Products by Quantity Sold</CardTitle>
          <CardDescription>This report is based on all historical sales data.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px] text-center">Rank</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Product Code</TableHead>
                  <TableHead className="text-right">Total Quantity Sold</TableHead>
                  <TableHead className="text-right">Total Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topProducts.length > 0 ? (
                  topProducts.map((product, index) => (
                    <TableRow key={product.product_id}>
                      <TableCell className="text-center font-bold">{index + 1}</TableCell>
                      <TableCell className="font-medium">{product.product_name}</TableCell>
                      <TableCell>{product.product_code}</TableCell>
                      <TableCell className="text-right">{product.total_quantity_sold}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(product.total_revenue)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">No sales data available to generate the report.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
