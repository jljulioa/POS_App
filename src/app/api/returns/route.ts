
// src/app/api/returns/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPool, query as executeQuery } from '@/lib/db';
import { z } from 'zod';
import type { Product } from '@/lib/mockData';

const ReturnItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().min(1, "Return quantity must be at least 1."),
  unitPrice: z.number().min(0), // Used for refund calculation on client, backend should use stored sale item price
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
      client.release();
      return NextResponse.json({ message: 'Invalid return data', errors: validation.error.format() }, { status: 400 });
    }

    const { saleId, itemsToReturn } = validation.data;

    await client.query('BEGIN');

    let totalRefundAmountCalculated = 0;

    for (const item of itemsToReturn) {
      // Fetch current product details for stock update and transaction log
      const productResult = await client.query('SELECT stock, name FROM Products WHERE id = $1 FOR UPDATE', [item.productId]);
      if (productResult.rowCount === 0) {
        await client.query('ROLLBACK');
        client.release();
        return NextResponse.json({ message: `Product ID ${item.productId} not found.` }, { status: 404 });
      }
      const currentProduct = productResult.rows[0];
      const stockBefore = currentProduct.stock;
      const stockAfter = stockBefore + item.quantity;

      // Increment product stock
      await client.query(
        'UPDATE Products SET stock = stock + $1 WHERE id = $2',
        [item.quantity, item.productId]
      );

      // Log inventory transaction
      const transactionSql = `
        INSERT INTO InventoryTransactions (product_id, product_name, transaction_type, quantity_change, stock_before, stock_after, related_document_id, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;
      await client.query(transactionSql, [
        item.productId,
        currentProduct.name, // Use product name from DB
        'Return',
        item.quantity, // Positive for return stock adjustment
        stockBefore,
        stockAfter,
        saleId,
        `Return of ${item.quantity} units from sale ${saleId}.`
      ]);

      // Fetch the original SaleItem to validate quantities and get original unit price
      const saleItemResult = await client.query(
        'SELECT id, quantity, unitprice FROM SaleItems WHERE sale_id = $1 AND product_id = $2',
        [saleId, item.productId]
      );

      if (saleItemResult.rowCount === 0) {
        await client.query('ROLLBACK');
        client.release();
        return NextResponse.json({ message: `Item with Product ID ${item.productId} not found in original sale ${saleId}.` }, { status: 400 });
      }
      const originalSaleItem = saleItemResult.rows[0];

      if (item.quantity > originalSaleItem.quantity) {
        await client.query('ROLLBACK');
        client.release();
        return NextResponse.json({ message: `Cannot return ${item.quantity} of ${currentProduct.name}. Only ${originalSaleItem.quantity} were originally sold in sale ${saleId}.` }, { status: 400 });
      }

      const newSaleItemQuantity = originalSaleItem.quantity - item.quantity;
      const newSaleItemTotalPrice = newSaleItemQuantity * originalSaleItem.unitprice;

      // Update the SaleItem quantity and total price
      await client.query(
        'UPDATE SaleItems SET quantity = $1, totalprice = $2 WHERE id = $3',
        [newSaleItemQuantity, newSaleItemTotalPrice, originalSaleItem.id]
      );
      
      // Accumulate refund amount based on the original sale item's unit price
      totalRefundAmountCalculated += item.quantity * originalSaleItem.unitprice;
    }

    // After all items are processed, update the parent Sale's totalAmount
    const updatedSaleTotalResult = await client.query(
      'SELECT SUM(totalprice) as new_total_amount FROM SaleItems WHERE sale_id = $1',
      [saleId]
    );
    const newSaleTotalAmount = updatedSaleTotalResult.rows[0]?.new_total_amount || 0;

    await client.query(
      'UPDATE Sales SET totalAmount = $1 WHERE id = $2',
      [newSaleTotalAmount, saleId]
    );

    await client.query('COMMIT');

    return NextResponse.json({ message: 'Return processed successfully. Sale and stock updated.', totalRefundAmount: totalRefundAmountCalculated }, { status: 200 });

  } catch (error) {
    await client.query('ROLLBACK').catch(rbError => console.error("Return API: Rollback failed", rbError));
    console.error('Failed to process return:', error);
    return NextResponse.json({ message: 'Failed to process return', error: (error as Error).message }, { status: 500 });
  } finally {
    client.release();
  }
}
