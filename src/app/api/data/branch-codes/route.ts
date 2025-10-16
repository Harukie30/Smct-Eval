import { NextRequest, NextResponse } from 'next/server';
import branchCodes from '@/data/branch-code.json';

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      branchCodes
    });

  } catch (error) {
    console.error('Get branch codes error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
