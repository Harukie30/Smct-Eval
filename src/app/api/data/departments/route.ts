import { NextResponse } from 'next/server';
import departmentsData from '@/data/departments.json';

export async function GET() {
  try {
    // Transform the departments array to match the expected format with id and name
    const departments = departmentsData.map(dept => ({
      id: dept.id.toString(),
      name: dept.name
    }));

    return NextResponse.json(departments);
  } catch (error) {
    console.error('Error fetching departments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch departments' },
      { status: 500 }
    );
  }
}
