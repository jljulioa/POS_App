
// src/app/api/sales-tickets/[ticketId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { z } from 'zod';
import type { SalesTicketDB as ImportedSalesTicketDB, SaleItemForTicket } from '@/app/api/sales-tickets/route'; // Import the type

// Re-define SalesTicketDB or ensure it's correctly typed if SaleItemForTicket is defined locally
export interface SalesTicketDB extends ImportedSalesTicketDB {}


// Zod schema for SaleItem (consistent with POS page and sales API)
const SaleItemSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  unitPrice: z.number().min(0),
  costPrice: z.number().min(0),
  totalPrice: z.number().min(0),
});

// Zod schema for SalesTicket update
const SalesTicketUpdateSchema = z.object({
  name: z.string().min(1, { message: "Ticket name cannot be empty." }).optional(),
  cart_items: z.array(SaleItemSchema).optional(), 
  status: z.enum(['Active', 'On Hold', 'Pending Payment']).optional(),
});

// Helper function to parse SalesTicket from DB (can be shared or re-defined)
// with robust cart_item parsing
const parseSalesTicketFromDB = (dbTicket: any): SalesTicketDB => {
  if (!dbTicket) return null as any; // Should not happen if query is correct

  const parsedCartItems = (dbTicket.cart_items || []).map((item: any): SaleItemForTicket | null => {
    const quantity = parseInt(String(item.quantity || '0'), 10);
    const productId = String(item.productId || '');
    
    if (!productId || quantity < 1) {
      // console.warn("Filtering out invalid cart item during single ticket parsing:", item);
      return null;
    }

    return {
      productId: productId,
      productName: String(item.productName || 'Unknown Product'),
      quantity: quantity,
      unitPrice: parseFloat(String(item.unitPrice || '0')) || 0,
      costPrice: parseFloat(String(item.costPrice || '0')) || 0,
      totalPrice: parseFloat(String(item.totalPrice || '0')) || 0,
    };
  }).filter((item): item is SaleItemForTicket => item !== null);


  return {
    id: String(dbTicket.id),
    name: String(dbTicket.name || 'Unnamed Ticket'),
    cart_items: parsedCartItems,
    status: dbTicket.status || 'Active',
    created_at: new Date(dbTicket.created_at || Date.now()).toISOString(),
    last_updated_at: new Date(dbTicket.last_updated_at || Date.now()).toISOString(),
  };
};

// GET handler to fetch a single sales ticket by ID
export async function GET(request: NextRequest, { params }: { params: { ticketId: string } }) {
  const { ticketId } = params;
  try {
    const dbResult = await query('SELECT * FROM SalesTickets WHERE id = $1', [ticketId]);
    if (dbResult.length === 0) {
      return NextResponse.json({ message: 'Sales ticket not found' }, { status: 404 });
    }
    const ticket: SalesTicketDB = parseSalesTicketFromDB(dbResult[0]);
    return NextResponse.json(ticket);
  } catch (error) {
    console.error(`Failed to fetch sales ticket ${ticketId}:`, error);
    return NextResponse.json({ message: 'Failed to fetch sales ticket', error: (error as Error).message }, { status: 500 });
  }
}

// PUT handler to update an existing sales ticket
export async function PUT(request: NextRequest, { params }: { params: { ticketId: string } }) {
  const { ticketId } = params;
  try {
    const body = await request.json();
    const validation = SalesTicketUpdateSchema.safeParse(body);

    if (!validation.success) {
      console.error(`SalesTicketUpdateSchema validation error for ticket ${ticketId}:`, validation.error.format());
      return NextResponse.json({ message: 'Invalid sales ticket data for update', errors: validation.error.format() }, { status: 400 });
    }

    // Fetch current ticket to only update provided fields
    const currentTicketResult = await query('SELECT * FROM SalesTickets WHERE id = $1', [ticketId]);
    if (currentTicketResult.length === 0) {
      return NextResponse.json({ message: 'Sales ticket not found for update' }, { status: 404 });
    }
    const currentTicket = parseSalesTicketFromDB(currentTicketResult[0]);

    const { name, cart_items, status } = validation.data;

    const updatedName = name ?? currentTicket.name;
    // If cart_items is provided in the body, use it (it's already validated by SaleItemSchema array)
    // otherwise, use current ticket's cart_items.
    const updatedCartItems = cart_items ?? currentTicket.cart_items; 
    const updatedStatus = status ?? currentTicket.status;
    
    const sql = `
      UPDATE SalesTickets
      SET name = $1, cart_items = $2, status = $3, last_updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `;
    const queryParams = [updatedName, JSON.stringify(updatedCartItems), updatedStatus, ticketId];

    const result = await query(sql, queryParams);
    if (result.length === 0) {
        return NextResponse.json({ message: 'Sales ticket not found or update failed unexpectedly' }, { status: 404 });
    }
    const updatedTicket: SalesTicketDB = parseSalesTicketFromDB(result[0]);

    return NextResponse.json(updatedTicket, { status: 200 });

  } catch (error) {
    console.error(`Failed to update sales ticket ${ticketId}:`, error);
    return NextResponse.json({ message: 'Failed to update sales ticket', error: (error as Error).message }, { status: 500 });
  }
}

// DELETE handler to remove a sales ticket
export async function DELETE(request: NextRequest, { params }: { params: { ticketId: string } }) {
  const { ticketId } = params;
  try {
    const result = await query('DELETE FROM SalesTickets WHERE id = $1 RETURNING id', [ticketId]);

    if (result.length === 0) {
      return NextResponse.json({ message: 'Sales ticket not found or already deleted' }, { status: 404 });
    }

    return NextResponse.json({ message: `Sales ticket ${ticketId} deleted successfully` }, { status: 200 });
  } catch (error) {
    console.error(`Failed to delete sales ticket ${ticketId}:`, error);
    return NextResponse.json({ message: 'Failed to delete sales ticket', error: (error as Error).message }, { status: 500 });
  }
}
