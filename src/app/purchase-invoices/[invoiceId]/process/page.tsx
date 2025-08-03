
"use client";

import AppLayout from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { PurchaseInvoice, PurchaseInvoiceItem, Product } from '@/lib/mockData';
import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useState, useMemo } from 'react';
import { ArrowLeft, CheckCircle, Loader2, AlertTriangle, ShoppingBag, PlusCircle, Trash2, Search as SearchIcon, PackagePlus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { ProductCategory } from '@/app/api/categories/route';

interface ProcessedItem extends Omit<PurchaseInvoiceItem, 'productId' | 'productName' | 'totalCost'> {
  productId: string; 
  productName: string;
  totalCost: number;
  newSellingPrice?: number; 
}

// API fetch function for a single purchase invoice
const fetchPurchaseInvoice = async (invoiceId: string): Promise<PurchaseInvoice> => {
  const response = await fetch(`/api/purchase-invoices/${invoiceId}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to fetch invoice' }));
    throw new Error(errorData.message || 'Failed to fetch invoice');
  }
  return response.json();
};

// API fetch function for products
const fetchProducts = async (): Promise<Product[]> => {
  const res = await fetch('/api/products');
  if (!res.ok) throw new Error('Failed to fetch products');
  return res.json();
};

// API mutation function to update/process an invoice
const processInvoiceAPI = async ({ invoiceId, data }: { invoiceId: string; data: Partial<PurchaseInvoice> & { items?: Array<{productId: string; quantity: number; costPrice: number; newSellingPrice?: number}> } }): Promise<PurchaseInvoice> => {
  const response = await fetch(`/api/purchase-invoices/${invoiceId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to process invoice' }));
    throw new Error(errorData.message || 'Failed to process invoice');
  }
  return response.json();
};

// Zod schema for quick product creation in modal
const QuickProductCreateSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  code: z.string().min(3, "El código debe tener al menos 3 caracteres."),
  reference: z.string().min(3, "La referencia debe tener al menos 3 caracteres."),
  categoryId: z.coerce.number().int().positive({ message: "La categoría es obligatoria." }),
  brand: z.string().min(2, "La marca es obligatoria."),
  price: z.coerce.number().min(0, "El precio de venta debe ser no negativo."),
  cost: z.coerce.number().min(0, "El precio de costo debe ser no negativo.").optional(),
  minStock: z.coerce.number().int().min(0).optional().default(0),
  maxStock: z.coerce.number().int().min(0).optional().default(0), // Added maxStock with default
});
type QuickProductCreateFormValues = z.infer<typeof QuickProductCreateSchema>;

// API fetch function for categories (for modal dropdown)
const fetchCategoriesAPI = async (): Promise<ProductCategory[]> => {
  const res = await fetch('/api/categories');
  if (!res.ok) throw new Error('Failed to fetch categories');
  return res.json();
};

// API mutation function to add a new product (for modal)
const addProductAPI = async (newProduct: QuickProductCreateFormValues): Promise<Product> => {
  const response = await fetch('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...newProduct, stock: 0 }), // Initialize stock to 0 for new products from here
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to create product' }));
    throw new Error(errorData.message || 'Failed to create product');
  }
  return response.json();
};


