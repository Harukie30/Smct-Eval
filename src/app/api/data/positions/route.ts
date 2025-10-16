import { NextRequest, NextResponse } from 'next/server';
import positionsData from '@/data/positions.json';

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      positions: positionsData
    });

  } catch (error) {
    console.error('Get positions error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
