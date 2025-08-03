
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
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, PackagePlus, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Product } from '@/lib/mockData';
import type { ProductCategory } from '@/app/api/categories/route';

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

// API mutation function
const addProductAPI = async (newProduct: ProductFormValues): Promise<Product> => {
  const response = await fetch('/api/products', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(newProduct),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to add product and could not parse error' }));
    throw new Error(errorData.message || 'Failed to add product');
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


export default function AddProductPage() {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
      categoryId: undefined, // Initial value for categoryId
      brand: '',
      minStock: 0,
      maxStock: undefined,
      cost: 0,
      price: 0,
      imageUrl: '',
      dataAiHint: '',
    },
  });

  const mutation = useMutation<Product, Error, ProductFormValues>({
    mutationFn: addProductAPI,
    onSuccess: (data) => {
      toast({
        title: "Producto Agregado Exitosamente",
        description: `${data.name} ha sido agregado a la lista de productos.`,
      });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      router.push('/inventory');
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error al Agregar el Producto",
        description: error.message || "Ocurrió un error inesperado.",
      });
    },
  });

  const onSubmit = (data: ProductFormValues) => {
    mutation.mutate(data);
  };

  return (
    <AppLayout>
      <PageHeader title="Agregar Nuevo Producto" description="Complete los detalles del nuevo producto.">
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
                <PackagePlus className="mr-2 h-6 w-6 text-primary" />
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
                      onValueChange={(value) => field.onChange(Number(value))} // Convert string value from Select to number
                      value={field.value?.toString()} // Convert number to string for Select value
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
                            <SelectItem key={category.id} value={category.id.toString()}> {/* Use category.id as value */}
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
              <Button type="submit" disabled={mutation.isPending || isLoadingCategories}>
                {mutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" /> 
                )}
                {mutation.isPending ? 'Guardando...' : 'Guardar Producto'}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </AppLayout>
  );
}
