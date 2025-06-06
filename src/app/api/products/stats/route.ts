
// src/app/api/products/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  // WARNING: Previous debug line for logging all env variables has been removed.
  // console.log("DEBUG: Checking for POSTGRES_URL in process.env. Is present: ", process.env.hasOwnProperty('POSTGRES_URL'));
  
  try {
    const result = await query('SELECT COUNT(*) as totalProducts FROM Products');
    const totalProducts = result.length > 0 ? parseInt(result[0].totalproducts, 10) : 0;
    return NextResponse.json({ totalProducts });
  } catch (error) {
    console.error('Failed to fetch product stats:', error);
    // Log the specific error to help diagnose if it's DB connection or query related
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ message: 'Failed to fetch product stats', error: errorMessage }, { status: 500 });
  }
}
