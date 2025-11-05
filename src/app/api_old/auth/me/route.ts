import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

// Mock data - same as login route
const accounts = [
  {
    id: 1,
    email: 'admin@smct.com',
    role: 'admin',
    name: 'System Administrator',
    position: 'System Administrator',
    department: 'IT',
    branch: 'head-office',
    isActive: true,
    isSuspended: false
  },
  {
    id: 2,
    email: 'evaluator@smct.com',
    role: 'evaluator',
    employeeId: 1001,
    name: 'John Evaluator',
    position: 'HR Manager',
    department: 'Human Resources',
    branch: 'head-office',
    isActive: true,
    isSuspended: false
  },
  {
    id: 3,
    email: 'employee@smct.com',
    role: 'employee',
    employeeId: 1002,
    name: 'Jane Employee',
    position: 'Software Developer',
    department: 'IT',
    branch: 'head-office',
    isActive: true,
    isSuspended: false
  }
];

export async function GET(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'No token provided' },
        { status: 401 }
      );
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    
    // Find account
    const account = accounts.find(acc => acc.id === decoded.userId);
    
    if (!account) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Check if account is suspended
    if (account.isSuspended) {
      return NextResponse.json({
        success: false,
        message: 'Account suspended',
        suspensionData: {
          reason: 'Account suspended by administrator',
          suspendedAt: new Date().toISOString(),
          suspendedBy: 'System Administrator',
          accountName: account.name
        }
      }, { status: 403 });
    }

    // Create user object
    const user = {
      id: account.id,
      name: account.name,
      email: account.email,
      position: account.position,
      department: account.department,
      branch: account.branch,
      role: account.role,
      hireDate: new Date().toISOString(),
      avatar: null,
      bio: null,
      contact: '',
      lastLogin: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      user
    });

  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json(
      { success: false, message: 'Invalid token' },
      { status: 401 }
    );
  }
}
