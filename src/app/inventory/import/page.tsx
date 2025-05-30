
"use client";

import React, { useState, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Upload, Loader2, CheckCircle, AlertTriangle, FileText } from 'lucide-react';
import Link from 'next/link';
import Papa from 'papaparse';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Product } from '@/lib/mockData';

// Define the expected shape for an imported product item after parsing
// This should align with what the backend expects (excluding 'id' and 'category' string if using categoryId)
type ImportedProduct = Omit<Product, 'id' | 'category' | 'createdAt' | 'updatedAt'> & {
  // categoryId will be expected as a number if present in CSV, otherwise it's optional in the schema.
  // If categoryId is not provided or invalid, the backend should handle it (e.g. set to null or a default)
};

interface ImportResult {
  success: boolean;
  message: string;
  createdCount: number;
  updatedCount: number;
  errorCount: number;
  errors?: Array<{ row: number; productCode?: string; error: string }>;
}

// API mutation function to import products
const importProductsAPI = async (products: ImportedProduct[]): Promise<ImportResult> => {
  const response = await fetch('/api/products/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(products),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to import products' }));
    throw new Error(errorData.message || 'Failed to import products');
  }
  return response.json();
};


export default function ImportInventoryPage() {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ImportedProduct[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const importMutation = useMutation<ImportResult, Error, ImportedProduct[]>({
    mutationFn: importProductsAPI,
    onSuccess: (data) => {
      setImportResult(data);
      if (data.success) {
        toast({
          title: "Import Successful",
          description: data.message,
        });
        queryClient.invalidateQueries({ queryKey: ['products'] });
      } else {
        toast({
          variant: "destructive",
          title: "Import Partially Failed or Failed",
          description: data.message,
        });
      }
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Import Failed",
        description: error.message,
      });
      setImportResult({
        success: false,
        message: error.message,
        createdCount: 0,
        updatedCount: 0,
        errorCount: parsedData.length, // Assume all failed if API error
      });
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFile(null);
    setParsedData([]);
    setFileName('');
    setImportResult(null);
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0];
      if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
        setFileName(selectedFile.name);
      } else {
        toast({
          variant: 'destructive',
          title: 'Invalid File Type',
          description: 'Please upload a CSV file.',
        });
      }
    }
  };

  const processFile = useCallback(() => {
    if (!file) {
      toast({ variant: 'destructive', title: 'No File Selected', description: 'Please select a CSV file to process.' });
      return;
    }
    setImportResult(null); // Reset previous results

    Papa.parse<any>(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false, // Keep everything as string initially, convert specifically later
      complete: (results) => {
        const productsToImport: ImportedProduct[] = [];
        const processingErrors: Array<{ row: number; error: string; rawData: any }> = [];

        results.data.forEach((row, index) => {
          // Basic validation and mapping
          const code = row.code?.trim();
          if (!code) {
            processingErrors.push({ row: index + 1, error: "Product 'code' is missing or empty.", rawData: row });
            return;
          }
          const name = row.name?.trim();
          if (!name) {
            processingErrors.push({ row: index + 1, error: "Product 'name' is missing or empty.", rawData: row });
            return;
          }
          
          // Coerce numbers, provide defaults for optional fields if not present or invalid
          const stock = parseInt(row.stock, 10);
          const minStock = parseInt(row.minStock, 10);
          const maxStock = row.maxStock ? parseInt(row.maxStock, 10) : undefined;
          const cost = parseFloat(row.cost);
          const price = parseFloat(row.price);
          const categoryId = row.categoryId ? parseInt(row.categoryId, 10) : undefined;

          if (isNaN(stock)) { processingErrors.push({row: index + 1, error: `Invalid 'stock' value for code ${code}. Must be a number.`, rawData: row }); return; }
          if (isNaN(minStock)) { processingErrors.push({row: index + 1, error: `Invalid 'minStock' value for code ${code}. Must be a number.`, rawData: row }); return; }
          if (maxStock !== undefined && isNaN(maxStock)) { processingErrors.push({row: index + 1, error: `Invalid 'maxStock' value for code ${code}. Must be a number.`, rawData: row }); return; }
          if (isNaN(cost)) { processingErrors.push({row: index + 1, error: `Invalid 'cost' value for code ${code}. Must be a number.`, rawData: row }); return; }
          if (isNaN(price)) { processingErrors.push({row: index + 1, error: `Invalid 'price' value for code ${code}. Must be a number.`, rawData: row }); return; }
          if (categoryId !== undefined && isNaN(categoryId)) { processingErrors.push({row: index + 1, error: `Invalid 'categoryId' for code ${code}. Must be a number.`, rawData: row }); return; }


          productsToImport.push({
            name,
            code,
            reference: row.reference?.trim() || code, // Default reference to code if empty
            barcode: row.barcode?.trim() || null,
            stock: stock,
            categoryId: categoryId, // Will be undefined if not present or invalid
            brand: row.brand?.trim() || 'N/A',
            minStock: minStock,
            maxStock: maxStock || 0, // Default maxStock if undefined
            cost: cost,
            price: price,
            imageUrl: row.imageUrl?.trim() || null,
            dataAiHint: row.dataAiHint?.trim() || null,
          });
        });

        if (processingErrors.length > 0) {
            setImportResult({
                success: false,
                message: "Some rows had errors during client-side parsing and were not processed.",
                createdCount: 0, updatedCount: 0, errorCount: processingErrors.length,
                errors: processingErrors.map(e => ({row: e.row, error: e.error}))
            });
            toast({variant: 'destructive', title: 'Parsing Errors', description: `Found ${processingErrors.length} errors in the CSV file. Please correct them and try again.`})
            return;
        }

        setParsedData(productsToImport);
        if (productsToImport.length > 0) {
          importMutation.mutate(productsToImport);
        } else {
          toast({title: 'No Data', description: 'No valid product data found in the file to import.'});
        }
      },
      error: (error: any) => {
        toast({ variant: 'destructive', title: 'CSV Parsing Error', description: error.message });
      },
    });
  }, [file, toast, importMutation]);

  return (
    <AppLayout>
      <PageHeader title="Import Products from CSV" description="Upload a CSV file to add or update products in bulk.">
        <Button variant="outline" asChild>
          <Link href="/inventory">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Inventory
          </Link>
        </Button>
      </PageHeader>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center"><Upload className="mr-2 h-5 w-5 text-primary"/>Upload CSV File</CardTitle>
            <CardDescription>
              Ensure your CSV file has a header row. Expected columns:
              <code className="block bg-muted p-2 rounded-md text-xs my-2 overflow-x-auto">
                name, code, reference, barcode, stock, categoryId, brand, minStock, maxStock, cost, price, imageUrl, dataAiHint
              </code>
              <span className="font-semibold">'name', 'code', 'stock', 'minStock', 'cost', 'price', 'categoryId'</span> are typically required.
              'categoryId' must be the numeric ID of an existing category. Other fields are optional or will use defaults.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
            />
            {fileName && <p className="text-sm text-muted-foreground">Selected file: {fileName}</p>}
          </CardContent>
          <CardFooter>
            <Button onClick={processFile} disabled={!file || importMutation.isPending} className="w-full">
              {importMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileText className="mr-2 h-4 w-4" />
              )}
              Process and Import File
            </Button>
          </CardFooter>
        </Card>

        {importResult && (
          <Card className="shadow-lg md:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center">
                {importResult.success && !importResult.errorCount ? <CheckCircle className="mr-2 h-5 w-5 text-green-500"/> : <AlertTriangle className="mr-2 h-5 w-5 text-destructive"/>}
                Import Result
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>{importResult.message}</p>
              <p>Products Processed: {importResult.createdCount + importResult.updatedCount + (importResult.errorCount || 0)}</p>
              <p className="text-green-600">New Products Created: {importResult.createdCount}</p>
              <p className="text-blue-600">Existing Products Updated: {importResult.updatedCount}</p>
              <p className="text-destructive">Rows with Errors: {importResult.errorCount}</p>
              {importResult.errors && importResult.errors.length > 0 && (
                <div className="mt-2 max-h-60 overflow-y-auto border p-2 rounded-md">
                  <h4 className="font-semibold mb-1">Error Details:</h4>
                  <ul className="list-disc list-inside text-xs">
                    {importResult.errors.map((err, idx) => (
                      <li key={idx}>Row {err.row}: {err.productCode ? `(Code: ${err.productCode}) ` : ''}{err.error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

