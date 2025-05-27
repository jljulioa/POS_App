
// src/app/api/sales/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPool, query as executeQuery } from '@/lib/db';
import { z } from 'zod';
import type { Sale, SaleItem, Product } from '@/lib/mockData';
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
    createdAt: dbSale.createdat ? new Date(dbSale.createdat).toISOString() : undefined,
    updatedAt: dbSale.updatedat ? new Date(dbSale.updatedat).toISOString() : undefined,
  };
};

const parseSaleItemFromDB = (dbItem: any): SaleItem => {
  return {
    productId: dbItem.product_id,
    productName: dbItem.productname,
    quantity: parseInt(dbItem.quantity, 10),
    unitPrice: parseFloat(dbItem.unitprice),
    costPrice: dbItem.costprice !== null ? parseFloat(dbItem.costprice) : 0, // Ensure costPrice is parsed
    totalPrice: parseFloat(dbItem.totalprice),
    category: dbItem.category, // This will be pc.name from the join
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
      SELECT s.id, s.date, s.totalamount, s.customerid, s.customername, s.paymentmethod, s.cashierid, s.createdat, s.updatedat
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
            SELECT
                si.sale_id,
                si.product_id,
                si.productName,
                si.quantity,
                si.unitPrice,
                si.costprice,
                si.totalPrice,
                pc.name AS category -- Get category name from ProductCategories
            FROM SaleItems si
            LEFT JOIN Products p ON si.product_id = p.id
            LEFT JOIN ProductCategories pc ON p.category_id = pc.id -- Join ProductCategories
            WHERE si.sale_id IN (${itemPlaceholders})
        `;
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
  costPrice: z.number().min(0), // costPrice is required
  totalPrice: z.number().min(0),
  // category is not part of SaleItem input, it's derived
});

// Zod schema for the entire sale creation request
const CreateSaleSchema = z.object({
  items: z.array(SaleItemSchema).min(1, { message: "Sale must have at least one item." }),
  totalAmount: z.number().min(0),
  customerId: z.string().optional().nullable(),
  customerName: z.string().optional().nullable(),
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
      console.error("Sale creation validation error:", validation.error.format());
      return NextResponse.json({ message: 'Invalid sale data', errors: validation.error.format() }, { status: 400 });
    }

    const { items, totalAmount, customerId, customerName, paymentMethod, cashierId } = validation.data;
    const saleId = `S${Date.now()}${Math.random().toString(36).substring(2, 7)}`;
    const saleDate = new Date(); // Handled by DEFAULT CURRENT_TIMESTAMP for createdat/updatedat

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
      `;
      const saleItemInsertParams = [saleId, item.productId, item.productName, item.quantity, item.unitPrice, item.costPrice, item.totalPrice];
      const saleItemResult = await client.query(saleItemInsertSql, saleItemInsertParams);
      
      // Fetch product name for transaction log
      const productInfoResult = await client.query('SELECT name, stock FROM Products WHERE id = $1 FOR UPDATE', [item.productId]);
      if (productInfoResult.rowCount === 0) {
          await client.query('ROLLBACK');
          client.release();
          return NextResponse.json({ message: `Product ${item.productName} (ID: ${item.productId}) not found during sale processing.` }, { status: 404 });
      }
      const productInfo = productInfoResult.rows[0];
      const stockBefore = productInfo.stock;


      if (stockBefore < item.quantity) {
        await client.query('ROLLBACK');
        client.release();
        return NextResponse.json({ message: `Insufficient stock for product ${productInfo.name} (ID: ${item.productId}). Available: ${stockBefore}, Requested: ${item.quantity}.` }, { status: 409 });
      }

      const stockAfter = stockBefore - item.quantity;
      const updateStockSql = `
        UPDATE Products
        SET stock = $1
        WHERE id = $2;
      `;
      await client.query(updateStockSql, [stockAfter, item.productId]);

      // Log inventory transaction
      const transactionSql = `
        INSERT INTO InventoryTransactions (product_id, product_name, transaction_type, quantity_change, stock_before, stock_after, related_document_id, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;
      await client.query(transactionSql, [
        item.productId,
        productInfo.name, // Use fresh product name from DB
        'Sale',
        -item.quantity,
        stockBefore,
        stockAfter,
        saleId,
        `Sale of ${item.quantity} units.`
      ]);
      
      // To get category for the returned SaleItem object, we'd need to join ProductCategories here too
      // For simplicity for now, parseSaleItemFromDB will handle category if fetched
      const saleItemDb = saleItemResult.rows[0];
      const createdSaleItemResult = await client.query(`
        SELECT si.*, pc.name as category 
        FROM SaleItems si 
        LEFT JOIN Products p ON si.product_id = p.id
        LEFT JOIN ProductCategories pc ON p.category_id = pc.id
        WHERE si.id = $1
      `, [saleItemDb.id]);

      const createdSaleItem = parseSaleItemFromDB(createdSaleItemResult.rows[0]);
      createdSaleItems.push(createdSaleItem);
    }

    await client.query('COMMIT');

    const createdSale: Sale = parseSaleFromDB(newSaleDb, createdSaleItems);
    return NextResponse.json(createdSale, { status: 201 });

  } catch (error) {
    await client.query('ROLLBACK').catch(err => console.error('Rollback failed on main error:', err));
    console.error('Failed to create sale:', error);
    if (error instanceof Error && (error as any).code === '23503' && (error as any).constraint?.includes('saleitems_product_id_fkey')) {
         return NextResponse.json({ message: 'Failed to create sale: One or more products do not exist.', error: (error as Error).message }, { status: 400 });
    }
    return NextResponse.json({ message: 'Failed to create sale', error: (error as Error).message }, { status: 500 });
  } finally {
    client.release();
  }
}
