'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Link from 'next/link';
import PageTransition from '@/components/PageTransition';
import FakeLoadingScreen from '@/components/FakeLoadingScreen';
import SuspensionModal from '@/components/SuspensionModal';
import GoogleLoginModal from '@/components/GoogleLoginModal';
import { useUser } from '@/contexts/UserContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { toastMessages } from '@/lib/toastMessages';

export default function LandingLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);
  const [showSuspensionModal, setShowSuspensionModal] = useState(false);
  const [suspensionData, setSuspensionData] = useState<any>(null);
  const [showGoogleLoginModal, setShowGoogleLoginModal] = useState(false);

  const { login, isAuthenticated, isLoading } = useUser();
  const router = useRouter();

  // Remove automatic redirect - let users stay on login page even if authenticated
  // This allows users to see the login form and choose to log in again or navigate elsewhere

  const handleLogin = async (e: any) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    try {
      const result = await login(username, password);

      if (result === true) {
        // Login successful
        console.log('Login successful');
        
        // Show success toast
        toastMessages.login.success(username);
        
        // Set remember me preference
        if (rememberMe) {
          localStorage.setItem('keepLoggedIn', 'true');
        } else {
          localStorage.setItem('keepLoggedIn', 'false');
        }
        
        // Show fake loading screen before redirecting
        setShowLoadingScreen(true);
        
        // Get user role for personalized loading message
        // Wait a bit for localStorage to be updated, then get user data
        setTimeout(() => {
          const storedUser = localStorage.getItem('authenticatedUser');
          if (storedUser) {
            const user = JSON.parse(storedUser);
            console.log('User role for redirect:', user.role);
            
            const roleDashboards: Record<string, string> = {
              'admin': '/admin',
              'hr': '/hr-dashboard',
              'hr-manager': '/hr-dashboard',
              'evaluator': '/evaluator',
              'employee': '/employee-dashboard',
              'manager': '/evaluator'
            };

            const dashboardPath = roleDashboards[user.role || ''] || '/dashboard';
            console.log('Redirecting to:', dashboardPath);
            
            // Redirect after loading screen completes
            setTimeout(() => {
              router.push(dashboardPath);
            }, 2500);
          } else {
            console.log('No user data found, redirecting to default dashboard');
            setTimeout(() => {
              router.push('/dashboard');
            }, 2500);
          }
        }, 100); // Small delay to ensure localStorage is updated
      } else if (result && typeof result === 'object' && result.suspended) {
        // Account is suspended
        console.log('Account suspended result:', result);
        console.log('Suspension data:', result.data);
        setSuspensionData(result.data);
        setShowSuspensionModal(true);
        setIsLoggingIn(false);
      } else {
        const errorMessage = 'Invalid username or password. Please try again.';
        setLoginError(errorMessage);
        toastMessages.login.error();
        setIsLoggingIn(false);
      }
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = 'An error occurred during login. Please try again.';
      setLoginError(errorMessage);
      toastMessages.login.networkError();
      setIsLoggingIn(false);
    }
  };

  if (isLoading) {
    // Check if user is logging out (no authenticated user but loading)
    const isLoggingOut = !isAuthenticated && isLoading;
    
    return (
      <PageTransition>
        <FakeLoadingScreen 
          message={isLoggingOut ? "Logging out..." : "Initializing System..."} 
          duration={isLoggingOut ? 1500 : 1000}
        />
      </PageTransition>
    );
  }

  // Remove automatic redirect screen - show login form even if authenticated

  // Show fake loading screen during login process
  if (showLoadingScreen) {
    return (
      <PageTransition>
        <FakeLoadingScreen 
          message="Authenticating..." 
          duration={1200}
          onComplete={() => setShowLoadingScreen(false)}
        />
      </PageTransition>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Abstract Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Floating geometric shapes */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-blue-200/20 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-indigo-300/30 rounded-full blur-lg animate-bounce" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-32 left-1/4 w-40 h-40 bg-purple-200/25 rounded-full blur-2xl animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute bottom-20 right-1/3 w-28 h-28 bg-cyan-300/20 rounded-full blur-xl animate-bounce" style={{animationDelay: '0.5s'}}></div>
        
        {/* Abstract lines and patterns */}
        <div className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-300/40 to-transparent"></div>
        <div className="absolute top-3/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-indigo-300/40 to-transparent"></div>
        
        {/* Diagonal abstract shapes */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-blue-100/30 to-transparent transform rotate-45 -translate-y-48 translate-x-48"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-indigo-100/30 to-transparent transform -rotate-45 translate-y-40 -translate-x-40"></div>
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `
            linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}></div>
        
        {/* Floating particles */}
        <div className="absolute top-1/3 left-1/5 w-2 h-2 bg-blue-400/40 rounded-full animate-ping" style={{animationDelay: '0s'}}></div>
        <div className="absolute top-1/2 right-1/4 w-1.5 h-1.5 bg-indigo-400/50 rounded-full animate-ping" style={{animationDelay: '1.5s'}}></div>
        <div className="absolute bottom-1/3 left-1/3 w-2.5 h-2.5 bg-purple-400/30 rounded-full animate-ping" style={{animationDelay: '3s'}}></div>
        <div className="absolute top-2/3 right-1/5 w-1 h-1 bg-cyan-400/60 rounded-full animate-ping" style={{animationDelay: '2.5s'}}></div>
      </div>
      
      {/* Header */}
      <header className="relative z-10 flex justify-between items-center p-6">
        <div className="flex items-center space-x-3">
          <img src="/smct.png" alt="SMCT Group of Companies" className="h-30 w-auto" />
        </div>
        <nav className="hidden md:flex space-x-6">
          <button
            onClick={() => setIsAboutModalOpen(true)}
            className="text-gray-600 font-semibold hover:underline-offset-4 hover:underline hover:text-blue-600 transition-colors"
          >
            About
          </button>
          <a href="#" className="text-gray-600 font-semibold hover:underline-offset-4 hover:underline hover:text-blue-600">Contact</a>
        </nav>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left Column - Landing Content */}
          <div className="flex flex-col justify-center space-y-8 relative group">
            {/* Subtle backdrop for better text readability */}
            <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px] rounded-2xl -m-4 transition-all duration-500 group-hover:bg-white/15 group-hover:backdrop-blur-sm"></div>
            <div className="relative z-10 animate-fade-in-up">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-800 animate-fade-in-up" style={{animationDelay: '0.1s'}}>
              Streamline Your <span className="text-blue-600 transition-colors duration-300 hover:text-blue-700">Performance Reviews</span>
            </h1>
            <p className="text-lg text-gray-600 animate-fade-in-up" style={{animationDelay: '0.2s'}}>
              Our platform helps organizations conduct meaningful performance evaluations,
              track employee progress, and foster professional growth with intuitive tools and analytics.
            </p>

            <div className="space-y-4 animate-fade-in-up" style={{animationDelay: '0.3s'}}>
              <div className="flex items-center group/item hover:translate-x-2 transition-transform duration-300 cursor-default">
                <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center mr-3 group-hover/item:bg-indigo-200 group-hover/item:scale-110 transition-all duration-300">
                  <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                <span className="text-gray-700 group-hover/item:text-gray-800 transition-colors duration-300">Customizable evaluation templates</span>
              </div>
              <div className="flex items-center group/item hover:translate-x-2 transition-transform duration-300 cursor-default">
                <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center mr-3 group-hover/item:bg-indigo-200 group-hover/item:scale-110 transition-all duration-300">
                  <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                <span className="text-gray-700 group-hover/item:text-gray-800 transition-colors duration-300">Real-time feedback and analytics</span>
              </div>
              <div className="flex items-center group/item hover:translate-x-2 transition-transform duration-300 cursor-default">
                <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center mr-3 group-hover/item:bg-indigo-200 group-hover/item:scale-110 transition-all duration-300">
                  <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                <span className="text-gray-700 group-hover/item:text-gray-800 transition-colors duration-300">Goal tracking and progress monitoring</span>
              </div>
            </div>

            <div className="bg-blue-50 p-6 rounded-lg border border-blue-100 animate-fade-in-up hover:shadow-lg transition-all duration-300 hover:scale-[1.02]" style={{animationDelay: '0.4s'}}>
              <p className="text-blue-800 font-medium">"This platform transformed our review process, saving hours of administrative work and providing meaningful insights."</p>
              <p className="text-blue-600 mt-2">- Sarah Johnson, HR Director</p>
            </div>
            </div>
          </div>

          {/* Right Column - Login Card */}
          <div className="flex items-center justify-center">
            <PageTransition>
              <Card className="w-full max-w-md shadow-lg hover:shadow-xl transition-shadow duration-300 backdrop-blur-sm bg-white border-gray-500/20">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-2xl text-center text-gray-900">
                    Sign in to your account
                  </CardTitle>
                  <CardDescription className="text-center">
                    Enter your credentials to access your performance evaluation dashboard
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form onSubmit={handleLogin}>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input
                          id="username"
                          type="text"
                          placeholder="Enter username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="password">Password</Label>
                          <a href="#" className="text-sm text-indigo-600 hover:underline">
                            Forgot password?
                          </a>
                        </div>
                        <Input
                          id="password"
                          type="password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          id="remember-me"
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <Label htmlFor="remember-me" className="text-sm text-gray-600">
                          Remember me
                        </Label>
                      </div>
                      {loginError && (
                        <div className="text-red-600 text-sm text-center bg-red-50 p-2 rounded">
                          {loginError}
                        </div>
                      )}
                      <Button
                        type="submit"
                        className="w-full bg-blue-600 text-white hover:bg-green-700"
                        disabled={isLoggingIn}
                      >
                        {isLoggingIn ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Signing in...
                          </>
                        ) : (
                          'Sign in'
                        )}
                      </Button>
                    </div>
                  </form>

                  <div className="text-center pt-4">
                    <p className="text-sm text-gray-600">
                      Don't have an account?{' '}
                      <Link href="/register" className="text-blue-600 hover:underline font-medium">
                        Create one here
                      </Link>
                    </p>
                    {isAuthenticated && (
                      <div className="mt-4 p-3 bg-green-600 border border-green-200 rounded-lg">
                        <p className="text-sm text-white mb-2">You're already logged in!</p>
                        <Button  
                          size="sm"
                          onClick={() => {
                            const storedUser = localStorage.getItem('authenticatedUser');
                            if (storedUser) {
                              const user = JSON.parse(storedUser);
                              const roleDashboards: Record<string, string> = {
                                'admin': '/admin',
                                'hr': '/hr-dashboard',
                                'hr-manager': '/hr-dashboard',
                                'evaluator': '/evaluator',
                                'employee': '/employee-dashboard',
                                'manager': '/evaluator'
                              };
                              const dashboardPath = roleDashboards[user.role || ''] || '/dashboard';
                              router.push(dashboardPath);
                            }
                          }}
                          className="text-white bg-green-400 hover:bg-green-700"
                        >
                          Go to Dashboard
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        Or continue with
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowGoogleLoginModal(true)}
                      className="w-full"
                    >
                      <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                        <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z" />
                      </svg>
                      Continue with Google
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </PageTransition>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 bg-blue-600 mt-20 py-8 border-t">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <img src="/smct.png" alt="SMCT Group of Companies" className="h-10 w-auto" />
              </div>
              <p className="text-white">Making performance evaluations meaningful and efficient for organizations of all sizes.</p>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-4">Resources</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-white hover:text-yellow-300">Help Center</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-4">Company</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-white hover:text-yellow-300">About Us</a></li>
                <li><a href="#" className="text-white hover:text-yellow-300">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-blue-500 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-white text-sm">© 2023 SMCT Group of Companies. All rights reserved.</p>

            
            <div className="flex space-x-4 mt-4 md:mt-0">
              <a href="#" className="text-white hover:text-yellow-300">
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
        {/* Clear Session Button */}
        <div className="mt-4 flex justify-end px-4">
              <Button
                size="lg"
                onClick={() => {
                  localStorage.clear();
                  sessionStorage.clear();
                  window.location.reload();
                }}
                className="text-base text-white bg-blue-600 hover-text-white hover:bg-blue-700"
              >
               🔄 Clear Session & Start Fresh
              </Button>
            </div>
      </footer>

      {/* About Modal */}
      <Dialog open={isAboutModalOpen} onOpenChangeAction={setIsAboutModalOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto mx-4 my-8 p-6">
          <DialogHeader className="flex justify-between items-start">
            <div>
              <DialogTitle className="text-xl font-bold text-blue-600 mb-1">
                About SMCT Performance Evaluation System
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600">
                Empowering organizations with comprehensive performance management solutions
              </DialogDescription>
            </div>
            <button
              onClick={() => setIsAboutModalOpen(false)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Close modal"
            >
              <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {/* What is the Evaluation App */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-md border border-blue-100">
              <h3 className="text-base font-semibold text-gray-800 mb-2 flex items-center">
                <span className="w-5 h-5 bg-blue-600 rounded-md flex items-center justify-center mr-2">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </span>
                What is the SMCT Evaluation App?
              </h3>
              <p className="text-gray-700 leading-relaxed text-xs">
                The SMCT Performance Evaluation System is a comprehensive digital platform designed to streamline
                and enhance the performance review process within organizations. Our system transforms traditional
                paper-based evaluations into an efficient, data-driven approach that benefits both employees and managers.
              </p>
            </div>

            {/* Key Features */}
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center">
                <span className="w-5 h-5 bg-blue-600 rounded-md flex items-center justify-center mr-2">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </span>
                Key Features
              </h3>
              <div className="grid grid-cols-1 gap-3">
                <div className="bg-white p-3 rounded-md border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center flex-shrink-0">
                      <span className="text-base">📋</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-800 mb-1 text-sm">Customizable Templates</h4>
                      <p className="text-gray-600 text-xs">Create and customize evaluation forms tailored to different roles and departments</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-3 rounded-md border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center flex-shrink-0">
                      <span className="text-base">📊</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-800 mb-1 text-sm">Real-time Analytics</h4>
                      <p className="text-gray-600 text-xs">Track performance trends and generate insightful reports</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-3 rounded-md border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center flex-shrink-0">
                      <span className="text-base">🎯</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-800 mb-1 text-sm">Goal Setting & Tracking</h4>
                      <p className="text-gray-600 text-xs">Set SMART goals and monitor progress throughout the evaluation period</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-3 rounded-md border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center flex-shrink-0">
                      <span className="text-base">🤝</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-800 mb-1 text-sm">360° Feedback</h4>
                      <p className="text-gray-600 text-xs">Collect feedback from peers, managers, and direct reports</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Benefits */}
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center">
                <span className="w-5 h-5 bg-blue-600 rounded-md flex items-center justify-center mr-2">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </span>
                Benefits for Organizations
              </h3>
              <div className="bg-white p-3 rounded-md border border-gray-200 shadow-sm">
                <div className="space-y-2">
                  <div className="flex items-start space-x-3">
                    <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                    </div>
                    <p className="text-gray-700 text-sm">Reduce administrative burden and save time on manual processes</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                    </div>
                    <p className="text-gray-700 text-sm">Improve accuracy and consistency in performance assessments</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                    </div>
                    <p className="text-gray-700 text-sm">Enhance employee engagement and development through regular feedback</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                    </div>
                    <p className="text-gray-700 text-sm">Make data-driven decisions for promotions and career development</p>
                  </div>
                </div>
              </div>
            </div>

            {/* How it Works */}
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center">
                <span className="w-5 h-5 bg-blue-600 rounded-md flex items-center justify-center mr-2">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
                  </svg>
                </span>
                How It Works
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="text-center p-3 bg-white rounded-md border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-white font-bold text-xs">1</span>
                  </div>
                  <h4 className="font-medium text-gray-800 mb-1 text-xs">Setup & Configuration</h4>
                  <p className="text-gray-600 text-xs">Configure evaluation criteria and templates for your organization</p>
                </div>
                <div className="text-center p-3 bg-white rounded-md border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-white font-bold text-xs">2</span>
                  </div>
                  <h4 className="font-medium text-gray-800 mb-1 text-xs">Evaluation Process</h4>
                  <p className="text-gray-600 text-xs">Conduct evaluations with structured forms and real-time feedback</p>
                </div>
                <div className="text-center p-3 bg-white rounded-md border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-white font-bold text-xs">3</span>
                  </div>
                  <h4 className="font-medium text-gray-800 mb-1 text-xs">Analysis & Insights</h4>
                  <p className="text-gray-600 text-xs">Generate reports and insights to drive organizational growth</p>
                </div>
              </div>
            </div>

            {/* Company Info */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-md shadow-lg">
              <div className="flex items-center space-x-3 mb-3">
                <img src="/smct.png" alt="SMCT Group of Companies" className="h-10 w-auto" />
                <div>
                  <h3 className="text-lg font-bold">SMCT Group of Companies</h3>
                  <p className="text-blue-100 text-sm">Empowering organizations through innovative solutions</p>
                </div>
              </div>
              <p className="text-blue-100 text-xs leading-relaxed">
                As a leading provider of business solutions, we understand the challenges organizations face
                in managing performance evaluations. Our platform is built with years of experience in HR
                technology and organizational development, ensuring that every feature serves a real business need.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Suspension Modal */}
      {suspensionData && (
        <SuspensionModal
          isOpen={showSuspensionModal}
          onClose={() => {
            setShowSuspensionModal(false);
            setSuspensionData(null);
          }}
          suspensionData={suspensionData}
        />
      )}

      {/* Google Login Modal */}
      <GoogleLoginModal
        isOpen={showGoogleLoginModal}
        onCloseAction={() => setShowGoogleLoginModal(false)}
        onSuccess={(user) => {
          console.log('Google login successful:', user);
          // The modal will handle the login and redirect
        }}
      />
    </div>
  );
}