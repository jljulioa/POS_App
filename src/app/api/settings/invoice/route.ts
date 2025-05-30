
// src/app/api/settings/invoice/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { z } from 'zod';
import type { InvoiceSettings } from '@/lib/mockData';

const InvoiceSettingsSchema = z.object({
  companyName: z.string().min(1, "Company name is required."),
  nit: z.string().min(1, "NIT/Tax ID is required."),
  address: z.string().min(1, "Address is required."),
  footerMessage: z.string().optional().or(z.literal('')),
});

const parseInvoiceSettingsFromDB = (dbSettings: any): InvoiceSettings | null => {
  if (!dbSettings) return null;
  return {
    id: parseInt(dbSettings.id, 10),
    companyName: dbSettings.companyname,
    nit: dbSettings.nit,
    address: dbSettings.address,
    footerMessage: dbSettings.footermessage || '',
    updatedAt: dbSettings.updatedat ? new Date(dbSettings.updatedat).toISOString() : undefined,
  };
};

// GET handler to fetch invoice settings
export async function GET(request: NextRequest) {
  try {
    // Use lowercase column names as PostgreSQL stores unquoted identifiers in lowercase
    const result = await query('SELECT id, companyname, nit, address, footermessage, updatedat FROM InvoiceSettings WHERE id = $1', [1]);
    if (result.length === 0) {
      // This case should ideally not happen if you've inserted the default row via SQL
      const defaultSettings: InvoiceSettings = {
        id: 1,
        companyName: 'MotoFox POS',
        nit: 'N/A',
        address: 'Your Store Address',
        footerMessage: 'Thank you for your business!',
      };
      console.warn("InvoiceSettings not found in DB, returning hardcoded defaults. Ensure default row (id=1) exists.");
      return NextResponse.json(defaultSettings);
    }
    const settings = parseInvoiceSettingsFromDB(result[0]);
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Failed to fetch invoice settings:', error);
    return NextResponse.json({ message: 'Failed to fetch invoice settings', error: (error as Error).message }, { status: 500 });
  }
}

// PUT handler to update invoice settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = InvoiceSettingsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid invoice settings data', errors: validation.error.format() }, { status: 400 });
    }

    const { companyName, nit, address, footerMessage } = validation.data;

    // Use lowercase column names for INSERT and UPDATE SET clauses
    // The trigger handles `updatedat`.
    const sql = `
      INSERT INTO InvoiceSettings (id, companyname, nit, address, footermessage)
      VALUES (1, $1, $2, $3, $4)
      ON CONFLICT (id) DO UPDATE SET
        companyname = EXCLUDED.companyname,
        nit = EXCLUDED.nit,
        address = EXCLUDED.address,
        footermessage = EXCLUDED.footermessage
      RETURNING *
    `;
    // Parameters map to $1, $2, $3, $4 as per their order
    const params = [companyName, nit, address, footerMessage || null];
    
    const result = await query(sql, params);
    const updatedSettings = parseInvoiceSettingsFromDB(result[0]);

    return NextResponse.json(updatedSettings, { status: 200 });

  } catch (error) {
    console.error('Failed to update invoice settings:', error);
    return NextResponse.json({ message: 'Failed to update invoice settings', error: (error as Error).message }, { status: 500 });
  }
}

