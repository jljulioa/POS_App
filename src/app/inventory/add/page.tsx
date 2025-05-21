
"use client";

import AppLayout from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, PackagePlus, Save } from 'lucide-react';
import Link from 'next/link';
// import { mockProducts, Product } from '@/lib/mockData'; // For actual data addition

const ProductFormSchema = z.object({
  name: z.string().min(3, { message: "Name must be at least 3 characters." }),
  code: z.string().min(3, { message: "Code must be at least 3 characters." }),
  reference: z.string().min(3, { message: "Reference must be at least 3 characters." }),
  barcode: z.string().optional(),
  stock: z.coerce.number().int().min(0, { message: "Stock must be a non-negative integer." }),
  category: z.string().min(2, { message: "Category is required." }),
  brand: z.string().min(2, { message: "Brand is required." }),
  minStock: z.coerce.number().int().min(0, { message: "Min. stock must be a non-negative integer." }),
  maxStock: z.coerce.number().int().min(0, { message: "Max. stock must be a non-negative integer." }).optional(),
  cost: z.coerce.number().min(0, { message: "Cost must be a non-negative number." }),
  price: z.coerce.number().min(0, { message: "Price must be a non-negative number." }),
  imageUrl: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  dataAiHint: z.string().max(50, { message: "AI Hint cannot exceed 50 characters."}).optional(),
});

type ProductFormValues = z.infer<typeof ProductFormSchema>;

export default function AddProductPage() {
  const router = useRouter();
  const { toast } = useToast();

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
      maxStock: 0,
      cost: 0,
      price: 0,
      imageUrl: '',
      dataAiHint: '',
    },
  });

  const onSubmit = (data: ProductFormValues) => {
    // For now, we'll simulate adding the product
    console.log('New Product Data:', data);
    
    // In a real app, you would generate an ID and add to your data source
    // const newProduct: Product = {
    //   id: `P${Date.now()}`, // Simple ID generation
    //   ...data,
    //   maxStock: data.maxStock || 0, // Ensure maxStock is a number
    //   imageUrl: data.imageUrl || `https://placehold.co/100x100.png?text=${data.name.substring(0,3)}`,
    // };
    // mockProducts.push(newProduct); // This won't persist or update UI effectively without state management

    toast({
      title: "Product Added (Simulated)",
      description: `${data.name} has been added to the product list.`,
    });
    router.push('/inventory');
  };

  return (
    <AppLayout>
      <PageHeader title="Add New Product" description="Fill in the details for the new product.">
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
                <PackagePlus className="mr-2 h-6 w-6 text-primary" />
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
                      <Input placeholder="e.g., 1234567890123" {...field} />
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
                    <FormControl>
                      <Input placeholder="e.g., Engine Parts" {...field} />
                    </FormControl>
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
                      <Input type="number" placeholder="e.g., 200" {...field} />
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
                      <Input placeholder="https://placehold.co/100x100.png" {...field} />
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
                      <Input placeholder="e.g., spark plug" {...field} />
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
              <Button type="submit" disabled={form.formState.isSubmitting}>
                <Save className="mr-2 h-4 w-4" /> 
                {form.formState.isSubmitting ? 'Saving...' : 'Save Product'}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </AppLayout>
  );
}
