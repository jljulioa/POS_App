// src/app/api/reports/balance-sheet/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { format, isValid, parseISO, endOfDay } from 'date-fns';

export interface BalanceSheetData {
  asOfDate: string;
  assets: {
    inventory: number;
    accountsReceivable: number;
  };
  liabilities: {
    accountsPayable: number;
  };
  equity: {
    retainedEarnings: number;
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const endDateParam = searchParams.get('endDate');

  if (!endDateParam) {
    return NextResponse.json({ message: 'The endDate parameter is required.' }, { status: 400 });
  }

  const endDate = endOfDay(parseISO(endDateParam));

  if (!isValid(endDate)) {
    return NextResponse.json({ message: 'Invalid date format provided.' }, { status: 400 });
  }
  
  const isoEndDate = format(endDate, "yyyy-MM-dd'T'HH:mm:ss.SSSXXX");
  const dateOnlyEndDate = format(endDate, 'yyyy-MM-dd');

  try {
    // === ASSETS ===
    // Note: Inventory value is current, not historical as of endDate. This is a simplification.
    const inventoryResult = await query(
      `SELECT SUM(stock * cost) as total_inventory_value FROM products`
    );
    const inventory = parseFloat(inventoryResult[0]?.total_inventory_value || '0');

    // Note: Accounts Receivable is current, not historical.
    const accountsReceivableResult = await query(
        `SELECT SUM(outstandingbalance) as total_receivable FROM customers WHERE outstandingbalance > 0`
    );
    const accountsReceivable = parseFloat(accountsReceivableResult[0]?.total_receivable || '0');

    // === LIABILITIES ===
    const accountsPayableResult = await query(
      `SELECT SUM(balance_due) as total_payable FROM purchaseinvoices WHERE payment_status != 'Paid' AND invoicedate <= $1`,
      [dateOnlyEndDate]
    );
    const accountsPayable = parseFloat(accountsPayableResult[0]?.total_payable || '0');

    // === EQUITY (Calculated as historical Net Profit up to end date) ===
    const revenueResult = await query(
      `SELECT SUM(totalAmount) as total_revenue FROM Sales WHERE date <= $1`,
      [isoEndDate]
    );
    const totalRevenue = parseFloat(revenueResult[0]?.total_revenue || '0');

    const cogsResult = await query(
      `SELECT SUM(si.quantity * si.costprice) as total_cogs
       FROM SaleItems si
       JOIN Sales s ON si.sale_id = s.id
       WHERE s.date <= $1`,
      [isoEndDate]
    );
    const totalCogs = parseFloat(cogsResult[0]?.total_cogs || '0');

    const expensesResult = await query(
      `SELECT SUM(amount) as total_expenses FROM DailyExpenses WHERE expenseDate <= $1`,
      [dateOnlyEndDate]
    );
    const totalExpenses = parseFloat(expensesResult[0]?.total_expenses || '0');

    const retainedEarnings = totalRevenue - totalCogs - totalExpenses;

    const responseData: BalanceSheetData = {
      asOfDate: dateOnlyEndDate,
      assets: {
        inventory,
        accountsReceivable,
      },
      liabilities: {
        accountsPayable,
      },
      equity: {
        retainedEarnings,
      },
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Failed to fetch Balance Sheet data:', error);
    return NextResponse.json({ message: 'Failed to fetch Balance Sheet data', error: (error as Error).message }, { status: 500 });
  }
}
