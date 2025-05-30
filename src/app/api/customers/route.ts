
// src/app/api/customers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { z } from 'zod';
import type { Customer } from '@/lib/mockData';

const CustomerCreateSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }).optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  identificationNumber: z.string().optional().or(z.literal('')), // Added new field
  purchaseHistoryCount: z.coerce.number().int().min(0).optional().default(0),
  totalSpent: z.coerce.number().min(0).optional().default(0),
  creditLimit: z.coerce.number().min(0).optional(),
  outstandingBalance: z.coerce.number().optional(),
});

// Helper function to parse customer fields from DB (PostgreSQL often returns numbers as strings)
const parseCustomerFromDB = (dbCustomer: any): Customer => {
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

// GET handler to fetch all customers
export async function GET(request: NextRequest) {
  try {
    const dbCustomers = await query('SELECT id, name, email, phone, address, identification_number, purchasehistorycount, totalspent, creditlimit, outstandingbalance FROM Customers ORDER BY name ASC');
    const customers: Customer[] = dbCustomers.map(parseCustomerFromDB);
    return NextResponse.json(customers);
  } catch (error) {
    console.error('Failed to fetch customers:', error);
    return NextResponse.json({ message: 'Failed to fetch customers', error: (error as Error).message }, { status: 500 });
  }
}

// POST handler to add a new customer
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = CustomerCreateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid customer data', errors: validation.error.format() }, { status: 400 });
    }

    const {
        name, email, phone, address, identificationNumber, purchaseHistoryCount,
        totalSpent, creditLimit, outstandingBalance
    } = validation.data;

    const id = `C${Date.now()}${Math.random().toString(36).substring(2, 7)}`;

    const sql = `
      INSERT INTO Customers (id, name, email, phone, address, identification_number, purchasehistorycount, totalspent, creditlimit, outstandingbalance)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    const params = [
        id, name, email || null, phone || null, address || null, identificationNumber || null,
        purchaseHistoryCount, totalSpent, creditLimit ?? null, outstandingBalance ?? null
    ];

    const result = await query(sql, params);
    const newCustomer: Customer = parseCustomerFromDB(result[0]);

    return NextResponse.json(newCustomer, { status: 201 });

  } catch (error) {
    console.error('Failed to create customer:', error);
     if (error instanceof Error && (error as any).code === '23505') { // PostgreSQL unique_violation (e.g. for email if unique constraint added)
        let field = 'email or identification number';
        if ((error as Error).message.includes('customers_email_key')) field = 'email';
        if ((error as Error).message.includes('customers_identification_number_key')) field = 'identification number'; // Assuming unique constraint name
        return NextResponse.json({ message: `Failed to create customer: The ${field} might already exist.`, error: (error as Error).message }, { status: 409 });
    }
    return NextResponse.json({ message: 'Failed to create customer', error: (error as Error).message }, { status: 500 });
  }
}
