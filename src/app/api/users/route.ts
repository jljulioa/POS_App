
// src/app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { User, UserRole } from '@/lib/mockData';

// Helper function to parse user fields from DB
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

// GET handler to fetch all users
export async function GET(request: NextRequest) {
  try {
    // Select all fields EXCEPT password_hash for security
    const dbUsers = await query('SELECT id, email, role, full_name, is_active, created_at, updated_at, supabase_user_id FROM "users" ORDER BY full_name ASC');
    const users: User[] = dbUsers.map(parseUserFromDB).filter((user): user is User => user !== null);
    return NextResponse.json(users);
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return NextResponse.json({ message: 'Failed to fetch users', error: (error as Error).message }, { status: 500 });
  }
}

// Placeholder for POST - User creation should be handled securely with password hashing
// This would typically be part of an admin interface or a separate registration flow.
export async function POST(request: NextRequest) {
  return NextResponse.json({ message: 'User creation not implemented in this basic setup. Requires password hashing.' }, { status: 501 });
}
