'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, Clock, Mail, CheckCircle } from 'lucide-react';

interface PendingApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
  userName?: string;
}

export default function PendingApprovalModal({
  isOpen,
  onClose,
  userEmail,
  userName
}: PendingApprovalModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden animate-popup">
        {/* Header with gradient background */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                <Clock className="w-8 h-8 text-blue-600" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-yellow-900" />
              </div>
            </div>
          </div>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center text-white">
              Registration Successful!
            </DialogTitle>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Success message */}
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Account Pending Approval
            </h3>
            <p className="text-sm text-gray-600">
              Thank you for registering{userName ? `, ${userName}` : ''}! Your account has been created successfully.
            </p>
          </div>

          {/* Status card */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-yellow-900 text-sm">Waiting for Admin Approval</p>
                <p className="text-xs text-yellow-800 mt-1">
                  Your account is currently under review by our admin team. You won't be able to login until your account has been approved.
                </p>
              </div>
            </div>
          </div>

          {/* What happens next */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900 text-sm">What happens next?</h4>
            <div className="space-y-2">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-blue-600">1</span>
                </div>
                <p className="text-sm text-gray-600">Admin reviews your registration details</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-blue-600">2</span>
                </div>
                <p className="text-sm text-gray-600">You'll receive email notification once approved</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-blue-600">3</span>
                </div>
                <p className="text-sm text-gray-600">You can then login with your credentials</p>
              </div>
            </div>
          </div>

          {/* Email info if provided */}
          {userEmail && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-blue-900 font-medium">We'll notify you at:</p>
                  <p className="text-sm text-blue-700 truncate">{userEmail}</p>
                </div>
              </div>
            </div>
          )}

          {/* Timeframe estimate */}
          <div className="text-center text-xs text-gray-500 border-t pt-4">
            <Clock className="w-4 h-4 inline-block mr-1" />
            Approval usually takes 24-48 hours
          </div>

          {/* Action button */}
          <Button
            onClick={onClose}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Got it, Thanks!
          </Button>

          {/* Help text */}
          <p className="text-xs text-center text-gray-500">
            Need urgent access?{' '}
            <a href="mailto:admin@company.com" className="text-blue-600 hover:underline">
              Contact Admin
            </a>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

