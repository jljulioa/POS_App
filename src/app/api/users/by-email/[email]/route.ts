
// src/app/api/users/by-email/[email]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { User, UserRole } from '@/lib/mockData'; // Using User type

const parseUserFromDB = (dbUser: any): User | null => {
  if (!dbUser) return null;
  return {
    id: parseInt(dbUser.id, 10),
    username: dbUser.username,
    email: dbUser.email,
    role: dbUser.role as UserRole,
    full_name: dbUser.full_name || null,
    is_active: dbUser.is_active,
    created_at: dbUser.created_at ? new Date(dbUser.created_at).toISOString() : undefined,
    updated_at: dbUser.updated_at ? new Date(dbUser.updated_at).toISOString() : undefined,
    firebase_uid: dbUser.firebase_uid || null,
  };
};

export async function GET(request: NextRequest, { params }: { params: { email: string } }) {
  const { email } = params;

  if (!email) {
    return NextResponse.json({ message: 'Email parameter is required' }, { status: 400 });
  }

  try {
    // Select all fields EXCEPT password_hash for security
    const result = await query(
      'SELECT id, username, email, role, full_name, is_active, created_at, updated_at, firebase_uid FROM Users WHERE email = $1 AND is_active = TRUE',
      [decodeURIComponent(email)]
    );

    if (result.length === 0) {
      return NextResponse.json({ message: 'User not found or not active' }, { status: 404 });
    }

    const user = parseUserFromDB(result[0]);
    return NextResponse.json(user);
  } catch (error) {
    console.error(`Failed to fetch user by email ${email}:`, error);
    return NextResponse.json({ message: 'Failed to fetch user', error: (error as Error).message }, { status: 500 });
  }
}
