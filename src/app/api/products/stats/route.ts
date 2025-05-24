
// src/app/api/products/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const result = await query('SELECT COUNT(*) as totalProducts FROM Products');
    const totalProducts = result.length > 0 ? parseInt(result[0].totalproducts, 10) : 0;
    return NextResponse.json({ totalProducts });
  } catch (error) {
    console.error('Failed to fetch product stats:', error);
    return NextResponse.json({ message: 'Failed to fetch product stats', error: (error as Error).message }, { status: 500 });
  }
}

