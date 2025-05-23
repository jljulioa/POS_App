
// src/app/api/purchase-invoices/[invoiceId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query, getPool } from '@/lib/db';
import { z } from 'zod';
import type { PurchaseInvoice, PurchaseInvoiceItem, Product } from '@/lib/mockData';

// Helper function (can be shared or defined per route if specific parsing is needed)
const parsePurchaseInvoiceFromDB = (dbInvoice: any, items?: PurchaseInvoiceItem[]): PurchaseInvoice => {
  return {
    id: dbInvoice.id,
    invoiceNumber: dbInvoice.invoicenumber,
    invoiceDate: new Date(dbInvoice.invoicedate).toISOString().split('T')[0], // Format as YYYY-MM-DD
    supplierName: dbInvoice.suppliername,
    totalAmount: parseFloat(dbInvoice.totalamount),
    paymentTerms: dbInvoice.paymentterms,
    processed: dbInvoice.processed,
    items: items || [], // Populate if items are fetched
  };
};

const parsePurchaseInvoiceItemFromDB = (dbItem: any): PurchaseInvoiceItem => {
  return {
    productId: dbItem.product_id,
    productName: dbItem.productname,
    quantity: parseInt(dbItem.quantity, 10),
    costPrice: parseFloat(dbItem.costprice),
    totalCost: parseFloat(dbItem.totalcost),
  };
};

const InvoiceUpdateSchema = z.object({
  invoiceNumber: z.string().min(1).optional(),
  invoiceDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Invalid date format." }).optional(),
  supplierName: z.string().min(1).optional(),
  totalAmount: z.coerce.number().min(0).optional(),
  paymentTerms: z.enum(['Credit', 'Cash']).optional(),
  processed: z.boolean().optional(),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().int().min(1),
    costPrice: z.number().min(0),
  })).optional(),
});


// GET handler to fetch a single purchase invoice
export async function GET(request: NextRequest, { params }: { params: { invoiceId: string } }) {
  const { invoiceId } = params;
  try {
    const invoiceResult = await query('SELECT * FROM PurchaseInvoices WHERE id = $1', [invoiceId]);
    if (invoiceResult.length === 0) {
      return NextResponse.json({ message: 'Purchase invoice not found' }, { status: 404 });
    }
    
    const itemsResult = await query('SELECT * FROM PurchaseInvoiceItems WHERE purchase_invoice_id = $1', [invoiceId]);
    const items = itemsResult.map(parsePurchaseInvoiceItemFromDB);
    
    const invoice: PurchaseInvoice = parsePurchaseInvoiceFromDB(invoiceResult[0], items);
    return NextResponse.json(invoice);
  } catch (error) {
    console.error(`Failed to fetch purchase invoice ${invoiceId}:`, error);
    return NextResponse.json({ message: 'Failed to fetch purchase invoice', error: (error as Error).message }, { status: 500 });
  }
}

