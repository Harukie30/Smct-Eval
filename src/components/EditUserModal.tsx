import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SignaturePad from '@/components/SignaturePad';
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
  branches: string[];
  positions: string[];
}

const EditUserModal: React.FC<EditUserModalProps> = ({
  isOpen,
  onClose,
  user,
  onSave,
  departments,
  branches,
  positions
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

  // Update form data when user prop changes
  useEffect(() => {
    if (user) {
      setFormData({
        id: user.id,
        name: user.name || '',
        email: user.email || '',
        position: user.position || '',
        department: user.department || '',
        branch: user.branch || '',
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

    if (!formData.department.trim()) {
      newErrors.department = 'Department is required';
    }

    if (!formData.branch.trim()) {
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
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

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
        console.log('Save completed, closing modal...');
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
              value={formData.contact || ''}
              onChange={(e) => handleInputChange('contact', e.target.value)}
              className={errors.contact ? 'border-red-500' : 'bg-white'}
              placeholder="Enter contact number"
            />
            {errors.contact && <p className="text-sm text-red-500">{errors.contact}</p>}
          </div>

          {/* Position */}
          <div className="space-y-2">
            <Label htmlFor="position">Position *</Label>
            <Select
              value={formData.position}
              onValueChange={(value) => handleInputChange('position', value)}
            >
              <SelectTrigger className={errors.position ? 'border-red-500' : 'bg-white'}>
                <SelectValue placeholder="Select position" />
              </SelectTrigger>
              <SelectContent>
                {positions.map((position) => (
                  <SelectItem key={position} value={position}>
                    {position}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.position && <p className="text-sm text-red-500">{errors.position}</p>}
          </div>

          {/* Department */}
          <div className="space-y-2">
            <Label htmlFor="department">Department *</Label>
            <Select
              value={formData.department}
              onValueChange={(value) => handleInputChange('department', value)}
            >
              <SelectTrigger className={errors.department ? 'border-red-500' : 'bg-white'}>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((department) => (
                  <SelectItem key={department} value={department}>
                    {department}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.department && <p className="text-sm text-red-500">{errors.department}</p>}
          </div>

          {/* Branch */}
          <div className="space-y-2">
            <Label htmlFor="branch">Branch *</Label>
            <Select
              value={formData.branch}
              onValueChange={(value) => handleInputChange('branch', value)}
            >
              <SelectTrigger className={errors.branch ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((branch) => (
                  <SelectItem key={branch} value={branch}>
                    {branch}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.branch && <p className="text-sm text-red-500">{errors.branch}</p>}
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <Select
              value={formData.role || ''}
              onValueChange={(value) => handleInputChange('role', value)}
            >
              <SelectTrigger className={errors.role ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="hr">HR Employee</SelectItem>
                <SelectItem value="hr-manager">HR Manager</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="evaluator">Evaluator</SelectItem>
                <SelectItem value="employee">Employee</SelectItem>
              </SelectContent>
            </Select>
            {errors.role && <p className="text-sm text-red-500">{errors.role}</p>}
          </div>

          {/* Hire Date */}
          <div className="space-y-2">
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
          <div className="space-y-2">
            <Label htmlFor="isActive">Status</Label>
            <Select
              value={formData.isActive ? 'active' : 'inactive'}
              onValueChange={(value) => handleInputChange('isActive', value === 'active')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Digital Signature - Full Width */}
        <div className="w-full space-y-2 pt-4 mt-4 border-t border-gray-200">
          <Label htmlFor="signature" className="text-base font-medium">Digital Signature</Label>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <SignaturePad
              value={formData.signature || ''}
              onChangeAction={(signature) => handleInputChange('signature', signature)}
              className="w-full"
              required={false}
              hasError={false}
            />
          </div>
          <p className="text-sm text-gray-500">
            Update the user's digital signature if needed. This signature will be used for official documents.
          </p>
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
