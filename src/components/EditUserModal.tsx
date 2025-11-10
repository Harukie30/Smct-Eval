import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import LoadingAnimation from '@/components/LoadingAnimation';
import { useToast } from '@/hooks/useToast';

interface User {
  id: number;
  name: string;
  email: string;
  position: string;
  department: string;
  branch: string;
  role?: string;
  username?: string;
  password?: string;
  contact?: string;
  hireDate?: string;
  isActive?: boolean;
  signature?: string;
}

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onSave: (updatedUser: User) => void;
  departments: string[];
  branches: string[] | {id: string, name: string}[];
  positions: {id: string, name: string}[];
  onRefresh?: () => void | Promise<void>;
}

const EditUserModal: React.FC<EditUserModalProps> = ({
  isOpen,
  onClose,
  user,
  onSave,
  departments,
  branches,
  positions,
  onRefresh
}) => {
  const [formData, setFormData] = useState<User>({
    id: 0,
    name: '',
    email: '',
    position: '',
    department: '',
    branch: '',
    role: '',
    username: '',
    password: '',
    contact: '',
    hireDate: '',
    isActive: true,
    signature: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { success } = useToast();

  // Helper function to check if branch is HO, Head Office, or none
  const isBranchHOOrNone = (branch: string): boolean => {
    if (!branch) return false;
    const branchLower = branch.toLowerCase().trim();
    return branchLower === 'ho' || 
           branchLower === 'head office' || 
           branchLower === 'none' ||
           branchLower === 'none ho';
  };

  // Update form data when user prop changes
  useEffect(() => {
    if (user) {
      const branchValue = (user.branch && typeof user.branch === 'string') ? user.branch : (user.branch ? String(user.branch) : '');
      setFormData({
        id: user.id,
        name: user.name || '',
        email: user.email || '',
        position: user.position || '',
        // Clear department if branch is NOT HO/none/Head Office (i.e., regular branch)
        department: isBranchHOOrNone(branchValue) ? (user.department || '') : '',
        branch: branchValue,
        role: user.role || '',
        username: user.username || '',
        password: user.password || '',
        contact: user.contact || '',
        hireDate: user.hireDate || '',
        isActive: user.isActive !== undefined ? user.isActive : true,
        signature: user.signature || ''
      });
      setErrors({});
    }
  }, [user]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.position.trim()) {
      newErrors.position = 'Position is required';
    }

    // Department is only required if branch IS HO/none/Head Office
    if (isBranchHOOrNone(formData.branch) && !formData.department.trim()) {
      newErrors.department = 'Department is required';
    }

    if (formData.branch && typeof formData.branch === 'string' && !formData.branch.trim()) {
      newErrors.branch = 'Branch is required';
    }

    if (!formData.role?.trim()) {
      newErrors.role = 'Role is required';
    }

    if (formData.username && !formData.username.trim()) {
      newErrors.username = 'Username cannot be empty if provided';
    }

    if (formData.contact && !/^\d{10,15}$/.test(formData.contact.replace(/\D/g, ''))) {
      newErrors.contact = 'Please enter a valid phone number';
    }

    if (formData.password && formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof User, value: string | boolean) => {
    // If branch is changed to a regular branch (not HO/none/Head Office), clear department
    if (field === 'branch' && typeof value === 'string' && !isBranchHOOrNone(value)) {
      setFormData(prev => ({
        ...prev,
        [field]: value,
        department: '' // Clear department when branch is a regular branch (not HO/none)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleSave = async () => {
    if (validateForm()) {
      console.log('Starting save process...');
      setIsSaving(true);
      try {
        // Simulate a delay to show the loading animation
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('Calling onSave...');
        await onSave(formData);
        console.log('Save completed, refreshing table...');
        
        // Refresh the table if onRefresh callback is provided
        // This ensures the table updates with the latest data
        if (onRefresh) {
          await onRefresh();
          // Small delay to ensure state updates propagate
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        success('Success! Your changes have been saved.');
        onClose();
      } catch (error) {
        console.error('Error saving user:', error);
        // You might want to show an error message here
      } finally {
        console.log('Setting isSaving to false...');
        setIsSaving(false);
      }
    }
  };

  const handleCancel = () => {
    setErrors({});
    onClose();
  };

  if (!user) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChangeAction={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-6 bg-blue-100 animate-popup">
        <DialogHeader className="pb-6">
          <DialogTitle className="text-xl font-semibold">Edit User Information</DialogTitle>
          <DialogDescription className="text-gray-600">
            Update the user's information below. All fields marked with * are required.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-2">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={errors.name ? 'border-red-500 ' : 'bg-white'}
              placeholder="Enter full name"
            />
            {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={errors.email ? 'border-red-500' : 'bg-white'}
              placeholder="Enter email address"
            />
            {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
          </div>

          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={formData.username || ''}
              onChange={(e) => handleInputChange('username', e.target.value)}
              className={errors.username ? 'border-red-500' : 'bg-white'}
              placeholder="Enter username"
            />
            {errors.username && <p className="text-sm text-red-500">{errors.username}</p>}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password || ''}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className={errors.password ? 'border-red-500 pr-10' : 'pr-10 bg-white'}
                placeholder="Enter password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
            <p className="text-xs text-gray-500">Leave empty to keep current password</p>
          </div>

          {/* Contact */}
          <div className="space-y-2">
            <Label htmlFor="contact">Contact Number</Label>
            <Input
              id="contact"
              type="tel"
              value={formData.contact || ''}
              onChange={(e) => {
                // Only allow numbers, spaces, hyphens, and parentheses (for formatting)
                const value = e.target.value.replace(/[^\d\s\-()]/g, '');
                handleInputChange('contact', value);
              }}
              onKeyDown={(e) => {
                // Allow: backspace, delete, tab, escape, enter, and arrow keys
                if ([8, 9, 27, 13, 46, 37, 38, 39, 40].indexOf(e.keyCode) !== -1 ||
                    // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
                    (e.keyCode === 65 && e.ctrlKey === true) ||
                    (e.keyCode === 67 && e.ctrlKey === true) ||
                    (e.keyCode === 86 && e.ctrlKey === true) ||
                    (e.keyCode === 88 && e.ctrlKey === true) ||
                    // Allow: home, end, left, right
                    (e.keyCode >= 35 && e.keyCode <= 39)) {
                  return;
                }
                // Ensure that it is a number and stop the keypress
                if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105) && 
                    e.key !== ' ' && e.key !== '-' && e.key !== '(' && e.key !== ')') {
                  e.preventDefault();
                }
              }}
              className={errors.contact ? 'border-red-500' : 'bg-white'}
              placeholder="Enter contact number (numbers only)"
            />
            {errors.contact && <p className="text-sm text-red-500">{errors.contact}</p>}
          </div>

          {/* Position */}
          <div className="space-y-2 w-1/2">
            <Label htmlFor="position">Position *</Label>
            <Combobox
              options={positions.map(p => ({ value: p.id, label: p.name }))}
              value={formData.position}
              onValueChangeAction={(value) => handleInputChange('position', value as string)}
              placeholder="Select position"
              searchPlaceholder="Search positions..."
              emptyText="No positions found."
              className={errors.position ? 'border-red-500' : 'bg-white'}
              error={errors.position || null}
            />
            {errors.position && <p className="text-sm text-red-500">{errors.position}</p>}
          </div>

          {/* Department - Show only if branch is HO, Head Office, or none */}
          {isBranchHOOrNone(formData.branch) && (
            <div className="space-y-2 w-1/2">
              <Label htmlFor="department">Department *</Label>
              <Combobox
                options={departments.map(dept => ({ value: dept, label: dept }))}
                value={formData.department}
                onValueChangeAction={(value) => handleInputChange('department', value as string)}
                placeholder="Select department"
                searchPlaceholder="Search departments..."
                emptyText="No departments found."
                className={errors.department ? 'border-red-500' : 'bg-white'}
                error={errors.department || null}
              />
              {errors.department && <p className="text-sm text-red-500">{errors.department}</p>}
            </div>
          )}

          {/* Branch */}
          <div className="space-y-2 w-1/2">
            <Label htmlFor="branch">Branch *</Label>
            <Combobox
              options={
                Array.isArray(branches) && branches.length > 0 && typeof branches[0] === 'object' && !('value' in branches[0])
                  ? (branches as {id: string, name: string}[]).map(b => ({ value: b.name, label: b.name }))
                  : (branches as string[])
              }
              value={formData.branch || ''}
              onValueChangeAction={(value) => handleInputChange('branch', value as string)}
              placeholder="Select branch"
              searchPlaceholder="Search branches..."
              emptyText="No branches found."
              className={errors.branch ? 'border-red-500' : ''}
              error={errors.branch || null}
            />
            {errors.branch && <p className="text-sm text-red-500">{errors.branch}</p>}
          </div>

          {/* Role */}
          <div className="space-y-2 w-1/2">
            <Label htmlFor="role">Role *</Label>
            <Combobox
              options={[
                { value: 'admin', label: 'Admin' },
                { value: 'hr', label: 'HR' },
                { value: 'evaluator', label: 'Evaluator' },
                { value: 'employee', label: 'Employee' }
              ]}
              value={formData.role || ''}
              onValueChangeAction={(value) => handleInputChange('role', value as string)}
              placeholder="Select role"
              searchPlaceholder="Search roles..."
              emptyText="No roles found."
              className={errors.role ? 'border-red-500' : ''}
              error={errors.role || null}
            />
            {errors.role && <p className="text-sm text-red-500">{errors.role}</p>}
          </div>

          {/* Hire Date */}
          <div className="space-y-2 w-1/2">
            <Label htmlFor="hireDate">Hire Date</Label>
            <Input
              id="hireDate"
              type="date"
              value={formData.hireDate || ''}
              onChange={(e) => handleInputChange('hireDate', e.target.value)}
              placeholder="Select hire date"
            />
          </div>

          {/* Active Status */}
          <div className="space-y-2 w-1/2">
            <Label htmlFor="isActive">Status</Label>
            <Combobox
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' }
              ]}
              value={formData.isActive ? 'active' : 'inactive'}
              onValueChangeAction={(value) => handleInputChange('isActive', value === 'active')}
              placeholder="Select status"
              searchPlaceholder="Search status..."
              emptyText="No status found."
            />
          </div>
        </div>

        <DialogFooter className="flex justify-end space-x-3 pt-6 mt-6 border-t border-gray-200">
          <Button variant="outline" onClick={handleCancel} className="px-6" disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 px-6" disabled={isSaving}>
            {isSaving ? (
              <div className="flex items-center space-x-2">
                <LoadingAnimation size="sm" variant="spinner" color="blue" />
                <span>Saving...</span>
              </div>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Loading Modal Overlay */}
      {isSaving && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 shadow-xl max-w-sm w-full mx-4">
            <div className="flex flex-col items-center space-y-4">
              <LoadingAnimation 
                size="lg" 
                variant="spinner" 
                color="blue" 
                showText={true}
                text="Saving user information..."
              />
              <p className="text-sm text-gray-600 text-center">
                Please wait while we save your changes. This may take a few moments.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EditUserModal;
