// src/app/api/products/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { z } from 'zod';
import type { Product } from '@/lib/mockData'; // Using the existing Product type

// Zod schema for product creation, matching the frontend form
const ProductCreateSchema = z.object({
  name: z.string().min(3),
  code: z.string().min(3),
  reference: z.string().min(3),
  barcode: z.string().optional(),
  stock: z.coerce.number().int().min(0),
  category: z.string().min(2),
  brand: z.string().min(2),
  minStock: z.coerce.number().int().min(0),
  maxStock: z.coerce.number().int().min(0).optional(),
  cost: z.coerce.number().min(0),
  price: z.coerce.number().min(0),
  imageUrl: z.string().url().optional().or(z.literal('')),
  dataAiHint: z.string().max(50).optional(),
});

// GET handler to fetch all products
export async function GET(request: NextRequest) {
  try {
    const products = await query('SELECT * FROM Products ORDER BY name ASC');
    return NextResponse.json(products);
  } catch (error) {
    console.error('Failed to fetch products:', error);
    return NextResponse.json({ message: 'Failed to fetch products', error: (error as Error).message }, { status: 500 });
  }
}

// POST handler to add a new product
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = ProductCreateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid product data', errors: validation.error.format() }, { status: 400 });
    }

    const { 
        name, code, reference, barcode, stock, category, brand, 
        minStock, maxStock, cost, price, imageUrl, dataAiHint 
    } = validation.data;

    // Generate a simple unique ID (in a real app, UUID or database auto-increment is better for primary keys not managed by DB)
    // For PostgreSQL, if 'id' is SERIAL or similar, you might not need to generate it here if the table is set up for auto-generation.
    // Assuming 'id' is a TEXT field that we provide for now.
    const id = `P${Date.now()}${Math.random().toString(36).substring(2, 7)}`;
    const finalImageUrl = imageUrl || `https://placehold.co/100x100.png?text=${name.substring(0,3)}`;
    const finalDataAiHint = dataAiHint || (name.split(' ').slice(0,2).join(' ') || "product");


    const sql = `
      INSERT INTO Products (id, name, code, reference, barcode, stock, category, brand, minStock, maxStock, cost, price, imageUrl, dataAiHint)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;
    const params = [
        id, name, code, reference, barcode ?? null, stock, category, brand, 
        minStock, maxStock ?? null, cost, price, finalImageUrl, finalDataAiHint
    ];
    
    const result = await query(sql, params);
    const newProduct: Product = result[0]; // pg driver returns an array of rows

    return NextResponse.json(newProduct, { status: 201 });

  } catch (error) {
    console.error('Failed to create product:', error);
    // Check for unique constraint violation (e.g., duplicate product code)
    // PostgreSQL error code for unique_violation is '23505'
    if (error instanceof Error && (error as any).code === '23505') {
        return NextResponse.json({ message: 'Failed to create product: Product code might already exist.', error: (error as Error).message }, { status: 409 });
    }
    return NextResponse.json({ message: 'Failed to create product', error: (error as Error).message }, { status: 500 });
  }
}
