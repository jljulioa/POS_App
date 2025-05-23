
// src/app/api/inventory-transactions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query as executeQuery } from '@/lib/db';
import type { InventoryTransaction } from '@/lib/types'; // Assuming types.ts will be created

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
  try {
    const dbTransactions = await executeQuery(
      'SELECT * FROM InventoryTransactions ORDER BY transaction_date DESC, id DESC'
    );
    const transactions: InventoryTransactionDB[] = dbTransactions.map(parseTransactionFromDB);
    return NextResponse.json(transactions);
  } catch (error) {
    console.error('Failed to fetch inventory transactions:', error);
    return NextResponse.json({ message: 'Failed to fetch inventory transactions', error: (error as Error).message }, { status: 500 });
  }
}
