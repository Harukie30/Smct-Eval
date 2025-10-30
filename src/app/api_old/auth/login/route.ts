/*import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

// Helper function to read pending registrations
function getPendingRegistrations() {
  try {
    const filePath = path.join(process.cwd(), 'src', 'data', 'pending-registrations.json');
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileContents);
    return data || [];
  } catch (error) {
    console.error('Error reading pending registrations:', error);
    return [];
  }
}



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

    // Check if email exists in pending registrations
    const pendingRegistrations = getPendingRegistrations();
    const pendingAccount = pendingRegistrations.find((reg: any) => reg.email === email && reg.status === 'pending');
    
    if (pendingAccount) {
      return NextResponse.json({
        success: false,
        pending: true,
        message: 'Account pending approval',
        pendingData: {
          name: pendingAccount.name,
          email: pendingAccount.email,
          submittedAt: pendingAccount.submittedAt
        }
      }, { status: 403 });
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
*/