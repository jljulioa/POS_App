
// src/app/api/sales-tickets/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { z } from 'zod';
// Ensure SaleItem type includes costPrice if it's not already globally defined and imported
// For consistency, let's define SaleItem locally here for tickets, ensuring costPrice is present.
interface SaleItemForTicket {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  costPrice: number; // This was the missing piece
  totalPrice: number;
}

// Zod schema for SaleItem (consistent with POS page and sales API)
const SaleItemSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  quantity: z.number().int().min(1),
  unitPrice: z.number().min(0),
  costPrice: z.number().min(0), // Ensure this is required and non-negative
  totalPrice: z.number().min(0),
});

// Zod schema for SalesTicket creation
const SalesTicketCreateSchema = z.object({
  name: z.string().min(1, { message: "Ticket name cannot be empty." }),
  cart_items: z.array(SaleItemSchema).optional().default([]),
  status: z.enum(['Active', 'On Hold', 'Pending Payment']),
  // created_at and last_updated_at will be handled by the database
});

// Interface for SalesTicket matching the DB schema
export interface SalesTicketDB {
  id: string;
  name: string;
  cart_items: SaleItemForTicket[]; // Use the local SaleItemForTicket
  status: 'Active' | 'On Hold' | 'Pending Payment';
  created_at: string;
  last_updated_at: string;
}

// Helper function to parse SalesTicket from DB
const parseSalesTicketFromDB = (dbTicket: any): SalesTicketDB => {
  return {
    id: dbTicket.id,
    name: dbTicket.name,
    cart_items: dbTicket.cart_items || [], // Ensure cart_items is an array
    status: dbTicket.status,
    created_at: new Date(dbTicket.created_at).toISOString(),
    last_updated_at: new Date(dbTicket.last_updated_at).toISOString(),
  };
};

// GET handler to fetch all sales tickets (e.g., non-finalized ones)
export async function GET(request: NextRequest) {
  try {
    // You might want to filter by user or session in a real app
    const dbTickets = await query('SELECT id, name, cart_items, status, created_at, last_updated_at FROM SalesTickets ORDER BY last_updated_at DESC');
    const tickets: SalesTicketDB[] = dbTickets.map(parseSalesTicketFromDB);
    return NextResponse.json(tickets);
  } catch (error) {
    console.error('Failed to fetch sales tickets:', error);
    return NextResponse.json({ message: 'Failed to fetch sales tickets', error: (error as Error).message }, { status: 500 });
  }
}

// POST handler to create a new sales ticket
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = SalesTicketCreateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid sales ticket data', errors: validation.error.format() }, { status: 400 });
    }

    const { name, cart_items, status } = validation.data;
    const id = `T${Date.now()}${Math.random().toString(36).substring(2, 7)}`; // Simple ID generation

    const sql = `
      INSERT INTO SalesTickets (id, name, cart_items, status)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    // Ensure cart_items (which includes costPrice) are stringified for JSONB
    const params = [id, name, JSON.stringify(cart_items || []), status];
    
    const result = await query(sql, params);
    const newTicket: SalesTicketDB = parseSalesTicketFromDB(result[0]);

    return NextResponse.json(newTicket, { status: 201 });

  } catch (error) {
    console.error('Failed to create sales ticket:', error);
    return NextResponse.json({ message: 'Failed to create sales ticket', error: (error as Error).message }, { status: 500 });
  }
}
