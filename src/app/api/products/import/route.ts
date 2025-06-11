
// src/app/api/products/import/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query, getPool } from '@/lib/db';
import { z } from 'zod';

// Schema for a single product item in the import array
// Ensure this aligns with the fields you expect from the CSV and want to process.
// 'id' is not included as it's generated or determined by upsert logic.
// 'category' string is not included, as we should use 'categoryId'.
const ProductImportItemSchema = z.object({
  name: z.string().min(1, "Product name is required."),
  code: z.string().min(1, "Product code is required."),
  reference: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  stock: z.number().int().min(0),
  category_id: z.number().int().positive().optional().nullable(), // Changed from categoryId
  brand: z.string().optional().nullable(),
  minStock: z.number().int().min(0),
  maxStock: z.number().int().min(0).optional().nullable().default(0), // Added default
  cost: z.number().min(0),
  price: z.number().min(0),
  imageUrl: z.string().url().optional().nullable(),
  dataAiHint: z.string().max(50).optional().nullable(),
});


const ProductImportSchema = z.array(ProductImportItemSchema);

export async function POST(request: NextRequest) {
  const pool = await getPool();
  const client = await pool.connect();
  let body: any; // To safely access body in final catch block

  try {
    body = await request.json();
    const validation = ProductImportSchema.safeParse(body);

    if (!validation.success) {
      console.error("Product import validation error:", validation.error.format());
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid product data received.', 
        errors: validation.error.format(),
        createdCount: 0, updatedCount: 0, errorCount: Array.isArray(body) ? body.length : 0
      }, { status: 400 });
    }

    const productsToImport = validation.data;
    let createdCount = 0;
    let updatedCount = 0;
    const detailedErrors: Array<{ row?: number; productCode?: string; error: string }> = [];

    await client.query('BEGIN');

    for (let i = 0; i < productsToImport.length; i++) {
      const productData = productsToImport[i];
      try {
        // Check if categoryId exists, if provided
        if (productData.category_id) {
          const categoryExists = await client.query('SELECT id FROM productcategories WHERE id = $1', [productData.category_id]);
          if (categoryExists.rowCount === 0) {
            detailedErrors.push({ row: i + 1, productCode: productData.code, error: `Category ID ${productData.category_id} does not exist.` });
            continue; // Skip this product
          }
        }
        
        const finalImageUrl = productData.imageUrl || `https://placehold.co/100x100.png?text=${productData.name.substring(0,3)}`;
        const finalDataAiHint = productData.dataAiHint || (productData.name.split(' ').slice(0,2).join(' ') || "product");


        // Check if product exists by code
        const existingProductResult = await client.query('SELECT id FROM products WHERE code = $1', [productData.code]);

        if (existingProductResult.rowCount > 0) {
          // Product exists, update it
          const existingProductId = existingProductResult.rows[0].id;
          const updateSql = `
            UPDATE products
            SET name = $1, reference = $2, barcode = $3, stock = $4, category_id = $5, brand = $6,
                minstock = $7, maxstock = $8, cost = $9, price = $10, imageurl = $11, dataaihint = $12
            WHERE id = $13
          `;
          await client.query(updateSql, [
            productData.name,
            productData.reference || productData.code,
            productData.barcode,
            productData.stock,
            productData.category_id,
            productData.brand,
            productData.minStock,
            productData.maxStock ?? 0, // Use ?? 0
            productData.cost,
            productData.price,
            finalImageUrl,
            finalDataAiHint,
            existingProductId
          ]);
          updatedCount++;
        } else {
          // Product does not exist, insert it
          const newProductId = `P${Date.now()}${Math.random().toString(36).substring(2, 7)}`; // Generate ID if not serial
          const insertSql = `
            INSERT INTO products (id, name, code, reference, barcode, stock, category_id, brand, minstock, maxstock, cost, price, imageurl, dataaihint)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          `;
          await client.query(insertSql, [
            newProductId,
            productData.name,
            productData.code,
            productData.reference || productData.code,
            productData.barcode,
            productData.stock,
            productData.category_id,
            productData.brand,
            productData.minStock,
            productData.maxStock ?? 0, // Use ?? 0
            productData.cost,
            productData.price,
            finalImageUrl,
            finalDataAiHint
          ]);
          createdCount++;
        }
      } catch (itemError: any) {
        detailedErrors.push({ 
          row: i + 1, 
          productCode: productData.code, 
          error: itemError.message || 'Unknown error processing this item.' 
        });
      }
    }

    if (detailedErrors.length > 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({
        success: false,
        message: `Import process completed with ${detailedErrors.length} errors. No changes were saved.`,
        createdCount: 0,
        updatedCount: 0,
        errorCount: detailedErrors.length,
        errors: detailedErrors,
      }, { status: 400 }); // Or 207 Multi-Status if partial success was allowed
    } else {
      await client.query('COMMIT');
      return NextResponse.json({
        success: true,
        message: `Successfully imported products. Created: ${createdCount}, Updated: ${updatedCount}.`,
        createdCount,
        updatedCount,
        errorCount: 0,
      }, { status: 200 });
    }

  } catch (error: any) {
    await client.query('ROLLBACK').catch(rbError => console.error('Rollback failed:', rbError));
    console.error('Product import general error:', error);
    const errorCountForResponse = (typeof body === 'object' && Array.isArray(body)) ? body.length : 0;
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to import products due to a server error.', 
      error: error.message,
      createdCount: 0, updatedCount: 0, errorCount: errorCountForResponse
    }, { status: 500 });
  } finally {
    client.release();
  }
}

