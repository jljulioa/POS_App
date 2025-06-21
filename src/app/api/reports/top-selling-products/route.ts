// src/app/api/reports/top-selling-products/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export interface TopSellingProduct {
  product_id: string;
  product_name: string;
  product_code: string;
  total_quantity_sold: number;
  total_revenue: number;
}

export async function GET(request: NextRequest) {
  try {
    // This query joins SaleItems with Products to get the product code.
    // It groups by product details, sums the quantity and total price,
    // orders by the total quantity sold in descending order, and limits to the top 20.
    const sql = `
      SELECT
        si.product_id,
        si.productName AS product_name,
        p.code AS product_code,
        SUM(si.quantity) AS total_quantity_sold,
        SUM(si.totalPrice) AS total_revenue
      FROM SaleItems si
      JOIN Products p ON si.product_id = p.id
      GROUP BY si.product_id, si.productName, p.code
      ORDER BY total_quantity_sold DESC
      LIMIT 20;
    `;

    const dbResult = await query(sql);

    // Parse the results from the database, ensuring correct types
    const topProducts: TopSellingProduct[] = dbResult.map(item => ({
      product_id: item.product_id,
      product_name: item.product_name,
      product_code: item.product_code,
      total_quantity_sold: parseInt(item.total_quantity_sold, 10),
      total_revenue: parseFloat(item.total_revenue),
    }));

    return NextResponse.json(topProducts);

  } catch (error) {
    console.error('Failed to fetch top selling products:', error);
    return NextResponse.json({ message: 'Failed to fetch top selling products', error: (error as Error).message }, { status: 500 });
  }
}
