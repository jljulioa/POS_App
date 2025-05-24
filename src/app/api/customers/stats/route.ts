
// src/app/api/customers/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const result = await query('SELECT COUNT(*) as totalCustomers FROM Customers');
    const totalCustomers = result.length > 0 ? parseInt(result[0].totalcustomers, 10) : 0;
    return NextResponse.json({ totalCustomers });
  } catch (error) {
    console.error('Failed to fetch customer stats:', error);
    return NextResponse.json({ message: 'Failed to fetch customer stats', error: (error as Error).message }, { status: 500 });
  }
}

