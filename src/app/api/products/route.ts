
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
  barcode: z.string().optional().or(z.literal('')),
  stock: z.coerce.number().int().min(0),
  category: z.string().min(1),
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
  const stock = parseInt(dbProduct.stock, 10);
  const minStock = parseInt(dbProduct.minstock, 10);
  // Ensure maxStock defaults to 0 if null or undefined, then parse.
  const maxStockValue = dbProduct.maxstock !== null && dbProduct.maxstock !== undefined ? dbProduct.maxstock : 0;
  const maxStock = parseInt(String(maxStockValue), 10);
  const cost = parseFloat(dbProduct.cost);
  const price = parseFloat(dbProduct.price);

  return {
    id: String(dbProduct.id), // Ensure ID is a string if it's SERIAL
    name: dbProduct.name,
    code: dbProduct.code,
    reference: dbProduct.reference,
    barcode: dbProduct.barcode,
    stock: !isNaN(stock) ? stock : 0,
    category: dbProduct.category,
    brand: dbProduct.brand,
    minStock: !isNaN(minStock) ? minStock : 0,
    maxStock: !isNaN(maxStock) ? maxStock : 0,
    cost: !isNaN(cost) ? cost : 0, // Ensure cost is a valid number, default to 0
    price: !isNaN(price) ? price : 0, // Ensure price is a valid number, default to 0
    imageUrl: dbProduct.imageurl,
    dataAiHint: dbProduct.dataaihint,
  };
};

// GET handler to fetch all products
export async function GET(request: NextRequest) {
  try {
    // Ensure column names match actual DB schema (likely lowercase if not quoted during DDL)
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
    } = validation.data;

    const finalImageUrl = imageUrl || `https://placehold.co/100x100.png?text=${name.substring(0,3)}`;
    const finalDataAiHint = dataAiHint || (name.split(' ').slice(0,2).join(' ') || "product");

    const sql = `
      INSERT INTO products (name, code, reference, barcode, stock, category, brand, minstock, maxstock, cost, price, imageurl, dataaihint)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;
    const params = [
        name, code, reference, barcode ?? null, stock, category, brand,
        minStock,
        maxStock ?? null, // Ensure maxStock is handled correctly if optional
        cost, price,
        finalImageUrl,
        finalDataAiHint
    ];

    const result = await query(sql, params);
    if (result.length === 0) {
      throw new Error("Product creation failed, no data returned.");
    }
    const dbNewProduct = result[0];
    const newProduct: Product = parseProductFromDB(dbNewProduct);

    return NextResponse.json(newProduct, { status: 201 });

  } catch (error) {
    console.error('Failed to create product:', error);
    if (error instanceof Error && (error as any).code === '23505') {
        return NextResponse.json({ message: 'Failed to create product: Product code might already exist.', error: (error as Error).message }, { status: 409 });
    }
    return NextResponse.json({ message: 'Failed to create product', error: (error as Error).message }, { status: 500 });
  }
}
