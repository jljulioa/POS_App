
// src/app/api/purchase-invoices/[invoiceId]/payments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { z } from 'zod';
import { format } from 'date-fns';

const PaymentCreateSchema = z.object({
  amount: z.coerce.number().positive({ message: "Payment amount must be a positive number." }),
  payment_date: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Invalid date format." }),
  payment_method: z.string().min(1, "Payment method is required."),
  notes: z.string().optional().or(z.literal('')),
});

export async function GET(request: NextRequest, { params }: { params: { invoiceId: string } }) {
    const { invoiceId } = params;
    try {
        const pool = await getPool();
        const paymentsResult = await pool.query('SELECT * FROM PurchaseInvoicePayments WHERE purchase_invoice_id = $1 ORDER BY payment_date DESC', [invoiceId]);
        return NextResponse.json(paymentsResult.rows);
    } catch (error) {
        console.error(`Failed to fetch payments for invoice ${invoiceId}:`, error);
        return NextResponse.json({ message: 'Failed to fetch payments', error: (error as Error).message }, { status: 500 });
    }
}


export async function POST(request: NextRequest, { params }: { params: { invoiceId: string } }) {
  const { invoiceId } = params;
  const pool = await getPool();
  const client = await pool.connect();

  try {
    const body = await request.json();
    const validation = PaymentCreateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid payment data', errors: validation.error.format() }, { status: 400 });
    }

    const { amount, payment_date, payment_method, notes } = validation.data;

    await client.query('BEGIN');

    // Lock the invoice row and get current balance and total amount
    const invoiceResult = await client.query('SELECT balance_due, totalamount FROM PurchaseInvoices WHERE id = $1 FOR UPDATE', [invoiceId]);

    if (invoiceResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ message: `Purchase invoice with ID ${invoiceId} not found.` }, { status: 404 });
    }

    const currentBalance = parseFloat(invoiceResult.rows[0].balance_due);
    const totalAmount = parseFloat(invoiceResult.rows[0].totalamount);

    if (amount > currentBalance) {
        await client.query('ROLLBACK');
        return NextResponse.json({ message: `Payment amount (${amount}) cannot be greater than the balance due (${currentBalance}).`}, { status: 400 });
    }

    // Insert the payment record
    await client.query(
      'INSERT INTO PurchaseInvoicePayments (purchase_invoice_id, payment_date, amount, payment_method, notes) VALUES ($1, $2, $3, $4, $5)',
      [invoiceId, payment_date, amount, payment_method, notes || null]
    );

    // Update the invoice balance and status
    const newBalance = currentBalance - amount;
    const paymentStatusUpdateSql = `
        UPDATE PurchaseInvoices
        SET 
            balance_due = $1,
            payment_status = CASE
                WHEN $1 <= 0 THEN 'Paid'
                WHEN $1 < totalamount THEN 'Partially Paid'
                ELSE 'Unpaid'
            END
        WHERE id = $2
    `;
    await client.query(paymentStatusUpdateSql, [newBalance, invoiceId]);
    
    await client.query('COMMIT');

    return NextResponse.json({ message: 'Payment recorded successfully', newBalance: newBalance }, { status: 201 });

  } catch (error) {
    await client.query('ROLLBACK').catch(rbError => console.error("Payment API: Rollback failed", rbError));
    console.error(`Failed to record payment for invoice ${invoiceId}:`, error);
    return NextResponse.json({ message: 'Failed to record payment', error: (error as Error).message }, { status: 500 });
  } finally {
    client.release();
  }
}
