
"use client";

import AppLayout from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, DollarSign, PlusCircle, Save, Loader2, AlertTriangle, FilterX, ChevronLeft, ChevronRight, Edit3, Trash2 } from 'lucide-react';
import { Calendar } from "@/components/ui/calendar";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, isValid } from 'date-fns';
import type { DailyExpense, ExpenseCategoryEnum } from '@/lib/mockData';
import { expenseCategories } from '@/lib/mockData'; 
import React, { useState, useEffect, useMemo } from 'react';
import { cn } from "@/lib/utils";
import { useCurrency } from '@/contexts/CurrencyContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const ExpenseCategoryEnumSchema = z.enum(expenseCategories as [ExpenseCategoryEnum, ...ExpenseCategoryEnum[]]);

const ExpenseFormSchema = z.object({
  expenseDate: z.date({ required_error: "La fecha del gasto es obligatoria." }),
  description: z.string().min(3, { message: "La descripción debe tener al menos 3 caracteres." }),
  category: ExpenseCategoryEnumSchema,
  amount: z.coerce.number().positive({ message: "El monto debe ser un número positivo." }),
  notes: z.string().optional().or(z.literal('')),
});

type ExpenseFormValues = z.infer<typeof ExpenseFormSchema>;

const defaultFormValues: Partial<ExpenseFormValues> = {
  expenseDate: new Date(),
  description: '',
  category: 'Other',
  amount: 0,
  notes: '',
};

// API fetch function for expenses
const fetchExpensesAPI = async (startDate?: Date, endDate?: Date): Promise<DailyExpense[]> => {
  const params = new URLSearchParams();
  if (startDate) {
    params.append('startDate', format(startDate, 'yyyy-MM-dd'));
  }
  if (endDate) {
    params.append('endDate', format(endDate, 'yyyy-MM-dd'));
  }

  const res = await fetch(`/api/expenses?${params.toString()}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'Failed to fetch expenses' }));
    throw new Error(errorData.message || 'Failed to fetch expenses');
  }
  return res.json();
};

// API mutation function to add an expense
const addExpenseAPI = async (newExpense: ExpenseFormValues): Promise<DailyExpense> => {
  const apiPayload = {
    ...newExpense,
    expenseDate: format(newExpense.expenseDate, "yyyy-MM-dd"),
  };
  const response = await fetch('/api/expenses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(apiPayload),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to add expense' }));
    throw new Error(errorData.message || 'Failed to add expense');
  }
  return response.json();
};

const updateExpenseAPI = async ({ id, data }: { id: number; data: ExpenseFormValues }): Promise<DailyExpense> => {
  const apiPayload = { ...data, expenseDate: format(data.expenseDate, "yyyy-MM-dd") };
  const response = await fetch(`/api/expenses/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(apiPayload),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to update expense' }));
    throw new Error(errorData.message || 'Failed to update expense');
  }
  return response.json();
};

const deleteExpenseAPI = async (id: number): Promise<{ message: string }> => {
  const response = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to delete expense' }));
    throw new Error(errorData.message || 'Failed to delete expense');
  }
  return response.json();
};


