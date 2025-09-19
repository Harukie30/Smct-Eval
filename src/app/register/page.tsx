'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SearchableDropdown from "@/components/ui/searchable-dropdown";
import SignaturePad from '@/components/SignaturePad';
import { AlertDialog } from "@/components/ui/alert-dialog";
import Link from 'next/link';
import PageTransition from '@/components/PageTransition';
import branchCodes from '@/data/branch-code.json';
import clientDataService from '@/lib/clientDataService';

export default function RegisterPage() {
  const [isRegisterButtonClicked, setIsRegisterButtonClicked] = useState(false);
  const [positions, setPositions] = useState<string[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [alertDialog, setAlertDialog] = useState({
    open: false,
    title: '',
    description: '',
    type: 'info' as 'success' | 'error' | 'warning' | 'info',
    onConfirm: () => {}
  });
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    contact: '',
    position: '',
    department: '',
    branchCode: '',
    branch: '',
    password: '',
    confirmPassword: '',
    signature: ''
  });
  const [signatureError, setSignatureError] = useState(false);

  // Load positions and departments from client data service
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch positions and departments using client data service
        const [positionsData, departmentsData] = await Promise.all([
          clientDataService.getPositions(),
          clientDataService.getDepartments()
        ]);
        
        setPositions(positionsData);
        setDepartments(departmentsData);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  const showAlert = (title: string, description: string, type: 'success' | 'error' | 'warning' | 'info', onConfirm?: () => void) => {
    setAlertDialog({
      open: true,
      title,
      description,
      type,
      onConfirm: onConfirm || (() => {})
    });
  };

  const handleRegisterSubmit = async (e: any) => {
    e.preventDefault();
    
    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      showAlert('Password Mismatch', 'Passwords do not match! Please try again.', 'error');
      return;
    }
    
    // Validate password length
    if (formData.password.length < 8) {
      showAlert('Password Too Short', 'Password must be at least 8 characters long!', 'warning');
      return;
    }
    
    // Validate signature
    if (!formData.signature || formData.signature.trim() === '') {
      setSignatureError(true);
      showAlert('Signature Required', 'Please draw your digital signature to complete the registration!', 'warning');
      return;
    }
    
    // Clear signature error if signature is valid
    setSignatureError(false);
    
    setIsRegisterButtonClicked(true);
    
    try {
      // Create pending registration using client data service
      const registrationData = {
        name: `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
        position: formData.position,
        department: formData.department,
        branch: formData.branch,
        hireDate: new Date().toISOString().split('T')[0], // Today's date
        role: formData.position,
        signature: formData.signature, // Include the digital signature
        username: formData.username,
        contact: formData.contact,
        password: formData.password, // Note: In production, this should be hashed
      };

      const result = await clientDataService.createPendingRegistration(registrationData);
      
      if (result) {
        showAlert(
          'Registration Successful!', 
          'Account registration submitted successfully! Your registration is pending approval. You will be notified once approved.', 
          'success',
          () => {
            // Reset form
            setFormData({
              firstName: '',
              lastName: '',
              username: '',
              email: '',
              contact: '',
              position: '',
              department: '',
              branchCode: '',
              branch: '',
              password: '',
              confirmPassword: '',
              signature: ''
            });
            setSignatureError(false);
            // Redirect to login page
            window.location.href = '/';
          }
        );
      } else {
        showAlert('Registration Failed', 'An error occurred during registration. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Registration error:', error);
      showAlert('Registration Error', 'An error occurred during registration. Please try again.', 'error');
    } finally {
      setIsRegisterButtonClicked(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 relative overflow-hidden">
      {/* Abstract Background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Animated geometric shapes */}
        <div className="absolute top-0 left-0 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 right-0 w-72 h-72 bg-blue-600 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
        
        {/* Floating geometric elements */}
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg transform rotate-12 opacity-10 animate-float"></div>
        <div className="absolute top-1/3 right-1/4 w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full opacity-10 animate-float animation-delay-1000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-20 h-20 bg-gradient-to-br from-indigo-400 to-indigo-600 transform rotate-45 opacity-10 animate-float animation-delay-2000"></div>
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%239C92AC%22%20fill-opacity%3D%220.05%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%221%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-30"></div>
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-transparent"></div>
      </div>
      {/* Header */}
      <header className="flex justify-between items-center p-6">
        <Link href="/" className="flex items-center space-x-2">
          <img src="/smct.png" alt="SMCT Group of Companies" className="h-30 w-auto" />
        </Link>
       
       
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
          <PageTransition>
            <Card className="w-full max-w-lg shadow-2xl transform scale-105 bg-white/95 backdrop-blur-sm border-0 relative z-10">
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl text-center text-blue-700">
                  Create your account
                </CardTitle>
                <CardDescription className="text-center">
                  Join us to start your performance evaluation journey
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={handleRegisterSubmit}>
                  <div className="space-y-4">
                    {/* Personal Information */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First name</Label>
                        <Input 
                          id="firstName" 
                          placeholder="John" 
                          value={formData.firstName}
                          onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                          required 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last name</Label>
                        <Input 
                          id="lastName" 
                          placeholder="Doe" 
                          value={formData.lastName}
                          onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                          required 
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input 
                        id="username" 
                        placeholder="johndoe" 
                        value={formData.username}
                        onChange={(e) => setFormData({...formData, username: e.target.value})}
                        required 
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="registerEmail">Email</Label>
                      <Input
                        id="registerEmail"
                        type="email"
                        placeholder="name@company.com"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="contact">Contact Number</Label>
                      <Input
                        id="contact"
                        type="tel"
                        placeholder="09123456789"
                        value={formData.contact}
                        onChange={(e) => {
                          // Only allow numbers and limit to 11 digits
                          const value = e.target.value.replace(/\D/g, '').slice(0, 11);
                          setFormData({...formData, contact: value});
                        }}
                        onKeyPress={(e) => {
                          // Prevent non-numeric input
                          if (!/[0-9]/.test(e.key)) {
                            e.preventDefault();
                          }
                        }}
                        maxLength={11}
                        required
                      />
                    </div>
                    
                    
                    <div className="space-y-2">
                      <Label htmlFor="position">Position</Label>
                      <SearchableDropdown
                        options={positions}
                        value={formData.position}
                        onValueChangeAction={(value) => {
                          const newFormData = {...formData, position: value};
                          // Auto-set department for Branch Managers
                          if (value.toLowerCase().includes('branch manager')) {
                            newFormData.department = 'Operations';
                          }
                          setFormData(newFormData);
                        }}
                        placeholder="Select your position"
                        className="w-full"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="department">Department</Label>
                      <SearchableDropdown
                        options={departments}
                        value={formData.department}
                        onValueChangeAction={(value) => setFormData({...formData, department: value})}
                        placeholder="Select your department"
                        className="w-full"
                        disabled={formData.position.toLowerCase().includes('branch manager')}
                      />
                      {formData.position.toLowerCase().includes('branch manager') && (
                        <p className="text-sm text-blue-600 bg-blue-50 p-2 rounded-md">
                          ℹ️ "Operations" is automatically set for Branch Managers
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="branchCode">Branch Code</Label>
                      <SearchableDropdown
                        options={branchCodes}
                        value={formData.branchCode}
                        onValueChangeAction={(value) => setFormData({...formData, branchCode: value})}
                        placeholder="Select branch code"
                        className="w-full"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="branch">Branch</Label>
                      <SearchableDropdown
                        options={[
                          'Head Office',
                          'Cebu Branch',
                          'Davao Branch',
                          'Bacolod Branch',
                          'Iloilo Branch',
                          'Cagayan de Oro Branch',
                          'Baguio Branch',
                          'Zamboanga Branch',
                          'General Santos Branch'
                        ]}
                        value={formData.branch}
                        onValueChangeAction={(value) => setFormData({...formData, branch: value})}
                        placeholder="Select your branch"
                        className="w-full"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="registerPassword">Password</Label>
                      <Input
                        id="registerPassword"
                        type="password"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="••••••••"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signature">Digital Signature *</Label>
                      <SignaturePad
                        value={formData.signature}
                        onChangeAction={(signature) => {
                          setFormData({...formData, signature});
                          if (signature && signatureError) {
                            setSignatureError(false);
                          }
                        }}
                        className="w-full"
                        required={true}
                        hasError={signatureError}
                      />
                      <p className="text-sm text-gray-500">
                        By drawing your signature above, you agree to the terms and conditions of this registration.
                      </p>
                    </div>
                    
                    <Button 
                      type="submit" 
                      className={`w-full bg-blue-600 text-white hover:bg-green-700 transition-all duration-300 ${
                        isRegisterButtonClicked 
                          ? 'transform scale-95 bg-blue-700 shadow-inner' 
                          : 'hover:scale-105 hover:shadow-lg active:scale-95'
                      }`}
                    >
                      {isRegisterButtonClicked ? (
                        <span className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Creating...
                        </span>
                      ) : (
                        'Create account'
                      )}
                    </Button>
                  </div>
                </form>
                
                <div className="text-center pt-4">
                  <p className="text-sm text-gray-600">
                    Already have an account?{' '}
                      <Link href="/" className="text-blue-600 hover:underline font-medium">
                      Sign in here
                    </Link>
                  </p>
                </div>
              </CardContent>
            </Card>
          </PageTransition>
        </div>
      </main>

      {/* Alert Dialog */}
      <AlertDialog
        open={alertDialog.open}
        onOpenChangeAction={(open) => setAlertDialog(prev => ({ ...prev, open }))}
        title={alertDialog.title}
        description={alertDialog.description}
        type={alertDialog.type}
        onConfirm={alertDialog.onConfirm}
        confirmText="OK"
      />
    </div>
  );
}

