import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    // Validate email
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { message: 'Please provide a valid email address' },
        { status: 400 }
      );
    }

    // TODO: Replace with your actual user database/service
    // For now, we'll simulate checking if user exists
    const userExists = await checkUserExists(email);
    
    if (!userExists) {
      return NextResponse.json(
        { message: 'No account found with this email address' },
        { status: 404 }
      );
    }

    // TODO: Generate password reset token
    const resetToken = generateResetToken();
    
    // TODO: Store token in database with expiration
    await storeResetToken(email, resetToken);
    
    // TODO: Send email with reset link
    await sendPasswordResetEmail(email, resetToken);
    
    // Always return success to prevent email enumeration
    return NextResponse.json({
      message: 'If an account with this email exists, password reset instructions have been sent.'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// TODO: Implement these functions based on your database/auth system
async function checkUserExists(email: string): Promise<boolean> {
  // Example: Check against your user database
  // const user = await db.users.findUnique({ where: { email } });
  // return !!user;
  
  // For demo purposes, return true for any email
  return true;
}

function generateResetToken(): string {
  // Generate a secure random token
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

async function storeResetToken(email: string, token: string): Promise<void> {
  // TODO: Store in database with expiration (e.g., 1 hour)
  // await db.passwordResets.create({
  //   data: {
  //     email,
  //     token,
  //     expiresAt: new Date(Date.now() + 3600000) // 1 hour
  //   }
  // });
  console.log(`Reset token for ${email}: ${token}`);
}

async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
  // await emailService.send({
  //   to: email,
  //   subject: 'Reset Your Password',
  //   template: 'password-reset',
  //   data: { resetLink: `${process.env.NEXT_PUBLIC_BASE_URL}/reset-password?token=${token}` }
  // });
  
  console.log(`Password reset email sent to ${email} with token: ${token}`);
}
