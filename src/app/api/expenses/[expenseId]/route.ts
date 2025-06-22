
// src/app/api/expenses/[expenseId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { z } from 'zod';
import type { DailyExpense, ExpenseCategoryEnum } from '@/lib/mockData';
import { format, isValid, parseISO } from 'date-fns';

const ExpenseCategoryEnumSchema = z.enum([
    'Rent', 'Utilities', 'Supplies', 'Salaries', 'Marketing', 'Maintenance',
    'Office', 'Travel', 'Taxes', 'Insurance', 'Bank Fees', 'Shipping', 'Meals & Entertainment', 'Other'
]);

const ExpenseUpdateSchema = z.object({
  expenseDate: z.string().refine((date) => isValid(parseISO(date)), {
    message: "Invalid date format. Use YYYY-MM-DD.",
  }),
  description: z.string().min(3, { message: "Description must be at least 3 characters." }),
  category: ExpenseCategoryEnumSchema,
  amount: z.coerce.number().positive({ message: "Amount must be a positive number." }),
  notes: z.string().optional().or(z.literal('')),
});

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

// GET handler to fetch a single expense by ID
export async function GET(request: NextRequest, { params }: { params: { expenseId: string } }) {
  const { expenseId } = params;
  if (isNaN(parseInt(expenseId, 10))) {
      return NextResponse.json({ message: 'Invalid expense ID' }, { status: 400 });
  }

  try {
    const dbExpenses = await query('SELECT * FROM DailyExpenses WHERE id = $1', [expenseId]);
    if (dbExpenses.length === 0) {
      return NextResponse.json({ message: 'Expense not found' }, { status: 404 });
    }
    const expense = parseExpenseFromDB(dbExpenses[0]);
    return NextResponse.json(expense);
  } catch (error) {
    console.error(`Failed to fetch expense ${expenseId}:`, error);
    return NextResponse.json({ message: 'Failed to fetch expense', error: (error as Error).message }, { status: 500 });
  }
}

// PUT handler to update an existing expense
export async function PUT(request: NextRequest, { params }: { params: { expenseId: string } }) {
  const { expenseId } = params;
  if (isNaN(parseInt(expenseId, 10))) {
    return NextResponse.json({ message: 'Invalid expense ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const validation = ExpenseUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid expense data', errors: validation.error.format() }, { status: 400 });
    }

    const { expenseDate, description, category, amount, notes } = validation.data;

    const sql = `
      UPDATE DailyExpenses
      SET expenseDate = $1, description = $2, category = $3, amount = $4, notes = $5
      WHERE id = $6
      RETURNING *
    `;
    const queryParams = [expenseDate, description, category, amount, notes || null, expenseId];
    
    const result = await query(sql, queryParams);
    if (result.length === 0) {
      return NextResponse.json({ message: 'Expense not found or update failed' }, { status: 404 });
    }
    
    const updatedExpense = parseExpenseFromDB(result[0]);
    return NextResponse.json(updatedExpense, { status: 200 });

  } catch (error) {
    console.error(`Failed to update expense ${expenseId}:`, error);
    return NextResponse.json({ message: 'Failed to update expense', error: (error as Error).message }, { status: 500 });
  }
}

// DELETE handler to remove an expense
export async function DELETE(request: NextRequest, { params }: { params: { expenseId: string } }) {
  const { expenseId } = params;
   if (isNaN(parseInt(expenseId, 10))) {
    return NextResponse.json({ message: 'Invalid expense ID' }, { status: 400 });
  }
  
  try {
    const result = await query('DELETE FROM DailyExpenses WHERE id = $1 RETURNING id', [expenseId]);
    if (result.length === 0) {
      return NextResponse.json({ message: 'Expense not found or already deleted' }, { status: 404 });
    }
    return NextResponse.json({ message: `Expense ${expenseId} deleted successfully` });
  } catch (error) {
    console.error(`Failed to delete expense ${expenseId}:`, error);
    return NextResponse.json({ message: 'Failed to delete expense', error: (error as Error).message }, { status: 500 });
  }
}
