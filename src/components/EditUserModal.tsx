import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import LoadingAnimation from '@/components/LoadingAnimation';
import { useToast } from '@/hooks/useToast';
import clientDataService from '@/lib/clientDataService.api';
import { Combobox } from './ui/combobox';

interface User {
  id: number;
  fname: string;
  lname: string;
  email: string;
  position_id: string | number;
  department_id?: string  | number ;
  branch_id:string  | number;
  roles?: any;
  username?: string;
  password?: string;
  contact?: string;
  is_active?: string ;
}

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onSave: () => void;
  positions: {value: string | number, label: string}[];
  departments:  {value: string | number, label: string}[];
  branches:  {value: string | number, label: string}[];
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
    fname: '',
    lname: '',
    email: '',
    position_id: 0,
    department_id: "",
    branch_id: 0,
    roles: '' ,
    username: '',
    password: '',
    contact: '',
    is_active: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const { success } = useToast();

  // Update form data when user prop changes
  useEffect(() => {
    if (user) { 
      setFormData({
        id: user.id,
        fname: user.fname || '',
        lname: user.lname || '',
        email: user.email || '',
        position_id: user.position_id || '',
        department_id: user.department_id || '',
        branch_id: user.branch_id || '',
        roles: user?.roles?.[0]?.name || '',
        username: user.username || '',
        contact: user.contact || '',
        is_active: user.is_active || '',
      });
      setErrors({});
    }
  }, [user]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.fname.trim()) {
      newErrors.fname = 'First name is required';
    }

    if (!formData.lname.trim()) {
      newErrors.lname = 'Last name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.position_id) {
      newErrors.positions = 'Position is required';
    }

    if (!formData.branch_id) {
      newErrors.branches = 'Branch is required';
    }

    if (!formData.roles) {
      newErrors.role = 'Role is required';
    }

    if (formData.username && !formData.username.trim()) {
      newErrors.username = 'Username cannot be empty if provided';
    }

    if (formData.contact && !/^\d{10,15}$/.test(formData.contact.replace(/\D/g, ''))) {
      newErrors.contact = 'Please enter a valid phone number';
    }

    if(formData.password == null) {
      delete newErrors.password;
    }
    else if (formData.password && formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    } else if (formData.password && !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password =
        "Password must contain uppercase, lowercase, and number";
    } else{
      delete newErrors.password;
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
        await new Promise(resolve => setTimeout(resolve, 1000));
        const data = new FormData();
        Object.entries(formData).forEach(([key, value]) => {
          data.append(key, value as string); 
        });
        const save = await clientDataService.updateEmployee(data ,formData.id);
        success('Success! Your changes have been saved.');
        onClose();
        onSave();
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
            <Label htmlFor="fname">First Name *</Label>
            <Input
              id="name"
              value={formData.fname}
              onChange={(e) => handleInputChange('fname', e.target.value)}
              className={errors.name ? 'border-red-500 ' : 'bg-white'}
              placeholder="Enter full name"
            />
            {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lname">Last Name *</Label>
            <Input
              id="lname"
              value={formData.lname}
              onChange={(e) => handleInputChange('lname', e.target.value)}
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

          <div className="space-y-2">
            <Label htmlFor="department">Position *</Label>
            <Combobox
              options={positions}
              value={formData.position_id}
              onValueChangeAction={(value) =>
                setFormData({ ...formData, position_id: value })
              }
              placeholder="Select your branch"
              searchPlaceholder="Search branches..."
              emptyText="No branches found."
              className="w-full"
              error={errors.position_id}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">Branch *</Label>
            <Combobox
              options={branches}
              value={formData.branch_id}
              onValueChangeAction={(value) =>
                setFormData({ ...formData, branch_id: value })
              }
              placeholder="Select your branch"
              searchPlaceholder="Search branches..."
              emptyText="No branches found."
              className="w-full"
              error={errors.branch_id}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Combobox
              options={departments}
              value={formData.department_id}
              onValueChangeAction={(value) =>
                setFormData({ ...formData, department_id: value })
              }
              placeholder="Select your branch"
              searchPlaceholder="Search branches..."
              emptyText="No branches found."
              className="w-full"
              error={errors.department_id}
            />
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <Select
              value={formData.roles}
              onValueChange={(value) => handleInputChange('roles', value)}
            >
              <SelectTrigger className={errors.role ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="hr">HR</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="evaluator">Evaluator</SelectItem>
                <SelectItem value="employee">Employee</SelectItem>
              </SelectContent>
            </Select>
            {errors.role && <p className="text-sm text-red-500">{errors.role}</p>}
          </div>

            {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <Input
              id="password"
              type="text"
              onChange={(e) => handleInputChange('password', e.target.value)}
              className={errors.password ? 'border-red-500' : 'bg-white'}
              placeholder='Set new Password'
            />
            {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
          </div>

            {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="email">Status</Label>
            <Input
              id="isActive"
              type="text"
              value={formData.is_active}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={errors.email ? 'border-red-500' : 'bg-white'}
              readOnly
            />
            {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
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
