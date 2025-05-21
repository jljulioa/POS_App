
"use client";

import AppLayout from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { mockProducts, Product } from '@/lib/mockData';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { PlusCircle, FileDown, Edit3, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import React, { useState, useMemo } from 'react';
import Link from 'next/link';

export default function InventoryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBrand, setFilterBrand] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  const uniqueBrands = useMemo(() => ['all', ...new Set(mockProducts.map(p => p.brand))], []);
  const uniqueCategories = useMemo(() => ['all', ...new Set(mockProducts.map(p => p.category))], []);

  const filteredProducts = useMemo(() => {
    return mockProducts.filter(product => {
      const searchTermLower = searchTerm.toLowerCase();
      const matchesSearch = product.name.toLowerCase().includes(searchTermLower) ||
                            product.code.toLowerCase().includes(searchTermLower) ||
                            product.reference.toLowerCase().includes(searchTermLower) ||
                            (product.barcode && product.barcode.toLowerCase().includes(searchTermLower));
      const matchesBrand = filterBrand === 'all' || product.brand === filterBrand;
      const matchesCategory = filterCategory === 'all' || product.category === filterCategory;
      return matchesSearch && matchesBrand && matchesCategory;
    });
  }, [searchTerm, filterBrand, filterCategory]);

  return (
    <AppLayout>
      <PageHeader title="Inventory Management" description="View and manage your product stock.">
        <Button asChild>
          <Link href="/inventory/add">
            <PlusCircle className="mr-2 h-4 w-4" /> Add Product
          </Link>
        </Button>
        <Button variant="outline">
          <FileDown className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </PageHeader>

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <Input 
          placeholder="Search by name, code, reference, barcode..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select value={filterBrand} onValueChange={setFilterBrand}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by brand" />
          </SelectTrigger>
          <SelectContent>
            {uniqueBrands.map(brand => (
              <SelectItem key={brand} value={brand}>{brand === 'all' ? 'All Brands' : brand}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            {uniqueCategories.map(category => (
              <SelectItem key={category} value={category}>{category === 'all' ? 'All Categories' : category}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border shadow-sm bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  <Image src={product.imageUrl} alt={product.name} width={50} height={50} className="rounded-md object-cover" data-ai-hint={product.dataAiHint || "motorcycle part"} />
                </TableCell>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell>{product.code}</TableCell>
                <TableCell>{product.reference}</TableCell>
                <TableCell>{product.brand}</TableCell>
                <TableCell>{product.category}</TableCell>
                <TableCell className="text-right">{product.stock}</TableCell>
                <TableCell className="text-right">${product.price.toFixed(2)}</TableCell>
                <TableCell className="text-center">
                  {product.stock === 0 ? <Badge variant="destructive">Out of Stock</Badge> :
                   product.stock < product.minStock ? <Badge variant="outline" className="border-yellow-500 text-yellow-600">Low Stock</Badge> :
                   <Badge variant="secondary" className="border-green-500 text-green-600 bg-green-100">In Stock</Badge>}
                </TableCell>
                <TableCell className="text-center">
                  <Button variant="ghost" size="icon" className="hover:text-primary">
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
             {filteredProducts.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center">
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
