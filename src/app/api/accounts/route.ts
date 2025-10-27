import { NextRequest, NextResponse } from 'next/server';

// Mock data - replace with your actual database
const accounts: any[] = [
  {
    id: 1,
    email: 'admin@smct.com',
    username: 'admin',
    name: 'System Administrator',
    role: 'admin',
    isActive: true
  },
  {
    id: 2,
    email: 'evaluator@smct.com',
    username: 'evaluator',
    name: 'John Evaluator',
    role: 'evaluator',
    isActive: true
  },
  {
    id: 3,
    email: 'employee@smct.com',
    username: 'employee',
    name: 'Jane Employee',
    role: 'employee',
    isActive: true
  }
];

export async function GET(request: NextRequest) {
  try {
    // Return accounts without sensitive data
    const safeAccounts = accounts.map(account => {
      const { password, ...safeAccount } = account;
      return safeAccount;
    });

    return NextResponse.json({
      success: true,
      accounts: safeAccounts
    });

  } catch (error) {
    console.error('Get accounts error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
