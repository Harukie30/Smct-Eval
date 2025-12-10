'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import { EvaluationData } from './types';

interface WelcomeStepProps {
  data: EvaluationData;
  updateDataAction: (updates: Partial<EvaluationData>) => void;
  employee?: {
    id: number;
    name: string;
    email: string;
    position: string;
    department: string;
    role: string;
  };
  onStartAction: () => void;
  onBackAction?: () => void;
  currentUser?: {
    id: number;
    name: string;
    email: string;
    signature?: string;
  };
}

export default function WelcomeStep({ employee, onStartAction, onBackAction, currentUser }: WelcomeStepProps) {
  // Signature can be a PNG file (base64 data URL or file path)
  const hasSignature = currentUser?.signature && 
    typeof currentUser.signature === 'string' && 
    currentUser.signature.length > 0;
  return (
    <div className="space-y-6">
      

      {/* Welcome Header */}
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Manager Performance Evaluation</h3>
        <p className="text-gray-600 mb-6">
          This comprehensive evaluation is designed specifically for managers to assess performance across multiple dimensions and leadership competencies.
        </p>
      </div>

      {/* Employee Information Card */}
      {employee && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="text-center mb-4">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-blue-600">
                  {employee.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </span>
              </div>
              <h4 className="text-xl font-semibold text-gray-900">{employee.name}</h4>
              <p className="text-gray-600">{employee.email}</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <Badge className="bg-blue-100 text-blue-800 mb-1">Position</Badge>
                <p className="text-sm text-gray-900">{employee.position || 'N/A'}</p>
              </div>
              <div>
                <Badge className="bg-green-100 text-green-800 mb-1">Department</Badge>
                <p className="text-sm text-gray-900">{employee.department || 'N/A'}</p>
              </div>
              <div>
                <Badge className="bg-purple-100 text-purple-800 mb-1">Role</Badge>
                <p className="text-sm text-gray-900">
                  {(() => {
                    if (!employee.role) return 'N/A';
                    if (typeof employee.role === 'string') return employee.role;
                    if (Array.isArray(employee.role)) {
                      const firstRole = employee.role[0];
                      if (firstRole && typeof firstRole === 'object' && 'name' in firstRole) {
                        return (firstRole as any).name || String(firstRole);
                      }
                      return String(firstRole || 'N/A');
                    }
                    if (typeof employee.role === 'object' && 'name' in employee.role) {
                      return (employee.role as any).name || 'N/A';
                    }
                    return String(employee.role);
                  })()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Evaluation Overview */}
      <Card>
        <CardContent className="pt-6">
          <h4 className="font-medium text-gray-900 mb-4">Evaluation Overview</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                <div>
                  <h5 className="font-medium text-gray-900">Employee Information/Job Knowledge </h5>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                <div>
                  <h5 className="font-medium text-gray-900"> Quality of Work </h5>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                <div>
                  <h5 className="font-medium text-gray-900">Adaptability</h5>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">4</div>
                <div>
                  <h5 className="font-medium text-gray-900">Teamwork</h5>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">5</div>
                <div>
                  <h5 className="font-medium text-gray-900">Reliability</h5>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">6</div>
                <div>
                  <h5 className="font-medium text-gray-900">Ethical & Professional Behavior</h5>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">7</div>
                <div>
                  <h5 className="font-medium text-gray-900">Customer Service</h5>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Signature Validation */}
      {!hasSignature && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="text-red-600 text-lg">⚠️</div>
              <div>
                <h4 className="font-medium text-red-800 mb-2">Signature Required</h4>
                <p className="text-sm text-red-700 mb-3">
                  You must have a signature saved in your profile to start an evaluation. 
                  Please add your signature in your profile settings before proceeding.
                </p>
                <div className="bg-red-100 p-3 rounded-md">
                  <p className="text-sm text-red-800 font-medium">
                    ❌ Cannot start evaluation without signature
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Important Information */}
      <Card className="bg-yellow-50 border-yellow-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="text-yellow-600 text-lg">ℹ️</div>
            <div>
              <h4 className="font-medium text-yellow-800 mb-2">Important Information</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• This evaluation will take approximately 15-20 minutes to complete</li>
                <li>• All ratings are on a scale of 1-5 (Poor to Excellent)</li>
                <li>• You can navigate back to previous steps to make changes</li>
                <li>• Your responses will be saved automatically as you progress</li>
                <li>• This evaluation will be used for performance management and development planning</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-4">
          {/* Back Button - Only show when no signature */}
          {onBackAction && !hasSignature && (
            <Button
              variant="outline"
              onClick={onBackAction}
              size="lg"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white hover:text-white text-lg flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          )}
          
          {/* Start Button */}
          <Button
            onClick={hasSignature ? onStartAction : undefined}
            size="lg"
            disabled={!hasSignature}
            className={`px-8 py-3 text-lg ${
              hasSignature 
                ? 'bg-blue-600 hover:bg-blue-700' 
                : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            {hasSignature ? 'Start Evaluation' : 'Signature Required'}
          </Button>
        </div>
        
        <p className="text-sm text-gray-500 mt-2">
          {hasSignature 
            ? 'Click to begin the performance evaluation process'
            : 'Add your signature in profile settings to start evaluation'
          }
        </p>
      </div>
    </div>
  );
}
