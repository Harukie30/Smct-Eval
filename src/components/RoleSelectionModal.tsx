'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';

interface RoleSelectionModalProps {
  isOpen: boolean;
  userName: string;
  availableRoles: string[];
  onRoleSelectedAction: (role: string) => void;
}

export default function RoleSelectionModal({ 
  isOpen, 
  userName, 
  availableRoles,
  onRoleSelectedAction 
}: RoleSelectionModalProps) {
  const router = useRouter();
  
  const handleHRRole = () => {
    onRoleSelectedAction('hr');
    router.push('/hr-dashboard');
  };
  
  const handleEvaluatorRole = () => {
    // Handle evaluator or manager roles
    const evaluatorRole = availableRoles.find(role => role === 'evaluator' || role === 'manager') || 'evaluator';
    onRoleSelectedAction(evaluatorRole);
    router.push('/evaluator');
  };
  
  const handleEmployeeRole = () => {
    onRoleSelectedAction('employee');
    router.push('/employee-dashboard');
  };
  
  // Check available roles
  const hasHRRole = availableRoles.includes('hr');
  const hasEvaluatorRole = availableRoles.some(role => role === 'evaluator' || role === 'manager');
  const hasEmployeeRole = availableRoles.includes('employee');
  
  // Count the number of roles to dynamically adjust grid
  const roleCount = [hasHRRole, hasEvaluatorRole, hasEmployeeRole].filter(Boolean).length;
  const gridClass = roleCount === 3 
    ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
    : "grid grid-cols-1 md:grid-cols-2 gap-4";
  const modalWidthClass = roleCount === 3 ? "sm:max-w-4xl" : "sm:max-w-2xl";
  
  return (
    <Dialog open={isOpen} onOpenChangeAction={() => {}}>
      <DialogContent className={`${modalWidthClass} animate-popup`}>
        <div className="space-y-6 p-4">
          {/* Header */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">
              Welcome back, {userName}! 👋
            </h2>
            <p className="text-sm text-gray-500 mt-2">
              How would you like to continue?
            </p>
          </div>
          
          {/* Role Selection - Responsive Grid */}
          <div className={gridClass}>
            {/* HR Role - Only show if user has HR access */}
            {hasHRRole && (
              <button
                onClick={handleHRRole}
                className="group p-8 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 hover:shadow-lg transition-all duration-300 text-center transform hover:scale-105"
              >
                <div className="text-6xl mb-4 animate-bounce-slow">👔</div>
                <h3 className="font-bold text-xl mb-2 text-gray-900 group-hover:text-blue-600">
                  HR Manager
                </h3>
                <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                  Manage employees, approve registrations, and view reports
                </p>
                <div className="inline-flex items-center text-blue-500 group-hover:text-blue-600 font-semibold">
                  Continue
                  <span className="ml-2 transform group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </button>
            )}
            
            {/* Evaluator Role - Only show if user has Evaluator access */}
            {hasEvaluatorRole && (
              <button
                onClick={handleEvaluatorRole}
                className="group p-8 border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 hover:shadow-lg transition-all duration-300 text-center transform hover:scale-105"
              >
                <div className="text-6xl mb-4 animate-bounce-slow">📝</div>
                <h3 className="font-bold text-xl mb-2 text-gray-900 group-hover:text-purple-600">
                  Evaluator
                </h3>
                <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                  Evaluate employees, review performance, and provide feedback
                </p>
                <div className="inline-flex items-center text-purple-500 group-hover:text-purple-600 font-semibold">
                  Continue
                  <span className="ml-2 transform group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </button>
            )}
            
            {/* Employee Role - Only show if user has Employee access */}
            {hasEmployeeRole && (
              <button
                onClick={handleEmployeeRole}
                className="group p-8 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 hover:shadow-lg transition-all duration-300 text-center transform hover:scale-105"
              >
                <div className="text-6xl mb-4 animate-bounce-slow">👤</div>
                <h3 className="font-bold text-xl mb-2 text-gray-900 group-hover:text-green-600">
                  My Profile
                </h3>
                <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                  View your evaluations, performance, and personal profile
                </p>
                <div className="inline-flex items-center text-green-500 group-hover:text-green-600 font-semibold">
                  Continue
                  <span className="ml-2 transform group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </button>
            )}
          </div>
          
          {/* Footer Tip */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <span className="text-lg">💡</span>
              <p className="text-xs text-blue-700 flex-1">
                <strong>Tip:</strong> You can switch between roles anytime from the profile menu in the top right corner
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

