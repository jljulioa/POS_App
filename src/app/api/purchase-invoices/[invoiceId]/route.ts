
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
  items: z.array(z.object({ // For processing items
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
    // Optionally, fetch items if needed here or keep it separate for processing step
    // For now, just returning the invoice header
    const invoice: PurchaseInvoice = parsePurchaseInvoiceFromDB(invoiceResult[0]);
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
      return NextResponse.json({ message: 'Invalid purchase invoice data for update', errors: validation.error.format() }, { status: 400 });
    }

    const { invoiceNumber, invoiceDate, supplierName, totalAmount, paymentTerms, processed, items } = validation.data;

    await client.query('BEGIN');

    // Update PurchaseInvoices table
    // Build the SET clause dynamically for the main invoice update
    const updateFields: string[] = [];
    const queryParams: any[] = [invoiceId];
    let paramIndex = 2; // Start params from $2 ($1 is invoiceId for WHERE)

    if (invoiceNumber !== undefined) { updateFields.push(`invoiceNumber = $${paramIndex++}`); queryParams.push(invoiceNumber); }
    if (invoiceDate !== undefined) { updateFields.push(`invoiceDate = $${paramIndex++}`); queryParams.push(invoiceDate); }
    if (supplierName !== undefined) { updateFields.push(`supplierName = $${paramIndex++}`); queryParams.push(supplierName); }
    if (totalAmount !== undefined) { updateFields.push(`totalAmount = $${paramIndex++}`); queryParams.push(totalAmount); }
    if (paymentTerms !== undefined) { updateFields.push(`paymentTerms = $${paramIndex++}`); queryParams.push(paymentTerms); }
    if (processed !== undefined) { updateFields.push(`processed = $${paramIndex++}`); queryParams.push(processed); }

    if (updateFields.length > 0) {
        const updateInvoiceSql = `
          UPDATE PurchaseInvoices
          SET ${updateFields.join(', ')}
          WHERE id = $1
          RETURNING *;
        `;
        await client.query(updateInvoiceSql, queryParams);
    }


    // If 'processed' is true and items are provided, update product stock and add to PurchaseInvoiceItems
    if (processed === true && items && items.length > 0) {
        for (const item of items) {
            // Add to PurchaseInvoiceItems
            const itemInsertSql = `
                INSERT INTO PurchaseInvoiceItems (purchase_invoice_id, product_id, productName, quantity, costPrice, totalCost)
                SELECT $1, p.id, p.name, $2, $3, $2 * $3
                FROM Products p WHERE p.id = $4
                RETURNING *;
            `;
            // Note: productName could be passed from client or fetched. Here fetching from Products table.
            // totalCost is calculated
            const itemInsertParams = [invoiceId, item.quantity, item.costPrice, item.productId];
            await client.query(itemInsertSql, itemInsertParams);

            // Update product stock and cost
            const updateProductSql = `
                UPDATE Products
                SET stock = stock + $1,
                    cost = $2 -- Update product cost to the latest cost price from this invoice
                WHERE id = $3
                RETURNING *; 
            `;
            const productUpdateResult = await client.query(updateProductSql, [item.quantity, item.costPrice, item.productId]);
            if (productUpdateResult.rowCount === 0) {
                await client.query('ROLLBACK');
                return NextResponse.json({ message: `Product with ID ${item.productId} not found. Invoice processing rolled back.` }, { status: 404 });
            }
        }
    }

    await client.query('COMMIT');
    
    // Fetch the updated invoice to return
    const updatedInvoiceResult = await client.query('SELECT * FROM PurchaseInvoices WHERE id = $1', [invoiceId]);
    // Fetch associated items if any were processed
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
  // Important: Consider implications of deleting invoices. Usually, they are archived or marked void.
  // Deleting associated PurchaseInvoiceItems should be handled by ON DELETE CASCADE if set up.
  // Also, if items were processed, this doesn't "unprocess" them (i.e., adjust stock back).
  try {
    const result = await query('DELETE FROM PurchaseInvoices WHERE id = $1 RETURNING id', [invoiceId]);

    if (result.length === 0) {
      return NextResponse.json({ message: 'Purchase invoice not found or already deleted' }, { status: 404 });
    }

    return NextResponse.json({ message: `Purchase invoice ${invoiceId} deleted successfully (Note: Does not revert stock changes if processed).` }, { status: 200 });
  } catch (error) {
    console.error(`Failed to delete purchase invoice ${invoiceId}:`, error);
     // Check for foreign key constraints if PurchaseInvoiceItems are not set to cascade delete
    if (error instanceof Error && (error as any).code === '23503') {
        return NextResponse.json({ message: 'Failed to delete purchase invoice: It may have associated items that need to be removed first.', error: (error as Error).message }, { status: 409 });
    }
    return NextResponse.json({ message: 'Failed to delete purchase invoice', error: (error as Error).message }, { status: 500 });
  }
}
