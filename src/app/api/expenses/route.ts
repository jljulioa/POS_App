
// src/app/api/expenses/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { z } from 'zod';
import type { DailyExpense, ExpenseCategoryEnum } from '@/lib/mockData';
import { format, isValid, parseISO } from 'date-fns';

// Zod schema for ExpenseCategoryEnum
const ExpenseCategoryEnumSchema = z.enum([
    'Rent', 'Utilities', 'Supplies', 'Salaries', 'Marketing', 'Maintenance',
    'Office', 'Travel', 'Taxes', 'Insurance', 'Bank Fees', 'Shipping', 'Meals & Entertainment', 'Other'
]);

const ExpenseCreateSchema = z.object({
  expenseDate: z.string().refine((date) => isValid(parseISO(date)), {
    message: "Invalid date format. Use YYYY-MM-DD.",
  }),
  description: z.string().min(3, { message: "Description must be at least 3 characters." }),
  category: ExpenseCategoryEnumSchema,
  amount: z.coerce.number().positive({ message: "Amount must be a positive number." }),
  notes: z.string().optional().or(z.literal('')),
});

// Helper function to parse expense fields from DB
const parseExpenseFromDB = (dbExpense: any): DailyExpense => {
  return {
    id: parseInt(dbExpense.id, 10),
    expenseDate: format(new Date(dbExpense.expensedate), 'yyyy-MM-dd'),
    description: dbExpense.description,
    category: dbExpense.category as ExpenseCategoryEnum,
    amount: parseFloat(dbExpense.amount),
    notes: dbExpense.notes,
    createdAt: new Date(dbExpense.createdat).toISOString(),
    updatedAt: new Date(dbExpense.updatedat).toISOString(),
  };
};

// GET handler to fetch expenses
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get('date');
  const startDateParam = searchParams.get('startDate');
  const endDateParam = searchParams.get('endDate');

  let sql = 'SELECT id, expenseDate, description, category, amount, notes, createdAt, updatedAt FROM DailyExpenses';
  const queryParams: any[] = [];
  const conditions: string[] = [];
  let paramIndex = 1;

  if (startDateParam && endDateParam) {
    const startDate = parseISO(startDateParam);
    const endDate = parseISO(endDateParam);
    if (isValid(startDate) && isValid(endDate)) {
      conditions.push(`expenseDate >= $${paramIndex++}`);
      queryParams.push(format(startDate, 'yyyy-MM-dd'));
      conditions.push(`expenseDate <= $${paramIndex++}`);
      queryParams.push(format(endDate, 'yyyy-MM-dd'));
    }
  } else if (dateParam) {
    if (dateParam === 'today') {
      conditions.push(`expenseDate = CURRENT_DATE`);
    } else if (isValid(parseISO(dateParam))) {
      conditions.push(`expenseDate = $${paramIndex++}`);
      queryParams.push(dateParam);
    }
  }
  // If no date parameters are provided, it fetches all expenses.

  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(' AND ')}`;
  }
  sql += ' ORDER BY expenseDate DESC, createdAt DESC';

  try {
    const dbExpenses = await query(sql, queryParams);
    const expenses: DailyExpense[] = dbExpenses.map(parseExpenseFromDB);
    return NextResponse.json(expenses);
  } catch (error) {
    console.error('Failed to fetch expenses:', error);
    return NextResponse.json({ message: 'Failed to fetch expenses', error: (error as Error).message }, { status: 500 });
  }
}

// POST handler to add a new expense
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = ExpenseCreateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid expense data', errors: validation.error.format() }, { status: 400 });
    }

    const { expenseDate, description, category, amount, notes } = validation.data;

    const sqlInsert = `
      INSERT INTO DailyExpenses (expenseDate, description, category, amount, notes)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const params = [expenseDate, description, category, amount, notes || null];

    const result = await query(sqlInsert, params);
    const newExpense: DailyExpense = parseExpenseFromDB(result[0]);

    return NextResponse.json(newExpense, { status: 201 });

  } catch (error) {
    console.error('Failed to create expense:', error);
    return NextResponse.json({ message: 'Failed to create expense', error: (error as Error).message }, { status: 500 });
  }
}
