import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserProfile } from "./ProfileCard";
import { User, Save, X, Eye, EyeOff } from "lucide-react";
// Removed profileService import - we'll use UserContext directly
import SignaturePad from "@/components/SignaturePad";
import { useToast } from "@/hooks/useToast";
import LoadingAnimation from "@/components/LoadingAnimation";
import apiService from "@/lib/apiService";
import { dataURLtoFile } from "../utils/data-url-to-file";

import { useAuth } from "@/contexts/UserContext";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile | null;
  onSave: (updatedProfile: UserProfile | null) => void;
}

interface Account {
  username?: string;
  email?: string;
  current_password?: string;
  new_password?: string;
  confirm_password?: string;
  signature?: string | null;
}

export default function ProfileModal({
  isOpen,
  onClose,
  profile,
  onSave,
}: ProfileModalProps) {
  // Format employee ID as 10-digit number with dash (e.g., 1234-567890)
  const formatEmployeeId = (
    employeeId: string | number | undefined
  ): string => {
    if (!employeeId) return "N/A";

    // Convert to string
    let idString = String(employeeId);

    // If it already has a dash, return as is
    if (idString.includes("-")) {
      return idString;
    }

    // Remove any non-numeric characters
    idString = idString.replace(/\D/g, "");

    // Pad to 10 digits if needed
    if (idString.length < 10) {
      idString = idString.padStart(10, "0");
    }

    // Format as 1234-567890 (4 digits, dash, 6 digits)
    if (idString.length >= 10) {
      return `${idString.slice(0, 4)}-${idString.slice(4, 10)}`;
    }

    return idString;
  };

  const [formData, setFormData] = useState<Account | null>({
    username: "",
    email: "",
    current_password: "",
    new_password: "",
    confirm_password: "",
    signature: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { success } = useToast();
  const { refreshUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [isSignatureSaved, setIsSignatureSaved] = useState(false); // Track if signature is saved
  const [hasApprovedReset, setHasApprovedReset] = useState(false); // Track if user has approved reset request
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Reset form data when profile changes
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      username: profile?.username,
      email: profile?.email,
      // Only update signature from profile if formData doesn't have a local change (data URL)
      signature:
        prev?.signature &&
        typeof prev.signature === "string" &&
        prev.signature.startsWith("data:")
          ? prev.signature
          : profile?.signature || null,
    }));

    // Determine if signature is saved:
    // - If profile has signature AND formData doesn't have a new data URL, it's saved
    // - If formData has a data URL (starts with 'data:'), it's a newly drawn signature - not saved yet
    const hasProfileSignature = !!(
      profile?.signature && profile.signature !== ""
    );
    const hasFormDataDataURL =
      formData?.signature &&
      typeof formData.signature === "string" &&
      formData.signature.startsWith("data:");

    if (hasProfileSignature && !hasFormDataDataURL) {
      // Profile has signature and formData doesn't have a new data URL - signature is saved
      setIsSignatureSaved(true);
    } else if (hasFormDataDataURL) {
      // FormData has a data URL - this is a newly drawn signature, not saved yet
      setIsSignatureSaved(false);
    } else if (!hasProfileSignature) {
      // No profile signature - signature is not saved (or was deleted)
      setIsSignatureSaved(false);
    }

    // Check if user has an approved signature reset request
    // This would typically come from the profile or a separate API call
    // For now, we'll check if approvedSignatureReset is 1 (approved)
    const approvedReset =
      (profile as any)?.approvedSignatureReset === 1 ||
      (profile as any)?.approvedSignatureReset === true;
    setHasApprovedReset(approvedReset);
  }, []);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Require current password if username or email has changed
    const usernameChanged = formData?.username !== profile?.username;
    const emailChanged = formData?.email !== profile?.email;
    if ((usernameChanged || emailChanged) && !formData?.current_password) {
      newErrors.current_password =
        "Current password is required to change username or email";
    }

    if (
      formData?.current_password &&
      String(formData?.current_password).length < 8
    ) {
      newErrors.current_password = "Password must be at least 8 characters";
    } else if (
      formData?.current_password &&
      !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.current_password)
    ) {
      newErrors.current_password =
        "Password must contain uppercase, lowercase, and number";
    }

    if (formData?.new_password && String(formData?.new_password).length < 8) {
      newErrors.new_password = "Password must be at least 8 characters";
    } else if (
      formData?.new_password &&
      !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.new_password)
    ) {
      newErrors.new_password =
        "Password must contain uppercase, lowercase, and number";
    }

    if (
      formData?.confirm_password &&
      String(formData?.confirm_password).length < 8
    ) {
      newErrors.confirm_password = "Password must be at least 8 characters";
    } else if (
      formData?.confirm_password &&
      !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.confirm_password)
    ) {
      newErrors.confirm_password =
        "Password must contain uppercase, lowercase, and number";
    }

    if (
      formData?.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData?.email)
    ) {
      newErrors.email = "Please enter a valid email address";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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

      const formDataToUpload = new FormData();
      formDataToUpload.append("username", formData?.username || "");
      formDataToUpload.append("email", formData?.email || "");
      formDataToUpload.append(
        "current_password",
        formData?.current_password || ""
      );
      formDataToUpload.append("new_password", formData?.new_password || "");
      formDataToUpload.append(
        "confirm_password",
        formData?.confirm_password || ""
      );

      // Handle signature: if null or empty, send empty string to delete it from server
      // If it's a data URL, convert to file and upload
      if (
        formData?.signature &&
        formData?.signature !== "" &&
        formData?.signature !== null
      ) {
        const signature = dataURLtoFile(formData.signature, "signature.png");
        if (signature) {
          formDataToUpload.append("signature", signature);
        }
      } else if (formData?.signature === null || formData?.signature === "") {
        // Explicitly send empty string to delete signature from server
        formDataToUpload.append("signature", "");
      }

      await apiService.updateEmployee_auth(formDataToUpload);

      // If signature was included in the save, mark it as saved and update formData
      if (
        formData?.signature &&
        formData?.signature !== "" &&
        formData?.signature !== null
      ) {
        // Update formData to use profile signature (remove data URL) so useEffect detects it as saved
        setFormData((prev) => ({
          ...prev,
          signature: profile?.signature || prev?.signature, // Use profile signature if available, otherwise keep current
        }));
        setIsSignatureSaved(true);
        setHasApprovedReset(false); // Reset approval status after saving new signature
      } else if (formData?.signature === null || formData?.signature === "") {
        // Signature was deleted
        setFormData((prev) => ({
          ...prev,
          signature: null,
        }));
        setIsSignatureSaved(false);
        setHasApprovedReset(false); // Reset approval status after clearing signature
      }

      // Show success toast
      success("Profile updated successfully!");

      // Refresh user profile to get updated data
      refreshUser();

      // Close modal after a brief delay to ensure state is updated
    } catch (error: any) {
      if (error.response?.data?.errors) {
        const backendErrors: Record<string, string> = {};

        Object.keys(error.response.data.errors).forEach((field) => {
          backendErrors[field] = error.response.data.errors[field][0];
        });
        setErrors(backendErrors);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData(null); // Reset to original data
    setErrors({});
    onClose();
  };

  const handleRequestReset = async () => {
    try {
      setIsLoading(true);
      await apiService.requestSignatureReset();
      // After successful reset request, wait for admin approval
      // Don't enable Clear Signature yet - user must wait for approval
      setHasApprovedReset(false); // Reset to false until approved
      success(
        "Signature reset request submitted successfully! Please wait for admin approval. You will be able to clear your signature once approved."
      );
    } catch (error: any) {
      console.error("Error requesting signature reset:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Failed to request signature reset. Please try again.";
      setErrors((prev) => ({
        ...prev,
        general: errorMessage,
      }));
    } finally {
      setIsLoading(false);
    }
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
              <div className="h-24 w-24 rounded-full bg-blue-600 flex items-center justify-center overflow-hidden">
                <img
                  src="/user.png"
                  alt={profile?.fname || "Profile"}
                  className="h-24 w-24 rounded-full object-cover"
                />
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-600 mt-10">
              This fields is read only :
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              {/* Name */}
              <div className="space-y-1.5">
                <Label htmlFor="fname" className="text-sm font-medium">
                  First Name
                </Label>
                <Input id="fname" value={profile?.fname} readOnly />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lname" className="text-sm font-medium">
                  Last Name
                </Label>
                <Input id="lname" value={profile?.lname} readOnly />
              </div>

              {/* Contact */}
              <div className="space-y-1.5">
                <Label htmlFor="contact" className="text-sm font-medium">
                  Contact
                </Label>
                <Input
                  id="contact"
                  type="number"
                  value={profile?.contact || ""}
                  readOnly
                />
              </div>

              {/* Employee ID */}
              <div className="space-y-1.5">
                <Label htmlFor="employeeId" className="text-sm font-medium">
                  Employee ID
                </Label>
                <Input
                  id="employeeId"
                  value={formatEmployeeId(
                    profile?.emp_id ||
                      (profile as any)?.employeeId ||
                      (profile as any)?.employee_id
                  )}
                  readOnly
                />
              </div>

              {/* Role/Position */}
              {profile?.roles[0].name !== "admin" && (
                <>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="roleOrPosition"
                      className="text-sm font-medium"
                    >
                      Position
                    </Label>
                    <Input
                      value={profile?.positions?.label || "Not Assigned "}
                      readOnly
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="department" className="text-sm font-medium">
                      Department
                    </Label>
                    <Input
                      value={
                        profile?.departments?.department_name || "Not Assigned "
                      }
                      readOnly
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="branch" className="text-sm font-medium">
                      Branch
                    </Label>
                    <Input
                      value={
                        profile?.branches[0]?.branch_name || "Not Assigned "
                      }
                      readOnly
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          <div>
            <p
              className="text-sm text-blue-700 mt-10 cursor-pointer"
              onClick={() => setOpen(!open)}
            >
              Edit Account Settings ...
            </p>

            <div
              className={`${
                open ? "max-h-[30vh]" : "max-h-0"
              } overflow-hidden transition-all duration-400 mt-2`}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Username */}
                <div className="space-y-1.5">
                  <Label htmlFor="username" className="text-sm font-medium">
                    Username
                  </Label>
                  <Input
                    id="username"
                    value={formData?.username || ""}
                    readOnly
                  />
                  {errors.username && (
                    <p className="text-sm text-red-500">{errors.username}</p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email Address
                  </Label>
                  <Input id="email" value={formData?.email || ""} readOnly />
                  {errors.email && (
                    <p className="text-sm text-red-500">{errors.email}</p>
                  )}
                </div>

                {/* Current Password */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">
                    Current Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="current_password"
                      type={showCurrentPassword ? "text" : "password"}
                      placeholder="******"
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          current_password: e.target.value,
                        })
                      }
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowCurrentPassword(!showCurrentPassword)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                      aria-label={
                        showCurrentPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {errors.current_password && (
                    <p className="text-sm text-red-500">
                      {errors.current_password}
                    </p>
                  )}
                </div>

                {/* New Password */}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new_password"
                      type={showNewPassword ? "text" : "password"}
                      placeholder="******"
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          new_password: e.target.value,
                        })
                      }
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                      aria-label={
                        showNewPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {errors.new_password && (
                    <p className="text-sm text-red-500">
                      {errors.new_password}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirm_password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="******"
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          confirm_password: e.target.value,
                        })
                      }
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                      aria-label={
                        showConfirmPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {errors.confirm_password && (
                    <p className="text-sm text-red-500">
                      {errors.confirm_password}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Digital Signature */}
          <Label htmlFor="signature" className="text-sm font-medium">
            Digital Signature{" "}
          </Label>
          <div className="space-y-2">
            <SignaturePad
              value={profile?.signature || formData?.signature || null}
              onChangeAction={(signature) => {
                // If signature is null, permanently delete it
                if (signature === null) {
                  setFormData({ ...formData, signature: null });
                  setIsSignatureSaved(false);
                  setHasApprovedReset(false); // Reset approval status after clearing
                } else {
                  setFormData({ ...formData, signature });
                  setIsSignatureSaved(false); // New signature drawn, not saved yet
                }
              }}
              className="w-full"
              required={true}
              hasError={false}
              onRequestReset={handleRequestReset}
              isSaved={isSignatureSaved && !hasApprovedReset} // Disable if saved AND no approved reset
            />
            {errors.signature && (
              <p className="text-sm text-red-500">{errors.signature}</p>
            )}
          </div>
          <p className="text-sm text-gray-500">
            Update your digital signature for official documents and approvals.
          </p>

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
              onClick={handleSubmit}
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
