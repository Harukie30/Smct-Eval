'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onCloseAction: () => void;
}

export default function ForgotPasswordModal({ isOpen, onCloseAction }: ForgotPasswordModalProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      // Real API call
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        // Success - show success state
        setShowSuccess(true);
        setEmail('');
        setMessage('');
      } else {
        // Handle different error scenarios
        if (response.status === 404) {
          setMessage('No account found with this email address.');
        } else if (response.status === 429) {
          setMessage('Too many requests. Please try again later.');
        } else if (response.status === 500) {
          setMessage('Server error. Please try again later.');
        } else {
          setMessage(data.message || 'Failed to send reset email. Please try again.');
        }
      }
      
    } catch (error) {
      console.error('Forgot password error:', error);
      setMessage('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEmail('');
    setMessage('');
    setShowSuccess(false);
    onCloseAction();
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    onCloseAction();
  };

  // Auto-close success state after 5 seconds
  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => {
        handleSuccessClose();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  return (
    <Dialog open={isOpen} onOpenChangeAction={onCloseAction}>
      <DialogContent 
        className="max-w-md w-[90vw] sm:w-full px-6 py-6 animate-in zoom-in-95 duration-300"
        style={{
          animation: isOpen ? 'modalPopup 0.3s ease-out' : 'modalPopdown 0.3s ease-in'
        }}
      >
        <style jsx>{`
          @keyframes modalPopup {
            0% {
              transform: scale(0.8) translateY(20px);
              opacity: 0;
            }
            50% {
              transform: scale(1.05) translateY(-5px);
              opacity: 0.9;
            }
            100% {
              transform: scale(1) translateY(0);
              opacity: 1;
            }
          }
            @keyframes modalPopdown {
              0% {
                transform: scale(1) translateY(0);
                opacity: 1;
              }
              100% {
                transform: scale(0.8) translateY(20px);
                opacity: 0;
              }
            }
            
            @keyframes spinOnce {
              0% {
                transform: rotate(0deg);
              }
              100% {
                transform: rotate(360deg);
              }
            }
            
            .spin-once {
              animation: spinOnce 0.6s ease-in-out 0.2s;
            }
            
            .success-checkmark {
              animation: successScale 0.3s ease-out 0.4s both;
            }
            
            .success-checkmark-path {
              stroke-dasharray: 20;
              stroke-dashoffset: 20;
              animation: successDraw 0.6s ease-out 0.7s forwards;
            }
            
            @keyframes successScale {
              0% {
                transform: scale(0);
                opacity: 0;
              }
              50% {
                transform: scale(1.1);
                opacity: 0.8;
              }
              100% {
                transform: scale(1);
                opacity: 1;
              }
            }
            
            @keyframes successDraw {
              to {
                stroke-dashoffset: 0;
              }
            }
        `}</style>
        
        {!showSuccess ? (
          // Forgot Password Form
          <>
            <DialogHeader>
              <div className="flex justify-center mb-4">
                
                  <img 
                    src="/password.png" 
                    alt="Forgot Password" 
                    className="w-20 h-20 spin-once"
                  />
               
              </div>
              <DialogTitle className="text-xl font-bold text-gray-900 text-center">
                Reset Your Password
              </DialogTitle>
              <DialogDescription className="text-center text-gray-600">
                Enter your email address and we'll send you instructions to reset your password.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label htmlFor="forgot-email">Email Address</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full"
                />
              </div>
              
              {message && (
                <div className={`p-3 rounded-md text-sm ${
                  message.includes('Failed') 
                    ? 'bg-red-50 text-red-600 border border-red-200' 
                    : 'bg-green-50 text-green-600 border border-green-200'
                }`}>
                  {message}
                </div>
              )}
              
              <div className="flex space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  className="flex-1"
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || !email}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Sending...
                    </>
                  ) : (
                    'Send Reset Email'
                  )}
                </Button>
              </div>
            </form>
            
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-500">
                Remember your password?{' '}
                <button
                  type="button"
                  onClick={onCloseAction}
                  className="text-blue-600 hover:underline font-medium"
                >
                  Back to Login
                </button>
              </p>
            </div>
          </>
        ) : (
          // Success State
          <div className="space-y-4 text-center">
            {/* Animated Check Icon */}
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <svg 
                  className="w-10 h-10 text-green-600 success-checkmark" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    className="success-checkmark-path"
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="3" 
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
            
            {/* Success Message */}
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-gray-900">Email Sent!</h3>
              <p className="text-gray-600 text-sm">
                Password reset instructions have been sent to your email address. 
                Please check your inbox and follow the instructions to reset your password.
              </p>
            </div>
            
            {/* Action Button */}
            <Button
              onClick={handleSuccessClose}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              Got it!
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
