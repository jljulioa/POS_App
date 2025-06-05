
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
import { Calendar as CalendarIcon, DollarSign, PlusCircle, Save, Loader2, AlertTriangle, FilterX, ChevronLeft, ChevronRight } from 'lucide-react';
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
import { useCurrency } from '@/contexts/CurrencyContext'; // Import useCurrency

const ExpenseCategoryEnumSchema = z.enum(expenseCategories as [ExpenseCategoryEnum, ...ExpenseCategoryEnum[]]);

const ExpenseFormSchema = z.object({
  expenseDate: z.date({ required_error: "Expense date is required." }),
  description: z.string().min(3, { message: "Description must be at least 3 characters." }),
  category: ExpenseCategoryEnumSchema,
  amount: z.coerce.number().positive({ message: "Amount must be a positive number." }),
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

export default function ExpensesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { formatCurrency } = useCurrency(); // Use currency context
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState(''); // For filtering expenses client-side after fetch
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number | 'all'>(20);


  const queryKeyParams = [
    startDate ? format(startDate, 'yyyy-MM-dd') : 'all',
    endDate ? format(endDate, 'yyyy-MM-dd') : 'all',
  ];

  const { data: fetchedExpenses = [], isLoading: isLoadingExpenses, error: expensesError, refetch: refetchExpenses } = useQuery<DailyExpense[], Error>({
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
      toast({ title: "Expense Added", description: `${data.description} has been successfully recorded.` });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      form.reset(defaultFormValues);
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Failed to Add Expense", description: error.message });
    },
  });

  const onSubmit = (data: ExpenseFormValues) => {
    addMutation.mutate(data);
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

  useEffect(() => {
    setCurrentPage(1);
  }, [startDate, endDate, searchTerm, itemsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages);
    else if (totalPages === 0 && filteredExpenses.length > 0) setCurrentPage(1);
  }, [filteredExpenses.length, totalPages, currentPage]);

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(value === 'all' ? 'all' : Number(value));
  };

  const paginationStartItem = itemsPerPage === 'all' || filteredExpenses.length === 0 ? (filteredExpenses.length > 0 ? 1 : 0) : (currentPage - 1) * Number(itemsPerPage) + 1;
  const paginationEndItem = itemsPerPage === 'all' ? filteredExpenses.length : Math.min(currentPage * Number(itemsPerPage), filteredExpenses.length);

  const itemsPerPageOptions = [
    { value: '20', label: '20 per page' },
    { value: '40', label: '40 per page' },
    { value: 'all', label: 'Show All' },
  ];

  const handleClearFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    // setSearchTerm(''); // Optionally clear search term as well
  };

  const pageTitle = useMemo(() => {
    if (startDate && endDate) {
      return `Expenses from ${format(startDate, "PPP")} to ${format(endDate, "PPP")}`;
    }
    return "All Recorded Expenses";
  }, [startDate, endDate]);


  return (
    <AppLayout>
      <PageHeader title="Daily Expenses" description="Track and manage your daily operational costs.">
        <div className="flex items-center gap-2 flex-wrap">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full sm:w-[180px] justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP") : <span>Start Date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  disabled={(date) => endDate ? date > endDate : false}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full sm:w-[180px] justify-start text-left font-normal",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "PPP") : <span>End Date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  disabled={(date) => startDate ? date < startDate : false}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {(startDate || endDate) && (
              <Button variant="ghost" onClick={handleClearFilters} className="text-muted-foreground hover:text-destructive">
                <FilterX className="mr-2 h-4 w-4" /> Clear
              </Button>
            )}
        </div>
      </PageHeader>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <PlusCircle className="mr-2 h-6 w-6 text-primary" />
                    Add New Expense
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="expenseDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Expense Date *</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                              >
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Office electricity bill" {...field} />
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {expenseCategories.map(cat => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount *</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="e.g., 75.50" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="e.g., Paid via online transfer, ref #123" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={addMutation.isPending} className="w-full">
                    {addMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {addMutation.isPending ? 'Saving...' : 'Save Expense'}
                  </Button>
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
               <Input
                  placeholder="Filter displayed expenses by description, category, notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="mt-2"
                />
            </CardHeader>
            <CardContent>
              {isLoadingExpenses && (
                <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
              )}
              {expensesError && (
                <div className="text-destructive p-4 border border-destructive rounded-md">
                  <AlertTriangle className="mr-2 h-5 w-5 inline-block" /> Failed to load expenses: {expensesError?.message}
                </div>
              )}
              {!isLoadingExpenses && !expensesError && displayedExpenses.length === 0 && (
                <p className="text-muted-foreground text-center py-4">No expenses recorded for the selected criteria.</p>
              )}
              {!isLoadingExpenses && !expensesError && displayedExpenses.length > 0 && (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead>Recorded At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedExpenses.map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell className="text-sm">{format(parseISO(expense.expenseDate), 'MMM d, yyyy')}</TableCell>
                          <TableCell className="font-medium">{expense.description}</TableCell>
                          <TableCell>{expense.category}</TableCell>
                          <TableCell className="text-right">{formatCurrency(expense.amount)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{expense.notes || 'N/A'}</TableCell>
                           <TableCell className="text-sm">{format(parseISO(expense.createdAt), 'p')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
             {(!isLoadingExpenses && !expensesError && filteredExpenses.length > 0) && (
                <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t">
                     <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Rows per page:</span>
                        <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                            <SelectTrigger className="w-[120px] h-9"><SelectValue placeholder="Items per page" /></SelectTrigger>
                            <SelectContent>{itemsPerPageOptions.map(option => (<SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>))}</SelectContent>
                        </Select>
                    </div>
                    <div className="text-sm text-muted-foreground">{filteredExpenses.length > 0 ? `Showing ${paginationStartItem}-${paginationEndItem} of ${filteredExpenses.length} expenses` : "No expenses"}</div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1 || itemsPerPage === 'all'}><ChevronLeft className="h-4 w-4 mr-1" /> Previous</Button>
                        <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages || itemsPerPage === 'all'}>Next <ChevronRight className="h-4 w-4 ml-1" /></Button>
                    </div>
                </CardFooter>
            )}
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

