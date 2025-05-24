
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
    // No createdAt or updatedAt as they are not in the user's schema for this table
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

const InvoiceItemProcessSchema = z.object({
    productId: z.string(),
    quantity: z.number().int().min(1, "Quantity must be at least 1.").finite(),
    costPrice: z.number().min(0, "Cost price must be non-negative.").finite(),
    newSellingPrice: z.number().min(0, "New selling price must be non-negative.").finite().optional(),
});

const InvoiceUpdateSchema = z.object({
  invoiceNumber: z.string().min(1).optional(),
  invoiceDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Invalid date format." }).optional(),
  supplierName: z.string().min(1).optional(),
  totalAmount: z.coerce.number().min(0).finite().optional(),
  paymentTerms: z.enum(['Credit', 'Cash']).optional(),
  processed: z.boolean().optional(),
  items: z.array(InvoiceItemProcessSchema).optional(),
});


// GET handler to fetch a single purchase invoice
export async function GET(request: NextRequest, { params }: { params: { invoiceId: string } }) {
  const { invoiceId } = params;
  try {
    // Removed 'createdat' and 'updatedat' from SELECT as they are not in the user's schema
    const invoiceResult = await query('SELECT id, invoicenumber, invoicedate, suppliername, totalamount, paymentterms, processed FROM PurchaseInvoices WHERE id = $1', [invoiceId]);
    if (invoiceResult.length === 0) {
      return NextResponse.json({ message: 'Purchase invoice not found' }, { status: 404 });
    }
    
    let items: PurchaseInvoiceItem[] = [];
    // If invoice is processed, items might exist (or might not if processing failed or items weren't saved for some reason)
    if (invoiceResult[0].processed === true) {
        const itemsResult = await query('SELECT id, purchase_invoice_id, product_id, productname, quantity, costprice, totalcost FROM PurchaseInvoiceItems WHERE purchase_invoice_id = $1', [invoiceId]);
        items = itemsResult.map(parsePurchaseInvoiceItemFromDB);
    }
    
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
      await client.query('ROLLBACK').catch(err => console.error('Rollback failed on validation error:', err)); 
      client.release();
      console.error("InvoiceUpdateSchema validation error:", validation.error.format());
      return NextResponse.json({ message: 'Invalid purchase invoice data for update', errors: validation.error.format() }, { status: 400 });
    }

    const { invoiceNumber, invoiceDate, supplierName, totalAmount, paymentTerms, processed, items } = validation.data;

    await client.query('BEGIN');

    const updateFields: string[] = [];
    const queryParams: any[] = [invoiceId];
    let paramIndex = 2;

    if (invoiceNumber !== undefined) { updateFields.push(`invoicenumber = $${paramIndex++}`); queryParams.push(invoiceNumber); }
    if (invoiceDate !== undefined) { updateFields.push(`invoicedate = $${paramIndex++}`); queryParams.push(invoiceDate); }
    if (supplierName !== undefined) { updateFields.push(`suppliername = $${paramIndex++}`); queryParams.push(supplierName); }
    if (totalAmount !== undefined) { updateFields.push(`totalamount = $${paramIndex++}`); queryParams.push(totalAmount); }
    if (paymentTerms !== undefined) { updateFields.push(`paymentterms = $${paramIndex++}`); queryParams.push(paymentTerms); }

    // No 'updatedat' column, so no trigger or explicit set for it.
    if (updateFields.length > 0) {
        const updateInvoiceSql = `
          UPDATE PurchaseInvoices
          SET ${updateFields.join(', ')} 
          WHERE id = $1
          RETURNING *;
        `;
        await client.query(updateInvoiceSql, queryParams);
    }

    if (processed === true && items && items.length > 0) {
        // Mark invoice as processed first
        await client.query('UPDATE PurchaseInvoices SET processed = TRUE WHERE id = $1', [invoiceId]);

        for (const item of items) {
            const productInfoResult = await client.query('SELECT name, stock FROM Products WHERE id = $1 FOR UPDATE', [item.productId]);
            if (productInfoResult.rowCount === 0) {
                await client.query('ROLLBACK');
                client.release();
                return NextResponse.json({ message: `Product with ID ${item.productId} not found. Invoice processing rolled back.` }, { status: 404 });
            }
            const productInfo = productInfoResult.rows[0];
            const stockBefore = parseInt(productInfo.stock, 10);
            const stockAfter = stockBefore + item.quantity;

            const itemInsertSql = `
                INSERT INTO PurchaseInvoiceItems (purchase_invoice_id, product_id, productName, quantity, costPrice, totalCost)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (purchase_invoice_id, product_id) DO UPDATE SET 
                    quantity = PurchaseInvoiceItems.quantity + EXCLUDED.quantity, 
                    costPrice = EXCLUDED.costPrice, 
                    totalCost = PurchaseInvoiceItems.totalCost + EXCLUDED.totalCost,
                    productName = EXCLUDED.productName -- Use product name from productInfo
                RETURNING *;
            `;
            // Use productInfo.name for productName when inserting/updating invoice items
            await client.query(itemInsertSql, [invoiceId, item.productId, productInfo.name, item.quantity, item.costPrice, item.quantity * item.costPrice]);
            
            let productUpdateSql = `
                UPDATE Products
                SET stock = $1,
                    cost = $2`;
            const productUpdateParams: any[] = [stockAfter, item.costPrice];
            
            if (item.newSellingPrice !== undefined && item.newSellingPrice !== null) {
                productUpdateSql += `, price = $${productUpdateParams.length + 1}`;
                productUpdateParams.push(item.newSellingPrice);
            }
            productUpdateSql += ` WHERE id = $${productUpdateParams.length + 1} RETURNING *;`;
            productUpdateParams.push(item.productId);
            
            await client.query(productUpdateSql, productUpdateParams);

            const currentInvoiceDataResult = await client.query('SELECT invoicenumber FROM PurchaseInvoices WHERE id = $1', [invoiceId]);
            const currentInvoiceNumber = currentInvoiceDataResult.rows[0]?.invoicenumber || invoiceId; // Fallback to invoiceId if number somehow not found
            
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
              `Received ${item.quantity} units from supplier invoice ${currentInvoiceNumber}. Cost updated to ${item.costPrice}. ${item.newSellingPrice !== undefined && item.newSellingPrice !== null ? `Price updated to ${item.newSellingPrice}.`:''}`
            ]);
        }
    } else if (processed === true && !updateFields.some(f => f.startsWith('processed'))) {
        await client.query('UPDATE PurchaseInvoices SET processed = TRUE WHERE id = $1', [invoiceId]);
    } else if (processed === false && !updateFields.some(f => f.startsWith('processed'))) {
        // Note: Reverting a processed invoice is complex and typically not done by just flipping 'processed' to false.
        // Stock levels would need manual adjustment or a "reverse processing" feature.
        // For now, we allow setting to false, but it doesn't undo stock changes.
        await client.query('UPDATE PurchaseInvoices SET processed = FALSE WHERE id = $1', [invoiceId]);
    }

    await client.query('COMMIT');

    const updatedInvoiceResult = await client.query('SELECT * FROM PurchaseInvoices WHERE id = $1', [invoiceId]);
    let finalItems: PurchaseInvoiceItem[] = [];
    if (updatedInvoiceResult.rows[0] && updatedInvoiceResult.rows[0].processed) {
        const updatedItemsResult = await client.query('SELECT * FROM PurchaseInvoiceItems WHERE purchase_invoice_id = $1', [invoiceId]);
        finalItems = updatedItemsResult.rows.map(parsePurchaseInvoiceItemFromDB);
    }
    
    const finalInvoice = parsePurchaseInvoiceFromDB(updatedInvoiceResult.rows[0], finalItems);

    return NextResponse.json(finalInvoice, { status: 200 });

  } catch (error) {
    await client.query('ROLLBACK').catch(err => console.error('Rollback failed on main error:', err));
    console.error(`Failed to update purchase invoice ${invoiceId}:`, error);
    if (error instanceof z.ZodError) {
        return NextResponse.json({ message: 'Validation error processing invoice.', errors: error.format() }, { status: 400 });
    }
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
    // Check if invoice was processed. We might want different behavior or warnings
    // if deleting a processed invoice, as stock levels won't be automatically reverted.
    const invoiceStatusResult = await client.query('SELECT processed FROM PurchaseInvoices WHERE id = $1', [invoiceId]);
    if (invoiceStatusResult.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      return NextResponse.json({ message: 'Purchase invoice not found.' }, { status: 404 });
    }
    // const isProcessed = invoiceStatusResult.rows[0].processed;

    // First delete related items to avoid foreign key constraint violations
    await client.query('DELETE FROM PurchaseInvoiceItems WHERE purchase_invoice_id = $1', [invoiceId]);
    // Then delete the invoice itself
    const result = await client.query('DELETE FROM PurchaseInvoices WHERE id = $1 RETURNING id', [invoiceId]);
    await client.query('COMMIT');

    if (result.rowCount === 0) { // Check rowCount for DELETE
      // This case might not be reached if the select before already confirmed existence
      return NextResponse.json({ message: 'Purchase invoice not found or already deleted' }, { status: 404 });
    }
    // Add a note about stock if it was processed.
    // const message = `Purchase invoice ${invoiceId} and its items deleted successfully.` + 
    //                 (isProcessed ? " Stock levels NOT automatically reverted." : "");
    return NextResponse.json({ message: `Purchase invoice ${invoiceId} and its items deleted successfully. Stock levels NOT automatically reverted.` }, { status: 200 });
  } catch (error) {
    await client.query('ROLLBACK').catch(err => console.error('Rollback failed on delete error:', err));
    console.error(`Failed to delete purchase invoice ${invoiceId}:`, error);
    // Check for foreign key violations is usually handled by deleting items first,
    // but if other constraints exist, this might be relevant.
    if (error instanceof Error && (error as any).code === '23503') {
        return NextResponse.json({ message: 'Failed to delete purchase invoice: It may have associated items that need to be removed first or other integrity constraints.', error: (error as Error).message }, { status: 409 });
    }
    return NextResponse.json({ message: 'Failed to delete purchase invoice', error: (error as Error).message }, { status: 500 });
  } finally {
    client.release();
  }
}
    