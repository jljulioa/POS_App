
// src/app/api/customers/[customerId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { z } from 'zod';
import type { Customer } from '@/lib/mockData';

const CustomerUpdateSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }).optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  identificationNumber: z.string().optional().or(z.literal('')), // Added new field
  purchaseHistoryCount: z.coerce.number().int().min(0).optional(), // Optional on update
  totalSpent: z.coerce.number().min(0).optional(), // Optional on update
  creditLimit: z.coerce.number().min(0).optional(),
  outstandingBalance: z.coerce.number().optional(),
});

// Helper function to parse customer fields from DB
const parseCustomerFromDB = (dbCustomer: any): Customer => {
  if (!dbCustomer) return null as any;
  return {
    id: dbCustomer.id,
    name: dbCustomer.name,
    email: dbCustomer.email,
    phone: dbCustomer.phone,
    address: dbCustomer.address,
    identificationNumber: dbCustomer.identification_number, // Added new field
    purchaseHistoryCount: parseInt(dbCustomer.purchasehistorycount, 10) || 0,
    totalSpent: parseFloat(dbCustomer.totalspent) || 0,
    creditLimit: dbCustomer.creditlimit !== null ? parseFloat(dbCustomer.creditlimit) : undefined,
    outstandingBalance: dbCustomer.outstandingbalance !== null ? parseFloat(dbCustomer.outstandingbalance) : undefined,
  };
};

// GET handler to fetch a single customer by ID
export async function GET(request: NextRequest, { params }: { params: { customerId: string } }) {
  const customerId = params.customerId;
  try {
    const dbCustomers = await query('SELECT id, name, email, phone, address, identification_number, purchasehistorycount, totalspent, creditlimit, outstandingbalance FROM Customers WHERE id = $1', [customerId]);
    if (dbCustomers.length === 0) {
      return NextResponse.json({ message: 'Customer not found' }, { status: 404 });
    }
    const customer: Customer = parseCustomerFromDB(dbCustomers[0]);
    return NextResponse.json(customer);
  } catch (error) {
    console.error(`Failed to fetch customer ${customerId}:`, error);
    return NextResponse.json({ message: 'Failed to fetch customer', error: (error as Error).message }, { status: 500 });
  }
}

// PUT handler to update an existing customer
export async function PUT(request: NextRequest, { params }: { params: { customerId: string } }) {
  const customerId = params.customerId;
  try {
    const body = await request.json();
    const validation = CustomerUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid customer data', errors: validation.error.format() }, { status: 400 });
    }

    const {
        name, email, phone, address, identificationNumber, purchaseHistoryCount,
        totalSpent, creditLimit, outstandingBalance
    } = validation.data;

    const sql = `
      UPDATE Customers
      SET name = $1, email = $2, phone = $3, address = $4, identification_number = $5,
          purchasehistorycount = COALESCE($6, purchasehistorycount), -- Keep old value if not provided
          totalspent = COALESCE($7, totalspent),             -- Keep old value if not provided
          creditlimit = $8, outstandingbalance = $9
      WHERE id = $10
      RETURNING *
    `;
    const queryParams = [
        name, email || null, phone || null, address || null, identificationNumber || null,
        purchaseHistoryCount, totalSpent, creditLimit ?? null, outstandingBalance ?? null,
        customerId
    ];

    const result = await query(sql, queryParams);
    if (result.length === 0) {
        return NextResponse.json({ message: 'Customer not found or update failed' }, { status: 404 });
    }
    const updatedCustomer: Customer = parseCustomerFromDB(result[0]);

    return NextResponse.json(updatedCustomer, { status: 200 });

  } catch (error) {
    console.error(`Failed to update customer ${customerId}:`, error);
    if (error instanceof Error && (error as any).code === '23505') { // Unique constraint violation
        let field = 'email or identification number';
        if ((error as Error).message.includes('customers_email_key')) field = 'email';
        if ((error as Error).message.includes('customers_identification_number_key')) field = 'identification number'; // Assuming unique constraint name
        return NextResponse.json({ message: `Failed to update customer: The ${field} might already exist for another customer.`, error: (error as Error).message }, { status: 409 });
    }
    return NextResponse.json({ message: 'Failed to update customer', error: (error as Error).message }, { status: 500 });
  }
}

// DELETE handler to remove a customer
export async function DELETE(request: NextRequest, { params }: { params: { customerId: string } }) {
  const customerId = params.customerId;
  try {
    // Optional: Check for related records (e.g., sales) before deleting
    // For this example, we'll proceed with direct deletion.
    const result = await query('DELETE FROM Customers WHERE id = $1 RETURNING id, name', [customerId]);

    if (result.length === 0) {
      return NextResponse.json({ message: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json({ message: `Customer "${result[0].name}" deleted successfully` }, { status: 200 });

  } catch (error) {
    console.error(`Failed to delete customer ${customerId}:`, error);
    // Handle potential foreign key constraints, e.g., if customer has sales records
    if (error instanceof Error && (error as any).code === '23503') {
      return NextResponse.json({ message: 'Cannot delete customer with existing sales records or transactions.' }, { status: 409 });
    }
    return NextResponse.json({ message: 'Failed to delete customer', error: (error as Error).message }, { status: 500 });
  }
}