export default function ExpensesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { formatCurrency } = useCurrency();
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number | 'all'>(20);

  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [editingExpense, setEditingExpense] = useState<DailyExpense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<DailyExpense | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const queryKeyParams = [
    startDate ? format(startDate, 'yyyy-MM-dd') : 'all',
    endDate ? format(endDate, 'yyyy-MM-dd') : 'all',
  ];

  const { data: fetchedExpenses = [], isLoading: isLoadingExpenses, error: expensesError } = useQuery<DailyExpense[], Error>({
    queryKey: ['expenses', ...queryKeyParams],
    queryFn: () => fetchExpensesAPI(startDate, endDate),
  });

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(ExpenseFormSchema),
    defaultValues: defaultFormValues,
  });

  const addMutation = useMutation<DailyExpense, Error, ExpenseFormValues>({
    mutationFn: addExpenseAPI,
    onSuccess: (data) => {
      toast({ title: "Gasto Añadido", description: `${data.description} ha sido registrado con éxito.` });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      form.reset(defaultFormValues);
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error al Añadir Gasto", description: error.message });
    },
  });

  const updateMutation = useMutation<DailyExpense, Error, { id: number; data: ExpenseFormValues }>({
    mutationFn: updateExpenseAPI,
    onSuccess: (data) => {
      toast({ title: "Gasto Actualizado", description: `${data.description} ha sido actualizado.` });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      handleCancelEdit();
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error al Actualizar Gasto", description: error.message });
    },
  });

  const deleteMutation = useMutation<{ message: string }, Error, number>({
    mutationFn: deleteExpenseAPI,
    onSuccess: (data, deletedExpenseId) => {
        toast({ title: "Gasto Eliminado", description: `El gasto ha sido eliminado.` });
        queryClient.invalidateQueries({ queryKey: ['expenses'] });
        if (editingExpense?.id === deletedExpenseId) {
            handleCancelEdit();
        }
        setIsDeleteDialogOpen(false);
        setExpenseToDelete(null);
    },
    onError: (error) => {
        toast({ variant: "destructive", title: "Error al Eliminar Gasto", description: error.message });
        setIsDeleteDialogOpen(false);
        setExpenseToDelete(null);
    }
  });
  
  const onSubmit = (data: ExpenseFormValues) => {
    if (formMode === 'edit' && editingExpense) {
      updateMutation.mutate({ id: editingExpense.id, data });
    } else {
      addMutation.mutate(data);
    }
  };

  const handleEditClick = (expense: DailyExpense) => {
    setFormMode('edit');
    setEditingExpense(expense);
    form.reset({
      expenseDate: parseISO(expense.expenseDate),
      description: expense.description,
      category: expense.category,
      amount: expense.amount,
      notes: expense.notes || '',
    });
  };

  const handleCancelEdit = () => {
    setFormMode('add');
    setEditingExpense(null);
    form.reset(defaultFormValues);
  };

  const handleDeleteClick = (expense: DailyExpense) => {
    setExpenseToDelete(expense);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (expenseToDelete) {
        deleteMutation.mutate(expenseToDelete.id);
    }
  };

  const filteredExpenses = useMemo(() => {
    if (!fetchedExpenses) return [];
    const termLower = searchTerm.toLowerCase();
    return fetchedExpenses.filter(expense =>
      expense.description.toLowerCase().includes(termLower) ||
      expense.category.toLowerCase().includes(termLower) ||
      (expense.notes && expense.notes.toLowerCase().includes(termLower))
    );
  }, [searchTerm, fetchedExpenses]);
  
  const totalFilteredExpensesAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  }, [filteredExpenses]);

  const totalPages = useMemo(() => {
    if (itemsPerPage === 'all' || filteredExpenses.length === 0) return 1;
    return Math.ceil(filteredExpenses.length / Number(itemsPerPage));
  }, [filteredExpenses, itemsPerPage]);

  const displayedExpenses = useMemo(() => {
    if (itemsPerPage === 'all') return filteredExpenses;
    const numericItemsPerPage = Number(itemsPerPage);
    const startIndex = (currentPage - 1) * numericItemsPerPage;
    const endIndex = startIndex + numericItemsPerPage;
    return filteredExpenses.slice(startIndex, endIndex);
  }, [filteredExpenses, currentPage, itemsPerPage]);

  useEffect(() => { setCurrentPage(1); }, [startDate, endDate, searchTerm, itemsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages);
    else if (totalPages === 0 && filteredExpenses.length > 0) setCurrentPage(1);
  }, [filteredExpenses.length, totalPages, currentPage]);

  const handleItemsPerPageChange = (value: string) => { setItemsPerPage(value === 'all' ? 'all' : Number(value)); };

  const paginationStartItem = itemsPerPage === 'all' || filteredExpenses.length === 0 ? (filteredExpenses.length > 0 ? 1 : 0) : (currentPage - 1) * Number(itemsPerPage) + 1;
  const paginationEndItem = itemsPerPage === 'all' ? filteredExpenses.length : Math.min(currentPage * Number(itemsPerPage), filteredExpenses.length);

  const itemsPerPageOptions = [{ value: '20', label: '20' }, { value: '40', label: '40' }, { value: 'all', label: 'Todos' }];

  const handleClearFilters = () => { setStartDate(undefined); setEndDate(undefined); };

  const pageTitle = useMemo(() => {
    if (startDate && endDate) { return `Gastos desde ${format(startDate, "PPP")} hasta ${format(endDate, "PPP")}`; }
    return "Todos los Gastos Registrados";
  }, [startDate, endDate]);


  return (
    <AppLayout>
      <PageHeader title="Gastos Diarios" description="Rastree y gestione sus costos operativos diarios.">
        <div className="flex items-center gap-2 flex-wrap">
            <Popover>
              <PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full sm:w-[180px] justify-start text-left font-normal",!startDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{startDate ? format(startDate, "PPP") : <span>Fecha de Inicio</span>}</Button></PopoverTrigger>
              <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={startDate} onSelect={setStartDate} disabled={(date) => endDate ? date > endDate : false} initialFocus/></PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full sm:w-[180px] justify-start text-left font-normal",!endDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{endDate ? format(endDate, "PPP") : <span>Fecha de Fin</span>}</Button></PopoverTrigger>
              <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={endDate} onSelect={setEndDate} disabled={(date) => startDate ? date < startDate : false} initialFocus/></PopoverContent>
            </Popover>
            {(startDate || endDate) && (<Button variant="ghost" onClick={handleClearFilters} className="text-muted-foreground hover:text-destructive"><FilterX className="mr-2 h-4 w-4" /> Limpiar</Button>)}
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <div className="md:col-span-1">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    {formMode === 'edit' ? <Edit3 className="mr-2 h-6 w-6 text-accent" /> : <PlusCircle className="mr-2 h-6 w-6 text-primary" />}
                    {formMode === 'edit' ? 'Editar Gasto' : 'Añadir Nuevo Gasto'}
                  </CardTitle>
                  {formMode === 'edit' && editingExpense && <CardDescription>Editando: {editingExpense.description}</CardDescription>}
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField control={form.control} name="expenseDate" render={({ field }) => (
                      <FormItem className="flex flex-col"><FormLabel>Fecha del Gasto *</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Seleccione una fecha</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Descripción *</FormLabel><FormControl><Input placeholder="Ej., Factura de electricidad de la oficina" {...field} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="category" render={({ field }) => (
                      <FormItem><FormLabel>Categoría *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleccione una categoría" /></SelectTrigger></FormControl><SelectContent>{expenseCategories.map(cat => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="amount" render={({ field }) => ( <FormItem><FormLabel>Monto *</FormLabel><FormControl><Input type="number" step="0.01" placeholder="Ej., 75.50" {...field} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem><FormLabel>Notas (Opcional)</FormLabel><FormControl><Textarea placeholder="Ej., Pagado por transferencia en línea, ref #123" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                </CardContent>
                <CardFooter className="flex-col gap-2">
                  <Button type="submit" disabled={addMutation.isPending || updateMutation.isPending} className="w-full">
                    {addMutation.isPending || updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {addMutation.isPending || updateMutation.isPending ? 'Guardando...' : (formMode === 'edit' ? 'Actualizar Gasto' : 'Guardar Gasto')}
                  </Button>
                  {formMode === 'edit' && (<Button type="button" variant="outline" onClick={handleCancelEdit} className="w-full">Cancelar Edición</Button>)}
                </CardFooter>
              </Card>
            </form>
          </Form>
        </div>

        <div className="md:col-span-2">
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <CardTitle className="flex items-center"><DollarSign className="mr-2 h-5 w-5 text-primary"/>{pageTitle}</CardTitle>
                  <span className="text-base sm:text-lg font-semibold text-primary">Total: {formatCurrency(totalFilteredExpensesAmount)}</span>
              </div>
               <Input placeholder="Filtrar gastos por descripción, categoría, notas..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="mt-2"/>
            </CardHeader>
            <CardContent>
              {isLoadingExpenses && (<div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>)}
              {expensesError && (<div className="text-destructive p-4 border border-destructive rounded-md"><AlertTriangle className="mr-2 h-5 w-5 inline-block" /> Error al cargar los gastos: {expensesError?.message}</div>)}
              {!isLoadingExpenses && !expensesError && displayedExpenses.length === 0 && (<p className="text-muted-foreground text-center py-4">No se registraron gastos para los criterios seleccionados.</p>)}
              {!isLoadingExpenses && !expensesError && displayedExpenses.length > 0 && (
                <div className="rounded-lg border shadow-sm overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow><TableHead className="w-[120px]">Fecha</TableHead><TableHead>Descripción</TableHead><TableHead>Categoría</TableHead><TableHead className="text-right">Monto</TableHead><TableHead>Notas</TableHead><TableHead>Registrado a las</TableHead><TableHead className="text-center w-[100px]">Acciones</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedExpenses.map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell className="text-sm whitespace-nowrap">{format(parseISO(expense.expenseDate), 'MMM d, yyyy')}</TableCell>
                          <TableCell className="font-medium">{expense.description}</TableCell>
                          <TableCell>{expense.category}</TableCell>
                          <TableCell className="text-right">{formatCurrency(expense.amount)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{expense.notes || 'N/A'}</TableCell>
                          <TableCell className="text-sm whitespace-nowrap">{format(parseISO(expense.createdAt), 'p')}</TableCell>
                          <TableCell className="text-center">
                            <Button variant="ghost" size="icon" className="hover:text-accent h-8 w-8" onClick={() => handleEditClick(expense)} disabled={deleteMutation.isPending}><Edit3 className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="hover:text-destructive h-8 w-8" onClick={() => handleDeleteClick(expense)} disabled={deleteMutation.isPending}><Trash2 className="h-4 w-4" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
             {(!isLoadingExpenses && !expensesError && filteredExpenses.length > 0) && (
                <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t">
                     <div className="flex items-center gap-2"><span className="text-sm text-muted-foreground">Filas por página:</span><Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}><SelectTrigger className="w-[120px] h-9"><SelectValue placeholder="Artículos por página" /></SelectTrigger><SelectContent>{itemsPerPageOptions.map(option => (<SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>))}</SelectContent></Select></div>
                    <div className="text-sm text-muted-foreground">{filteredExpenses.length > 0 ? `Mostrando ${paginationStartItem}-${paginationEndItem} de ${filteredExpenses.length} gastos` : "No hay gastos"}</div>
                    <div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1 || itemsPerPage === 'all'}><ChevronLeft className="h-4 w-4 mr-1" /> Anterior</Button><span className="text-sm text-muted-foreground">Página {currentPage} de {totalPages}</span><Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages || itemsPerPage === 'all'}>Siguiente <ChevronRight className="h-4 w-4 ml-1" /></Button></div>
                </CardFooter>
            )}
          </Card>
        </div>
      </div>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está absolutamente seguro?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer. Esto eliminará permanentemente el gasto <span className="font-semibold">"{expenseToDelete?.description}"</span>.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setExpenseToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleteMutation.isPending} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">{deleteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
