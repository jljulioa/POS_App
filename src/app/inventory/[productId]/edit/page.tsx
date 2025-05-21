
"use client";

import AppLayout from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Package, Save, Loader2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Product } from '@/lib/mockData';
import React, { useEffect } from 'react';
import type { ProductCategory } from '@/app/api/categories/route';

const ProductFormSchema = z.object({
  name: z.string().min(3, { message: "Name must be at least 3 characters." }),
  code: z.string().min(3, { message: "Code must be at least 3 characters." }),
  reference: z.string().min(3, { message: "Reference must be at least 3 characters." }),
  barcode: z.string().optional().or(z.literal('')),
  stock: z.coerce.number().int().min(0, { message: "Stock must be a non-negative integer." }),
  category: z.string().min(1, { message: "Category is required." }), // Will be category name
  brand: z.string().min(2, { message: "Brand is required." }),
  minStock: z.coerce.number().int().min(0, { message: "Min. stock must be a non-negative integer." }),
  maxStock: z.coerce.number().int().min(0, { message: "Max. stock must be a non-negative integer." }).optional(),
  cost: z.coerce.number().min(0, { message: "Cost must be a non-negative number." }),
  price: z.coerce.number().min(0, { message: "Price must be a non-negative number." }),
  imageUrl: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  dataAiHint: z.string().max(50, { message: "AI Hint cannot exceed 50 characters."}).optional(),
});

type ProductFormValues = z.infer<typeof ProductFormSchema>;

// API fetch function for a single product
const fetchProduct = async (productId: string): Promise<Product> => {
  const response = await fetch(`/api/products/${productId}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to fetch product and could not parse error' }));
    throw new Error(errorData.message || 'Failed to fetch product');
  }
  return response.json();
};

// API mutation function for updating a product
const updateProduct = async ({ productId, data }: { productId: string; data: ProductFormValues }): Promise<Product> => {
  const response = await fetch(`/api/products/${productId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to update product and could not parse error' }));
    throw new Error(errorData.message || 'Failed to update product');
  }
  return response.json();
};

// API fetch function for categories
const fetchCategories = async (): Promise<ProductCategory[]> => {
  const res = await fetch('/api/categories');
  if (!res.ok) {
    throw new Error('Failed to fetch categories');
  }
  return res.json();
};

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.productId as string;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: product, isLoading: isLoadingProduct, error: productError, isError: isProductError } = useQuery<Product, Error>({
    queryKey: ['product', productId],
    queryFn: () => fetchProduct(productId),
    enabled: !!productId,
  });

  const { data: categories = [], isLoading: isLoadingCategories } = useQuery<ProductCategory[], Error>({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(ProductFormSchema),
    defaultValues: {
      name: '',
      code: '',
      reference: '',
      barcode: '',
      stock: 0,
      category: '',
      brand: '',
      minStock: 0,
      maxStock: undefined,
      cost: 0,
      price: 0,
      imageUrl: '',
      dataAiHint: '',
    },
  });

  useEffect(() => {
    if (product) {
      form.reset({
        name: product.name,
        code: product.code,
        reference: product.reference,
        barcode: product.barcode || '',
        stock: product.stock,
        category: product.category || '', // Ensure category has a default string value
        brand: product.brand,
        minStock: product.minStock,
        maxStock: product.maxStock || undefined,
        cost: product.cost,
        price: product.price,
        imageUrl: product.imageUrl || '',
        dataAiHint: product.dataAiHint || '',
      });
    }
  }, [product, form]);

  const mutation = useMutation<Product, Error, ProductFormValues>({
    mutationFn: (data) => updateProduct({ productId, data }),
    onSuccess: (data) => {
      toast({
        title: "Product Updated Successfully",
        description: `${data.name} has been updated.`,
      });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      router.push('/inventory');
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to Update Product",
        description: error.message || "An unexpected error occurred.",
      });
    },
  });

  const onSubmit = (data: ProductFormValues) => {
    mutation.mutate(data);
  };

  if (isLoadingProduct || isLoadingCategories) {
    return (
      <AppLayout>
        <PageHeader title="Edit Product" description="Loading product details..." />
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (isProductError || !product) {
    return (
      <AppLayout>
        <PageHeader title="Error" description="Could not load product details." />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <AlertTriangle className="mr-2 h-6 w-6" />
              Failed to Load Product
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{productError?.message || "The product could not be found or an error occurred."}</p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" asChild>
              <Link href="/inventory">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Inventory
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader title={`Edit Product: ${product.name}`} description="Update the product details below.">
        <Button variant="outline" asChild>
          <Link href="/inventory">
            <ArrowLeft className="mr-2 h-4 w-4" /> Cancel
          </Link>
        </Button>
      </PageHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="mr-2 h-6 w-6 text-primary" />
                Product Information
              </CardTitle>
              <CardDescription>Fields marked with * are required.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Spark Plug NGK CR9E" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Code *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., SPK-NGK-CR9E" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., REF-SPK-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="barcode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Barcode (EAN/UPC)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 1234567890123" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingCategories}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingCategories ? "Loading categories..." : "Select a category"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingCategories ? (
                            <SelectItem value="loading" disabled>Loading...</SelectItem>
                        ) : categories.length === 0 ? (
                            <SelectItem value="no-categories" disabled>No categories found. Add one first.</SelectItem>
                        ) : (
                          categories.map((category) => (
                            <SelectItem key={category.id} value={category.name}>
                              {category.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., NGK" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Stock *</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 150" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="minStock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum Stock *</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 20" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="maxStock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maximum Stock</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 200" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost Price *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="e.g., 2.50" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Selling Price *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="e.g., 5.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://placehold.co/100x100.png" {...field} value={field.value ?? ''} />
                    </FormControl>
                     <FormDescription>
                      Enter a valid image URL or leave blank for a default placeholder.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dataAiHint"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>AI Image Hint</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., spark plug" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormDescription>
                      Keywords for AI to find a relevant image (max 2 words).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button type="submit" disabled={mutation.isPending || isLoadingProduct || isLoadingCategories}>
                {mutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {mutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </AppLayout>
  );
}
