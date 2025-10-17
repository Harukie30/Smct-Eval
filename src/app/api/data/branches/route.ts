import { NextResponse } from 'next/server';

const branches = [
  { id: 'HO', name: 'Head Office' },
  { id: 'CEB', name: 'Cebu Branch' },
  { id: 'DAV', name: 'Davao Branch' },
  { id: 'BAC', name: 'Bacolod Branch' },
  { id: 'ILO', name: 'Iloilo Branch' },
  { id: 'CDO', name: 'Cagayan de Oro Branch' },
  { id: 'BAG', name: 'Baguio Branch' },
  { id: 'ZAM', name: 'Zamboanga Branch' },
  { id: 'GSC', name: 'General Santos Branch' }
];

export async function GET() {
  try {
    return NextResponse.json(branches);
  } catch (error) {
    console.error('Error fetching branches:', error);
    return NextResponse.json(
      { error: 'Failed to fetch branches' },
      { status: 500 }
    );
  }
}
