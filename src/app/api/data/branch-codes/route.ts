import { NextRequest, NextResponse } from 'next/server';
import branchCodes from '@/data/branch-code.json';

export async function GET(request: NextRequest) {
  try {
    // Transform the branch codes array to match the consistent {id, name} format
    const transformedBranchCodes = branchCodes.map(code => ({
      id: code,
      name: code
    }));

    return NextResponse.json(transformedBranchCodes);

  } catch (error) {
    console.error('Get branch codes error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch branch codes' },
      { status: 500 }
    );
  }
}