export default function ProcessPurchaseInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { formatCurrency } = useCurrency();
  const invoiceId = params.invoiceId as string;

  const [itemsToProcess, setItemsToProcess] = useState<ProcessedItem[]>([]);
  const [productSearchTerm, setProductSearchTerm] = useState<string>("");
  const [selectedProductDetails, setSelectedProductDetails] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState<number | string>(1);
  const [costPrice, setCostPrice] = useState<number | string>(""); 
  const [newSellingPriceInput, setNewSellingPriceInput] = useState<number | string>(""); 
  const [isCreateProductModalOpen, setIsCreateProductModalOpen] = useState(false);

  const { data: invoice, isLoading: isLoadingInvoice, error: invoiceError } = useQuery<PurchaseInvoice, Error>({
    queryKey: ['purchaseInvoice', invoiceId],
    queryFn: () => fetchPurchaseInvoice(invoiceId),
    enabled: !!invoiceId,
  });

  const { data: products = [], isLoading: isLoadingProducts } = useQuery<Product[], Error>({
    queryKey: ['products'],
    queryFn: fetchProducts,
  });

  const { data: categories = [], isLoading: isLoadingCategories } = useQuery<ProductCategory[], Error>({
    queryKey: ['categories'],
    queryFn: fetchCategoriesAPI,
  });
  
  const processMutation = useMutation<PurchaseInvoice, Error, { invoiceId: string; data: Partial<PurchaseInvoice> & { items: Array<{productId: string; quantity: number; costPrice: number; newSellingPrice?: number}> } }>({
    mutationFn: processInvoiceAPI,
    onSuccess: (data) => {
      toast({ title: "Factura Procesada", description: `La factura ${data.invoiceNumber} ha sido procesada con éxito.` });
      queryClient.invalidateQueries({ queryKey: ['purchaseInvoices'] });
      queryClient.invalidateQueries({ queryKey: ['purchaseInvoice', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventoryTransactions']});
      router.push('/purchase-invoices');
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Procesamiento Fallido", description: error.message });
    },
  });

  const quickProductForm = useForm<QuickProductCreateFormValues>({
    resolver: zodResolver(QuickProductCreateSchema),
    defaultValues: {
      name: '',
      code: '',
      reference: '',
      categoryId: undefined,
      brand: '',
      price: 0,
      cost: 0,
      minStock: 0,
      maxStock: 0, // Default maxStock
    },
  });

  const addProductMutation = useMutation<Product, Error, QuickProductCreateFormValues>({
    mutationFn: addProductAPI,
    onSuccess: (newProduct) => {
      toast({ title: "Producto Creado", description: `${newProduct.name} ha sido creado con éxito.` });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsCreateProductModalOpen(false);
      quickProductForm.reset();
      // Optionally, auto-select this new product
      // setSelectedProductDetails(newProduct);
      // setProductSearchTerm(newProduct.name); // Or code
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error al Crear Producto", description: error.message });
    },
  });

  const onQuickProductSubmit = (data: QuickProductCreateFormValues) => {
    addProductMutation.mutate(data);
  };

  const filteredProductsForSearch = useMemo(() => {
    if (!productSearchTerm.trim()) return [];
    const termLower = productSearchTerm.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(termLower) ||
      p.code.toLowerCase().includes(termLower) ||
      p.reference.toLowerCase().includes(termLower)
    ).slice(0, 5); 
  }, [productSearchTerm, products]);

  const handleProductSelect = (product: Product) => {
    setSelectedProductDetails(product);
    setCostPrice(product.cost); 
    setNewSellingPriceInput(product.price); 
    setProductSearchTerm(""); 
    setQuantity(1); 
  };

  const handleAddItemToProcess = () => {
    if (!selectedProductDetails || Number(quantity) <= 0 || costPrice === "" || Number(costPrice) < 0) {
      toast({ variant: "destructive", title: "Artículo Inválido", description: "Por favor, seleccione un producto e ingrese una cantidad y precio de costo válidos." });
      return;
    }

    const newItem: ProcessedItem = {
      productId: selectedProductDetails.id,
      productName: selectedProductDetails.name,
      productCode: selectedProductDetails.code,
      quantity: Number(quantity),
      costPrice: Number(costPrice),
      totalCost: Number(quantity) * Number(costPrice),
      newSellingPrice: newSellingPriceInput !== "" && Number(newSellingPriceInput) !== selectedProductDetails.price ? Number(newSellingPriceInput) : undefined,
    };

    setItemsToProcess(prev => {
      const existingItemIndex = prev.findIndex(item => item.productId === newItem.productId);
      if (existingItemIndex > -1) {
        const updatedItems = [...prev];
        const existingItem = updatedItems[existingItemIndex];
        existingItem.quantity += newItem.quantity;
        existingItem.costPrice = newItem.costPrice; 
        existingItem.totalCost = existingItem.quantity * existingItem.costPrice;
        if (newItem.newSellingPrice !== undefined) { 
            existingItem.newSellingPrice = newItem.newSellingPrice;
        }
        return updatedItems;
      } else {
        return [...prev, newItem];
      }
    });

    setSelectedProductDetails(null);
    setQuantity(1);
    setCostPrice("");
    setNewSellingPriceInput("");
  };
  
  const handleRemoveItem = (index: number) => {
    setItemsToProcess(prev => prev.filter((_, i) => i !== index));
  };

  const handleFinalizeProcessing = () => {
    if (!invoice) return;
    if (itemsToProcess.length === 0) {
      toast({ variant: "destructive", title: "No hay Artículos", description: "Por favor, añada artículos para procesar esta factura." });
      return;
    }
    const itemsForAPI = itemsToProcess.map(item => ({
        productId: item.productId,
        productName: item.productName,
        productCode: item.productCode,
        quantity: item.quantity,
        costPrice: item.costPrice,
        totalCost: item.totalCost,
        newSellingPrice: item.newSellingPrice,
    }));
    processMutation.mutate({ invoiceId: invoice.id, data: { processed: true, items: itemsForAPI } });
  };

  if (isLoadingInvoice || isLoadingProducts) {
    return (
      <AppLayout>
        <PageHeader title="Procesar Factura de Compra" description="Cargando detalles de la factura..." />
        <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
      </AppLayout>
    );
  }

  if (invoiceError) {
    return (
      <AppLayout>
        <PageHeader title="Error" />
        <Card><CardContent className="text-destructive p-4"><AlertTriangle className="inline mr-2"/> {invoiceError.message}</CardContent></Card>
      </AppLayout>
    );
  }
  
  if (!invoice) {
    return (
      <AppLayout>
        <PageHeader title="Factura no Encontrada" />
        <Card><CardContent className="p-4">No se pudo encontrar la factura de compra solicitada.</CardContent></Card>
        <Button onClick={() => router.push('/purchase-invoices')} className="mt-4"><ArrowLeft className="mr-2 h-4 w-4" /> Volver a Facturas</Button>
      </AppLayout>
    );
  }

  if (invoice.processed) {
     return (
      <AppLayout>
        <PageHeader title={`Factura ${invoice.invoiceNumber}`} description="Esta factura ya ha sido procesada." />
         <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><CheckCircle className="mr-2 h-6 w-6 text-green-500"/>Factura ya Procesada</CardTitle>
            <CardDescription>
              Los artículos de la factura <span className="font-semibold">{invoice.invoiceNumber}</span> del proveedor <span className="font-semibold">{invoice.supplierName}</span> ya han sido añadidos al inventario.
            </CardDescription>
          </CardHeader>
           <CardContent>
            <h4 className="font-semibold mb-2">Artículos Procesados:</h4>
            {invoice.items && invoice.items.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre del Producto</TableHead>
                      <TableHead className="text-center">Cant.</TableHead>
                      <TableHead className="text-right">Costo/Unidad</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.items.map(item => (
                      <TableRow key={item.productId}>
                        <TableCell>{item.productName}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.costPrice)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-muted-foreground">No se registraron artículos para esta factura procesada.</p>
            )}
          </CardContent>
          <CardFooter>
            <Button onClick={() => router.push('/purchase-invoices')}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Facturas de Compra
            </Button>
          </CardFooter>
        </Card>
      </AppLayout>
    );
  }

  const totalCostOfItems = itemsToProcess.reduce((sum, item) => sum + item.totalCost, 0);

  return (
    <AppLayout>
      <PageHeader 
        title={`Procesar Factura: ${invoice.invoiceNumber}`} 
        description={`Proveedor: ${invoice.supplierName} | Total Factura: ${formatCurrency(invoice.totalAmount)}`}
      >
        <Button onClick={() => router.push('/purchase-invoices')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Cancelar
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
                <div className="flex items-center"><PlusCircle className="mr-2 h-5 w-5"/>Añadir Artículo a la Factura</div>
                 <Dialog open={isCreateProductModalOpen} onOpenChange={setIsCreateProductModalOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <PackagePlus className="mr-2 h-4 w-4" /> Nuevo Producto
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Crear Nuevo Producto</DialogTitle>
                        <DialogDescription>
                          Añada rápidamente un nuevo producto al sistema. El stock se inicializará a 0.
                        </DialogDescription>
                      </DialogHeader>
                      <Form {...quickProductForm}>
                        <form onSubmit={quickProductForm.handleSubmit(onQuickProductSubmit)} className="space-y-4 py-4">
                          <FormField control={quickProductForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nombre *</FormLabel><FormControl><Input placeholder="Nombre del Producto" {...field} /></FormControl><FormMessage /></FormItem>)} />
                          <div className="grid grid-cols-2 gap-4">
                            <FormField control={quickProductForm.control} name="code" render={({ field }) => (<FormItem><FormLabel>Código *</FormLabel><FormControl><Input placeholder="Código del Producto" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={quickProductForm.control} name="reference" render={({ field }) => (<FormItem><FormLabel>Referencia *</FormLabel><FormControl><Input placeholder="Referencia del Producto" {...field} /></FormControl><FormMessage /></FormItem>)} />
                          </div>
                          <FormField control={quickProductForm.control} name="categoryId" render={({ field }) => (
                              <FormItem>
                                <FormLabel>Categoría *</FormLabel>
                                <Select onValueChange={(value) => field.onChange(Number(value))} value={field.value?.toString()} disabled={isLoadingCategories}>
                                  <FormControl><SelectTrigger><SelectValue placeholder={isLoadingCategories ? "Cargando..." : "Seleccione una categoría"} /></SelectTrigger></FormControl>
                                  <SelectContent>{!isLoadingCategories && categories.map(cat => (<SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>))}</SelectContent>
                                </Select><FormMessage />
                              </FormItem>
                            )} />
                          <FormField control={quickProductForm.control} name="brand" render={({ field }) => (<FormItem><FormLabel>Marca *</FormLabel><FormControl><Input placeholder="Marca del Producto" {...field} /></FormControl><FormMessage /></FormItem>)} />
                          <div className="grid grid-cols-2 gap-4">
                            <FormField control={quickProductForm.control} name="price" render={({ field }) => (<FormItem><FormLabel>Precio de Venta *</FormLabel><FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={quickProductForm.control} name="cost" render={({ field }) => (<FormItem><FormLabel>Precio de Costo</FormLabel><FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} /></FormControl><FormMessage /></FormItem>)} />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <FormField control={quickProductForm.control} name="minStock" render={({ field }) => (<FormItem><FormLabel>Stock Mín.</FormLabel><FormControl><Input type="number" placeholder="0" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={quickProductForm.control} name="maxStock" render={({ field }) => (<FormItem><FormLabel>Stock Máx.</FormLabel><FormControl><Input type="number" placeholder="0" {...field} /></FormControl><FormMessage /></FormItem>)} />
                          </div>
                          <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsCreateProductModalOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={addProductMutation.isPending}>
                              {addProductMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Crear Producto
                            </Button>
                          </DialogFooter>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <label htmlFor="product-search" className="block text-sm font-medium text-foreground mb-1">Buscar Producto (Código, Nombre, Ref) *</label>
              <div className="relative">
                <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="product-search"
                  type="text" 
                  value={productSearchTerm} 
                  onChange={e => setProductSearchTerm(e.target.value)} 
                  placeholder="Escriba para buscar..."
                  className="pl-8"
                  disabled={!!selectedProductDetails || isLoadingProducts}
                />
              </div>
              {isLoadingProducts && productSearchTerm && <p className="text-xs text-muted-foreground mt-1">Cargando productos...</p>}
              {productSearchTerm && filteredProductsForSearch.length > 0 && !selectedProductDetails && (
                <ScrollArea className="absolute z-10 w-full bg-background border rounded-md shadow-lg max-h-48 mt-1">
                  {filteredProductsForSearch.map(p => (
                    <div 
                      key={p.id} 
                      onClick={() => handleProductSelect(p)}
                      className="p-2 hover:bg-accent hover:text-accent-foreground cursor-pointer text-sm"
                    >
                      {p.name} ({p.code}) - Stock: {p.stock}
                    </div>
                  ))}
                </ScrollArea>
              )}
            </div>

            {selectedProductDetails && (
              <Card className="bg-muted/50 p-3 space-y-1">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-sm font-semibold">{selectedProductDetails.name}</p>
                        <p className="text-xs text-muted-foreground">Código: {selectedProductDetails.code} | Ref: {selectedProductDetails.reference}</p>
                    </div>
                    <Button variant="link" size="sm" className="p-0 h-auto text-xs text-destructive" onClick={() => {setSelectedProductDetails(null); setCostPrice(""); setNewSellingPriceInput(""); setQuantity(1); }}>Limpiar</Button>
                </div>
                <p className="text-xs text-muted-foreground">Stock Actual: {selectedProductDetails.stock}</p>
                <p className="text-xs text-muted-foreground">Costo Actual: {formatCurrency(selectedProductDetails.cost)}</p>
                <p className="text-xs text-muted-foreground">Precio Actual: {formatCurrency(selectedProductDetails.price)}</p>
              </Card>
            )}

            {selectedProductDetails && (
              <>
                <div>
                  <label htmlFor="quantity" className="block text-sm font-medium text-foreground mb-1">Cantidad Recibida *</label>
                  <Input id="quantity" type="number" value={quantity} onChange={e => setQuantity(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Ej., 10" min="1"/>
                </div>
                <div>
                  <label htmlFor="costPrice" className="block text-sm font-medium text-foreground mb-1">Precio de Costo (por unidad en Factura) *</label>
                  <Input id="costPrice" type="number" value={costPrice} onChange={e => setCostPrice(e.target.value)} placeholder="Ej., 25.50" step="0.01" min="0"/>
                </div>
                 <div>
                  <label htmlFor="newSellingPrice" className="block text-sm font-medium text-foreground mb-1">Nuevo Precio de Venta (opcional)</label>
                  <Input id="newSellingPrice" type="number" value={newSellingPriceInput} onChange={e => setNewSellingPriceInput(e.target.value)} placeholder={`Actual: ${formatCurrency(selectedProductDetails.price)}`} step="0.01" min="0"/>
                </div>
                <Button onClick={handleAddItemToProcess} className="w-full">
                  <ShoppingBag className="mr-2 h-4 w-4"/> Añadir Artículo
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 shadow-lg">
          <CardHeader>
            <CardTitle>Artículos a Procesar para esta Factura</CardTitle>
            <CardDescription>
              Revise los artículos antes de finalizar. Se actualizarán los niveles de stock, los costos de los productos y, opcionalmente, los precios de venta.
              Total de Artículos: <span className="font-bold">{formatCurrency(totalCostOfItems)}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {itemsToProcess.length > 0 ? (
              <ScrollArea className="rounded-md border max-h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-center">Cant.</TableHead>
                      <TableHead className="text-right">Costo/Unidad</TableHead>
                      <TableHead className="text-right">Nuevo Precio</TableHead>
                      <TableHead className="text-right">Costo Total</TableHead>
                      <TableHead className="text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemsToProcess.map((item, index) => (
                      <TableRow key={item.productId + index}>
                        <TableCell className="font-medium text-sm">{item.productName}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.costPrice)}</TableCell>
                        <TableCell className="text-right">{item.newSellingPrice ? formatCurrency(item.newSellingPrice) : 'N/A'}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(item.totalCost)}</TableCell>
                        <TableCell className="text-center">
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive h-8 w-8" onClick={() => handleRemoveItem(index)}>
                            <Trash2 className="h-4 w-4"/>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            ) : (
              <p className="text-muted-foreground text-center py-4">Aún no se han añadido artículos para procesar.</p>
            )}
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button onClick={handleFinalizeProcessing} disabled={itemsToProcess.length === 0 || processMutation.isPending} className="w-full md:w-auto">
              {processMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CheckCircle className="mr-2 h-4 w-4"/>}
              Finalizar y Añadir al Inventario
            </Button>
          </CardFooter>
        </Card>
      </div>
    </AppLayout>
  );
}
