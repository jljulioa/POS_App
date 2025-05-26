
// src/app/api/products/[productId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { z } from 'zod';
import type { Product } from '@/lib/mockData';

const ProductUpdateSchema = z.object({
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
  if (!dbProduct) return null as any; // Should not happen if query is correct
  const stock = parseInt(String(dbProduct.stock), 10);
  const minStock = parseInt(String(dbProduct.minstock), 10);
  const maxStockValue = dbProduct.maxstock !== null && dbProduct.maxstock !== undefined ? dbProduct.maxstock : '0'; // Default to '0' string if null
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
    category: dbProduct.category_name || 'N/A', // Use joined category_name
    categoryId: dbProduct.category_id ? parseInt(dbProduct.category_id, 10) : undefined,
    brand: dbProduct.brand,
    minStock: !isNaN(minStock) ? minStock : 0,
    maxStock: !isNaN(maxStock) ? maxStock : 0,
    cost: !isNaN(cost) ? cost : 0,
    price: !isNaN(price) ? price : 0,
    imageUrl: dbProduct.imageurl,
    dataAiHint: dbProduct.dataaihint,
    createdAt: dbProduct.createdat ? new Date(dbProduct.createdat).toISOString() : undefined,
    updatedAt: dbProduct.updatedat ? new Date(dbProduct.updatedat).toISOString() : undefined,
  };
};


// GET handler to fetch a single product by ID
export async function GET(request: NextRequest, { params }: { params: { productId: string } }) {
  const { productId } = params;
  try {
    const sql = \`
      SELECT
        p.id, p.name, p.code, p.reference, p.barcode, p.stock,
        p.category_id, pc.name AS category_name,
        p.brand, p.minstock, p.maxstock, p.cost, p.price,
        p.imageurl, p.dataaihint, p.createdat, p.updatedat
      FROM Products p
      LEFT JOIN ProductCategories pc ON p.category_id = pc.id
      WHERE p.id = $1
    \`;
    const dbProducts = await query(sql, [productId]);
    if (dbProducts.length === 0) {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }
    const product: Product = parseProductFromDB(dbProducts[0]);
    return NextResponse.json(product);
  } catch (error) {
    console.error(\`Failed to fetch product \${productId}:\`, error);
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
        name, code, reference, barcode, stock, categoryId, brand,
        minStock, maxStock, cost, price, imageUrl, dataAiHint
    } = validation.data;

    const finalImageUrl = imageUrl || \`https://placehold.co/100x100.png?text=\${name.substring(0,3)}\`;
    const finalDataAiHint = dataAiHint || (name.split(' ').slice(0,2).join(' ') || "product");

    // Note: 'updatedat' is handled by database trigger
    const sqlUpdate = \`
      UPDATE products
      SET name = $1, code = $2, reference = $3, barcode = $4, stock = $5, category_id = $6, brand = $7,
          minstock = $8, maxstock = $9, cost = $10, price = $11, imageurl = $12, dataaihint = $13
      WHERE id = $14
      RETURNING id
    \`;
    const queryParams = [
        name, code, reference, barcode ?? null, stock, categoryId, brand,
        minStock, maxStock ?? null, cost, price,
        finalImageUrl, finalDataAiHint, productId
    ];

    const result = await query(sqlUpdate, queryParams);
    if (result.length === 0) {
        return NextResponse.json({ message: 'Product not found or update failed' }, { status: 404 });
    }

    // Fetch the updated product with its category name for accurate response
    const updatedProductWithCategorySql = \`
      SELECT
        p.id, p.name, p.code, p.reference, p.barcode, p.stock,
        p.category_id, pc.name AS category_name,
        p.brand, p.minstock, p.maxstock, p.cost, p.price,
        p.imageurl, p.dataaihint, p.createdat, p.updatedat
      FROM Products p
      LEFT JOIN ProductCategories pc ON p.category_id = pc.id
      WHERE p.id = $1
    \`;
    const updatedProductData = await query(updatedProductWithCategorySql, [result[0].id]);
    if (updatedProductData.length === 0) {
      throw new Error("Failed to fetch updated product with category details after update.");
    }
    const updatedProduct: Product = parseProductFromDB(updatedProductData[0]);

    return NextResponse.json(updatedProduct, { status: 200 });

  } catch (error) {
    console.error(\`Failed to update product \${productId}:\`, error);
    if (error instanceof Error && (error as any).code === '23505') {
        return NextResponse.json({ message: 'Failed to update product: Product code might already exist for another product.', error: (error as Error).message }, { status: 409 });
    }
    return NextResponse.json({ message: 'Failed to update product', error: (error as Error).message }, { status: 500 });
  }
}

// DELETE handler to remove a product
export async function DELETE(request: NextRequest, { params }: { params: { productId: string } }) {
  const { productId } = params;
  try {
    const result = await query('DELETE FROM Products WHERE id = $1 RETURNING id', [productId]);

    if (result.length === 0) {
      return NextResponse.json({ message: 'Product not found or already deleted' }, { status: 404 });
    }

    return NextResponse.json({ message: \`Product \${productId} deleted successfully\` }, { status: 200 });
  } catch (error) {
    console.error(\`Failed to delete product \${productId}:\`, error);
    // PostgreSQL error code for foreign_key_violation is '23503'
    if (error instanceof Error && (error as any).code === '23503') {
        return NextResponse.json({ message: 'Failed to delete product: It is referenced in other records (e.g., sales).', error: (error as Error).message }, { status: 409 });
    }
    return NextResponse.json({ message: 'Failed to delete product', error: (error as Error).message }, { status: 500 });
  }
}
