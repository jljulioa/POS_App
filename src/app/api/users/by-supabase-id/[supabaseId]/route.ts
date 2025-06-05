
// src/app/api/users/by-supabase-id/[supabaseId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { User, UserRole } from '@/lib/mockData';

const parseUserFromDB = (dbUser: any): User | null => {
  if (!dbUser) return null;
  return {
    id: parseInt(dbUser.id, 10),
    email: dbUser.email,
    role: dbUser.role as UserRole,
    full_name: dbUser.full_name || null,
    is_active: dbUser.is_active,
    created_at: dbUser.created_at ? new Date(dbUser.created_at).toISOString() : undefined,
    updated_at: dbUser.updated_at ? new Date(dbUser.updated_at).toISOString() : undefined,
    supabase_user_id: dbUser.supabase_user_id || null,
  };
};

export async function GET(request: NextRequest, { params }: { params: { supabaseId: string } }) {
  const { supabaseId } = await params;

  if (!supabaseId) {
    return NextResponse.json({ message: 'Supabase ID parameter is required' }, { status: 400 });
  }
  console.log(`API /users/by-supabase-id: Attempting to fetch user for supabase_user_id: ${supabaseId}`);

  try {
    // Select all fields EXCEPT password_hash for security
    const result = await query(
      'SELECT id, email, role, full_name, is_active, created_at, updated_at, supabase_user_id FROM "users" WHERE supabase_user_id = $1 AND is_active = TRUE',
      [supabaseId]
    );

    if (result.length === 0) {
      console.warn(`API /users/by-supabase-id: User not found or not active for supabase_user_id: ${supabaseId}`);
      return NextResponse.json({ message: 'User not found or not active for the given Supabase ID' }, { status: 404 });
    }

    const user = parseUserFromDB(result[0]);
    console.log(`API /users/by-supabase-id: User found for supabase_user_id: ${supabaseId}`, user);
    return NextResponse.json(user);
  } catch (error) {
    console.error(`API /users/by-supabase-id: Failed to fetch user by Supabase ID ${supabaseId}:`, error);
    return NextResponse.json({ message: 'Failed to fetch user', error: (error as Error).message }, { status: 500 });
  }
}
