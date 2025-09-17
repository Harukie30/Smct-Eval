import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UserProfile } from './ProfileCard';
import { User, Camera, Save, X } from 'lucide-react';
import { uploadProfileImage, deleteProfileImage } from '@/lib/imageUpload';
// Removed profileService import - we'll use UserContext directly
import SignaturePad from '@/components/SignaturePad';

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
  const [formData, setFormData] = useState<UserProfile>(profile);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form data when profile changes
  useEffect(() => {
    setFormData(profile);
    setErrors({});
  }, [profile]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters long';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof UserProfile, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setErrors(prev => ({ ...prev, avatar: 'File size must be less than 5MB' }));
        return;
      }

      try {
        setIsLoading(true);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      // If avatar changed and old avatar exists, delete the old one
      if (formData.avatar !== profile.avatar && profile.avatar && !profile.avatar.startsWith('data:')) {
        try {
          await deleteProfileImage(profile.avatar);
        } catch (error) {
          console.warn('Failed to delete old avatar:', error);
        }
      }

      // Call onSave directly - this will update the UserContext and localStorage
      await onSave(formData);
      
      onClose();
    } catch (error) {
      console.error('Error saving profile:', error);
      setErrors(prev => ({ ...prev, general: 'Failed to save profile. Please try again.' }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData(profile); // Reset to original data
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChangeAction={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto px-6 py-6">
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
                    alt={formData.name} 
                    className="h-24 w-24 rounded-full object-cover"
                  />
                ) : (
                  formData.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
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
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm font-medium">
                Full Name *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter your full name"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name}</p>
              )}
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

            {/* Role/Position */}
            <div className="space-y-1.5">
              <Label htmlFor="roleOrPosition" className="text-sm font-medium">
                Role/Position
              </Label>
              <Input
                id="roleOrPosition"
                value={formData.roleOrPosition || ''}
                onChange={(e) => handleInputChange('roleOrPosition', e.target.value)}
                placeholder="e.g., Senior Developer, Manager"
              />
            </div>

            {/* Department */}
            <div className="space-y-1.5">
              <Label htmlFor="department" className="text-sm font-medium">
                Department
              </Label>
              <Input
                id="department"
                value={formData.department || ''}
                onChange={(e) => handleInputChange('department', e.target.value)}
                placeholder="e.g., Engineering, HR, Sales"
              />
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
              className="flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Save className="w-4 h-4" />
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
