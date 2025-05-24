
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
import { Calendar as CalendarIcon, DollarSign, PlusCircle, Save, Loader2, AlertTriangle, ListFilter } from 'lucide-react';
import { Calendar } from "@/components/ui/calendar";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, isValid } from 'date-fns';
import type { DailyExpense, ExpenseCategoryEnum } from '@/lib/mockData';
import { expenseCategories } from '@/lib/mockData'; // Import predefined categories
import React, { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";

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

// API fetch function for expenses for a specific date
const fetchExpenses = async (date: Date): Promise<DailyExpense[]> => {
  const formattedDate = format(date, 'yyyy-MM-dd');
  const res = await fetch(`/api/expenses?date=${formattedDate}`);
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
  const [filterDate, setFilterDate] = useState<Date>(new Date());

  const { data: expenses = [], isLoading: isLoadingExpenses, error: expensesError, refetch: refetchExpenses } = useQuery<DailyExpense[], Error>({
    queryKey: ['expenses', format(filterDate, 'yyyy-MM-dd')],
    queryFn: () => fetchExpenses(filterDate),
  });

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(ExpenseFormSchema),
    defaultValues: defaultFormValues,
  });

  const addMutation = useMutation<DailyExpense, Error, ExpenseFormValues>({
    mutationFn: addExpenseAPI,
    onSuccess: (data) => {
      toast({ title: "Expense Added", description: `${data.description} has been successfully recorded.` });
      queryClient.invalidateQueries({ queryKey: ['expenses', format(data.expenseDate ? parseISO(data.expenseDate) : filterDate, 'yyyy-MM-dd')] });
      // If the added expense's date is the current filterDate, refetch immediately
      if (format(data.expenseDate ? parseISO(data.expenseDate) : new Date() , 'yyyy-MM-dd') === format(filterDate, 'yyyy-MM-dd')) {
        refetchExpenses();
      }
      form.reset(defaultFormValues); // Reset form to default
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Failed to Add Expense", description: error.message });
    },
  });

  const onSubmit = (data: ExpenseFormValues) => {
    addMutation.mutate(data);
  };

  const totalExpensesForDay = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  useEffect(() => {
    refetchExpenses();
  }, [filterDate, refetchExpenses]);


  return (
    <AppLayout>
      <PageHeader title="Daily Expenses" description="Track and manage your daily operational costs.">
        <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[200px] justify-start text-left font-normal",
                    !filterDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filterDate ? format(filterDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={filterDate}
                  onSelect={(date) => date && setFilterDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
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
                        <FormLabel>Amount ($) *</FormLabel>
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
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center"><DollarSign className="mr-2 h-5 w-5 text-primary"/>Expenses for {format(filterDate, "PPP")}</span>
                <span className="text-lg font-semibold text-primary">Total: ${totalExpensesForDay.toFixed(2)}</span>
              </CardTitle>
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
              {!isLoadingExpenses && !expensesError && expenses.length === 0 && (
                <p className="text-muted-foreground text-center py-4">No expenses recorded for this day.</p>
              )}
              {!isLoadingExpenses && !expensesError && expenses.length > 0 && (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead>Recorded At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expenses.map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell className="font-medium">{expense.description}</TableCell>
                          <TableCell>{expense.category}</TableCell>
                          <TableCell className="text-right">${expense.amount.toFixed(2)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{expense.notes || 'N/A'}</TableCell>
                           <TableCell className="text-sm">{format(parseISO(expense.createdAt), 'p')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
