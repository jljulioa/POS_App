
"use client";

import AppLayout from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { ListPlus, Save, Loader2, AlertTriangle, Edit3, Trash2, Tag } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import type { ProductCategory } from '@/app/api/categories/route';
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
import React, { useState } from 'react';

const CategoryFormSchema = z.object({
  name: z.string().min(2, { message: "Category name must be at least 2 characters." }),
  description: z.string().optional().or(z.literal('')),
});

type CategoryFormValues = z.infer<typeof CategoryFormSchema>;

const defaultValues: Partial<CategoryFormValues> = {
  name: '',
  description: '',
};

// API fetch functions for categories
const fetchCategories = async (): Promise<ProductCategory[]> => {
  const res = await fetch('/api/categories');
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'Network response was not ok and failed to parse error JSON.' }));
    throw new Error(errorData.message || 'Network response was not ok');
  }
  return res.json();
};

// API mutation functions
const addCategory = async (newCategory: CategoryFormValues): Promise<ProductCategory> => {
  const response = await fetch('/api/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newCategory),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to add category' }));
    throw new Error(errorData.message || 'Failed to add category');
  }
  return response.json();
};

const updateCategory = async ({ id, data }: { id: number; data: CategoryFormValues }): Promise<ProductCategory> => {
  const response = await fetch(`/api/categories/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to update category' }));
    throw new Error(errorData.message || 'Failed to update category');
  }
  return response.json();
};

const deleteCategory = async (id: number): Promise<{ message: string }> => {
  const response = await fetch(`/api/categories/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to delete category' }));
    throw new Error(errorData.message || 'Failed to delete category');
  }
  return response.json();
};


export default function CategoriesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<ProductCategory | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { data: categories = [], isLoading: isLoadingCategories, error: categoriesError, isError: isCategoriesError } = useQuery<ProductCategory[], Error>({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(CategoryFormSchema),
    defaultValues,
  });

  const addMutation = useMutation<ProductCategory, Error, CategoryFormValues>({
    mutationFn: addCategory,
    onSuccess: (data) => {
      toast({ title: "Category Added", description: `${data.name} has been added.` });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      form.reset(defaultValues);
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Failed to Add Category", description: error.message });
    },
  });

  const updateMutation = useMutation<ProductCategory, Error, { id: number; data: CategoryFormValues }>({
    mutationFn: updateCategory,
    onSuccess: (data) => {
      toast({ title: "Category Updated", description: `${data.name} has been updated.` });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['category', data.id] });
      handleCancelEdit();
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Failed to Update Category", description: error.message });
    },
  });
  
  const deleteMutation = useMutation<{ message: string }, Error, number>({
    mutationFn: deleteCategory,
    onSuccess: (data, deletedCategoryId) => {
      toast({ title: "Category Deleted", description: data.message });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      if (editingCategory?.id === deletedCategoryId) {
        handleCancelEdit();
      }
      setIsDeleteDialogOpen(false);
      setCategoryToDelete(null);
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Failed to Delete Category", description: error.message });
      setIsDeleteDialogOpen(false);
      setCategoryToDelete(null);
    },
  });

  const onSubmit = (data: CategoryFormValues) => {
    if (formMode === 'edit' && editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data });
    } else {
      addMutation.mutate(data);
    }
  };

  const handleEditClick = (category: ProductCategory) => {
    setEditingCategory(category);
    setFormMode('edit');
    form.reset({
      name: category.name,
      description: category.description || '',
    });
  };

  const handleCancelEdit = () => {
    setFormMode('add');
    setEditingCategory(null);
    form.reset(defaultValues);
  };

  const handleDeleteClick = (category: ProductCategory) => {
    setCategoryToDelete(category);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (categoryToDelete) {
      deleteMutation.mutate(categoryToDelete.id);
    }
  };


  return (
    <AppLayout>
      <PageHeader title="Product Categories" description="Manage your product categories." />

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    {formMode === 'edit' ? <Edit3 className="mr-2 h-6 w-6 text-accent" /> : <ListPlus className="mr-2 h-6 w-6 text-primary" />}
                    {formMode === 'edit' ? 'Edit Category' : 'Add New Category'}
                  </CardTitle>
                  {formMode === 'edit' && editingCategory && <CardDescription>Editing: {editingCategory.name}</CardDescription>}
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Engine Parts" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Brief description of the category" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter className="flex flex-col">
                  <Button type="submit" disabled={addMutation.isPending || updateMutation.isPending} className="w-full">
                    {addMutation.isPending || updateMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    {addMutation.isPending || updateMutation.isPending ? 'Saving...' : (formMode === 'edit' ? 'Update Category' : 'Save Category')}
                  </Button>
                  {formMode === 'edit' && (
                    <Button type="button" variant="outline" onClick={handleCancelEdit} className="w-full mt-2">
                      Cancel Edit
                    </Button>
                  )}
                </CardFooter>
              </Card>
            </form>
          </Form>
        </div>

        <div className="md:col-span-2">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center"><Tag className="mr-2 h-5 w-5 text-primary"/>Existing Categories</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingCategories && (
                <div className="flex justify-center items-center h-40">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}
              {isCategoriesError && (
                <div className="text-destructive p-4 border border-destructive rounded-md">
                  <AlertTriangle className="mr-2 h-5 w-5 inline-block" />
                  Failed to load categories: {categoriesError?.message}
                </div>
              )}
              {!isLoadingCategories && !isCategoriesError && categories.length === 0 && (
                <p className="text-muted-foreground text-center py-4">No categories found. Add one using the form.</p>
              )}
              {!isLoadingCategories && !isCategoriesError && categories.length > 0 && (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Slug</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Created At</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories.map((category) => (
                        <TableRow key={category.id}>
                          <TableCell className="font-medium">{category.name}</TableCell>
                          <TableCell>{category.slug}</TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{category.description || 'N/A'}</TableCell>
                          <TableCell className="text-sm">{format(new Date(category.createdat), 'MMM d, yyyy')}</TableCell>
                          <TableCell className="text-center">
                            <Button variant="ghost" size="icon" className="hover:text-accent" onClick={() => handleEditClick(category)} disabled={deleteMutation.isPending && deleteMutation.variables === category.id}>
                              <Edit3 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="hover:text-destructive" onClick={() => handleDeleteClick(category)} disabled={deleteMutation.isPending && deleteMutation.variables === category.id}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
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
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the category 
              <span className="font-semibold"> {categoryToDelete?.name}</span>. 
              If products are using this category name, you might need to update them separately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCategoryToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {deleteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </AppLayout>
  );
}
    