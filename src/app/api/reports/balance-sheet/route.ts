// src/app/api/reports/balance-sheet/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { format } from 'date-fns';

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
  // This report is now a real-time snapshot of the current financial position.
  // Date parameters are no longer used for calculation to ensure the sheet is balanced.
  const asOfDate = new Date();

  try {
    // === ASSETS (Current Value) ===
    const inventoryResult = await query(
      `SELECT SUM(stock * cost) as total_inventory_value FROM products`
    );
    const inventory = parseFloat(inventoryResult[0]?.total_inventory_value || '0');

    const accountsReceivableResult = await query(
        `SELECT SUM(outstandingbalance) as total_receivable FROM customers WHERE outstandingbalance > 0`
    );
    const accountsReceivable = parseFloat(accountsReceivableResult[0]?.total_receivable || '0');

    // === LIABILITIES (Current Value) ===
    const accountsPayableResult = await query(
      `SELECT SUM(balance_due) as total_payable FROM purchaseinvoices WHERE payment_status != 'Paid'`
    );
    const accountsPayable = parseFloat(accountsPayableResult[0]?.total_payable || '0');

    // === EQUITY (Calculated as All-Time Net Profit) ===
    const revenueResult = await query(
      `SELECT SUM(totalAmount) as total_revenue FROM Sales`
    );
    const totalRevenue = parseFloat(revenueResult[0]?.total_revenue || '0');

    const cogsResult = await query(
      `SELECT SUM(si.quantity * si.costprice) as total_cogs
       FROM SaleItems si
       JOIN Sales s ON si.sale_id = s.id`
    );
    const totalCogs = parseFloat(cogsResult[0]?.total_cogs || '0');

    const expensesResult = await query(
      `SELECT SUM(amount) as total_expenses FROM DailyExpenses`
    );
    const totalExpenses = parseFloat(expensesResult[0]?.total_expenses || '0');

    const retainedEarnings = totalRevenue - totalCogs - totalExpenses;

    const responseData: BalanceSheetData = {
      asOfDate: format(asOfDate, 'yyyy-MM-dd'),
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
