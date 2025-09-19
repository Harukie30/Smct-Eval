// src/components/EmployeeNameDisplay.tsx

'use client';

import React from 'react';
import { useEmployeeName } from '@/hooks/useEmployeeData';
import { Badge } from '@/components/ui/badge';
import { User, Loader2 } from 'lucide-react';

interface EmployeeNameDisplayProps {
  employeeId: number | null;
  showEmail?: boolean;
  showPosition?: boolean;
  showDepartment?: boolean;
  showStatus?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
  className?: string;
}

export default function EmployeeNameDisplay({
  employeeId,
  showEmail = false,
  showPosition = false,
  showDepartment = false,
  showStatus = false,
  variant = 'default',
  className = ''
}: EmployeeNameDisplayProps) {
  const { name, loading } = useEmployeeName(employeeId);

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-gray-500">Loading...</span>
      </div>
    );
  }

  if (!name) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <User className="h-4 w-4 text-gray-400" />
        <span className="text-gray-500">Unknown Employee</span>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
          <span className="text-xs font-medium text-gray-600">
            {name.split(' ').map(n => n[0]).join('').toUpperCase()}
          </span>
        </div>
        <span className="font-medium">{name}</span>
      </div>
    );
  }

  if (variant === 'detailed') {
    return (
      <div className={`space-y-1 ${className}`}>
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-gray-600">
              {name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </span>
          </div>
          <div>
            <div className="font-medium">{name}</div>
            {showEmail && (
              <div className="text-sm text-gray-500">ID: {employeeId}</div>
            )}
          </div>
        </div>
        {showPosition && (
          <div className="text-sm text-gray-600">Position: Loading...</div>
        )}
        {showDepartment && (
          <div className="text-sm text-gray-600">Department: Loading...</div>
        )}
        {showStatus && (
          <Badge variant="outline" className="text-xs">
            Active
          </Badge>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <User className="h-4 w-4 text-gray-400" />
      <span className="font-medium">{name}</span>
    </div>
  );
}

// Example usage in a table cell
export function EmployeeTableCell({ employeeId }: { employeeId: number }) {
  return (
    <EmployeeNameDisplay 
      employeeId={employeeId} 
      variant="compact"
      className="font-medium"
    />
  );
}

// Example usage for detailed employee info
export function EmployeeInfoCard({ employeeId }: { employeeId: number }) {
  return (
    <EmployeeNameDisplay 
      employeeId={employeeId} 
      variant="detailed"
      showEmail={true}
      showPosition={true}
      showDepartment={true}
      showStatus={true}
    />
  );
}
