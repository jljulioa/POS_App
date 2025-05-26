
// src/app/api/products/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { z } from 'zod';
import type { Product } from '@/lib/mockData';
import type { ProductCategory } from '@/app/api/categories/route';

const ProductCreateSchema = z.object({
  name: z.string().min(3),
  code: z.string().min(3),
  reference: z.string().min(3),
  barcode: z.string().optional().or(z.literal('')),
  stock: z.coerce.number().int().min(0),
  categoryId: z.coerce.number().int().positive({ message: "Category is required." }),
  brand: z.string().min(2),
  minStock: z.coerce.number().int().min(0),
  maxStock: z.coerce.number().int().min(0).optional(),
  cost: z.coerce.number().min(0),
  price: z.coerce.number().min(0),
  imageUrl: z.string().url().optional().or(z.literal('')),
  dataAiHint: z.string().max(50).optional(),
});

// Helper function to parse product fields from DB strings to numbers, now including category name from join
const parseProductFromDB = (dbProduct: any): Product => {
  // Ensure that numeric fields are parsed correctly and default to 0 if NaN
  const stock = parseInt(String(dbProduct.stock), 10);
  const minStock = parseInt(String(dbProduct.minstock), 10); // DB uses minstock
  const maxStockValue = dbProduct.maxstock !== null && dbProduct.maxstock !== undefined ? String(dbProduct.maxstock) : '0'; // DB uses maxstock
  const maxStock = parseInt(maxStockValue, 10);
  const cost = parseFloat(String(dbProduct.cost));
  const price = parseFloat(String(dbProduct.price));

  return {
    id: String(dbProduct.id),
    name: dbProduct.name,
    code: dbProduct.code,
    reference: dbProduct.reference,
    barcode: dbProduct.barcode,
    stock: !isNaN(stock) ? stock : 0,
    category: dbProduct.category_name || 'N/A', // Use joined category_name from ProductCategories
    categoryId: dbProduct.category_id ? parseInt(dbProduct.category_id, 10) : undefined,
    brand: dbProduct.brand,
    minStock: !isNaN(minStock) ? minStock : 0,
    maxStock: !isNaN(maxStock) ? maxStock : 0,
    cost: !isNaN(cost) ? cost : 0,
    price: !isNaN(price) ? price : 0,
    imageUrl: dbProduct.imageurl, // DB uses imageurl
    dataAiHint: dbProduct.dataaihint, // DB uses dataaihint
    createdAt: dbProduct.createdat ? new Date(dbProduct.createdat).toISOString() : undefined,
    updatedAt: dbProduct.updatedat ? new Date(dbProduct.updatedat).toISOString() : undefined,
  };
};

// GET handler to fetch all products
export async function GET(request: NextRequest) {
  try {
    // Join with ProductCategories to get the category name
    const sql = `
      SELECT
        p.id, p.name, p.code, p.reference, p.barcode, p.stock,
        p.category_id, pc.name AS category_name,
        p.brand, p.minstock, p.maxstock, p.cost, p.price,
        p.imageurl, p.dataaihint, p.createdat, p.updatedat
      FROM Products p
      LEFT JOIN ProductCategories pc ON p.category_id = pc.id
      ORDER BY p.name ASC
    `;
    const dbProducts = await query(sql);
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
        name, code, reference, barcode, stock, categoryId, brand,
        minStock, maxStock, cost, price, imageUrl, dataAiHint
    } = validation.data;

    const finalImageUrl = imageUrl || `https://placehold.co/100x100.png?text=${name.substring(0,3)}`; // Corrected: Removed leading \
    const finalDataAiHint = dataAiHint || (name.split(' ').slice(0,2).join(' ') || "product");

    // The 'id' column is TEXT PRIMARY KEY, so we generate it here (unless changed to SERIAL)
    const id = `P${Date.now()}${Math.random().toString(36).substring(2, 7)}`;

    const sqlInsert = `
      INSERT INTO products (id, name, code, reference, barcode, stock, category_id, brand, minstock, maxstock, cost, price, imageurl, dataaihint)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id, name, code, reference, barcode, stock, category_id, brand, minstock, maxstock, cost, price, imageurl, dataaihint, createdat, updatedat
    `;
    // createdat and updatedat will use database defaults
    const params = [
        id, name, code, reference, barcode ?? null, stock, categoryId, brand,
        minStock,
        maxStock ?? null,
        cost, price,
        finalImageUrl,
        finalDataAiHint
    ];

    const result = await query(sqlInsert, params);
    if (result.length === 0) {
      throw new Error("Product creation failed, no data returned.");
    }

    // Fetch the newly created product along with its category name for accurate response
    // Since RETURNING * from INSERT doesn't give us the joined category_name, we do a separate SELECT.
    const newProductWithCategorySql = `
      SELECT
        p.id, p.name, p.code, p.reference, p.barcode, p.stock,
        p.category_id, pc.name AS category_name,
        p.brand, p.minstock, p.maxstock, p.cost, p.price,
        p.imageurl, p.dataaihint, p.createdat, p.updatedat
      FROM Products p
      LEFT JOIN ProductCategories pc ON p.category_id = pc.id
      WHERE p.id = $1
    `;
    const newProductData = await query(newProductWithCategorySql, [result[0].id]);
    if (newProductData.length === 0) {
      throw new Error("Failed to fetch newly created product with category details.");
    }
    const newProduct: Product = parseProductFromDB(newProductData[0]);

    return NextResponse.json(newProduct, { status: 201 });

  } catch (error) {
    console.error('Failed to create product:', error);
    if (error instanceof Error && (error as any).code === '23505') { // PostgreSQL unique_violation
        let field = 'code or reference'; // General message
        if ((error as Error).message.includes('products_code_key')) field = 'code';
        // Add other unique constraints checks if needed, e.g., for reference if it's unique
        return NextResponse.json({ message: `Failed to create product: Product ${field} might already exist.`, error: (error as Error).message }, { status: 409 });
    }
    return NextResponse.json({ message: 'Failed to create product', error: (error as Error).message }, { status: 500 });
  }
}
    