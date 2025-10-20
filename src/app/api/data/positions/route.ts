import { NextResponse } from 'next/server';
import positionsData from '@/data/positions.json';

export async function GET() {
  try {
    // Transform the positions array to match the branches structure with id and name
    const positions = positionsData.map(position => ({
      id: position,
      name: position
    }));

    return NextResponse.json(positions);
  } catch (error) {
    console.error('Error fetching positions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch positions' },
      { status: 500 }
    );
  }
}
