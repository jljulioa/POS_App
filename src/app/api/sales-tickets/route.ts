
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
  costPrice: number;
  totalPrice: number;
}

// Zod schema for SaleItem (consistent with POS page and sales API)
const SaleItemSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  unitPrice: z.number().min(0),
  costPrice: z.number().min(0), 
  totalPrice: z.number().min(0),
});

// Zod schema for SalesTicket creation
const SalesTicketCreateSchema = z.object({
  name: z.string().min(1, { message: "Ticket name cannot be empty." }),
  cart_items: z.array(SaleItemSchema).optional().default([]),
  status: z.enum(['Active', 'On Hold', 'Pending Payment']),
});

// Interface for SalesTicket matching the DB schema
export interface SalesTicketDB {
  id: string;
  name: string;
  cart_items: SaleItemForTicket[]; 
  status: 'Active' | 'On Hold' | 'Pending Payment';
  created_at: string;
  last_updated_at: string;
}

// Helper function to parse SalesTicket from DB, with robust cart_item parsing
const parseSalesTicketFromDB = (dbTicket: any): SalesTicketDB => {
  const parsedCartItems = (dbTicket.cart_items || []).map((item: any): SaleItemForTicket | null => {
    const quantity = parseInt(String(item.quantity || '0'), 10);
    const productId = String(item.productId || '');

    // Basic validation: ensure productId exists and quantity is at least 1
    if (!productId || quantity < 1) {
      // console.warn("Filtering out invalid cart item during parsing:", item);
      return null; // This item will be filtered out
    }

    return {
      productId: productId,
      productName: String(item.productName || 'Unknown Product'),
      quantity: quantity,
      unitPrice: parseFloat(String(item.unitPrice || '0')) || 0,
      costPrice: parseFloat(String(item.costPrice || '0')) || 0,
      totalPrice: parseFloat(String(item.totalPrice || '0')) || 0,
    };
  }).filter((item): item is SaleItemForTicket => item !== null); // Remove nulls (invalid items)

  return {
    id: String(dbTicket.id),
    name: String(dbTicket.name || 'Unnamed Ticket'),
    cart_items: parsedCartItems,
    status: dbTicket.status || 'Active',
    created_at: new Date(dbTicket.created_at || Date.now()).toISOString(),
    last_updated_at: new Date(dbTicket.last_updated_at || Date.now()).toISOString(),
  };
};

// GET handler to fetch all sales tickets
export async function GET(request: NextRequest) {
  try {
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
      console.error("SalesTicketCreateSchema validation error:", validation.error.format());
      return NextResponse.json({ message: 'Invalid sales ticket data', errors: validation.error.format() }, { status: 400 });
    }

    const { name, cart_items, status } = validation.data;
    // Generate a unique ID for the ticket
    const id = `T${Date.now()}${Math.random().toString(36).substring(2, 7)}`; 

    const sql = `
      INSERT INTO SalesTickets (id, name, cart_items, status)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const params = [id, name, JSON.stringify(cart_items || []), status];
    
    const result = await query(sql, params);
    if (result.length === 0) {
        throw new Error("Ticket creation failed, no data returned from DB.");
    }
    const newTicket: SalesTicketDB = parseSalesTicketFromDB(result[0]);

    return NextResponse.json(newTicket, { status: 201 });

  } catch (error) {
    console.error('Failed to create sales ticket:', error);
    return NextResponse.json({ message: 'Failed to create sales ticket', error: (error as Error).message }, { status: 500 });
  }
}
