
// src/app/api/categories/[categoryId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { z } from 'zod';
import type { ProductCategory } from '@/app/api/categories/route'; // Using existing type

// Helper function to generate a URL-friendly slug (consistent with the main categories route)
const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

const CategoryUpdateSchema = z.object({
  name: z.string().min(2, { message: "Category name must be at least 2 characters." }),
  description: z.string().optional().or(z.literal('')),
});

// GET handler to fetch a single category by ID
export async function GET(request: NextRequest, { params }: { params: { categoryId: string } }) {
  const { categoryId: rawCategoryId } = params;
  
  if (!rawCategoryId || isNaN(parseInt(rawCategoryId, 10))) {
      return NextResponse.json({ message: 'Invalid category ID format' }, { status: 400 });
  }
  const numericCategoryId = parseInt(rawCategoryId, 10);

  try {
    // Use lowercase 'createdat' and 'updatedat' as per PostgreSQL default casing for unquoted identifiers
    const dbCategories = await query('SELECT id, name, slug, description, createdat, updatedat FROM ProductCategories WHERE id = $1', [numericCategoryId]);
    if (dbCategories.length === 0) {
      return NextResponse.json({ message: 'Category not found' }, { status: 404 });
    }
    
    const dbCategory = dbCategories[0];
    const category: ProductCategory = {
        id: parseInt(dbCategory.id, 10),
        name: dbCategory.name,
        slug: dbCategory.slug,
        description: dbCategory.description,
        createdat: new Date(dbCategory.createdat).toISOString(), // Ensure lowercase access
        updatedat: new Date(dbCategory.updatedat).toISOString(), // Ensure lowercase access
    };
    return NextResponse.json(category);
  } catch (error) {
    console.error(`Failed to fetch category ${numericCategoryId}:`, error);
    return NextResponse.json({ message: 'Failed to fetch category', error: (error as Error).message }, { status: 500 });
  }
}

// PUT handler to update an existing category
export async function PUT(request: NextRequest, { params }: { params: { categoryId: string } }) {
  const { categoryId: rawCategoryId } = params;

  if (!rawCategoryId || isNaN(parseInt(rawCategoryId, 10))) {
    return NextResponse.json({ message: 'Invalid category ID format' }, { status: 400 });
  }
  const numericCategoryId = parseInt(rawCategoryId, 10);

  try {
    const body = await request.json();
    const validation = CategoryUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid category data', errors: validation.error.format() }, { status: 400 });
    }

    const { name, description } = validation.data;
    const newSlug = generateSlug(name);

    // Rely on database trigger for 'updatedat'
    const sql = `
      UPDATE ProductCategories
      SET name = $1, slug = $2, description = $3
      WHERE id = $4
      RETURNING *
    `;
    const queryParams = [name, newSlug, description || null, numericCategoryId];

    const result = await query(sql, queryParams);
    if (result.length === 0) {
        return NextResponse.json({ message: 'Category not found or update failed' }, { status: 404 });
    }
    
    const dbUpdatedCategory = result[0];
    const updatedCategory: ProductCategory = {
        id: parseInt(dbUpdatedCategory.id, 10),
        name: dbUpdatedCategory.name,
        slug: dbUpdatedCategory.slug,
        description: dbUpdatedCategory.description,
        createdat: new Date(dbUpdatedCategory.createdat).toISOString(),
        updatedat: new Date(dbUpdatedCategory.updatedat).toISOString(),
    };

    return NextResponse.json(updatedCategory, { status: 200 });

  } catch (error) {
    console.error(`Failed to update category ${numericCategoryId}:`, error);
    if (error instanceof Error && (error as any).code === '23505') { // Unique constraint violation
        let field = 'name or slug';
        if ((error as Error).message.includes('productcategories_name_key')) field = 'name';
        if ((error as Error).message.includes('productcategories_slug_key')) field = 'slug';
        return NextResponse.json({ message: `Failed to update category: The ${field} might already exist for another category.`, error: (error as Error).message }, { status: 409 });
    }
    return NextResponse.json({ message: 'Failed to update category', error: (error as Error).message }, { status: 500 });
  }
}

// DELETE handler to remove a category
export async function DELETE(request: NextRequest, { params }: { params: { categoryId: string } }) {
  const { categoryId: rawCategoryId } = params;

  if (!rawCategoryId || isNaN(parseInt(rawCategoryId, 10))) {
    return NextResponse.json({ message: 'Invalid category ID format' }, { status: 400 });
  }
  const numericCategoryId = parseInt(rawCategoryId, 10);

  try {
    const result = await query('DELETE FROM ProductCategories WHERE id = $1 RETURNING id', [numericCategoryId]);

    if (result.length === 0) {
      return NextResponse.json({ message: 'Category not found or already deleted' }, { status: 404 });
    }

    return NextResponse.json({ message: `Category ${numericCategoryId} deleted successfully` }, { status: 200 });
  } catch (error) {
    console.error(`Failed to delete category ${numericCategoryId}:`, error);
    // PostgreSQL error code for foreign_key_violation is '23503'
    // This might not be directly applicable if Products.category stores names,
    // but good to keep for robustness if schema changes.
    if (error instanceof Error && (error as any).code === '23503') {
        return NextResponse.json({ message: 'Failed to delete category: It might be referenced in other records.', error: (error as Error).message }, { status: 409 });
    }
    return NextResponse.json({ message: 'Failed to delete category', error: (error as Error).message }, { status: 500 });
  }
}
