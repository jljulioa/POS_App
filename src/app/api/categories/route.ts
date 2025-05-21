
// src/app/api/categories/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { z } from 'zod';

// Helper function to generate a URL-friendly slug
const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w-]+/g, '') // Remove all non-word chars
    .replace(/--+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text
};

const CategoryCreateSchema = z.object({
  name: z.string().min(2, { message: "Category name must be at least 2 characters." }),
  description: z.string().optional().or(z.literal('')),
});

export interface ProductCategory {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  createdat: string;
  updatedat: string;
}

// Helper function to parse category fields from DB
const parseCategoryFromDB = (dbCategory: any): ProductCategory => {
  return {
    id: parseInt(dbCategory.id, 10),
    name: dbCategory.name,
    slug: dbCategory.slug,
    description: dbCategory.description,
    createdat: new Date(dbCategory.createdat).toISOString(),
    updatedat: new Date(dbCategory.updatedat).toISOString(),
  };
};

// GET handler to fetch all categories
export async function GET(request: NextRequest) {
  try {
    const dbCategories = await query('SELECT id, name, slug, description, createdat, updatedat FROM ProductCategories ORDER BY name ASC');
    const categories: ProductCategory[] = dbCategories.map(parseCategoryFromDB);
    return NextResponse.json(categories);
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    return NextResponse.json({ message: 'Failed to fetch categories', error: (error as Error).message }, { status: 500 });
  }
}

// POST handler to add a new category
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = CategoryCreateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid category data', errors: validation.error.format() }, { status: 400 });
    }

    const { name, description } = validation.data;
    const slug = generateSlug(name);

    const sql = `
      INSERT INTO ProductCategories (name, slug, description)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const params = [name, slug, description || null];
    
    const result = await query(sql, params);
    const newCategory: ProductCategory = parseCategoryFromDB(result[0]);

    return NextResponse.json(newCategory, { status: 201 });

  } catch (error) {
    console.error('Failed to create category:', error);
    if (error instanceof Error && (error as any).code === '23505') { // PostgreSQL unique_violation (e.g., for name or slug)
        let field = 'name or slug';
        if ((error as Error).message.includes('productcategories_name_key')) field = 'name';
        if ((error as Error).message.includes('productcategories_slug_key')) field = 'slug';
        return NextResponse.json({ message: `Failed to create category: The ${field} might already exist.`, error: (error as Error).message }, { status: 409 });
    }
    return NextResponse.json({ message: 'Failed to create category', error: (error as Error).message }, { status: 500 });
  }
}
