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
    const products = await query('SELECT * FROM Products');
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

    // Generate a simple unique ID (in a real app, UUID or database auto-increment is better)
    const id = `P${Date.now()}`;
    const finalImageUrl = imageUrl || `https://placehold.co/100x100.png?text=${name.substring(0,3)}`;
    const finalDataAiHint = dataAiHint || (name.split(' ').slice(0,2).join(' ') || "product");


    const sql = `
      INSERT INTO Products (id, name, code, reference, barcode, stock, category, brand, minStock, maxStock, cost, price, imageUrl, dataAiHint)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
        id, name, code, reference, barcode ?? null, stock, category, brand, 
        minStock, maxStock ?? null, cost, price, finalImageUrl, finalDataAiHint
    ];
    
    await query(sql, params);

    // Construct the newly created product object to return, matching the Product type
    const newProduct: Product = {
      id,
      name,
      code,
      reference,
      barcode: barcode ?? undefined,
      stock,
      category,
      brand,
      minStock,
      maxStock: maxStock ?? 0, // Ensure maxStock is a number
      cost,
      price,
      imageUrl: finalImageUrl,
      dataAiHint: finalDataAiHint
    };

    return NextResponse.json(newProduct, { status: 201 });

  } catch (error) {
    console.error('Failed to create product:', error);
    // Check for unique constraint violation (e.g., duplicate product code)
    if (error instanceof Error && (error as any).code === 'ER_DUP_ENTRY') {
        return NextResponse.json({ message: 'Failed to create product: Product code might already exist.', error: (error as Error).message }, { status: 409 });
    }
    return NextResponse.json({ message: 'Failed to create product', error: (error as Error).message }, { status: 500 });
  }
}
