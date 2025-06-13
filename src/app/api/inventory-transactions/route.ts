
// src/app/api/inventory-transactions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query as executeQuery } from '@/lib/db';
import type { InventoryTransaction } from '@/lib/types'; // Assuming types.ts will be created
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
    };
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const transactionType = searchParams.get('type');
  const startDateParam = searchParams.get('startDate');
  const endDateParam = searchParams.get('endDate');

  let sql = 'SELECT * FROM InventoryTransactions';
  const conditions: string[] = [];
  const queryParams: any[] = [];
  let paramIndex = 1;

  if (transactionType) {
    conditions.push(`transaction_type = $${paramIndex++}`);
    queryParams.push(transactionType);
  }

  if (startDateParam) {
    const startDate = parseISO(startDateParam);
    if (isValid(startDate)) {
      conditions.push(`transaction_date >= $${paramIndex++}`);
      queryParams.push(format(startOfDay(startDate), "yyyy-MM-dd'T'HH:mm:ss.SSSXXX"));
    }
  }
  if (endDateParam) {
    const endDate = parseISO(endDateParam);
    if (isValid(endDate)) {
      conditions.push(`transaction_date <= $${paramIndex++}`);
      queryParams.push(format(endOfDay(endDate), "yyyy-MM-dd'T'HH:mm:ss.SSSXXX"));
    }
  }

  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(' AND ')}`;
  }
  sql += ' ORDER BY transaction_date DESC, id DESC';

  try {
    const dbTransactions = await executeQuery(sql, queryParams);
    const transactions: InventoryTransactionDB[] = dbTransactions.map(parseTransactionFromDB);
    return NextResponse.json(transactions);
  } catch (error) {
    console.error('Failed to fetch inventory transactions:', error);
    return NextResponse.json({ message: 'Failed to fetch inventory transactions', error: (error as Error).message }, { status: 500 });
  }
}
