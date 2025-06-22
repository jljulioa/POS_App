// src/app/api/reports/profit-loss/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { format, isValid, parseISO, startOfDay, endOfDay } from 'date-fns';

export interface ProfitLossData {
  totalRevenue: number;
  totalCogs: number;
  grossProfit: number;
  expensesByCategory: { category: string; total: number }[];
  totalExpenses: number;
  netProfit: number;
  startDate?: string;
  endDate?: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const startDateParam = searchParams.get('startDate');
  const endDateParam = searchParams.get('endDate');

  if (!startDateParam || !endDateParam) {
    return NextResponse.json({ message: 'Both startDate and endDate are required.' }, { status: 400 });
  }

  const startDate = startOfDay(parseISO(startDateParam));
  const endDate = endOfDay(parseISO(endDateParam));

  if (!isValid(startDate) || !isValid(endDate)) {
    return NextResponse.json({ message: 'Invalid date format provided.' }, { status: 400 });
  }
  
  const isoStartDate = format(startDate, "yyyy-MM-dd'T'HH:mm:ss.SSSXXX");
  const isoEndDate = format(endDate, "yyyy-MM-dd'T'HH:mm:ss.SSSXXX");

  try {
    // 1. Calculate Total Revenue from Sales
    const revenueResult = await query(
      `SELECT SUM(totalAmount) as total_revenue FROM Sales WHERE date >= $1 AND date <= $2`,
      [isoStartDate, isoEndDate]
    );
    const totalRevenue = parseFloat(revenueResult[0]?.total_revenue || '0');

    // 2. Calculate Total Cost of Goods Sold (COGS) from SaleItems
    const cogsResult = await query(
      `SELECT SUM(si.quantity * si.costprice) as total_cogs
       FROM SaleItems si
       JOIN Sales s ON si.sale_id = s.id
       WHERE s.date >= $1 AND s.date <= $2`,
      [isoStartDate, isoEndDate]
    );
    const totalCogs = parseFloat(cogsResult[0]?.total_cogs || '0');
    
    // 3. Calculate Gross Profit
    const grossProfit = totalRevenue - totalCogs;

    // 4. Fetch and aggregate expenses by category
    const expensesResult = await query(
      `SELECT category, SUM(amount) as total
       FROM DailyExpenses
       WHERE expenseDate >= $1 AND expenseDate <= $2
       GROUP BY category
       ORDER BY total DESC`,
      [format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')]
    );
    const expensesByCategory = expensesResult.map(e => ({
        category: e.category,
        total: parseFloat(e.total || '0')
    }));
    
    const totalExpenses = expensesByCategory.reduce((sum, current) => sum + current.total, 0);
    
    // 5. Calculate Net Profit
    const netProfit = grossProfit - totalExpenses;

    const responseData: ProfitLossData = {
      totalRevenue,
      totalCogs,
      grossProfit,
      expensesByCategory,
      totalExpenses,
      netProfit,
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Failed to fetch P&L data:', error);
    return NextResponse.json({ message: 'Failed to fetch Profit & Loss data', error: (error as Error).message }, { status: 500 });
  }
}
