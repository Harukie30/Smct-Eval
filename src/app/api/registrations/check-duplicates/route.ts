import { NextRequest, NextResponse } from 'next/server';

// Mock data - same as registrations route
const accounts: any[] = [
  {
    id: 1,
    email: 'admin@smct.com',
    username: 'admin',
    name: 'System Administrator'
  },
  {
    id: 2,
    email: 'evaluator@smct.com',
    username: 'evaluator',
    name: 'John Evaluator'
  }
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const username = searchParams.get('username');

    if (!email && !username) {
      return NextResponse.json(
        { success: false, message: 'Email or username parameter is required' },
        { status: 400 }
      );
    }

    let emailExists = false;
    let usernameExists = false;

    if (email) {
      emailExists = accounts.some(acc => 
        acc.email.toLowerCase() === email.toLowerCase()
      );
    }

    if (username) {
      usernameExists = accounts.some(acc => 
        acc.username?.toLowerCase() === username.toLowerCase()
      );
    }

    return NextResponse.json({
      success: true,
      emailExists,
      usernameExists
    });

  } catch (error) {
    console.error('Check duplicates error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
