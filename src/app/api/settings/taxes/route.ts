
// src/app/api/settings/taxes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { z } from 'zod';
import type { TaxSetting } from '@/lib/mockData';

const TaxSettingSchema = z.object({
  taxName: z.string().min(1).max(50),
  taxPercentage: z.number().min(0).max(100),
  pricesEnteredWithTax: z.enum(['inclusive', 'exclusive']),
});

const parseTaxSettingFromDB = (dbSetting: any): TaxSetting | null => {
  if (!dbSetting) return null;
  return {
    id: parseInt(dbSetting.id, 10),
    taxName: dbSetting.tax_name,
    taxPercentage: parseFloat(dbSetting.tax_percentage),
    pricesEnteredWithTax: dbSetting.prices_entered_with_tax as 'inclusive' | 'exclusive',
    updatedAt: dbSetting.updated_at ? new Date(dbSetting.updated_at).toISOString() : undefined,
  };
};

const defaultDbTaxSetting = {
    id: 1,
    tax_name: 'VAT',
    tax_percentage: '0.00',
    prices_entered_with_tax: 'exclusive',
    updated_at: new Date().toISOString()
};


// GET handler to fetch tax settings
export async function GET(request: NextRequest) {
  try {
    const result = await query('SELECT id, tax_name, tax_percentage, prices_entered_with_tax, updated_at FROM TaxSettings WHERE id = $1', [1]);
    if (result.length === 0) {
      // If no settings row exists (e.g., first time setup and migration script for default row hasn't run or failed)
      // Return a default structure. The PUT request will handle creating it if it's missing.
      console.warn("TaxSettings not found in DB (id=1), returning hardcoded defaults. Ensure default row exists or run initial INSERT.");
      return NextResponse.json(parseTaxSettingFromDB(defaultDbTaxSetting));
    }
    const settings = parseTaxSettingFromDB(result[0]);
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Failed to fetch tax settings:', error);
    // If error, and it's likely table doesn't exist, return default to allow UI to function.
    if (error instanceof Error && (error as any).code === '42P01') { // 42P01 is undefined_table for PostgreSQL
        console.warn("TaxSettings table likely does not exist. Returning hardcoded defaults. Please run DB migrations.");
        return NextResponse.json(parseTaxSettingFromDB(defaultDbTaxSetting));
    }
    return NextResponse.json({ message: 'Failed to fetch tax settings', error: (error as Error).message }, { status: 500 });
  }
}

// PUT handler to update tax settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = TaxSettingSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid tax settings data', errors: validation.error.format() }, { status: 400 });
    }

    const { taxName, taxPercentage, pricesEnteredWithTax } = validation.data;

    // The trigger handles `updated_at`.
    const sql = `
      INSERT INTO TaxSettings (id, tax_name, tax_percentage, prices_entered_with_tax)
      VALUES (1, $1, $2, $3)
      ON CONFLICT (id) DO UPDATE SET
        tax_name = EXCLUDED.tax_name,
        tax_percentage = EXCLUDED.tax_percentage,
        prices_entered_with_tax = EXCLUDED.prices_entered_with_tax
      RETURNING *
    `;
    const params = [taxName, taxPercentage, pricesEnteredWithTax];
    
    const result = await query(sql, params);
    const updatedSettings = parseTaxSettingFromDB(result[0]);

    return NextResponse.json(updatedSettings, { status: 200 });

  } catch (error) {
    console.error('Failed to update tax settings:', error);
    return NextResponse.json({ message: 'Failed to update tax settings', error: (error as Error).message }, { status: 500 });
  }
}
