
"use client";

import React, { useState, useMemo, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle, Printer, PlusCircle, Trash2, Search, Barcode as BarcodeIcon } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Product as ProductType } from '@/lib/mockData';
import ProductBarcode from '@/components/ProductBarcode'; // Reusable barcode component
import type { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns'; // Import format

// API fetch function for products
const fetchProductsAPI = async (): Promise<ProductType[]> => {
  const res = await fetch('/api/products');
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'Failed to fetch products' }));
    throw new Error(errorData.message || 'Failed to fetch products');
  }
  return res.json();
};

interface ProductToPrint extends ProductType {
  printQuantity: number;
}

export default function BarcodeProductsPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<Record<string, ProductToPrint>>({});
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const { data: allProducts = [], isLoading: isLoadingProducts, error: productsError } = useQuery<ProductType[], Error>({
    queryKey: ['allProductsForBarcodeTool'],
    queryFn: fetchProductsAPI,
  });

  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return allProducts.slice(0, 50); // Show some initial products or limit display
    const termLower = searchTerm.toLowerCase();
    return allProducts.filter(product =>
      product.name.toLowerCase().includes(termLower) ||
      product.code.toLowerCase().includes(termLower) ||
      product.reference.toLowerCase().includes(termLower) ||
      (product.barcode && product.barcode.toLowerCase().includes(termLower))
    ).slice(0, 50); // Limit search results display
  }, [searchTerm, allProducts]);

  const handleToggleProductSelection = (product: ProductType) => {
    setSelectedProducts(prev => {
      const newSelected = { ...prev };
      if (newSelected[product.id]) {
        delete newSelected[product.id];
      } else {
        newSelected[product.id] = { ...product, printQuantity: 1 };
      }
      return newSelected;
    });
  };

  const handleQuantityChange = (productId: string, quantity: string) => {
    const numQuantity = parseInt(quantity, 10);
    if (numQuantity >= 0) { // Allow 0 if user wants to temporarily exclude then re-add
      setSelectedProducts(prev => ({
        ...prev,
        [productId]: { ...prev[productId], printQuantity: numQuantity }
      }));
    } else if (quantity === "") {
        setSelectedProducts(prev => ({
        ...prev,
        [productId]: { ...prev[productId], printQuantity: 0 } // Treat empty as 0
      }));
    }
  };

  const productsInPrintList = useMemo(() => {
    return Object.values(selectedProducts).filter(p => p.printQuantity > 0);
  }, [selectedProducts]);

  const handleGenerateBulkBarcodePdf = async () => {
    if (productsInPrintList.length === 0) {
      toast({ variant: "destructive", title: "No Products Selected", description: "Please select products and set quantities greater than 0 to print." });
      return;
    }
    setIsGeneratingPdf(true);

    const { jsPDF } = await import('jspdf');
    const JsBarcode = (await import('jsbarcode')).default;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    const margin = 10; // mm
    const labelWidth = 36; // mm, adjusted for 5 columns
    const labelHeight = 25; // mm (barcode + text)
    const xSpacing = 3; // mm horizontal space between labels
    const ySpacing = 5; // mm vertical space between labels

    const barcodeHeightMM = 15; // mm for the barcode itself
    const textLineHeightMM = 3; // approx mm for a line of text
    const textYOffsetFromBarcodeMM = 2; // mm space between barcode and first line of text

    const labelsPerRow = 5; 
    const labelsPerCol = Math.floor((pageHeight - 2 * margin + ySpacing) / (labelHeight + ySpacing));

    let currentX = margin;
    let currentY = margin;
    let labelsOnPageCount = 0; // Count labels on the current page

    for (const product of productsInPrintList) {
      for (let i = 0; i < product.printQuantity; i++) {
        if (labelsOnPageCount >= labelsPerRow * labelsPerCol) {
          doc.addPage();
          currentX = margin;
          currentY = margin;
          labelsOnPageCount = 0;
        } else if (labelsOnPageCount > 0 && labelsOnPageCount % labelsPerRow === 0) {
          // New row on the same page
          currentX = margin;
          currentY += labelHeight + ySpacing;
        }
        
        const canvas = document.createElement('canvas');
        try {
          JsBarcode(canvas, product.code, { // Using product.code
            format: "CODE128", width: 1.5, height: barcodeHeightMM * (72/25.4), displayValue: false, margin: 0,
          });
          const barcodeDataUrl = canvas.toDataURL('image/png');
          // Calculate actual barcode width in mm to center it, ensure it fits
          const actualBarcodeWidthInMM = canvas.width / (72 / 25.4); // Convert points to mm
          const finalPdfImageWidth = Math.min(actualBarcodeWidthInMM, labelWidth - 4); // Ensure it fits, with small padding
          const imageX = currentX + (labelWidth - finalPdfImageWidth) / 2; // Center barcode image

          doc.addImage(barcodeDataUrl, 'PNG', imageX, currentY, finalPdfImageWidth, barcodeHeightMM);
        } catch (e) {
          console.error(`Error generating barcode for ${product.code}:`, e);
          doc.text("Error", currentX + labelWidth / 2, currentY + barcodeHeightMM / 2, { align: 'center' });
        }

        // Product Name (single line, truncated)
        let productNameText = product.name;
        const maxNameWidth = labelWidth - 4; // mm, allowing small horizontal padding
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        if (doc.getTextWidth(productNameText) > maxNameWidth) {
          let truncatedName = productNameText;
          while (doc.getTextWidth(truncatedName + "...") > maxNameWidth && truncatedName.length > 0) {
            truncatedName = truncatedName.slice(0, -1);
          }
          productNameText = truncatedName.length > 0 ? truncatedName + "..." : "..."; // Handle very short names
        }
        doc.text(productNameText, currentX + labelWidth / 2, currentY + barcodeHeightMM + textYOffsetFromBarcodeMM + textLineHeightMM, { align: 'center' });

        // Product Code (Bold)
        doc.setFontSize(7);
        doc.setFont(undefined, 'bold');
        doc.text(product.code, currentX + labelWidth / 2, currentY + barcodeHeightMM + textYOffsetFromBarcodeMM + (textLineHeightMM * 2), { align: 'center', maxWidth: labelWidth - 2 });
        doc.setFont(undefined, 'normal'); // Reset font to normal

        currentX += labelWidth + xSpacing;
        labelsOnPageCount++;
      }
    }
    
    doc.save(`Bulk_Barcodes_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    setIsGeneratingPdf(false);
    toast({ title: "PDF Generated", description: "Bulk barcode PDF has been downloaded." });
  };


  return (
    <AppLayout>
      <PageHeader title="Barcode Products Tool" description="Select products and specify quantities to generate a printable barcode PDF." />

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center"><Search className="mr-2 h-5 w-5"/>Select Products</CardTitle>
            <Input
              placeholder="Search products by name, code, ref..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mt-2"
            />
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px] border-t">
              {isLoadingProducts && <div className="p-4 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-primary"/></div>}
              {productsError && <div className="p-4 text-destructive text-center">Error loading products.</div>}
              {!isLoadingProducts && !productsError && filteredProducts.length === 0 && (
                <p className="p-4 text-center text-muted-foreground">
                  {searchTerm ? "No products match your search." : "No products available or start typing to search."}
                </p>
              )}
              {!isLoadingProducts && !productsError && filteredProducts.map(product => (
                <div key={product.id} className="flex items-center justify-between p-3 border-b last:border-b-0 hover:bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`select-${product.id}`}
                      checked={!!selectedProducts[product.id]}
                      onCheckedChange={() => handleToggleProductSelection(product)}
                      aria-label={`Select ${product.name}`}
                    />
                    <label htmlFor={`select-${product.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      {product.name} <span className="text-xs text-muted-foreground">({product.code})</span>
                    </label>
                  </div>
                </div>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center"><BarcodeIcon className="mr-2 h-5 w-5"/>Print List</CardTitle>
            <CardDescription>Adjust quantities for selected products. Barcodes will be generated using the Product Code.</CardDescription>
          </CardHeader>
          <CardContent>
            {productsInPrintList.length === 0 ? (
              <p className="text-center text-muted-foreground py-10">No products selected or quantities are zero. Select products from the left to add them to the print list.</p>
            ) : (
              <ScrollArea className="max-h-[450px] rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead className="w-[120px] text-center">Print Quantity</TableHead>
                      <TableHead className="w-[80px] text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productsInPrintList.map(product => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{product.code}</TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            value={selectedProducts[product.id]?.printQuantity ?? 0}
                            onChange={(e) => handleQuantityChange(product.id, e.target.value)}
                            min="0"
                            className="h-8 w-20 text-center"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive h-8 w-8" onClick={() => handleToggleProductSelection(product)}>
                            <Trash2 className="h-4 w-4"/>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleGenerateBulkBarcodePdf} 
              disabled={isGeneratingPdf || productsInPrintList.length === 0}
              className="w-full sm:w-auto"
            >
              {isGeneratingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
              Generate PDF for Selected ({productsInPrintList.reduce((sum, p) => sum + p.printQuantity, 0)} total barcodes)
            </Button>
          </CardFooter>
        </Card>
      </div>
    </AppLayout>
  );
}