// PUT handler to update an existing purchase invoice (e.g., mark as processed, update items during processing)
export async function PUT(request: NextRequest, { params }: { params: { invoiceId: string } }) {
  const { invoiceId } = params;
  const pool = await getPool();
  const client = await pool.connect();

  try {
    const body = await request.json();
    const validation = InvoiceUpdateSchema.safeParse(body);

    if (!validation.success) {
      await client.query('ROLLBACK'); // Release client if not in transaction yet
      client.release();
      return NextResponse.json({ message: 'Invalid purchase invoice data for update', errors: validation.error.format() }, { status: 400 });
    }

    const { invoiceNumber, invoiceDate, supplierName, totalAmount, paymentTerms, processed, items } = validation.data;

    await client.query('BEGIN');

    const updateFields: string[] = [];
    const queryParams: any[] = [invoiceId];
    let paramIndex = 2;

    if (invoiceNumber !== undefined) { updateFields.push(`invoiceNumber = $${paramIndex++}`); queryParams.push(invoiceNumber); }
    if (invoiceDate !== undefined) { updateFields.push(`invoiceDate = $${paramIndex++}`); queryParams.push(invoiceDate); }
    if (supplierName !== undefined) { updateFields.push(`supplierName = $${paramIndex++}`); queryParams.push(supplierName); }
    if (totalAmount !== undefined) { updateFields.push(`totalAmount = $${paramIndex++}`); queryParams.push(totalAmount); }
    if (paymentTerms !== undefined) { updateFields.push(`paymentTerms = $${paramIndex++}`); queryParams.push(paymentTerms); }
    if (processed !== undefined) { updateFields.push(`processed = $${paramIndex++}`); queryParams.push(processed); }

    if (updateFields.length > 0) {
        const updateInvoiceSql = `
          UPDATE PurchaseInvoices
          SET ${updateFields.join(', ')}, updatedat = CURRENT_TIMESTAMP
          WHERE id = $1
          RETURNING *;
        `;
        await client.query(updateInvoiceSql, queryParams);
    }

    if (processed === true && items && items.length > 0) {
        for (const item of items) {
            const productInfoResult = await client.query('SELECT name, stock FROM Products WHERE id = $1 FOR UPDATE', [item.productId]);
            if (productInfoResult.rowCount === 0) {
                await client.query('ROLLBACK');
                client.release();
                return NextResponse.json({ message: `Product with ID ${item.productId} not found. Invoice processing rolled back.` }, { status: 404 });
            }
            const productInfo = productInfoResult.rows[0];
            const stockBefore = productInfo.stock;
            const stockAfter = stockBefore + item.quantity;

            const itemInsertSql = `
                INSERT INTO PurchaseInvoiceItems (purchase_invoice_id, product_id, productName, quantity, costPrice, totalCost)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *;
            `;
            await client.query(itemInsertSql, [invoiceId, item.productId, productInfo.name, item.quantity, item.costPrice, item.quantity * item.costPrice]);

            const updateProductSql = `
                UPDATE Products
                SET stock = $1,
                    cost = $2 -- Update product cost to the latest cost price from this invoice
                WHERE id = $3
                RETURNING *;
            `;
            await client.query(updateProductSql, [stockAfter, item.costPrice, item.productId]);

            // Log inventory transaction
            const transactionSql = `
              INSERT INTO InventoryTransactions (product_id, product_name, transaction_type, quantity_change, stock_before, stock_after, related_document_id, notes)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `;
            await client.query(transactionSql, [
              item.productId,
              productInfo.name,
              'Purchase',
              item.quantity,
              stockBefore,
              stockAfter,
              invoiceId,
              `Received ${item.quantity} units from supplier invoice ${invoiceNumber || invoiceId}.`
            ]);
        }
    }

    await client.query('COMMIT');

    const updatedInvoiceResult = await client.query('SELECT * FROM PurchaseInvoices WHERE id = $1', [invoiceId]);
    const updatedItemsResult = await client.query('SELECT * FROM PurchaseInvoiceItems WHERE purchase_invoice_id = $1', [invoiceId]);

    const finalInvoice = parsePurchaseInvoiceFromDB(updatedInvoiceResult.rows[0], updatedItemsResult.rows.map(parsePurchaseInvoiceItemFromDB));

    return NextResponse.json(finalInvoice, { status: 200 });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Failed to update purchase invoice ${invoiceId}:`, error);
    if (error instanceof Error && (error as any).code === '23505' && (error as any).constraint?.includes('purchaseinvoices_invoicenumber_key')) {
        return NextResponse.json({ message: 'Failed to update purchase invoice: Invoice number might already exist for another invoice.', error: (error as Error).message }, { status: 409 });
    }
    return NextResponse.json({ message: 'Failed to update purchase invoice', error: (error as Error).message }, { status: 500 });
  } finally {
    client.release();
  }
}

// DELETE handler to remove a purchase invoice
export async function DELETE(request: NextRequest, { params }: { params: { invoiceId: string } }) {
  const { invoiceId } = params;
  const pool = await getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Check if invoice was processed and items exist
    const itemsResult = await client.query('SELECT product_id, quantity FROM PurchaseInvoiceItems WHERE purchase_invoice_id = $1', [invoiceId]);
    if (itemsResult.rows.length > 0) {
        // Optional: Revert stock changes if deleting a processed invoice. This is complex.
        // For now, we'll just delete the invoice and its items.
        // A production system would need a clear policy on this.
        // For simplicity, current logic does NOT revert stock on PI delete.
        // To revert stock, you would iterate itemsResult.rows and update Products table, and log 'Adjustment' transactions.
    }
    await client.query('DELETE FROM PurchaseInvoiceItems WHERE purchase_invoice_id = $1', [invoiceId]);
    const result = await client.query('DELETE FROM PurchaseInvoices WHERE id = $1 RETURNING id', [invoiceId]);
    await client.query('COMMIT');

    if (result.rowCount === 0) {
      return NextResponse.json({ message: 'Purchase invoice not found or already deleted' }, { status: 404 });
    }
    // Note: No transaction log for PI deletion itself unless stock is adjusted.
    return NextResponse.json({ message: `Purchase invoice ${invoiceId} and its items deleted successfully. Stock levels NOT automatically reverted.` }, { status: 200 });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Failed to delete purchase invoice ${invoiceId}:`, error);
    if (error instanceof Error && (error as any).code === '23503') { // Should be caught by cascade or manual item deletion
        return NextResponse.json({ message: 'Failed to delete purchase invoice: It may have associated items that need to be removed first.', error: (error as Error).message }, { status: 409 });
    }
    return NextResponse.json({ message: 'Failed to delete purchase invoice', error: (error as Error).message }, { status: 500 });
  } finally {
    client.release();
  }
}
