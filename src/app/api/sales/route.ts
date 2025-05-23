
// src/app/api/sales/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPool, query as executeQuery } from '@/lib/db'; 
import { z } from 'zod';
import type { Sale, SaleItem } from '@/lib/mockData'; 
import { format, isValid, parseISO } from 'date-fns';

// Helper to parse Sale and SaleItem from DB
const parseSaleFromDB = (dbSale: any, items: SaleItem[]): Sale => {
  return {
    id: dbSale.id,
    date: new Date(dbSale.date).toISOString(),
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
    productId: dbItem.product_id,
    productName: dbItem.productname,
    quantity: parseInt(dbItem.quantity, 10),
    unitPrice: parseFloat(dbItem.unitprice),
    costPrice: parseFloat(dbItem.costprice), // Ensure costPrice is parsed
    totalPrice: parseFloat(dbItem.totalprice),
  };
};

// GET handler to fetch sales with their items
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period');
  const startDateParam = searchParams.get('startDate');
  const endDateParam = searchParams.get('endDate');

  let dateFilterClauses: string[] = [];
  const queryParams: any[] = [];
  let paramIndex = 1;

  if (period === 'today') {
    const today = format(new Date(), 'yyyy-MM-dd');
    dateFilterClauses.push(`DATE(s.date) = $${paramIndex++}`);
    queryParams.push(today);
  } else if (startDateParam && endDateParam) {
    const startDate = parseISO(startDateParam);
    const endDate = parseISO(endDateParam);

    if (isValid(startDate) && isValid(endDate)) {
      const formattedEndDate = format(endDate, 'yyyy-MM-dd') + 'T23:59:59.999Z';
      dateFilterClauses.push(`s.date >= $${paramIndex++}`);
      queryParams.push(format(startDate, 'yyyy-MM-dd') + 'T00:00:00.000Z');
      dateFilterClauses.push(`s.date <= $${paramIndex++}`);
      queryParams.push(formattedEndDate);
    } else {
        console.warn("Invalid date parameters received:", { startDateParam, endDateParam });
    }
  }

  const whereClause = dateFilterClauses.length > 0 ? `WHERE ${dateFilterClauses.join(' AND ')}` : '';

  try {
    const salesSql = `
      SELECT s.id, s.date, s.totalamount, s.customerid, s.customername, s.paymentmethod, s.cashierid
      FROM Sales s
      ${whereClause}
      ORDER BY s.date DESC
    `;
    const salesResults = await executeQuery(salesSql, queryParams);

    const saleIds = salesResults.map(s => s.id);
    let saleItemsResults: any[] = [];

    if (saleIds.length > 0) {
        const itemPlaceholders = saleIds.map((_, index) => `$${index + 1}`).join(',');
        const itemsSql = `
            SELECT sale_id, product_id, productname, quantity, unitprice, costprice, totalprice
            FROM SaleItems
            WHERE sale_id IN (${itemPlaceholders})
        `; // Added costprice to SELECT
        saleItemsResults = await executeQuery(itemsSql, saleIds);
    }


    const itemsBySaleId = new Map<string, SaleItem[]>();
    saleItemsResults.forEach(dbItem => {
      const item = parseSaleItemFromDB(dbItem);
      if (!itemsBySaleId.has(dbItem.sale_id)) {
        itemsBySaleId.set(dbItem.sale_id, []);
      }
      itemsBySaleId.get(dbItem.sale_id)!.push(item);
    });

    const sales: Sale[] = salesResults.map(dbSale => {
      return parseSaleFromDB(dbSale, itemsBySaleId.get(dbSale.id) || []);
    });

    return NextResponse.json(sales);
  } catch (error) {
    console.error('Failed to fetch sales:', error);
    return NextResponse.json({ message: 'Failed to fetch sales', error: (error as Error).message }, { status: 500 });
  }
}

// Zod schema for SaleItem input from POS
const SaleItemSchema = z.object({
  productId: z.string(),
  productName: z.string(), 
  quantity: z.number().int().min(1),
  unitPrice: z.number().min(0),
  costPrice: z.number().min(0), // Added costPrice
  totalPrice: z.number().min(0),
});

// Zod schema for the entire sale creation request
const CreateSaleSchema = z.object({
  items: z.array(SaleItemSchema).min(1, { message: "Sale must have at least one item." }),
  totalAmount: z.number().min(0),
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  paymentMethod: z.enum(['Cash', 'Card', 'Transfer', 'Combined']),
  cashierId: z.string().min(1),
});


// POST handler to create a new sale
export async function POST(request: NextRequest) {
  const pool = await getPool();
  const client = await pool.connect();

  try {
    const body = await request.json();
    const validation = CreateSaleSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid sale data', errors: validation.error.format() }, { status: 400 });
    }

    const { items, totalAmount, customerId, customerName, paymentMethod, cashierId } = validation.data;
    const saleId = `S${Date.now()}${Math.random().toString(36).substring(2, 7)}`;
    const saleDate = new Date();

    await client.query('BEGIN'); 

    const saleInsertSql = `
      INSERT INTO Sales (id, date, totalAmount, customerId, customerName, paymentMethod, cashierId)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const saleInsertParams = [saleId, saleDate, totalAmount, customerId || null, customerName || null, paymentMethod, cashierId];
    const saleResult = await client.query(saleInsertSql, saleInsertParams);
    const newSaleDb = saleResult.rows[0];

    const createdSaleItems: SaleItem[] = [];
    for (const item of items) {
      const saleItemInsertSql = `
        INSERT INTO SaleItems (sale_id, product_id, productName, quantity, unitPrice, costPrice, totalPrice)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `; // Added costPrice to INSERT
      const saleItemInsertParams = [saleId, item.productId, item.productName, item.quantity, item.unitPrice, item.costPrice, item.totalPrice];
      const saleItemResult = await client.query(saleItemInsertSql, saleItemInsertParams);
      createdSaleItems.push(parseSaleItemFromDB(saleItemResult.rows[0]));

      const updateStockSql = `
        UPDATE Products
        SET stock = stock - $1
        WHERE id = $2 AND stock >= $1 
        RETURNING stock; 
      `;
      const stockUpdateResult = await client.query(updateStockSql, [item.quantity, item.productId]);

      if (stockUpdateResult.rowCount === 0) {
        await client.query('ROLLBACK');
        console.error(`Failed to update stock for product ${item.productId}: Insufficient stock or product not found.`);
        return NextResponse.json({ message: `Failed to process sale: Insufficient stock for product ${item.productName} (ID: ${item.productId}) or product not found.` }, { status: 409 });
      }
    }

    await client.query('COMMIT');

    const createdSale: Sale = parseSaleFromDB(newSaleDb, createdSaleItems);
    return NextResponse.json(createdSale, { status: 201 });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to create sale:', error);
    if (error instanceof Error && (error as any).code === '23503' && (error as any).constraint?.includes('saleitems_product_id_fkey')) {
         return NextResponse.json({ message: 'Failed to create sale: One or more products do not exist.', error: (error as Error).message }, { status: 400 });
    }
    return NextResponse.json({ message: 'Failed to create sale', error: (error as Error).message }, { status: 500 });
  } finally {
    client.release();
  }
}
