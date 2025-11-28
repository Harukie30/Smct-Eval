import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserProfile } from "./ProfileCard";
import { User, Camera, Save, X } from "lucide-react";
import { uploadProfileImage } from "@/lib/imageUpload";
// Removed profileService import - we'll use UserContext directly
import SignaturePad from "@/components/SignaturePad";
import { useToast } from "@/hooks/useToast";
import LoadingAnimation from "@/components/LoadingAnimation";
import { apiService } from "@/lib/apiService";

// Extended form data type for editing
type ProfileFormData = UserProfile & {
  fname?: string;
  lname?: string;
  positions?: { value: string | number; label: string };
  departments?: { value: string | number; department_name: string };
  branches?: { value: string | number; branch_name: string };
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
  const profileToFormData = (
    prof: UserProfile,
    options?: {
      positions?: { value: string | number; label: string }[];
      departments?: { value: string | number; label: string }[];
      branches?: { value: string | number; label: string }[];
    }
  ): ProfileFormData => {
    const nameParts = prof.name?.split(" ") || [];
    const fname = nameParts[0] || "";
    const lname = nameParts.slice(1).join(" ") || "";

    // Find matching position
    let positionObj = undefined;
    if (prof.roleOrPosition && options?.positions) {
      const matched = options.positions.find(
        (p) => p.label === prof.roleOrPosition
      );
      if (matched) {
        positionObj = { value: matched.value, label: matched.label };
      } else {
        positionObj = { value: "", label: prof.roleOrPosition };
      }
    }

    // Find matching department
    let deptObj = undefined;
    if (prof.department && options?.departments) {
      const matched = options.departments.find(
        (d) => d.label === prof.department
      );
      if (matched) {
        deptObj = { value: matched.value, department_name: matched.label };
      } else {
        deptObj = { value: "", department_name: prof.department };
      }
    }

    // Find matching branch
    let branchObj = undefined;
    if (prof.branch && options?.branches) {
      const matched = options.branches.find((b) => b.label === prof.branch);
      if (matched) {
        branchObj = { value: matched.value, branch_name: matched.label };
      } else {
        branchObj = { value: "", branch_name: prof.branch };
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
  const formDataToProfile = (form: ProfileFormData): UserProfile => {
    return {
      id: form.id,
      name: `${form.fname || ""} ${form.lname || ""}`.trim() || form.name,
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

  const [formData, setFormData] = useState<ProfileFormData>(() =>
    profileToFormData(profile)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [branches, setBranches] = useState<
    { value: string | number; label: string }[]
  >([]);
  const [positions, setPositions] = useState<
    { value: string | number; label: string }[]
  >([]);
  const [departments, setDepartments] = useState<
    { value: string | number; label: string }[]
  >([]);
  const { success } = useToast();

  // Format employee ID as 10-digit number with dash (e.g., 1234-567890)
  const formatEmployeeId = (employeeId: number | undefined): string => {
    if (!employeeId) return "";
    // Convert to string and pad to 10 digits if needed
    const idString = employeeId.toString().padStart(10, "0");
    // Format as 1234-567890 (4 digits, dash, 6 digits)
    if (idString.length >= 10) {
      return `${idString.slice(0, 4)}-${idString.slice(4, 10)}`;
    }
    return idString;
  };

  // Reset form data when profile changes (but only if options are already loaded)
  useEffect(() => {
    if (positions.length > 0 && departments.length > 0 && branches.length > 0) {
      setFormData(
        profileToFormData(profile, { positions, departments, branches })
      );
    } else {
      // If options aren't loaded yet, just update basic fields
      const nameParts = profile.name?.split(" ") || [];
      setFormData((prev) => ({
        ...prev,
        ...profile,
        fname: nameParts[0] || "",
        lname: nameParts.slice(1).join(" ") || "",
      }));
    }
    setErrors({});
  }, [profile]);

  // Load branches, positions, and departments data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [branchesData, positionsData, departmentsData] =
          await Promise.all([
            apiService.getBranches(),
            apiService.getPositions(),
            apiService.getDepartments(),
          ]);
        // Convert from {id, name} to {value, label} format for Combobox
        const branchesOptions = branchesData.map((b) => ({
          value: b.id,
          label: b.name,
        }));
        const positionsOptions = positionsData.map((p) => ({
          value: p.id,
          label: p.name,
        }));
        const departmentsOptions = departmentsData.map((d) => ({
          value: d.id,
          label: d.name,
        }));

        setBranches(branchesOptions);
        setPositions(positionsOptions);
        setDepartments(departmentsOptions);

        // Update formData with matched values once options are loaded
        const updatedFormData = profileToFormData(profile, {
          positions: positionsOptions,
          departments: departmentsOptions,
          branches: branchesOptions,
        });
        setFormData(updatedFormData);
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    loadData();
  }, [profile]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const fname = formData.fname?.trim() || "";
    const lname = formData.lname?.trim() || "";
    const fullName = `${fname} ${lname}`.trim();

    if (!fname || !lname) {
      newErrors.name = "First and last name are required";
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (fullName.length < 2) {
      newErrors.name = "Name must be at least 2 characters long";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof ProfileFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleAvatarChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        setErrors((prev) => ({
          ...prev,
          avatar: "File size must be less than 5MB",
        }));
        return;
      }

      try {
        setIsLoading(true);
        // Pass File directly to uploadProfileImage
        const imageUrl = await uploadProfileImage(file);
        setFormData((prev) => ({ ...prev, avatar: imageUrl }));
        setErrors((prev) => ({ ...prev, avatar: "" }));
      } catch (error) {
        console.error("Error uploading image:", error);
        setErrors((prev) => ({
          ...prev,
          avatar: "Failed to upload image. Please try again.",
        }));
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
      // Add a small delay to show the loading animation
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Note: Old avatar deletion is handled by the backend
      // No need to delete client-side when using API

      // Convert form data back to UserProfile format
      const updatedProfile = formDataToProfile(formData);

      // Call onSave with converted profile
      await onSave(updatedProfile);

      // Show success toast
      success("Profile updated successfully!");
      onClose();
    } catch (error) {
      console.error("Error saving profile:", error);
      setErrors((prev) => ({
        ...prev,
        general: "Failed to save profile. Please try again.",
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData(profileToFormData(profile)); // Reset to original data
    setErrors({});
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
                  `${formData.fname?.[0] || formData.name?.[0] || ""}${
                    formData.lname?.[0] ||
                    formData.name?.split(" ")[1]?.[0] ||
                    ""
                  }`.toUpperCase()
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
                onChange={(e) => handleInputChange("fname", e.target.value)}
                placeholder="Enter your first name"
                className={errors.name ? "border-red-500" : ""}
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
                onChange={(e) => handleInputChange("lname", e.target.value)}
                placeholder="Enter your last name"
                className={errors.name ? "border-red-500" : ""}
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
                value={formData.email || ""}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="Enter your email address"
                className={errors.email ? "border-red-500" : ""}
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            {/* Role/Position */}
            <div className="space-y-1.5">
              <Label htmlFor="position" className="text-sm font-medium">
                Role/Position
              </Label>
              <Select
                value={formData.positions?.value?.toString() || ""}
                onValueChange={(value) => {
                  const selectedPosition = positions.find(
                    (p) => p.value.toString() === value
                  );
                  if (selectedPosition) {
                    setFormData((prev) => ({
                      ...prev,
                      positions: {
                        value: selectedPosition.value,
                        label: selectedPosition.label,
                      },
                    }));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your position" />
                </SelectTrigger>
                <SelectContent>
                  {positions.map((position) => (
                    <SelectItem key={position.value} value={position.label}>
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
                value={formData.departments?.value?.toString() || ""}
                onValueChange={(value) => {
                  const selectedDept = departments.find(
                    (d) => d.value.toString() === value
                  );
                  if (selectedDept) {
                    setFormData((prev) => ({
                      ...prev,
                      departments: {
                        value: selectedDept.value,
                        department_name: selectedDept.label,
                      },
                    }));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.value} value={dept.label}>
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
                value={formData.branches?.branch_name || ""}
                onValueChange={(value) => {
                  const selectedBranch = branches.find(
                    (b) => b.value === value
                  );
                  if (selectedBranch) {
                    setFormData((prev) => ({
                      ...prev,
                      branches: {
                        value: selectedBranch.value,
                        branch_name: selectedBranch.label,
                      },
                    }));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.value} value={branch.label}>
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
              value={formData.bio || ""}
              onChange={(e) => handleInputChange("bio", e.target.value)}
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
              value={formData.signature || ""}
              onChangeAction={(signature) =>
                handleInputChange("signature", signature)
              }
              className="w-full"
              required={false}
              hasError={false}
            />
            <p className="text-sm text-gray-500">
              Update your digital signature for official documents and
              approvals.
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
