// src/app/api/reports/balance-sheet/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { format } from 'date-fns';

// Updated interface: The API will no longer calculate or return equity.
// The frontend will derive it to ensure the balance sheet is always balanced.
export interface BalanceSheetData {
  asOfDate: string;
  assets: {
    inventory: number;
    accountsReceivable: number;
  };
  liabilities: {
    accountsPayable: number;
  };
}

export async function GET(request: NextRequest) {
  // This report is a real-time snapshot of the current financial position.
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

    const responseData: BalanceSheetData = {
      asOfDate: format(asOfDate, 'yyyy-MM-dd'),
      assets: {
        inventory,
        accountsReceivable,
      },
      liabilities: {
        accountsPayable,
      },
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Failed to fetch Balance Sheet data:', error);
    return NextResponse.json({ message: 'Failed to fetch Balance Sheet data', error: (error as Error).message }, { status: 500 });
  }
}
