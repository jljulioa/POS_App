
// src/app/api/purchase-invoices/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { z } from 'zod';
import type { PurchaseInvoice, PurchaseInvoiceItem } from '@/lib/mockData'; // Use existing types

// Zod schema for PurchaseInvoice creation
const PurchaseInvoiceCreateSchema = z.object({
  invoiceNumber: z.string().min(1, { message: "Invoice number cannot be empty." }),
  invoiceDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Invalid date format." }),
  supplierName: z.string().min(1, { message: "Supplier name cannot be empty." }),
  totalAmount: z.coerce.number().min(0, { message: "Total amount must be non-negative." }),
  paymentTerms: z.enum(['Credit', 'Cash']),
});

// Helper function to parse PurchaseInvoice fields from DB
const parsePurchaseInvoiceFromDB = (dbInvoice: any): PurchaseInvoice => {
  return {
    id: dbInvoice.id,
    invoiceNumber: dbInvoice.invoicenumber,
    invoiceDate: new Date(dbInvoice.invoicedate).toISOString().split('T')[0],
    supplierName: dbInvoice.suppliername,
    totalAmount: parseFloat(dbInvoice.totalamount),
    paymentTerms: dbInvoice.paymentterms,
    processed: dbInvoice.processed,
    createdAt: dbInvoice.createdat ? new Date(dbInvoice.createdat).toISOString() : undefined,
    updatedAt: dbInvoice.updatedat ? new Date(dbInvoice.updatedat).toISOString() : undefined,
    // items are not typically fetched in the main list
  };
};


// GET handler to fetch all purchase invoices
export async function GET(request: NextRequest) {
  try {
    const dbInvoices = await query('SELECT id, invoicenumber, invoicedate, suppliername, totalamount, paymentterms, processed, createdat, updatedat FROM PurchaseInvoices ORDER BY invoiceDate DESC');
    const invoices: PurchaseInvoice[] = dbInvoices.map(parsePurchaseInvoiceFromDB);
    return NextResponse.json(invoices);
  } catch (error) {
    console.error('Failed to fetch purchase invoices:', error);
    return NextResponse.json({ message: 'Failed to fetch purchase invoices', error: (error as Error).message }, { status: 500 });
  }
}

// POST handler to add a new purchase invoice
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = PurchaseInvoiceCreateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid purchase invoice data', errors: validation.error.format() }, { status: 400 });
    }

    const { invoiceNumber, invoiceDate, supplierName, totalAmount, paymentTerms } = validation.data;
    const id = `PI${Date.now()}${Math.random().toString(36).substring(2, 7)}`;

    // 'createdat' and 'updatedat' will use DEFAULT CURRENT_TIMESTAMP on insert.
    const sql = `
      INSERT INTO PurchaseInvoices (id, invoiceNumber, invoiceDate, supplierName, totalAmount, paymentTerms, processed)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING * 
    `;
    const params = [id, invoiceNumber, invoiceDate, supplierName, totalAmount, paymentTerms, false];
    
    const result = await query(sql, params);
    const newInvoice: PurchaseInvoice = parsePurchaseInvoiceFromDB(result[0]);

    return NextResponse.json(newInvoice, { status: 201 });

  } catch (error) {
    console.error('Failed to create purchase invoice:', error);
    if (error instanceof Error && (error as any).code === '23505') { // PostgreSQL unique_violation for invoiceNumber
        return NextResponse.json({ message: 'Failed to create purchase invoice: Invoice number might already exist.', error: (error as Error).message }, { status: 409 });
    }
    return NextResponse.json({ message: 'Failed to create purchase invoice', error: (error as Error).message }, { status: 500 });
  }
}
