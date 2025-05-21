
// src/app/api/products/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { z } from 'zod';
import type { Product } from '@/lib/mockData';

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

// Helper function to parse product fields from DB strings to numbers
// PostgreSQL stores unquoted identifiers in lowercase.
const parseProductFromDB = (dbProduct: any): Product => {
  return {
    id: dbProduct.id,
    name: dbProduct.name,
    code: dbProduct.code,
    reference: dbProduct.reference,
    barcode: dbProduct.barcode,
    stock: parseInt(dbProduct.stock, 10),
    category: dbProduct.category,
    brand: dbProduct.brand,
    minStock: parseInt(dbProduct.minstock, 10), // from minStock in DDL
    maxStock: dbProduct.maxstock !== null ? parseInt(dbProduct.maxstock, 10) : 0, // from maxStock in DDL
    cost: parseFloat(dbProduct.cost),
    price: parseFloat(dbProduct.price),
    imageUrl: dbProduct.imageurl, // from imageUrl in DDL
    dataAiHint: dbProduct.dataaihint, // from dataAiHint in DDL
  };
};

// GET handler to fetch all products
export async function GET(request: NextRequest) {
  try {
    // Use lowercase column names as PostgreSQL folds unquoted identifiers to lowercase
    const dbProducts = await query('SELECT id, name, code, reference, barcode, stock, category, brand, minstock, maxstock, cost, price, imageurl, dataaihint FROM Products ORDER BY name ASC');
    const products: Product[] = dbProducts.map(parseProductFromDB);
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
    } = validation.data; // These are mixedCase from Zod/frontend

    const id = `P${Date.now()}${Math.random().toString(36).substring(2, 7)}`;
    const finalImageUrl = imageUrl || `https://placehold.co/100x100.png?text=${name.substring(0,3)}`;
    const finalDataAiHint = dataAiHint || (name.split(' ').slice(0,2).join(' ') || "product");

    // Use lowercase column names for INSERT statement, matching PostgreSQL's handling of unquoted DDL identifiers
    const sql = `
      INSERT INTO products (id, name, code, reference, barcode, stock, category, brand, minstock, maxstock, cost, price, imageurl, dataaihint)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;
    const params = [
        id, name, code, reference, barcode ?? null, stock, category, brand, 
        minStock, // JS variable minStock (mixedCase) goes to minstock column
        maxStock ?? null, // JS variable maxStock (mixedCase) goes to maxstock column
        cost, price, 
        finalImageUrl, // JS variable finalImageUrl goes to imageurl column
        finalDataAiHint // JS variable finalDataAiHint goes to dataaihint column
    ];
    
    const result = await query(sql, params);
    const dbNewProduct = result[0];
    const newProduct: Product = parseProductFromDB(dbNewProduct);

    return NextResponse.json(newProduct, { status: 201 });

  } catch (error) {
    console.error('Failed to create product:', error);
    if (error instanceof Error && (error as any).code === '23505') { // PostgreSQL unique_violation for 'code' typically
        return NextResponse.json({ message: 'Failed to create product: Product code might already exist.', error: (error as Error).message }, { status: 409 });
    }
    return NextResponse.json({ message: 'Failed to create product', error: (error as Error).message }, { status: 500 });
  }
}

