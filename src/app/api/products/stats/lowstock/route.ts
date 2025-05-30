
// src/app/api/products/stats/lowstock/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Items where stock is below minStock but not zero
    const result = await query('SELECT COUNT(*) as totalLowStockItems FROM Products WHERE stock > 0 AND stock < minStock');
    const totalLowStockItems = result.length > 0 ? parseInt(result[0].totallowstockitems, 10) : 0;
    return NextResponse.json({ totalLowStockItems });
  } catch (error) {
    console.error('Failed to fetch low stock product stats:', error);
    return NextResponse.json({ message: 'Failed to fetch low stock product stats', error: (error as Error).message }, { status: 500 });
  }
}
