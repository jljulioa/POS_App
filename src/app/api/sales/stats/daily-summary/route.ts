
// src/app/api/sales/stats/daily-summary/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { format, subDays, eachDayOfInterval, startOfDay, endOfDay } from 'date-fns';

interface DailySalesSummary {
  date: string; // Formatted date e.g., "Jul 15"
  name: string; // Day name e.g., "Mon"
  revenue: number;
  cogs: number; // Changed from dailyCogs to cogs
  profit: number;
}

export async function GET(request: NextRequest) {
  try {
    const today = new Date();
    const fiveDaysAgo = subDays(today, 4); // today + 4 previous days = 5 days total

    const dateInterval = eachDayOfInterval({
      start: startOfDay(fiveDaysAgo),
      end: startOfDay(today),
    });

    const dailySummaries: DailySalesSummary[] = [];

    // Fetch all sales and items within the 5-day range in fewer queries
    const salesInRange = await query(
      `SELECT id, date, totalamount FROM Sales WHERE date >= $1 AND date < $2 ORDER BY date ASC`,
      [startOfDay(fiveDaysAgo), endOfDay(today)]
    );

    const saleIdsInRange = salesInRange.map(s => s.id);
    let saleItemsInRange: any[] = [];
    if (saleIdsInRange.length > 0) {
        const itemPlaceholders = saleIdsInRange.map((_, index) => `$${index + 1}`).join(',');
        saleItemsInRange = await query(
            `SELECT sale_id, quantity, costprice, totalprice FROM SaleItems WHERE sale_id IN (${itemPlaceholders})`,
            saleIdsInRange
        );
    }
    
    const itemsBySaleId = new Map<string, any[]>();
    saleItemsInRange.forEach(item => {
        if (!itemsBySaleId.has(item.sale_id)) {
            itemsBySaleId.set(item.sale_id, []);
        }
        itemsBySaleId.get(item.sale_id)!.push(item);
    });


    for (const day of dateInterval) {
      const formattedDate = format(day, 'MMM d');
      const dayName = format(day, 'EEE'); // Short day name like "Mon"

      let dailyRevenue = 0;
      let dailyCogsValue = 0; // Renamed for clarity within the loop

      const salesOnThisDay = salesInRange.filter(s => {
        const saleDate = startOfDay(s.date); // s.date is already a Date object
        return saleDate.getTime() === day.getTime();
      });

      for (const sale of salesOnThisDay) {
        dailyRevenue += parseFloat(sale.totalamount || 0);
        const itemsForThisSale = itemsBySaleId.get(sale.id) || [];
        for (const item of itemsForThisSale) {
          dailyCogsValue += (parseFloat(item.costprice || 0) * parseInt(item.quantity, 10));
        }
      }
      
      const dailyProfit = dailyRevenue - dailyCogsValue;

      dailySummaries.push({
        date: formattedDate,
        name: dayName,
        revenue: parseFloat(dailyRevenue.toFixed(2)),
        cogs: parseFloat(dailyCogsValue.toFixed(2)), // Use cogs
        profit: parseFloat(dailyProfit.toFixed(2)),
      });
    }

    return NextResponse.json(dailySummaries);

  } catch (error) {
    console.error('Failed to fetch daily sales summary:', error);
    return NextResponse.json({ message: 'Failed to fetch daily sales summary', error: (error as Error).message }, { status: 500 });
  }
}

