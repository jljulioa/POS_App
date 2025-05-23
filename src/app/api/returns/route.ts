
// src/app/api/returns/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPool, query as executeQuery } from '@/lib/db';
import { z } from 'zod';
import type { Product } from '@/lib/mockData';

const ReturnItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().min(1, "Return quantity must be at least 1."),
  unitPrice: z.number().min(0), // Used for refund calculation, not direct DB storage in a 'returns' table for now
});

const ProcessReturnSchema = z.object({
  saleId: z.string(),
  itemsToReturn: z.array(ReturnItemSchema).min(1, "At least one item must be selected for return."),
});

export async function POST(request: NextRequest) {
  const pool = await getPool();
  const client = await pool.connect();

  try {
    const body = await request.json();
    const validation = ProcessReturnSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid return data', errors: validation.error.format() }, { status: 400 });
    }

    const { saleId, itemsToReturn } = validation.data;

    await client.query('BEGIN');

    // Fetch original sale items to validate quantities
    const originalSaleItemsResult = await client.query(
      'SELECT product_id, quantity, productName FROM SaleItems WHERE sale_id = $1',
      [saleId]
    );
    const originalSaleItemsMap = new Map(originalSaleItemsResult.rows.map(item => [item.product_id, { quantity: item.quantity, productName: item.productname }]));

    let totalRefundAmount = 0;

    for (const item of itemsToReturn) {
      const originalItem = originalSaleItemsMap.get(item.productId);

      if (!originalItem) {
        await client.query('ROLLBACK');
        return NextResponse.json({ message: `Product ID ${item.productId} not found in original sale ${saleId}.` }, { status: 400 });
      }

      if (item.quantity > originalItem.quantity) {
        await client.query('ROLLBACK');
        return NextResponse.json({ message: `Cannot return ${item.quantity} of ${originalItem.productName}. Only ${originalItem.quantity} purchased in sale ${saleId}.` }, { status: 400 });
      }

      // Fetch current product details for stock update and transaction log
      const productResult = await client.query('SELECT stock, name FROM Products WHERE id = $1 FOR UPDATE', [item.productId]);
      if (productResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ message: `Product ${originalItem.productName} (ID: ${item.productId}) not found.` }, { status: 404 });
      }
      const currentProduct = productResult.rows[0];
      const stockBefore = currentProduct.stock;
      const stockAfter = stockBefore + item.quantity;

      // Increment product stock
      await client.query(
        'UPDATE Products SET stock = stock + $1 WHERE id = $2',
        [item.quantity, item.productId]
      );
      
      totalRefundAmount += item.quantity * item.unitPrice;

      // Log inventory transaction
      const transactionSql = `
        INSERT INTO InventoryTransactions (product_id, product_name, transaction_type, quantity_change, stock_before, stock_after, related_document_id, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;
      await client.query(transactionSql, [
        item.productId,
        originalItem.productName, // Use product name from original sale item
        'Return',
        item.quantity, // Positive for return
        stockBefore,
        stockAfter,
        saleId,
        `Return of ${item.quantity} units from sale ${saleId}.`
      ]);
    }

    // Here you might also create a 'Return' record or update the original 'Sale' record
    // For now, we are just updating stock.

    await client.query('COMMIT');

    return NextResponse.json({ message: 'Return processed successfully.', totalRefundAmount }, { status: 200 });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to process return:', error);
    return NextResponse.json({ message: 'Failed to process return', error: (error as Error).message }, { status: 500 });
  } finally {
    client.release();
  }
}
