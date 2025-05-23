
// src/app/api/sales/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { format } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const today = format(new Date(), 'yyyy-MM-dd');
    // Query to sum totalAmount and count sales for today
    // Note: In PostgreSQL, DATE(date) extracts the date part from a timestamp
    // For date comparison, ensure the 'date' column in Sales is a TIMESTAMP or DATE type
    const result = await query(
      "SELECT SUM(totalAmount) as totalSalesAmount, COUNT(*) as totalSalesCount FROM Sales WHERE DATE(date) = $1",
      [today]
    );

    const stats = result[0];
    const totalSalesAmount = stats.totalsalesamount ? parseFloat(stats.totalsalesamount) : 0;
    const totalSalesCount = stats.totalsalescount ? parseInt(stats.totalsalescount, 10) : 0;

    return NextResponse.json({ totalSalesAmount, totalSalesCount });
  } catch (error) {
    console.error('Failed to fetch sales stats:', error);
    return NextResponse.json({ message: 'Failed to fetch sales stats', error: (error as Error).message }, { status: 500 });
  }
}
