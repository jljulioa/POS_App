
// src/app/api/inventory/adjust/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db'; // Using getPool to manage connections
import { z } from 'zod';

const AdjustmentSchema = z.object({
  productId: z.string().min(1, "Product ID is required."),
  newPhysicalCount: z.coerce.number().int().min(0, "New physical count must be a non-negative integer."),
  notes: z.string().optional().or(z.literal('')),
});

export async function POST(request: NextRequest) {
  const pool = await getPool();
  const client = await pool.connect();

  try {
    const body = await request.json();
    const validation = AdjustmentSchema.safeParse(body);

    if (!validation.success) {
      client.release();
      return NextResponse.json({ message: 'Invalid adjustment data', errors: validation.error.format() }, { status: 400 });
    }

    const { productId, newPhysicalCount, notes } = validation.data;

    await client.query('BEGIN');

    // Fetch current product details and lock the row
    const productResult = await client.query(
      'SELECT id, name, stock FROM Products WHERE id = $1 FOR UPDATE',
      [productId]
    );

    if (productResult.rowCount === 0) {
      await client.query('ROLLBACK');
      client.release();
      return NextResponse.json({ message: `Product with ID ${productId} not found.` }, { status: 404 });
    }
    const currentProduct = productResult.rows[0];
    const stockBefore = parseInt(currentProduct.stock, 10);
    const productName = currentProduct.name;
    
    // Calculate quantity change
    const quantityChange = newPhysicalCount - stockBefore;

    // Update product stock
    await client.query(
      'UPDATE Products SET stock = $1 WHERE id = $2',
      [newPhysicalCount, productId]
    );

    // Log inventory transaction
    const relatedDocumentId = `ADJ-${Date.now()}`; // Auto-generate a simple related ID
    const transactionNotes = notes || `Physical inventory count adjustment. Change: ${quantityChange}.`;
    
    const transactionSql = `
      INSERT INTO InventoryTransactions (product_id, product_name, transaction_type, quantity_change, stock_before, stock_after, related_document_id, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;
    await client.query(transactionSql, [
      productId,
      productName,
      'Adjustment',
      quantityChange,
      stockBefore,
      newPhysicalCount,
      relatedDocumentId,
      transactionNotes,
    ]);

    await client.query('COMMIT');

    return NextResponse.json({ 
      message: 'Inventory adjusted successfully.',
      productName,
      productId,
      stockBefore,
      stockAfter: newPhysicalCount,
      quantityChange,
      notes: transactionNotes,
      relatedDocumentId
    }, { status: 200 });

  } catch (error) {
    await client.query('ROLLBACK').catch(rbError => console.error("Inventory Adjustment API: Rollback failed", rbError));
    console.error('Failed to adjust inventory:', error);
    return NextResponse.json({ message: 'Failed to adjust inventory', error: (error as Error).message }, { status: 500 });
  } finally {
    client.release();
  }
}
