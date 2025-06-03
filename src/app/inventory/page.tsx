
"use client";

import AppLayout from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import type { Product } from '@/lib/mockData';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { PlusCircle, FileDown, Edit3, Trash2, Loader2, AlertTriangle, Upload, DollarSign } from 'lucide-react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import React, { useState, useMemo, useEffect } from 'react';
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
import type { ProductCategory } from '@/app/api/categories/route';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';


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
}

function ProductRowActions({ product, deleteMutation }: ProductRowActionsProps) {
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
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="icon" className="hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the product
              <span className="font-semibold"> {product.name}</span> and remove its data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending && deleteMutation.variables === product.id}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {(deleteMutation.isPending && deleteMutation.variables === product.id) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

type StockStatusFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';

const stockStatusOptions: { value: StockStatusFilter; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'in_stock', label: 'In Stock' },
  { value: 'low_stock', label: 'Low Stock' },
  { value: 'out_of_stock', label: 'Out of Stock' },
];

export default function InventoryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [filterBrand, setFilterBrand] = useState('all');
  const [filterCategoryName, setFilterCategoryName] = useState('all'); 
  const [filterStockStatus, setFilterStockStatus] = useState<StockStatusFilter>('all');

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: products = [], isLoading: isLoadingProducts, error: productsError, isError: isProductsError } = useQuery<Product[], Error>({
    queryKey: ['products'],
    queryFn: fetchProducts,
  });

  const { data: categories = [], isLoading: isLoadingCategories } = useQuery<ProductCategory[], Error>({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  useEffect(() => {
    const urlCategoryFilter = searchParams.get('category');
    setFilterCategoryName(urlCategoryFilter || 'all');
    
    const urlStatusFilter = searchParams.get('status') as StockStatusFilter | null;
    setFilterStockStatus(urlStatusFilter || 'all');
  }, [searchParams]);

  const deleteMutation = useMutation< { message: string }, Error, string>({
    mutationFn: deleteProductAPI,
    onSuccess: (data, productId) => { 
      toast({
        title: "Product Deleted",
        description: `Product has been successfully deleted.`,
      });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to Delete Product",
        description: error.message || "An unexpected error occurred.",
      });
    },
  });

  const uniqueBrands = useMemo(() => ['all', ...new Set(products.map(p => p.brand).filter(Boolean).sort((a, b) => a.localeCompare(b)))], [products]);
  
  const categoryFilterOptions = useMemo(() => {
    if (isLoadingCategories || !categories) return [{ value: 'all', label: 'All Categories' }];
    const options = [{ value: 'all', label: 'All Categories' }];
    categories.forEach(cat => {
      if (cat.name) { 
        options.push({ value: cat.name, label: cat.name });
      }
    });
    return options.sort((a,b) => a.label.localeCompare(b.label));
  }, [categories, isLoadingCategories]);


  const filteredProducts = useMemo(() => {
    return products.filter(product => {
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
  }, [searchTerm, filterBrand, filterCategoryName, filterStockStatus, products]);

  const totalFilteredCogs = useMemo(() => {
    return filteredProducts.reduce((acc, product) => acc + (product.cost * product.stock), 0);
  }, [filteredProducts]);

  if (isLoadingProducts || isLoadingCategories) {
    return (
      <AppLayout>
        <PageHeader title="Inventory Management" description="Loading product stock..." />
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (isProductsError) {
    return (
      <AppLayout>
        <PageHeader title="Inventory Management" description="Error loading products." />
        <div className="bg-destructive/10 border border-destructive text-destructive p-4 rounded-md">
          <div className="flex items-center">
            <AlertTriangle className="mr-2 h-6 w-6" />
            <h3 className="font-semibold">Failed to Load Products</h3>
          </div>
          <p>{productsError?.message || "An unknown error occurred."}</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader title="Inventory Management" description="View and manage your product stock.">
        <Button asChild>
          <Link href="/inventory/add">
            <PlusCircle className="mr-2 h-4 w-4" /> Add Product
          </Link>
        </Button>
         <Button variant="outline" asChild>
          <Link href="/inventory/import">
            <Upload className="mr-2 h-4 w-4" /> Import Products
          </Link>
        </Button>
        <Button variant="outline">
          <FileDown className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </PageHeader>

      <div className="mb-6 flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-4">
        <Input
          placeholder="Search by name, code, reference, barcode..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:flex-1 md:flex-none md:max-w-xs lg:max-w-sm"
        />
        <Select value={filterBrand} onValueChange={setFilterBrand}>
          <SelectTrigger className="w-full sm:w-auto md:w-[180px]">
            <SelectValue placeholder="Filter by brand" />
          </SelectTrigger>
          <SelectContent>
            {uniqueBrands.map(brand => (
              <SelectItem key={brand} value={brand}>{brand === 'all' ? 'All Brands' : brand}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select 
          value={filterCategoryName} 
          onValueChange={(value) => {
            setFilterCategoryName(value);
            const newQuery = new URLSearchParams(searchParams.toString());
            if (value === 'all') {
              newQuery.delete('category');
            } else {
              newQuery.set('category', value);
            }
            router.push(`/inventory?${newQuery.toString()}`, { scroll: false });
          }}
          disabled={isLoadingCategories}
        >
          <SelectTrigger className="w-full sm:w-auto md:w-[180px]">
            <SelectValue placeholder={isLoadingCategories ? "Loading..." : "Filter by category"} />
          </SelectTrigger>
          <SelectContent>
            {categoryFilterOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select 
          value={filterStockStatus} 
          onValueChange={(value) => {
            const newStatus = value as StockStatusFilter;
            setFilterStockStatus(newStatus);
            const newQuery = new URLSearchParams(searchParams.toString());
            if (newStatus === 'all') {
              newQuery.delete('status');
            } else {
              newQuery.set('status', newStatus);
            }
            router.push(`/inventory?${newQuery.toString()}`, { scroll: false });
          }}
        >
          <SelectTrigger className="w-full sm:w-auto md:w-[180px]">
            <SelectValue placeholder="Filter by stock status" />
          </SelectTrigger>
          <SelectContent>
            {stockStatusOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="mb-6 shadow-md">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <DollarSign className="mr-2 h-5 w-5 text-blue-500" />
            Filtered Inventory Value
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">Total COGS: ${totalFilteredCogs.toFixed(2)}</p>
          <p className="text-sm text-muted-foreground">
            Based on {filteredProducts.length} product(s) matching current filters.
          </p>
        </CardContent>
      </Card>

      <div className="rounded-lg border shadow-sm bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px] sm:w-[80px]">Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Code</TableHead>
              <TableHead className="hidden lg:table-cell">Reference</TableHead>
              <TableHead className="hidden md:table-cell">Brand</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Cost</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Profit</TableHead>
              <TableHead className="text-center hidden sm:table-cell">Status</TableHead>
              <TableHead className="text-center w-[100px] sm:w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  <Image src={product.imageUrl || `https://placehold.co/50x50.png?text=${product.name.substring(0,2)}`} alt={product.name} width={50} height={50} className="rounded-md object-cover" data-ai-hint={product.dataAiHint || "motorcycle part"} />
                </TableCell>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell className="hidden md:table-cell">{product.code}</TableCell>
                <TableCell className="hidden lg:table-cell">{product.reference}</TableCell>
                <TableCell className="hidden md:table-cell">{product.brand}</TableCell>
                <TableCell>{product.category || 'N/A'}</TableCell>
                <TableCell className="text-right">{product.stock}</TableCell>
                <TableCell className="text-right hidden sm:table-cell">${Number(product.cost).toFixed(2)}</TableCell>
                <TableCell className="text-right">${Number(product.price).toFixed(2)}</TableCell>
                <TableCell className="text-right font-semibold text-green-600 hidden sm:table-cell">${(Number(product.price) - Number(product.cost)).toFixed(2)}</TableCell>
                <TableCell className="text-center hidden sm:table-cell">
                  {product.stock === 0 ? <Badge variant="destructive">Out of Stock</Badge> :
                   product.stock < product.minStock ? <Badge variant="outline" className="border-yellow-500 text-yellow-600">Low Stock</Badge> :
                   <Badge variant="secondary" className="border-green-500 text-green-600 bg-green-100">In Stock</Badge>}
                </TableCell>
                <TableCell className="text-center">
                  <ProductRowActions product={product} deleteMutation={deleteMutation} />
                </TableCell>
              </TableRow>
            ))}
             {filteredProducts.length === 0 && (
              <TableRow>
                <TableCell colSpan={12} className="h-24 text-center">
                  No products found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </AppLayout>
  );
}

