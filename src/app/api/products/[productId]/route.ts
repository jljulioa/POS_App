
// src/app/api/products/[productId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { z } from 'zod';
import type { Product } from '@/lib/mockData';

// Zod schema for product update, similar to creation but all fields can be optional for partial updates if needed
// For now, let's assume a full update is required or use .partial() if partial updates are desired.
const ProductUpdateSchema = z.object({
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

const parseProductFromDB = (dbProduct: any): Product => {
  if (!dbProduct) return null as any; // Handle case where product might not be found
  return {
    id: dbProduct.id,
    name: dbProduct.name,
    code: dbProduct.code,
    reference: dbProduct.reference,
    barcode: dbProduct.barcode,
    stock: parseInt(dbProduct.stock, 10),
    category: dbProduct.category,
    brand: dbProduct.brand,
    minStock: parseInt(dbProduct.minstock, 10),
    maxStock: dbProduct.maxstock !== null ? parseInt(dbProduct.maxstock, 10) : 0,
    cost: parseFloat(dbProduct.cost),
    price: parseFloat(dbProduct.price),
    imageUrl: dbProduct.imageurl,
    dataAiHint: dbProduct.dataaihint,
  };
};

// GET handler to fetch a single product by ID
export async function GET(request: NextRequest, { params }: { params: { productId: string } }) {
  const { productId } = params;
  try {
    const dbProducts = await query('SELECT id, name, code, reference, barcode, stock, category, brand, minstock, maxstock, cost, price, imageurl, dataaihint FROM Products WHERE id = $1', [productId]);
    if (dbProducts.length === 0) {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }
    const product: Product = parseProductFromDB(dbProducts[0]);
    return NextResponse.json(product);
  } catch (error) {
    console.error(`Failed to fetch product ${productId}:`, error);
    return NextResponse.json({ message: 'Failed to fetch product', error: (error as Error).message }, { status: 500 });
  }
}

// PUT handler to update an existing product
export async function PUT(request: NextRequest, { params }: { params: { productId: string } }) {
  const { productId } = params;
  try {
    const body = await request.json();
    const validation = ProductUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid product data', errors: validation.error.format() }, { status: 400 });
    }

    const {
        name, code, reference, barcode, stock, category, brand,
        minStock, maxStock, cost, price, imageUrl, dataAiHint
    } = validation.data;

    const finalImageUrl = imageUrl || `https://placehold.co/100x100.png?text=${name.substring(0,3)}`;
    const finalDataAiHint = dataAiHint || (name.split(' ').slice(0,2).join(' ') || "product");

    const sql = `
      UPDATE products
      SET name = $1, code = $2, reference = $3, barcode = $4, stock = $5, category = $6, brand = $7,
          minstock = $8, maxstock = $9, cost = $10, price = $11, imageurl = $12, dataaihint = $13
      WHERE id = $14
      RETURNING *
    `;
    const queryParams = [
        name, code, reference, barcode ?? null, stock, category, brand,
        minStock, maxStock ?? null, cost, price,
        finalImageUrl, finalDataAiHint, productId
    ];

    const result = await query(sql, queryParams);
    if (result.length === 0) {
        return NextResponse.json({ message: 'Product not found or update failed' }, { status: 404 });
    }
    const updatedProduct: Product = parseProductFromDB(result[0]);

    return NextResponse.json(updatedProduct, { status: 200 });

  } catch (error) {
    console.error(`Failed to update product ${productId}:`, error);
    if (error instanceof Error && (error as any).code === '23505') { // PostgreSQL unique_violation for 'code'
        return NextResponse.json({ message: 'Failed to update product: Product code might already exist for another product.', error: (error as Error).message }, { status: 409 });
    }
    return NextResponse.json({ message: 'Failed to update product', error: (error as Error).message }, { status: 500 });
  }
}

// DELETE handler to remove a product
export async function DELETE(request: NextRequest, { params }: { params: { productId: string } }) {
  const { productId } = params;
  try {
    // Before deleting, you might want to check if the product is part of any sales records
    // or other entities, depending on your foreign key constraints (e.g., SET NULL, RESTRICT).
    // For simplicity, we'll directly attempt deletion here.
    // If there are foreign key constraints that prevent deletion, the query will fail.
    const result = await query('DELETE FROM Products WHERE id = $1 RETURNING id', [productId]);

    if (result.length === 0) {
      return NextResponse.json({ message: 'Product not found or already deleted' }, { status: 404 });
    }

    return NextResponse.json({ message: `Product ${productId} deleted successfully` }, { status: 200 });
  } catch (error) {
    console.error(`Failed to delete product ${productId}:`, error);
    // Handle potential foreign key violation errors if the product is referenced elsewhere
    // PostgreSQL error code for foreign_key_violation is '23503'
    if (error instanceof Error && (error as any).code === '23503') {
        return NextResponse.json({ message: 'Failed to delete product: It is referenced in other records (e.g., sales).', error: (error as Error).message }, { status: 409 });
    }
    return NextResponse.json({ message: 'Failed to delete product', error: (error as Error).message }, { status: 500 });
  }
}
