
// src/app/api/inventory-transactions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query as executeQuery } from '@/lib/db';
// type InventoryTransaction removed as it's defined locally now
import { format, isValid, parseISO, endOfDay, startOfDay } from 'date-fns';

export interface InventoryTransactionDB {
    id: number;
    product_id: string;
    product_name: string;
    transaction_type: 'Sale' | 'Purchase' | 'Return' | 'Adjustment';
    quantity_change: number;
    stock_before: number;
    stock_after: number;
    related_document_id: string | null;
    notes: string | null;
    transaction_date: string; // ISO string
    cost_price?: number; // Added cost_price
}

const parseTransactionFromDB = (dbTransaction: any): InventoryTransactionDB => {
    return {
        id: parseInt(dbTransaction.id, 10),
        product_id: dbTransaction.product_id,
        product_name: dbTransaction.product_name,
        transaction_type: dbTransaction.transaction_type,
        quantity_change: parseInt(dbTransaction.quantity_change, 10),
        stock_before: parseInt(dbTransaction.stock_before, 10),
        stock_after: parseInt(dbTransaction.stock_after, 10),
        related_document_id: dbTransaction.related_document_id,
        notes: dbTransaction.notes,
        transaction_date: new Date(dbTransaction.transaction_date).toISOString(),
        cost_price: dbTransaction.cost_price !== null && dbTransaction.cost_price !== undefined ? parseFloat(dbTransaction.cost_price) : undefined,
    };
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const transactionType = searchParams.get('type');
  const startDateParam = searchParams.get('startDate');
  const endDateParam = searchParams.get('endDate');

  // Base SQL query, selecting from InventoryTransactions aliased as 'it'
  // and LEFT JOINing with Products aliased as 'p' to get p.cost
  let sql = `
    SELECT 
      it.id, 
      it.product_id, 
      it.product_name, 
      it.transaction_type, 
      it.quantity_change, 
      it.stock_before, 
      it.stock_after, 
      it.related_document_id, 
      it.notes, 
      it.transaction_date,
      p.cost as cost_price 
    FROM InventoryTransactions it
    LEFT JOIN Products p ON it.product_id = p.id
  `;
  const conditions: string[] = [];
  const queryParams: any[] = [];
  let paramIndex = 1;

  if (transactionType) {
    conditions.push(`it.transaction_type = $${paramIndex++}`);
    queryParams.push(transactionType);
  }

  if (startDateParam) {
    const startDate = parseISO(startDateParam);
    if (isValid(startDate)) {
      conditions.push(`it.transaction_date >= $${paramIndex++}`);
      queryParams.push(format(startOfDay(startDate), "yyyy-MM-dd'T'HH:mm:ss.SSSXXX"));
    }
  }
  if (endDateParam) {
    const endDate = parseISO(endDateParam);
    if (isValid(endDate)) {
      conditions.push(`it.transaction_date <= $${paramIndex++}`);
      queryParams.push(format(endOfDay(endDate), "yyyy-MM-dd'T'HH:mm:ss.SSSXXX"));
    }
  }

  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(' AND ')}`;
  }
  sql += ' ORDER BY it.transaction_date DESC, it.id DESC';

  try {
    const dbTransactions = await executeQuery(sql, queryParams);
    const transactions: InventoryTransactionDB[] = dbTransactions.map(parseTransactionFromDB);
    return NextResponse.json(transactions);
  } catch (error) {
    console.error('Failed to fetch inventory transactions:', error);
    return NextResponse.json({ message: 'Failed to fetch inventory transactions', error: (error as Error).message }, { status: 500 });
  }
}
