import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

// Mock data - replace with your actual database
let pendingRegistrations: any[] = [];
let accounts: any[] = [
  {
    id: 1,
    email: 'admin@smct.com',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    role: 'admin',
    name: 'System Administrator',
    position: 'System Administrator',
    department: 'IT',
    branch: 'head-office',
    isActive: true,
    isSuspended: false
  }
];

export async function POST(request: NextRequest) {
  try {
    const registrationData = await request.json();

    // Validate required fields
    const requiredFields = ['name', 'email', 'position', 'branch', 'hireDate', 'role', 'signature', 'username', 'contact', 'password'];
    const missingFields = requiredFields.filter(field => !registrationData[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { success: false, message: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Check for duplicate email
    const emailExists = accounts.some(acc => 
      acc.email.toLowerCase() === registrationData.email.toLowerCase()
    );
    
    if (emailExists) {
      return NextResponse.json(
        { success: false, message: 'An account with this email address already exists' },
        { status: 409 }
      );
    }

    // Check for duplicate username
    const usernameExists = accounts.some(acc => 
      acc.username?.toLowerCase() === registrationData.username.toLowerCase()
    );
    
    if (usernameExists) {
      return NextResponse.json(
        { success: false, message: 'This username is already taken' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(registrationData.password, 10);

    // Create pending registration
    const newRegistration = {
      id: Date.now(),
      ...registrationData,
      password: hashedPassword, // Store hashed password
      status: 'pending',
      submittedAt: new Date().toISOString()
    };

    pendingRegistrations.push(newRegistration);

    // Return success response (without password)
    const { password, ...responseData } = newRegistration;
    
    return NextResponse.json({
      success: true,
      registration: responseData,
      message: 'Registration submitted successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Return all pending registrations (for admin use)
    // Remove passwords from each registration for security
    const safeRegistrations = pendingRegistrations.map(reg => {
      const { password, ...safeReg } = reg;
      return safeReg;
    });

    return NextResponse.json({
      success: true,
      registrations: safeRegistrations
    });

  } catch (error) {
    console.error('Get registrations error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
