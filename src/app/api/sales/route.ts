
// src/app/api/sales/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { Sale, SaleItem } from '@/lib/mockData'; // Using existing types

// Helper to parse Sale and SaleItem from DB
// Note: Column names from DB (e.g., sale_id, product_id, unitprice) need to match what's used in SQL
const parseSaleFromDB = (dbSale: any, items: SaleItem[]): Sale => {
  return {
    id: dbSale.id,
    date: new Date(dbSale.date).toISOString(), // Ensure date is ISO string
    items: items,
    totalAmount: parseFloat(dbSale.totalamount),
    customerId: dbSale.customerid,
    customerName: dbSale.customername,
    paymentMethod: dbSale.paymentmethod,
    cashierId: dbSale.cashierid,
  };
};

const parseSaleItemFromDB = (dbItem: any): SaleItem => {
  return {
    productId: dbItem.product_id, // Ensure correct column name from DB
    productName: dbItem.productname,
    quantity: parseInt(dbItem.quantity, 10),
    unitPrice: parseFloat(dbItem.unitprice),
    totalPrice: parseFloat(dbItem.totalprice),
  };
};

// GET handler to fetch all sales with their items
export async function GET(request: NextRequest) {
  try {
    // Fetch all sales
    const salesResults = await query(`
      SELECT id, date, totalamount, customerid, customername, paymentmethod, cashierid
      FROM Sales
      ORDER BY date DESC
    `);

    // Fetch all sale items
    const saleItemsResults = await query(`
      SELECT sale_id, product_id, productname, quantity, unitprice, totalprice
      FROM SaleItems
    `);

    // Group items by sale_id
    const itemsBySaleId = new Map<string, SaleItem[]>();
    saleItemsResults.forEach(dbItem => {
      const item = parseSaleItemFromDB(dbItem);
      if (!itemsBySaleId.has(dbItem.sale_id)) {
        itemsBySaleId.set(dbItem.sale_id, []);
      }
      itemsBySaleId.get(dbItem.sale_id)!.push(item);
    });

    // Combine sales with their items
    const sales: Sale[] = salesResults.map(dbSale => {
      return parseSaleFromDB(dbSale, itemsBySaleId.get(dbSale.id) || []);
    });

    return NextResponse.json(sales);
  } catch (error) {
    console.error('Failed to fetch sales:', error);
    return NextResponse.json({ message: 'Failed to fetch sales', error: (error as Error).message }, { status: 500 });
  }
}

// POST handler to create a new sale (Simplified for now - full implementation is complex)
// A full implementation would involve:
// 1. Validating input (customer, items, payment)
// 2. Starting a database transaction
// 3. Inserting into Sales table
// 4. Inserting each item into SaleItems table
// 5. Decrementing stock for each product in Products table
// 6. Committing or rolling back the transaction
export async function POST(request: NextRequest) {
    // This is a placeholder for a more complex sale creation logic.
    // For now, let's assume we're just logging the request.
    try {
        const body = await request.json();
        console.log("Received sale creation request:", body);

        // TODO: Implement full sale creation logic with database transactions

        // For demonstration, let's return a mock success response.
        // In a real scenario, you'd return the created sale object.
        return NextResponse.json({ message: "Sale creation endpoint called. Full logic pending.", saleData: body }, { status: 201 });

    } catch (error) {
        console.error('Failed to process sale creation request:', error);
        return NextResponse.json({ message: 'Failed to process sale creation request', error: (error as Error).message }, { status: 500 });
    }
}
