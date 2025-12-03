import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { UserProfile } from './ProfileCard';
import { User, Camera, Save, X, Eye, EyeOff, ChevronDown } from 'lucide-react';
import { uploadProfileImage } from '@/lib/imageUpload';
// Removed profileService import - we'll use UserContext directly
import SignaturePad from '@/components/SignaturePad';
import { useToast } from '@/hooks/useToast';
import LoadingAnimation from '@/components/LoadingAnimation';
import { apiService } from '@/lib/apiService';

// Extended form data type for editing
type ProfileFormData = UserProfile & {
  fname?: string;
  lname?: string;
  positions?: { value: string | number; label: string };
  departments?: { value: string | number; department_name: string };
  branches?: { value: string | number; branch_name: string };
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
};

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile & { id?: string | number };
  onSave: (updatedProfile: UserProfile) => void;
}

export default function ProfileModal({
  isOpen,
  onClose,
  profile,
  onSave,
}: ProfileModalProps) {
  // Helper to convert UserProfile to form data
  const profileToFormData = (prof: UserProfile & { fname?: string; lname?: string }, options?: {
    positions?: {value: string | number, label: string}[],
    departments?: {value: string | number, label: string}[],
    branches?: {value: string | number, label: string}[]
  }): ProfileFormData => {
    // Use fname/lname if available, otherwise split name
    let fname = '';
    let lname = '';
    if (prof.fname || prof.lname) {
      fname = prof.fname || '';
      lname = prof.lname || '';
    } else {
      const nameParts = prof.name?.split(' ') || [];
      fname = nameParts[0] || '';
      lname = nameParts.slice(1).join(' ') || '';
    }
    
    // Find matching position
    let positionObj = undefined;
    if (prof.roleOrPosition && options?.positions) {
      const matched = options.positions.find(p => p.label === prof.roleOrPosition);
      if (matched) {
        positionObj = { value: matched.value, label: matched.label };
      } else {
        positionObj = { value: '', label: prof.roleOrPosition };
      }
    }
    
    // Find matching department
    let deptObj = undefined;
    if (prof.department && options?.departments) {
      const matched = options.departments.find(d => d.label === prof.department);
      if (matched) {
        deptObj = { value: matched.value, department_name: matched.label };
      } else {
        deptObj = { value: '', department_name: prof.department };
      }
    }
    
    // Find matching branch
    let branchObj = undefined;
    if (prof.branch && options?.branches) {
      const matched = options.branches.find(b => b.label === prof.branch);
      if (matched) {
        branchObj = { value: matched.value, branch_name: matched.label };
      } else {
        branchObj = { value: '', branch_name: prof.branch };
      }
    }
    
    return {
      ...prof,
      fname,
      lname,
      positions: positionObj,
      departments: deptObj,
      branches: branchObj,
    };
  };

  // Helper to convert form data back to UserProfile
  const formDataToProfile = (form: ProfileFormData): UserProfile & { fname?: string; lname?: string } => {
    return {
      id: form.id,
      name: `${form.fname || ''} ${form.lname || ''}`.trim() || form.name,
      fname: form.fname || '',
      lname: form.lname || '',
      roleOrPosition: form.positions?.label || form.roleOrPosition,
      email: form.email,
      avatar: form.avatar,
      department: form.departments?.department_name || form.department,
      branch: form.branches?.branch_name || form.branch,
      bio: form.bio,
      signature: form.signature,
      employeeId: form.employeeId,
    };
  };

  const [formData, setFormData] = useState<ProfileFormData>(() => profileToFormData(profile));
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [isPasswordSaved, setIsPasswordSaved] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [branches, setBranches] = useState<{value: string | number, label: string}[]>([]);
  const [positions, setPositions] = useState<{value: string | number, label: string}[]>([]);
  const [departments, setDepartments] = useState<{value: string | number, label: string}[]>([]);
  const { success } = useToast();

  // Format employee ID as 10-digit number with dash (e.g., 1234-567890)
  const formatEmployeeId = (employeeId: number | undefined): string => {
    if (!employeeId) return '';
    // Convert to string and pad to 10 digits if needed
    const idString = employeeId.toString().padStart(10, '0');
    // Format as 1234-567890 (4 digits, dash, 6 digits)
    if (idString.length >= 10) {
      return `${idString.slice(0, 4)}-${idString.slice(4, 10)}`;
    }
    return idString;
  };

  // Reset form data when profile changes (but only if options are already loaded)
  useEffect(() => {
    if (positions.length > 0 && departments.length > 0 && branches.length > 0) {
      const newFormData = profileToFormData(profile, { positions, departments, branches });
      // Reset password fields when profile changes
      setFormData({
        ...newFormData,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } else {
      // If options aren't loaded yet, just update basic fields
      // Use fname/lname if available, otherwise split name
      let fname = '';
      let lname = '';
      if ((profile as any).fname || (profile as any).lname) {
        fname = (profile as any).fname || '';
        lname = (profile as any).lname || '';
      } else {
        const nameParts = profile.name?.split(' ') || [];
        fname = nameParts[0] || '';
        lname = nameParts.slice(1).join(' ') || '';
      }
      setFormData(prev => ({
        ...prev,
        ...profile,
        fname: fname,
        lname: lname,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
    }
    setErrors({});
    setShowPasswords({ current: false, new: false, confirm: false });
    setIsPasswordOpen(false);
    setIsPasswordSaved(false);
  }, [profile]);

  // Load branches, positions, and departments data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [branchesData, positionsData, departmentsData] = await Promise.all([
          apiService.getBranches(),
          apiService.getPositions(),
          apiService.getDepartments()
        ]);
        // Convert from {id, name} to {value, label} format for Combobox
        const branchesOptions = branchesData.map((b) => ({ value: b.id, label: b.name }));
        const positionsOptions = positionsData.map((p) => ({ value: p.id, label: p.name }));
        const departmentsOptions = departmentsData.map((d) => ({ value: d.id, label: d.name }));
        
        setBranches(branchesOptions);
        setPositions(positionsOptions);
        setDepartments(departmentsOptions);
        
        // Update formData with matched values once options are loaded
        const updatedFormData = profileToFormData(profile, {
          positions: positionsOptions,
          departments: departmentsOptions,
          branches: branchesOptions
        });
        setFormData(updatedFormData);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    loadData();
  }, [profile]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const fname = formData.fname?.trim() || '';
    const lname = formData.lname?.trim() || '';
    const fullName = `${fname} ${lname}`.trim();

    if (!fname || !lname) {
      newErrors.name = 'First and last name are required';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (fullName.length < 2) {
      newErrors.name = 'Name must be at least 2 characters long';
    }

    // Password validation - only validate if any password field is filled
    const hasAnyPassword = formData.currentPassword || formData.newPassword || formData.confirmPassword;
    if (hasAnyPassword) {
      if (!formData.currentPassword?.trim()) {
        newErrors.currentPassword = 'Current password is required';
      }
      
      if (!formData.newPassword?.trim()) {
        newErrors.newPassword = 'New password is required';
      } else if (formData.newPassword.length < 8) {
        newErrors.newPassword = 'New password must be at least 8 characters long';
      }
      
      if (!formData.confirmPassword?.trim()) {
        newErrors.confirmPassword = 'Please confirm your new password';
      } else if (formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = useCallback((field: keyof ProfileFormData, value: string | null) => {
    // Update form data - React 18+ batches these automatically
    setFormData(prev => {
      const updated = { ...prev, [field]: value || '' };
      // Debug signature updates
      if (field === 'signature') {
        console.log('✍️ Signature updated:', {
          hasValue: !!value,
          valueLength: value?.length || 0,
          isBase64: value?.startsWith('data:image') || false,
        });
      }
      return updated;
    });
    
    // Reset password saved flag if user starts typing in password fields
    if (field === 'currentPassword' || field === 'newPassword' || field === 'confirmPassword') {
      setIsPasswordSaved(false);
    }
    
    // Clear error for this field if it exists - optimized to minimize re-renders
    setErrors(prev => {
      if (!prev[field]) {
        return prev; // Return same reference if no error to clear
      }
      const newErrors = { ...prev };
      delete newErrors[field];
      return Object.keys(newErrors).length > 0 ? newErrors : {};
    });
  }, []);

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setErrors(prev => ({ ...prev, avatar: 'File size must be less than 5MB' }));
        return;
      }

      try {
        setIsLoading(true);
        // Pass File directly to uploadProfileImage
        const imageUrl = await uploadProfileImage(file);
        setFormData(prev => ({ ...prev, avatar: imageUrl }));
        setErrors(prev => ({ ...prev, avatar: '' }));
      } catch (error) {
        console.error('Error uploading image:', error);
        setErrors(prev => ({ ...prev, avatar: 'Failed to upload image. Please try again.' }));
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Separate handler for saving password only
  const handleSavePassword = async () => {
    // Validate password fields
    const passwordErrors: Record<string, string> = {};
    
    if (!formData.currentPassword?.trim()) {
      passwordErrors.currentPassword = 'Current password is required';
    }
    
    if (!formData.newPassword?.trim()) {
      passwordErrors.newPassword = 'New password is required';
    } else if (formData.newPassword.length < 8) {
      passwordErrors.newPassword = 'New password must be at least 8 characters long';
    }
    
    if (!formData.confirmPassword?.trim()) {
      passwordErrors.confirmPassword = 'Please confirm your new password';
    } else if (formData.newPassword !== formData.confirmPassword) {
      passwordErrors.confirmPassword = 'Passwords do not match';
    }

    // If there are password errors, set them and return
    if (Object.keys(passwordErrors).length > 0) {
      setErrors(prev => ({ ...prev, ...passwordErrors }));
      return;
    }

    // Clear any previous password errors
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.currentPassword;
      delete newErrors.newPassword;
      delete newErrors.confirmPassword;
      delete newErrors.password;
      return newErrors;
    });

    setIsLoading(true);
    try {
      if (!formData.id) {
        throw new Error('User ID is required');
      }

      // Create FormData for password change
      const passwordFormData = new FormData();
      passwordFormData.append('current_password', formData.currentPassword || '');
      passwordFormData.append('new_password', formData.newPassword || '');
      passwordFormData.append('password_confirmation', formData.confirmPassword || '');
      
      // Update password using the authenticated user endpoint
      await apiService.updateEmployee_auth(passwordFormData);

      // Clear password fields after successful save
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));

      // Reset password visibility
      setShowPasswords({ current: false, new: false, confirm: false });

      // Mark password as saved to prevent duplicate saves
      setIsPasswordSaved(true);

      // Show success toast
      success('Password updated successfully!');
    } catch (error: any) {
      console.error('Error updating password:', error);
      const errorMessage = error?.message || error?.response?.data?.message || 'Failed to update password. Please check your current password.';
      setErrors(prev => ({ ...prev, password: errorMessage }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      // Add a small delay to show the loading animation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Handle password change separately if password fields are filled and not already saved
      const hasPasswordChange = (formData.currentPassword || formData.newPassword || formData.confirmPassword) && !isPasswordSaved;
      
      if (hasPasswordChange && formData.id) {
        try {
          // Create FormData for password change
          const passwordFormData = new FormData();
          passwordFormData.append('current_password', formData.currentPassword || '');
          passwordFormData.append('new_password', formData.newPassword || '');
          passwordFormData.append('password_confirmation', formData.confirmPassword || '');
          
          // Update password using the authenticated user endpoint
          await apiService.updateEmployee_auth(passwordFormData);
        } catch (error: any) {
          console.error('Error updating password:', error);
          const errorMessage = error?.message || error?.response?.data?.message || 'Failed to update password. Please check your current password.';
          setErrors(prev => ({ ...prev, password: errorMessage }));
          setIsLoading(false);
          return;
        }
      }
      
      // Note: Old avatar deletion is handled by the backend
      // No need to delete client-side when using API

      // Create FormData to send profile updates to API (including signature)
      if (formData.id) {
        const profileFormData = new FormData();
        
        // Add basic profile fields
        if (formData.fname) profileFormData.append('fname', formData.fname);
        if (formData.lname) profileFormData.append('lname', formData.lname);
        if (formData.email) profileFormData.append('email', formData.email);
        if (formData.bio !== undefined) profileFormData.append('bio', formData.bio || '');
        
        // Handle avatar - if it's a URL string, append it; if it's a File, append the file
        if (formData.avatar) {
          const avatarValue = formData.avatar as any;
          if (avatarValue instanceof File) {
            profileFormData.append('avatar', avatarValue);
          } else if (typeof avatarValue === 'string') {
            profileFormData.append('avatar', avatarValue);
          }
        }
        
        // Add signature (important: must ALWAYS be included)
        // Signature is a base64 data URL string from SignaturePad (e.g., "data:image/png;base64,...")
        // Always send signature field, even if empty, to ensure it's saved/cleared properly
        const signatureValue = formData.signature || '';
        profileFormData.append('signature', signatureValue);
        
        console.log('✍️ Signature being sent:', {
          hasSignature: !!signatureValue && signatureValue.length > 0,
          signatureLength: signatureValue.length,
          signatureType: signatureValue.startsWith('data:image') ? 'base64-data-url' : 'empty',
          signaturePreview: signatureValue.length > 0 ? signatureValue.substring(0, 60) + '...' : 'empty',
        });
        
        // Add position, department, and branch IDs
        if (formData.positions?.value) {
          profileFormData.append('position_id', formData.positions.value.toString());
        }
        if (formData.departments?.value) {
          profileFormData.append('department_id', formData.departments.value.toString());
        }
        if (formData.branches?.value) {
          profileFormData.append('branch_id', formData.branches.value.toString());
        }
        
        // Debug: Log what we're sending
        console.log('📤 Sending profile update to API:', {
          fname: formData.fname,
          lname: formData.lname,
          email: formData.email,
          hasSignature: !!formData.signature && formData.signature.length > 0,
          signatureLength: formData.signature?.length || 0,
          signatureInFormData: profileFormData.has('signature'),
          position_id: formData.positions?.value,
          department_id: formData.departments?.value,
          branch_id: formData.branches?.value,
        });
        
        // Debug: Log FormData contents to verify signature is included
        console.log('📦 FormData entries:');
        for (const [key, value] of profileFormData.entries()) {
          if (key === 'signature') {
            const sigValue = value as string;
            console.log(`  ${key}:`, {
              type: typeof sigValue,
              length: sigValue?.length || 0,
              preview: sigValue?.substring(0, 60) || 'empty',
              isBase64: sigValue?.startsWith('data:image') || false,
            });
          } else {
            const valStr = typeof value === 'string' ? value : String(value);
            console.log(`  ${key}:`, valStr.length > 100 ? valStr.substring(0, 50) + '...' : valStr);
          }
        }
        
        // Send profile update to API
        try {
          const response = await apiService.updateEmployee_auth(profileFormData);
          console.log('✅ Profile update API response:', response);
          
          // IMPORTANT: Wait a moment for backend to process, then verify signature was saved
          // The backend might need a moment to persist the signature
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (apiError: any) {
          console.error('❌ Profile update API error:', {
            error: apiError,
            message: apiError?.message,
            response: apiError?.response?.data,
            status: apiError?.status,
          });
          throw apiError;
        }
      }
      
      // Convert form data back to UserProfile format (excluding password fields)
      const updatedProfile = formDataToProfile(formData);
      
      // Call onSave with converted profile (for parent component updates)
      // This will trigger refreshUser() in DashboardShell
      await onSave(updatedProfile);
      
      // Additional verification: Check if signature is in the updated profile
      console.log('🔍 Updated profile signature check:', {
        hasSignature: !!updatedProfile.signature,
        signatureLength: updatedProfile.signature?.length || 0,
      });
      
      // Clear password fields after successful save
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
      
      // Show success toast
      success(hasPasswordChange ? 'Profile and password updated successfully!' : 'Profile updated successfully!');
      onClose();
    } catch (error) {
      console.error('Error saving profile:', error);
      setErrors(prev => ({ ...prev, general: 'Failed to save profile. Please try again.' }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData(profileToFormData(profile)); // Reset to original data
    setErrors({});
    setShowPasswords({ current: false, new: false, confirm: false });
    setIsPasswordOpen(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChangeAction={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto px-6 py-6 animate-popup">
        <DialogHeader className="px-1 ">
        <DialogTitle className="flex items-center gap-2 text-xl bg-blue-200 px-3 py-2 rounded-lg">
            <User className="w-5 h-5" />
            Edit Profile
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 px-0">
          {/* Avatar Section */}
          <div className="flex flex-col mt-7 items-center space-y-4">
            <div className="relative">
              <div className="h-24 w-24 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-2xl">
                {formData.avatar ? (
                  <img 
                    src={formData.avatar} 
                    alt={formData.name || `${formData.fname} ${formData.lname}`} 
                    className="h-24 w-24 rounded-full object-cover"
                  />
                ) : (
                  `${formData.fname?.[0] || formData.name?.[0] || ''}${formData.lname?.[0] || formData.name?.split(' ')[1]?.[0] || ''}`.toUpperCase()
                )}
              </div>
              <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition-colors">
                <Camera className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </label>
            </div>
            {errors.avatar && (
              <p className="text-sm text-red-600">{errors.avatar}</p>
            )}
            <p className="text-sm text-gray-500 text-center">
              Click the camera icon to change your profile picture
            </p>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-10">
            {/* Employee ID - Read Only */}
            {formData.employeeId && (
              <div className="space-y-1.5">
                <Label htmlFor="employeeId" className="text-sm font-medium">
                  Employee ID
                </Label>
                <Input
                  id="employeeId"
                  value={formatEmployeeId(formData.employeeId)}
                  disabled
                  readOnly
                  className="bg-gray-100 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500">
                  Your employee ID assigned during registration
                </p>
              </div>
            )}

            {/* First Name */}
            <div className="space-y-1.5">
              <Label htmlFor="fname" className="text-sm font-medium">
                First Name *
              </Label>
              <Input
                id="fname"
                value={formData.fname}
                onChange={(e) => handleInputChange('fname', e.target.value)}
                placeholder="Enter your first name"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            {/* Last Name */}
            <div className="space-y-1.5">
              <Label htmlFor="lname" className="text-sm font-medium">
                Last Name *
              </Label>
              <Input
                id="lname"
                value={formData.lname}
                onChange={(e) => handleInputChange('lname', e.target.value)}
                placeholder="Enter your last name"
                className={errors.name ? 'border-red-500' : ''}
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ''}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Enter your email address"
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email}</p>
              )}
            </div>
          </div>

          {/* Password Change Section - Collapsible */}
          <Collapsible open={isPasswordOpen} onOpenChange={setIsPasswordOpen} className="pt-4 border-t">
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex items-center justify-between w-full text-left space-y-2 hover:bg-gray-50 p-2 rounded-lg transition-colors"
              >
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-gray-700">Change Password</h3>
                  <p className="text-xs text-gray-500">Click to expand and change your password</p>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${
                    isPasswordOpen ? 'transform rotate-180' : ''
                  }`}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                {/* Current Password */}
                <div className="space-y-1.5 w-1/2">
                  <Label htmlFor="currentPassword" className="text-sm font-medium">
                    Current Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showPasswords.current ? 'text' : 'password'}
                      value={formData.currentPassword || ''}
                      onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                      placeholder="Enter your current password"
                      className={errors.currentPassword ? 'border-red-500 pr-10' : 'pr-10'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPasswords.current ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {errors.currentPassword && (
                    <p className="text-sm text-red-600">{errors.currentPassword}</p>
                  )}
                </div>

                {/* New Password */}
                <div className="space-y-1.5 w-1/2">
                  <Label htmlFor="newPassword" className="text-sm font-medium">
                    New Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPasswords.new ? 'text' : 'password'}
                      value={formData.newPassword || ''}
                      onChange={(e) => handleInputChange('newPassword', e.target.value)}
                      placeholder="Enter your new password"
                      className={errors.newPassword ? 'border-red-500 pr-10' : 'pr-10'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPasswords.new ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {errors.newPassword && (
                    <p className="text-sm text-red-600">{errors.newPassword}</p>
                  )}
                  <p className="text-xs text-gray-500">Must be at least 8 characters long</p>
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5 w-1/2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium">
                    Confirm New Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={formData.confirmPassword || ''}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      placeholder="Confirm your new password"
                      className={errors.confirmPassword ? 'border-red-500 pr-10' : 'pr-10'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPasswords.confirm ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-sm text-red-600">{errors.confirmPassword}</p>
                  )}
                </div>
              </div>
              {errors.password && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{errors.password}</p>
                </div>
              )}
              
              {/* Save Password Button */}
              <div className="flex justify-end pt-2 border-t">
                <Button
                  type="button"
                  onClick={handleSavePassword}
                  disabled={isLoading || !formData.currentPassword || !formData.newPassword || !formData.confirmPassword}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                >
                  {isLoading ? (
                    <>
                      <LoadingAnimation size="sm" variant="spinner" color="white" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Password</span>
                    </>
                  )}
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Role/Position */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            <div className="space-y-1.5">
              <Label htmlFor="position" className="text-sm font-medium">
                Role/Position
              </Label>
              <Select
                value={formData.positions?.value?.toString() || ''}
                onValueChange={(value) => {
                  const selectedPosition = positions.find(p => p.value.toString() === value);
                  if (selectedPosition) {
                    setFormData(prev => ({
                      ...prev,
                      positions: { value: selectedPosition.value, label: selectedPosition.label }
                    }));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your position" />
                </SelectTrigger>
                <SelectContent>
                  {positions.map((position) => (
                    <SelectItem key={position.value.toString()} value={position.value.toString()}>
                      {position.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Department */}
            <div className="space-y-1.5">
              <Label htmlFor="department" className="text-sm font-medium">
                Department
              </Label>
              <Select
                value={formData.departments?.value?.toString() || ''}
                onValueChange={(value) => {
                  const selectedDept = departments.find(d => d.value.toString() === value);
                  if (selectedDept) {
                    setFormData(prev => ({
                      ...prev,
                      departments: { value: selectedDept.value, department_name: selectedDept.label }
                    }));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.value.toString()} value={dept.value.toString()}>
                      {dept.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Branch */}
            <div className="space-y-1.5">
              <Label htmlFor="branch" className="text-sm font-medium">
                Branch
              </Label>
              <Select
                value={formData.branches?.value?.toString() || ''}
                onValueChange={(value) => {
                  const selectedBranch = branches.find(b => b.value.toString() === value);
                  if (selectedBranch) {
                    setFormData(prev => ({
                      ...prev,
                      branches: { value: selectedBranch.value, branch_name: selectedBranch.label }
                    }));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.value.toString()} value={branch.value.toString()}>
                      {branch.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Additional Information */}
          <div className="space-y-2">
            <Label htmlFor="bio" className="text-sm font-medium">
              Bio/About Me
            </Label>
            <Textarea
              id="bio"
              value={formData.bio || ''}
              onChange={(e) => handleInputChange('bio', e.target.value)}
              placeholder="Tell us a bit about yourself..."
              rows={3}
            />
          </div>

          {/* Digital Signature */}
          <div className="space-y-2">
            <Label htmlFor="signature" className="text-sm font-medium">
              Digital Signature
            </Label>
            <SignaturePad
              value={formData.signature || ''}
              onChangeAction={(signature) => handleInputChange('signature', signature)}
              className="w-full"
              required={false}
              hasError={false}
            />
            <p className="text-sm text-gray-500">
              Update your digital signature for official documents and approvals.
            </p>
          </div>

          {/* General Error */}
          {errors.general && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{errors.general}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 hover:text-white text-white"
            >
              <X className="w-5 h-5 text-white" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                <>
                  <LoadingAnimation size="sm" variant="spinner" color="white" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
