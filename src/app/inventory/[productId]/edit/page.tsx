
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
import { ArrowLeft, Package, Save, Loader2, AlertTriangle, Barcode as BarcodeIcon } from 'lucide-react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Product } from '@/lib/mockData';
import React, { useEffect } from 'react';
import type { ProductCategory } from '@/app/api/categories/route';
import ProductBarcode from '@/components/ProductBarcode'; // Import the new component

const ProductFormSchema = z.object({
  name: z.string().min(3, { message: "El nombre debe tener al menos 3 caracteres." }),
  code: z.string().min(3, { message: "El código debe tener al menos 3 caracteres." }),
  reference: z.string().min(3, { message: "La referencia debe tener al menos 3 caracteres." }),
  barcode: z.string().optional().or(z.literal('')),
  stock: z.coerce.number().int().min(0, { message: "El stock debe ser un número entero no negativo." }),
  categoryId: z.coerce.number().int().positive({ message: "La categoría es obligatoria." }), // Changed from category: string
  brand: z.string().min(2, { message: "La marca es obligatoria." }),
  minStock: z.coerce.number().int().min(0, { message: "El stock mínimo debe ser un número entero no negativo." }),
  maxStock: z.coerce.number().int().min(0, { message: "El stock máximo debe ser un número entero no negativo." }).optional(),
  cost: z.coerce.number().min(0, { message: "El costo debe ser un número no negativo." }),
  price: z.coerce.number().min(0, { message: "El precio debe ser un número no negativo." }),
  imageUrl: z.string().url({ message: "Por favor, ingrese una URL válida." }).optional().or(z.literal('')),
  dataAiHint: z.string().max(50, { message: "La pista de IA no puede exceder los 50 caracteres."}).optional(),
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
const updateProductAPI = async ({ productId, data }: { productId: string; data: ProductFormValues }): Promise<Product> => {
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
      categoryId: undefined, // Default for categoryId
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
        categoryId: product.categoryId, // Use product.categoryId
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
    mutationFn: (data) => updateProductAPI({ productId, data }),
    onSuccess: (data) => {
      toast({
        title: "Producto Actualizado Exitosamente",
        description: `${data.name} ha sido actualizado.`,
      });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      router.push('/inventory');
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error al Actualizar el Producto",
        description: error.message || "Ocurrió un error inesperado.",
      });
    },
  });

  const onSubmit = (data: ProductFormValues) => {
    mutation.mutate(data);
  };
  
  const currentBarcodeValue = form.watch("barcode");


  if (isLoadingProduct || isLoadingCategories) {
    return (
      <AppLayout>
        <PageHeader title="Editar Producto" description="Cargando detalles del producto..." />
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (isProductError || !product) {
    return (
      <AppLayout>
        <PageHeader title="Error" description="No se pudieron cargar los detalles del producto." />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <AlertTriangle className="mr-2 h-6 w-6" />
              Error al Cargar el Producto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{productError?.message || "No se pudo encontrar el producto o ocurrió un error."}</p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" asChild>
              <Link href="/inventory">
                <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Inventario
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader title={`Editar Producto: ${product.name}`} description="Actualice los detalles del producto a continuación.">
        <Button variant="outline" asChild>
          <Link href="/inventory">
            <ArrowLeft className="mr-2 h-4 w-4" /> Cancelar
          </Link>
        </Button>
      </PageHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="mr-2 h-6 w-6 text-primary" />
                Información del Producto
              </CardTitle>
              <CardDescription>Los campos marcados con * son obligatorios.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del Producto *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Bujía NGK CR9E" {...field} />
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
                    <FormLabel>Código del Producto *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: SPK-NGK-CR9E" {...field} />
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
                    <FormLabel>Referencia *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: REF-SPK-001" {...field} />
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
                    <FormLabel>Código de Barras (EAN/UPC)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: 1234567890123" {...field} value={field.value ?? ''} />
                    </FormControl>
                     {currentBarcodeValue && (
                        <div className="mt-2 p-2 border rounded-md bg-muted flex flex-col items-center justify-center">
                           <ProductBarcode value={currentBarcodeValue} options={{ height: 50, width: 1.5, background:"hsl(var(--muted))" }} className="max-w-full h-auto"/>
                           <p className="text-xs text-muted-foreground mt-1">{currentBarcodeValue}</p>
                        </div>
                      )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoría *</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(Number(value))} 
                      value={field.value?.toString()}
                      disabled={isLoadingCategories}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingCategories ? "Cargando categorías..." : "Seleccione una categoría"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingCategories ? (
                            <SelectItem value="loading" disabled>Cargando...</SelectItem>
                        ) : categories.length === 0 ? (
                            <SelectItem value="no-categories" disabled>No se encontraron categorías. Agregue una primero.</SelectItem>
                        ) : (
                          categories.map((category) => (
                            <SelectItem key={category.id} value={category.id.toString()}>
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
                    <FormLabel>Marca *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: NGK" {...field} />
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
                    <FormLabel>Stock Actual *</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Ej: 150" {...field} />
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
                    <FormLabel>Stock Mínimo *</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Ej: 20" {...field} />
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
                    <FormLabel>Stock Máximo</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Ej: 200" {...field} value={field.value ?? ''} />
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
                    <FormLabel>Precio de Costo *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="Ej: 2.50" {...field} />
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
                    <FormLabel>Precio de Venta *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="Ej: 5.00" {...field} />
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
                    <FormLabel>URL de la Imagen</FormLabel>
                    <FormControl>
                      <Input placeholder="https://placehold.co/100x100.png" {...field} value={field.value ?? ''} />
                    </FormControl>
                     <FormDescription>
                      Ingrese una URL de imagen válida o déjela en blanco para un marcador de posición predeterminado.
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
                    <FormLabel>Pista de Imagen para IA</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: bujía" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormDescription>
                      Palabras clave para que la IA encuentre una imagen relevante (máx. 2 palabras).
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
                {mutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </AppLayout>
  );
}
