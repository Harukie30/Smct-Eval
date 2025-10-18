import { NextRequest, NextResponse } from 'next/server';
import branchCodes from '@/data/branch-code.json';

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json(branchCodes);

  } catch (error) {
    console.error('Get branch codes error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch branch codes' },
      { status: 500 }
    );
  }
}
