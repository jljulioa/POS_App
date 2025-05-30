
// src/app/api/sales-tickets/[ticketId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { z } from 'zod';

// Import or redefine SaleItemForTicket to match the main route's definition
interface SaleItemForTicket {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  originalUnitPrice: number;
  costPrice: number;
  discountPercentage: number;
  totalPrice: number;
}

export interface SalesTicketDB {
  id: string;
  name: string;
  cart_items: SaleItemForTicket[];
  status: 'Active' | 'On Hold' | 'Pending Payment';
  customer_id?: string | null;
  customer_name?: string | null;
  created_at: string;
  last_updated_at: string;
}

const SaleItemSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  unitPrice: z.number().min(0),
  originalUnitPrice: z.number().min(0),
  costPrice: z.number().min(0),
  discountPercentage: z.number().min(0).max(100).default(0),
  totalPrice: z.number().min(0),
});

const SalesTicketUpdateSchema = z.object({
  name: z.string().min(1, { message: "Ticket name cannot be empty." }).optional(),
  cart_items: z.array(SaleItemSchema).optional(), 
  status: z.enum(['Active', 'On Hold', 'Pending Payment']).optional(),
  customer_id: z.string().nullable().optional(),
  customer_name: z.string().nullable().optional(),
});

const parseSalesTicketFromDB = (dbTicket: any): SalesTicketDB => {
  if (!dbTicket) return null as any;

  const parsedCartItems = (dbTicket.cart_items || []).map((item: any): SaleItemForTicket | null => {
    const quantity = parseInt(String(item.quantity || '0'), 10);
    const productId = String(item.productId || '');
    
    if (!productId || quantity < 1) {
      return null;
    }
    
    const originalUnitPrice = parseFloat(String(item.originalUnitPrice || item.unitPrice || '0')) || 0;
    const discountPercentage = parseFloat(String(item.discountPercentage || '0')) || 0;
    const unitPrice = parseFloat(String(item.unitPrice || '0')) || (originalUnitPrice * (1 - discountPercentage / 100));

    return {
      productId: productId,
      productName: String(item.productName || 'Unknown Product'),
      quantity: quantity,
      unitPrice: unitPrice,
      originalUnitPrice: originalUnitPrice,
      costPrice: parseFloat(String(item.costPrice || '0')) || 0,
      discountPercentage: discountPercentage,
      totalPrice: parseFloat(String(item.totalPrice || '0')) || (unitPrice * quantity),
    };
  }).filter((item): item is SaleItemForTicket => item !== null);

  return {
    id: String(dbTicket.id),
    name: String(dbTicket.name || 'Unnamed Ticket'),
    cart_items: parsedCartItems,
    status: dbTicket.status || 'Active',
    customer_id: dbTicket.customer_id || null,
    customer_name: dbTicket.customer_name || null,
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

    const currentTicketResult = await query('SELECT * FROM SalesTickets WHERE id = $1', [ticketId]);
    if (currentTicketResult.length === 0) {
      return NextResponse.json({ message: 'Sales ticket not found for update' }, { status: 404 });
    }
    // const currentTicket = parseSalesTicketFromDB(currentTicketResult[0]); // Not strictly needed if we update all provided fields

    const updateFields = [];
    const queryParams = [];
    let paramIndex = 1;

    const addParam = (value: any) => {
        queryParams.push(value);
        return `$${paramIndex++}`;
    };

    const { name, cart_items, status, customer_id, customer_name } = validation.data;

    if (name !== undefined) updateFields.push(`name = ${addParam(name)}`);
    if (cart_items !== undefined) updateFields.push(`cart_items = ${addParam(JSON.stringify(cart_items))}`);
    if (status !== undefined) updateFields.push(`status = ${addParam(status)}`);
    if (customer_id !== undefined) updateFields.push(`customer_id = ${addParam(customer_id)}`);
    if (customer_name !== undefined) updateFields.push(`customer_name = ${addParam(customer_name)}`);
    
    if (updateFields.length === 0) {
        return NextResponse.json({ message: "No fields to update provided." }, { status: 400 });
    }
    
    updateFields.push(`last_updated_at = CURRENT_TIMESTAMP`); // Always update last_updated_at

    const sql = `
      UPDATE SalesTickets
      SET ${updateFields.join(', ')}
      WHERE id = ${addParam(ticketId)}
      RETURNING *
    `;

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
