
"use client";

import React, { Suspense, useState, useMemo, useEffect, useRef } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import type { Product } from '@/lib/mockData';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { PlusCircle, FileDown, Edit3, Trash2, Loader2, AlertTriangle, Upload, DollarSign, ChevronLeft, ChevronRight, Barcode as BarcodeIcon, Printer, Settings2 } from 'lucide-react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useQuery, useQueryClient, useMutation, type UseMutationResult } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import type { ProductCategory } from '@/app/api/categories/route';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Skeleton } from '@/components/ui/skeleton';
import ProductBarcode from '@/components/ProductBarcode';
import type { jsPDF } from 'jspdf'; // For type annotation

// API fetch function
const fetchProducts = async (): Promise<Product[]> => {
  const res = await fetch('/api/products');
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'Network response was not ok and failed to parse error JSON.' }));
    throw new Error(errorData.message || 'Network response was not ok');
  }
  return res.json();
};

// API delete function
const deleteProductAPI = async (productId: string): Promise<{ message: string }> => {
  const res = await fetch(`/api/products/${productId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'Failed to delete product and could not parse error.' }));
    throw new Error(errorData.message || 'Failed to delete product.');
  }
  return res.json();
};

// API fetch function for categories (for filter dropdown)
const fetchCategories = async (): Promise<ProductCategory[]> => {
  const res = await fetch('/api/categories');
  if (!res.ok) {
    throw new Error('Failed to fetch categories for filter');
  }
  return res.json();
};

interface ProductRowActionsProps {
  product: Product;
  deleteMutation: UseMutationResult<{ message: string }, Error, string, unknown>;
  onBarcodeClick: (product: Product) => void;
}

function ProductRowActions({ product, deleteMutation, onBarcodeClick }: ProductRowActionsProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleDeleteConfirm = () => {
    deleteMutation.mutate(product.id, {
      onSuccess: () => {
        setIsDeleteDialogOpen(false); 
      },
      onError: () => {
        setIsDeleteDialogOpen(false); 
      }
    });
  };

  return (
    <div className="flex items-center justify-center space-x-1">
      <Button variant="ghost" size="icon" className="hover:text-primary" asChild>
        <Link href={`/inventory/${product.id}/edit`}>
          <Edit3 className="h-4 w-4" />
        </Link>
      </Button>
       <Button variant="ghost" size="icon" className="hover:text-indigo-500" onClick={() => onBarcodeClick(product)}>
        <BarcodeIcon className="h-4 w-4" />
      </Button>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="icon" className="hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está completamente seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el producto
              <span className="font-semibold"> {product.name}</span> y eliminará sus datos de nuestros servidores.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending && deleteMutation.variables === product.id}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {(deleteMutation.isPending && deleteMutation.variables === product.id) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

type StockStatusFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';

function InventoryContentLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-4">
        <Skeleton className="h-10 w-full sm:flex-1 md:flex-none md:max-w-xs lg:max-w-sm" />
        <Skeleton className="h-10 w-full sm:w-auto md:w-[180px]" />
        <Skeleton className="h-10 w-full sm:w-auto md:w-[180px]" />
        <Skeleton className="h-10 w-full sm:w-auto md:w-[180px]" />
      </div>
      <Card className="mb-6 shadow-md">
        <CardHeader><Skeleton className="h-6 w-3/4 mb-2" /><Skeleton className="h-4 w-1/2" /></CardHeader>
        <CardContent><Skeleton className="h-8 w-1/2" /><Skeleton className="h-4 w-2/3 mt-1" /></CardContent>
      </Card>
      <div className="rounded-lg border shadow-sm bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {[...Array(9)].map((_, i) => <TableHead key={i}><Skeleton className="h-5 my-2 w-full" /></TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                {[...Array(9)].map((_, j) => <TableCell key={j}><Skeleton className="h-10 my-1 w-full" /></TableCell>)}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-20" /> <Skeleton className="h-9 w-[120px]" />
        </div>
        <Skeleton className="h-5 w-1/4 sm:w-1/5" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
    </div>
  );
}

function InventoryPageContent({ productsData, categoriesData }: { productsData: Product[], categoriesData: ProductCategory[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const searchParams = useSearchParams();
  const router = useRouter();
  const { formatCurrency } = useCurrency();
  
  const [filterBrand, setFilterBrand] = useState('all');
  const [filterCategoryName, setFilterCategoryName] = useState('all'); 
  const [filterStockStatus, setFilterStockStatus] = useState<StockStatusFilter>('all');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number | 'all'>(50);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [selectedProductForBarcode, setSelectedProductForBarcode] = useState<Product | null>(null);
  const [barcodeQuantityToPrint, setBarcodeQuantityToPrint] = useState(1);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);


  useEffect(() => {
    const urlCategoryFilter = searchParams.get('category');
    setFilterCategoryName(urlCategoryFilter || 'all');
    
    const urlStatusFilter = searchParams.get('status') as StockStatusFilter | null;
    setFilterStockStatus(urlStatusFilter || 'all');
  }, [searchParams]);

  const deleteMutation = useMutation<{ message: string }, Error, string>({
    mutationFn: deleteProductAPI,
    onSuccess: (data, productId) => { 
      toast({
        title: "Producto Eliminado",
        description: `El producto ha sido eliminado exitosamente.`,
      });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error al Eliminar el Producto",
        description: error.message || "Ocurrió un error inesperado.",
      });
    },
  });

  const uniqueBrands = useMemo(() => ['all', ...new Set(productsData.map(p => p.brand).filter(Boolean).sort((a, b) => a.localeCompare(b)))], [productsData]);
  
  const categoryFilterOptions = useMemo(() => {
    const options = [{ value: 'all', label: 'Todas las Categorías' }];
    categoriesData.forEach(cat => {
      if (cat.name) { 
        options.push({ value: cat.name, label: cat.name });
      }
    });
    return options.sort((a,b) => a.label.localeCompare(b.label));
  }, [categoriesData]);

  const currentFilteredProducts = useMemo(() => {
    return productsData.filter(product => {
      const searchTermLower = searchTerm.toLowerCase();
      const matchesSearch = product.name.toLowerCase().includes(searchTermLower) ||
                            product.code.toLowerCase().includes(searchTermLower) ||
                            product.reference.toLowerCase().includes(searchTermLower) ||
                            (product.barcode && product.barcode.toLowerCase().includes(searchTermLower));
      const matchesBrand = filterBrand === 'all' || product.brand === filterBrand;
      const currentProductCategory = product.category || 'N/A'; 
      const matchesCategory = filterCategoryName === 'all' || currentProductCategory === filterCategoryName;

      let matchesStockStatus = true;
      if (filterStockStatus === 'in_stock') {
        matchesStockStatus = product.stock > 0 && product.stock >= product.minStock;
      } else if (filterStockStatus === 'low_stock') {
        matchesStockStatus = product.stock > 0 && product.stock < product.minStock;
      } else if (filterStockStatus === 'out_of_stock') {
        matchesStockStatus = product.stock === 0;
      }
      
      return matchesSearch && matchesBrand && matchesCategory && matchesStockStatus;
    });
  }, [searchTerm, filterBrand, filterCategoryName, filterStockStatus, productsData]);
  
  const totalPages = useMemo(() => {
    if (itemsPerPage === 'all' || currentFilteredProducts.length === 0) return 1;
    return Math.ceil(currentFilteredProducts.length / Number(itemsPerPage));
  }, [currentFilteredProducts, itemsPerPage]);

  const displayedProducts = useMemo(() => {
    if (itemsPerPage === 'all') return currentFilteredProducts;
    const numericItemsPerPage = Number(itemsPerPage);
    const startIndex = (currentPage - 1) * numericItemsPerPage;
    const endIndex = startIndex + numericItemsPerPage;
    return currentFilteredProducts.slice(startIndex, endIndex);
  }, [currentFilteredProducts, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterBrand, filterCategoryName, filterStockStatus, itemsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages);
    else if (totalPages === 0 && currentFilteredProducts.length > 0) setCurrentPage(1);
  }, [currentFilteredProducts.length, totalPages, currentPage]);

  const totalFilteredCogs = useMemo(() => {
    return currentFilteredProducts.reduce((acc, product) => acc + (product.cost * product.stock), 0);
  }, [currentFilteredProducts]);

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(value === 'all' ? 'all' : Number(value));
  };

  const paginationStartItem = itemsPerPage === 'all' ? 1 : (currentPage - 1) * Number(itemsPerPage) + 1;
  const paginationEndItem = itemsPerPage === 'all' ? currentFilteredProducts.length : Math.min(currentPage * Number(itemsPerPage), currentFilteredProducts.length);

  const stockStatusOptions: { value: StockStatusFilter; label: string }[] = [
    { value: 'all', label: 'Todos los Estados' },
    { value: 'in_stock', label: 'En Stock' },
    { value: 'low_stock', label: 'Stock Bajo' },
    { value: 'out_of_stock', label: 'Agotado' },
  ];

  const itemsPerPageOptions = [
    { value: '50', label: '50' },
    { value: '100', label: '100' },
    { value: 'all', label: 'Todos' },
  ];

  const handleBarcodeModalOpen = (product: Product) => {
    setSelectedProductForBarcode(product);
    setBarcodeQuantityToPrint(1);
    setIsBarcodeModalOpen(true);
  };

  const handleCloseBarcodeModal = () => {
    setIsBarcodeModalOpen(false);
    setSelectedProductForBarcode(null);
  };

  const handlePrintBarcodes = async () => {
    if (!selectedProductForBarcode || barcodeQuantityToPrint < 1) return;
    setIsGeneratingPdf(true);

    const { jsPDF } = await import('jspdf');
    const JsBarcode = (await import('jsbarcode')).default;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter'
    });

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
    let labelsOnPageCount = 0;

    for (let i = 0; i < barcodeQuantityToPrint; i++) {
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
        JsBarcode(canvas, selectedProductForBarcode.code, {
          format: "CODE128",
          width: 1.5, // Bar width in px for JsBarcode
          height: barcodeHeightMM * (72/25.4), // JsBarcode height in px (points)
          displayValue: false,
          margin: 0,
        });
        const barcodeDataUrl = canvas.toDataURL('image/png');
        
        // Calculate actual barcode width in mm to center it, ensure it fits
        const actualBarcodeWidthInMM = canvas.width / (72 / 25.4); // Convert points to mm
        const finalPdfImageWidth = Math.min(actualBarcodeWidthInMM, labelWidth - 4); // Ensure it fits, with small padding
        const imageX = currentX + (labelWidth - finalPdfImageWidth) / 2; // Center barcode image

        doc.addImage(barcodeDataUrl, 'PNG', imageX, currentY, finalPdfImageWidth, barcodeHeightMM);
      } catch (e) {
        console.error(`Error generating barcode for ${selectedProductForBarcode.code}:`, e);
        doc.text("Error", currentX + labelWidth / 2, currentY + barcodeHeightMM / 2, { align: 'center' });
      }
      
      // Product Name (single line, truncated)
      let productNameText = selectedProductForBarcode.name;
      const maxNameWidth = labelWidth - 4; // mm, allowing small horizontal padding

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');

      if (doc.getTextWidth(productNameText) > maxNameWidth) {
        let truncatedName = productNameText;
        while (doc.getTextWidth(truncatedName + "...") > maxNameWidth && truncatedName.length > 0) {
          truncatedName = truncatedName.slice(0, -1);
        }
        productNameText = truncatedName.length > 0 ? truncatedName + "..." : "..."; // Handle very short names
        if (doc.getTextWidth(productNameText) > maxNameWidth && productNameText.length <= 3) { 
             productNameText = productNameText.slice(0, Math.floor(maxNameWidth / doc.getTextWidth("."))); 
        }
      }
      doc.text(productNameText, currentX + labelWidth / 2, currentY + barcodeHeightMM + textYOffsetFromBarcodeMM + textLineHeightMM, { align: 'center' });

      // Product Code (Bold)
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text(selectedProductForBarcode.code, currentX + labelWidth / 2, currentY + barcodeHeightMM + textYOffsetFromBarcodeMM + (textLineHeightMM * 2), { align: 'center', maxWidth: labelWidth - 2 });
      doc.setFont('helvetica', 'normal'); // Reset font

      currentX += labelWidth + xSpacing;
      labelsOnPageCount++;
    }
    
    doc.save(`Barcodes_${selectedProductForBarcode.code}_${Date.now()}.pdf`);
    setIsGeneratingPdf(false);
    handleCloseBarcodeModal();
    toast({ title: "PDF Generado", description: "El PDF del código de barras ha sido descargado." });
  };


  return (
    <>
      <div className="mb-6 flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-4">
        <Input
          placeholder="Buscar por nombre, código, referencia, código de barras..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:flex-1 md:flex-none md:max-w-xs lg:max-w-sm"
        />
        <Select value={filterBrand} onValueChange={setFilterBrand}>
          <SelectTrigger className="w-full sm:w-auto md:w-[180px]"><SelectValue placeholder="Filtrar por marca" /></SelectTrigger>
          <SelectContent>{uniqueBrands.map(brand => (<SelectItem key={brand} value={brand}>{brand === 'all' ? 'Todas las Marcas' : brand}</SelectItem>))}</SelectContent>
        </Select>
        <Select 
          value={filterCategoryName} 
          onValueChange={(value) => {
            setFilterCategoryName(value);
            const newQuery = new URLSearchParams(searchParams.toString());
            if (value === 'all') newQuery.delete('category'); else newQuery.set('category', value);
            router.push(`/inventory?${newQuery.toString()}`, { scroll: false });
          }}
        >
          <SelectTrigger className="w-full sm:w-auto md:w-[180px]"><SelectValue placeholder={"Filtrar por categoría"} /></SelectTrigger>
          <SelectContent>{categoryFilterOptions.map(opt => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent>
        </Select>
        <Select 
          value={filterStockStatus} 
          onValueChange={(value) => {
            const newStatus = value as StockStatusFilter;
            setFilterStockStatus(newStatus);
            const newQuery = new URLSearchParams(searchParams.toString());
            if (newStatus === 'all') newQuery.delete('status'); else newQuery.set('status', newStatus);
            router.push(`/inventory?${newQuery.toString()}`, { scroll: false });
          }}
        >
          <SelectTrigger className="w-full sm:w-auto md:w-[180px]"><SelectValue placeholder="Filtrar por estado de stock" /></SelectTrigger>
          <SelectContent>{stockStatusOptions.map(opt => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent>
        </Select>
      </div>

      <Card className="mb-6 shadow-md">
        <CardHeader><CardTitle className="text-lg flex items-center"><DollarSign className="mr-2 h-5 w-5 text-blue-500" />Valor del Inventario Filtrado</CardTitle></CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">COGS Total: {formatCurrency(totalFilteredCogs)}</p>
          <p className="text-sm text-muted-foreground">Basado en {currentFilteredProducts.length} producto(s) que coinciden con los filtros actuales.</p>
        </CardContent>
      </Card>

      <div className="rounded-lg border shadow-sm bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px] sm:w-[80px]">Imagen</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead className="hidden md:table-cell">Código</TableHead>
              <TableHead className="hidden lg:table-cell">Referencia</TableHead>
              <TableHead className="hidden md:table-cell">Marca</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Costo</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Ganancia</TableHead>
              <TableHead className="text-center hidden sm:table-cell">Estado</TableHead>
              <TableHead className="text-center w-[100px] sm:w-[120px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedProducts.map((product) => (
              <TableRow key={product.id}>
                <TableCell><Image src={product.imageUrl || `https://placehold.co/50x50.png?text=${product.name.substring(0,2)}`} alt={product.name} width={50} height={50} className="rounded-md object-cover" data-ai-hint={product.dataAiHint || "motorcycle part"} /></TableCell>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell className="hidden md:table-cell">{product.code}</TableCell>
                <TableCell className="hidden lg:table-cell">{product.reference}</TableCell>
                <TableCell className="hidden md:table-cell">{product.brand}</TableCell>
                <TableCell>{product.category || 'N/A'}</TableCell>
                <TableCell className="text-right">{product.stock}</TableCell>
                <TableCell className="text-right hidden sm:table-cell">{formatCurrency(product.cost)}</TableCell>
                <TableCell className="text-right">{formatCurrency(product.price)}</TableCell>
                <TableCell className="text-right font-semibold text-green-600 hidden sm:table-cell">{formatCurrency(product.price - product.cost)}</TableCell>
                <TableCell className="text-center hidden sm:table-cell">
                  {product.stock === 0 ? <Badge variant="destructive">Agotado</Badge> :
                   product.stock < product.minStock ? <Badge variant="outline" className="border-yellow-500 text-yellow-600">Stock Bajo</Badge> :
                   <Badge variant="secondary" className="border-green-500 text-green-600 bg-green-100">En Stock</Badge>}
                </TableCell>
                <TableCell className="text-center"><ProductRowActions product={product} deleteMutation={deleteMutation} onBarcodeClick={handleBarcodeModalOpen} /></TableCell>
              </TableRow>
            ))}
            {displayedProducts.length === 0 && (<TableRow><TableCell colSpan={11} className="h-24 text-center">No se encontraron productos que coincidan con sus criterios.</TableCell></TableRow>)}
          </TableBody>
        </Table>
      </div>
      
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filas por página:</span>
          <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
            <SelectTrigger className="w-[120px] h-9"><SelectValue placeholder="Items por página" /></SelectTrigger>
            <SelectContent>{itemsPerPageOptions.map(option => (<SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>))}</SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground">{currentFilteredProducts.length > 0 ? `Mostrando ${paginationStartItem}-${paginationEndItem} de ${currentFilteredProducts.length} productos` : "No hay productos"}</div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1 || itemsPerPage === 'all'}><ChevronLeft className="h-4 w-4 mr-1" /> Anterior</Button>
          <span className="text-sm text-muted-foreground">Página {currentPage} de {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages || itemsPerPage === 'all'}>Siguiente <ChevronRight className="h-4 w-4 ml-1" /></Button>
        </div>
      </div>
      {isBarcodeModalOpen && selectedProductForBarcode && (
            <Dialog open={isBarcodeModalOpen} onOpenChange={handleCloseBarcodeModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center"><BarcodeIcon className="mr-2 h-6 w-6 text-primary" />Código de Barras para: {selectedProductForBarcode.name}</DialogTitle>
                        <DialogDescription>Código de Producto (Fuente para Código de Barras): {selectedProductForBarcode.code}</DialogDescription>
                    </DialogHeader>
                    <div className="my-4 flex flex-col items-center justify-center">
                        <ProductBarcode 
                            value={selectedProductForBarcode.code} 
                            options={{ height: 80, width: 2.5, fontSize: 16, textMargin: 5 }}
                            className="max-w-full h-auto"
                        />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="barcode-quantity" className="text-sm font-medium">Cantidad a Imprimir:</label>
                        <Input 
                            id="barcode-quantity"
                            type="number" 
                            value={barcodeQuantityToPrint}
                            onChange={(e) => setBarcodeQuantityToPrint(Math.max(1, parseInt(e.target.value, 10) || 1))}
                            min="1"
                            className="w-24"
                        />
                    </div>
                    <DialogFooter className="mt-4">
                        <Button type="button" variant="outline" onClick={handleCloseBarcodeModal}>Cancelar</Button>
                        {selectedProductForBarcode.code ? (
                             <Button 
                                type="button" 
                                onClick={handlePrintBarcodes} 
                                disabled={isGeneratingPdf || barcodeQuantityToPrint < 1}
                            >
                                {isGeneratingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
                                Imprimir en PDF
                            </Button>
                        ) : (
                            <Button type="button" disabled={true} title="El producto no tiene código para generar un código de barras.">
                                <Printer className="mr-2 h-4 w-4" /> Sin Datos de Código
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        )}
    </>
  );
}

export default function InventoryPage() {
  const { data: products = [], isLoading: isLoadingProducts, error: productsError, isError: isProductsError } = useQuery<Product[], Error>({
    queryKey: ['products'],
    queryFn: fetchProducts,
  });

  const { data: categories = [], isLoading: isLoadingCategories, error: categoriesError, isError: isCategoriesError } = useQuery<ProductCategory[], Error>({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  if (isLoadingProducts || isLoadingCategories) {
    return (
      <AppLayout>
        <PageHeader title="Gestion de Inventario" description="Cargando stock de productos..." />
        <InventoryContentLoading />
      </AppLayout>
    );
  }

  if (isProductsError || isCategoriesError) {
    return (
      <AppLayout>
        <PageHeader title="Gestion de Inventario" description="Error al cargar productos o categorías." />
        <div className="bg-destructive/10 border border-destructive text-destructive p-4 rounded-md">
          <div className="flex items-center">
            <AlertTriangle className="mr-2 h-6 w-6" />
            <h3 className="font-semibold">Error al Cargar Datos</h3>
          </div>
          <p>{(productsError || categoriesError)?.message || "Ocurrió un error desconocido."}</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader title="Gestion de Inventario" description="Ver y gestionar el stock de sus productos.">
        <Button asChild><Link href="/inventory/add"><PlusCircle className="mr-2 h-4 w-4" /> Añadir Producto</Link></Button>
        <Button variant="outline" asChild><Link href="/inventory/import"><Upload className="mr-2 h-4 w-4" /> Importar Productos</Link></Button>
        <Button variant="outline"><FileDown className="mr-2 h-4 w-4" /> Exportar CSV</Button>
      </PageHeader>

      <Suspense fallback={<InventoryContentLoading />}>
        <InventoryPageContent productsData={products} categoriesData={categories} />
      </Suspense>
    </AppLayout>
  );
}
