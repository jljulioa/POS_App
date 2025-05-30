
// src/app/api/products/stats/outofstock/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Items where stock is zero
    const result = await query('SELECT COUNT(*) as totalOutOfStockItems FROM Products WHERE stock = 0');
    const totalOutOfStockItems = result.length > 0 ? parseInt(result[0].totaloutofstockitems, 10) : 0;
    return NextResponse.json({ totalOutOfStockItems });
  } catch (error) {
    console.error('Failed to fetch out of stock product stats:', error);
    return NextResponse.json({ message: 'Failed to fetch out of stock product stats', error: (error as Error).message }, { status: 500 });
  }
}
