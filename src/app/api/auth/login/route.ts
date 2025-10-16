import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Mock data - replace with your actual database
const accounts = [
  {
    id: 1,
    email: 'admin@smct.com',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
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
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
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
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
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

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find account
    const account = accounts.find(acc => acc.email === email);
    
    if (!account) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
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

    // Verify password
    const isValidPassword = await bcrypt.compare(password, account.password);
    
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
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

    // Create JWT token
    const token = jwt.sign(
      { userId: account.id, email: account.email, role: account.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Return success response
    return NextResponse.json({
      success: true,
      user,
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
