import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import LoadingAnimation from "@/components/LoadingAnimation";
import { useToast } from "@/hooks/useToast";
import { apiService } from "@/lib/apiService";
import { useUser } from "@/contexts/UserContext";
import { LazyGif } from "@/components/LazyGif";

interface User {
  id: number;
  name?: string; // Keep for backward compatibility
  fname?: string;
  lname?: string;
  email: string;
  position: string;
  department: string;
  branch: string | number;
  role?: string;
  username?: string;
  password?: string;
  contact?: string;
  hireDate?: string;
  isActive?: boolean;
  signature?: string;
  employeeId?: number;
}

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onSave: (updatedUser: User) => void;
  departments: any;
  branches: any;
  positions: any;
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
  onRefresh,
}) => {
  const [formData, setFormData] = useState<User>({
    id: 0,
    name: "",
    fname: "",
    lname: "",
    email: "",
    position: "",
    department: "",
    branch: "",
    role: "",
    username: "",
    password: "",
    contact: "",
    hireDate: "",
    isActive: true,
    signature: "",
    employeeId: undefined,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  const [isEmployeeIdEditable, setIsEmployeeIdEditable] = useState(false);
  const [employeeIdInput, setEmployeeIdInput] = useState("");
  const { success, error: errorToast } = useToast();
  const { user: currentUser } = useUser();

  // Check if user is admin or HR (handle different role formats)
  const userRole = currentUser?.roles;
  const isAdmin =
    userRole === "admin" ||
    (typeof userRole === "string" && userRole.toLowerCase() === "admin") ||
    (Array.isArray(userRole) &&
      userRole.some(
        (r: any) =>
          (typeof r === "string" ? r.toLowerCase() : r?.name?.toLowerCase()) ===
          "admin"
      ));
  const isHR =
    userRole === "hr" ||
    (typeof userRole === "string" && userRole.toLowerCase() === "hr") ||
    (Array.isArray(userRole) &&
      userRole.some(
        (r: any) =>
          (typeof r === "string" ? r.toLowerCase() : r?.name?.toLowerCase()) ===
          "hr"
      ));
  const canEditEmployeeId = isAdmin || isHR;

  // Debug: Log role check
  useEffect(() => {
    if (isOpen && canEditEmployeeId) {
      console.log("🔐 Employee ID editing enabled for:", {
        userRole,
        isAdmin,
        isHR,
        canEditEmployeeId,
      });
    }
  }, [isOpen, canEditEmployeeId, userRole, isAdmin, isHR]);

  // Lockout management functions
  const getLockoutKey = () => {
    return `admin_password_lockout_${currentUser?.id || "unknown"}`;
  };

  const getAttemptsKey = () => {
    return `admin_password_attempts_${currentUser?.id || "unknown"}`;
  };

  const checkLockoutStatus = (): {
    isLockedOut: boolean;
    lockoutUntil?: Date;
    remainingAttempts?: number;
  } => {
    if (!currentUser?.id) return { isLockedOut: false };

    const lockoutKey = getLockoutKey();
    const attemptsKey = getAttemptsKey();

    if (typeof window === "undefined") return { isLockedOut: false };

    // Check if locked out
    const lockoutData = localStorage.getItem(lockoutKey);
    if (lockoutData) {
      const { lockoutUntil } = JSON.parse(lockoutData);
      const lockoutDate = new Date(lockoutUntil);
      const now = new Date();

      if (now < lockoutDate) {
        // Still locked out
        const hoursRemaining = Math.ceil(
          (lockoutDate.getTime() - now.getTime()) / (1000 * 60 * 60)
        );
        return { isLockedOut: true, lockoutUntil: lockoutDate };
      } else {
        // Lockout expired, clear it
        localStorage.removeItem(lockoutKey);
        localStorage.removeItem(attemptsKey);
      }
    }

    // Get current attempts
    const attemptsData = localStorage.getItem(attemptsKey);
    const attempts = attemptsData ? JSON.parse(attemptsData).count : 0;

    return { isLockedOut: false, remainingAttempts: 3 - attempts };
  };

  const incrementFailedAttempts = () => {
    if (!currentUser?.id || typeof window === "undefined") return;

    const attemptsKey = getAttemptsKey();
    const attemptsData = localStorage.getItem(attemptsKey);
    const attempts = attemptsData ? JSON.parse(attemptsData).count : 0;
    const newAttempts = attempts + 1;

    if (newAttempts >= 3) {
      // Lock out for 1 day (24 hours)
      const lockoutUntil = new Date();
      lockoutUntil.setHours(lockoutUntil.getHours() + 24);

      const lockoutKey = getLockoutKey();
      localStorage.setItem(
        lockoutKey,
        JSON.stringify({ lockoutUntil: lockoutUntil.toISOString() })
      );
      localStorage.removeItem(attemptsKey);
    } else {
      localStorage.setItem(attemptsKey, JSON.stringify({ count: newAttempts }));
    }
  };

  const resetFailedAttempts = () => {
    if (!currentUser?.id || typeof window === "undefined") return;

    const attemptsKey = getAttemptsKey();
    localStorage.removeItem(attemptsKey);
  };

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

  // Parse formatted employee ID back to number (e.g., "1234-567890" -> 1234567890)
  const parseEmployeeId = (formattedId: string): number | undefined => {
    if (!formattedId || formattedId.trim() === "") return undefined;
    // Remove dashes and convert to number
    const numericString = formattedId.replace(/-/g, "");
    // Don't parse if it's empty after cleaning
    if (numericString === "") {
      return undefined;
    }
    // Allow "0" to be parsed, but only if it's part of a longer number (e.g., "0123-456789")
    // If it's just "0" alone, return undefined to prevent premature updates
    if (numericString === "0" && formattedId.length <= 1) {
      return undefined;
    }
    const parsed = parseInt(numericString, 10);
    return isNaN(parsed) ? undefined : parsed;
  };

  // Verify admin/HR password using login endpoint (handles password hashing correctly)
  const verifyAdminPassword = async (): Promise<boolean> => {
    if (!currentUser || !canEditEmployeeId) return false;

    try {
      // Use the login endpoint to verify password (handles hashing correctly)
      // This is more secure than comparing plain text passwords
      const userEmail = currentUser.email;

      if (!userEmail) {
        console.error("User email not found for password verification");
        return false;
      }

      try {
        // Try to login with the provided password
        // If login succeeds, password is correct
        await apiService.login(userEmail, adminPassword);
        return true;
      } catch (loginError: any) {
        // Login failed - password is incorrect
        console.log(
          "Password verification failed:",
          loginError?.message || "Invalid password"
        );
        return false;
      }
    } catch (err) {
      console.error("Error verifying password:", err);
      return false;
    }
  };

  // Handle employee ID field click/focus (for admins and HR)
  const handleEmployeeIdFocus = () => {
    if (canEditEmployeeId && !isEmployeeIdEditable) {
      // Check lockout status before opening modal
      const lockoutStatus = checkLockoutStatus();
      if (lockoutStatus.isLockedOut && lockoutStatus.lockoutUntil) {
        const hoursRemaining = Math.ceil(
          (lockoutStatus.lockoutUntil.getTime() - new Date().getTime()) /
            (1000 * 60 * 60)
        );
        errorToast(`Account locked. Try again in ${hoursRemaining} hour(s).`);
        return;
      }

      setIsPasswordModalOpen(true);
      setAdminPassword("");
      setPasswordError("");
    }
  };

  // Handle password verification
  const handleVerifyPassword = async () => {
    if (!adminPassword.trim()) {
      setPasswordError("Password is required");
      return;
    }

    // Check lockout status first
    const lockoutStatus = checkLockoutStatus();
    if (lockoutStatus.isLockedOut && lockoutStatus.lockoutUntil) {
      const hoursRemaining = Math.ceil(
        (lockoutStatus.lockoutUntil.getTime() - new Date().getTime()) /
          (1000 * 60 * 60)
      );
      setPasswordError(
        `Account locked due to multiple failed attempts. Please try again in ${hoursRemaining} hour(s).`
      );
      errorToast("Account locked");
      return;
    }

    setIsVerifyingPassword(true);
    setPasswordError("");

    try {
      const isValid = await verifyAdminPassword();

      if (isValid) {
        // Reset failed attempts on successful verification
        resetFailedAttempts();
        setIsEmployeeIdEditable(true);
        setIsPasswordModalOpen(false);
        setAdminPassword("");
        setEmployeeIdInput(formatEmployeeId(formData.employeeId));
        success(
          `${
            isAdmin ? "Admin" : "HR"
          } password verified. You can now edit the Employee ID.`
        );
      } else {
        // Increment failed attempts
        incrementFailedAttempts();
        const lockoutStatus = checkLockoutStatus();

        if (lockoutStatus.isLockedOut) {
          const hoursRemaining = 24;
          setPasswordError(
            `Account locked for 24 hours due to multiple failed attempts. Please try again later.`
          );
          errorToast("Account locked for 24 hours");
        } else {
          const remaining = lockoutStatus.remainingAttempts || 0;
          setPasswordError(
            `Invalid admin password. ${remaining} attempt(s) remaining before lockout.`
          );
          errorToast(`Invalid password. ${remaining} attempt(s) remaining`);
        }
      }
    } catch (err) {
      setPasswordError("Error verifying password. Please try again.");
      errorToast("Verification failed");
    } finally {
      setIsVerifyingPassword(false);
    }
  };

  // Handle employee ID input change
  const handleEmployeeIdChange = (value: string) => {
    // Remove all non-numeric characters except dash
    let cleaned = value.replace(/[^\d-]/g, "");

    // Remove all dashes first
    cleaned = cleaned.replace(/-/g, "");

    // Limit to 10 digits
    cleaned = cleaned.slice(0, 10);

    // Add dash after first 4 digits
    if (cleaned.length > 4) {
      cleaned = cleaned.slice(0, 4) + "-" + cleaned.slice(4);
    }

    setEmployeeIdInput(cleaned);
  };

  // Update formData when employee ID is changed (after verification)
  useEffect(() => {
    if (isEmployeeIdEditable) {
      if (employeeIdInput && employeeIdInput.trim() !== "") {
        const parsedId = parseEmployeeId(employeeIdInput);
        // Only update if parsedId is not undefined and not NaN
        if (parsedId !== undefined && !isNaN(parsedId)) {
          setFormData((prev) => ({ ...prev, employeeId: parsedId }));
        } else {
          // Keep the current employeeId if parsing fails (user is still typing)
          // Don't clear it until they clear the input
        }
      } else {
        // Clear employeeId if input is empty
        setFormData((prev) => ({ ...prev, employeeId: undefined }));
      }
    }
  }, [employeeIdInput, isEmployeeIdEditable]);

  // Helper function to check if branch is HO, Head Office, or none
  const isBranchHOOrNone = (branch: string | number | undefined): boolean => {
    if (!branch) return false;
    // Convert to string if it's not already
    const branchStr = typeof branch === "string" ? branch : String(branch);
    const branchLower = branchStr.toLowerCase().trim();
    return (
      branchLower === "ho" ||
      branchLower === "head office /ho" ||
      branchLower === "none" ||
      branchLower === "none ho"
    );
  };

  // Helper function to check if position contains "manager" (case-insensitive)
  const isManagerPosition = (positionId: string): boolean => {
    if (!positionId) return false;
    // Find the position from the positions array
    // Positions come as { value: string, label: string } from API
    const position = positions.find(
      (p: any) =>
        p.value === positionId || p.id === positionId || p.name === positionId
    );
    if (!position) return false;
    // Get position name - could be in label, name, or label property
    const positionName = (position.label || position.name || "")
      .toLowerCase()
      .trim();
    // Check if position name contains "manager"
    return positionName.includes("manager");
  };

  // Update form data when user prop changes
  useEffect(() => {
    if (user) {
      // Extract branch value - could be string, object, or array
      // IMPORTANT: We need to find the branch ID (value) not the name (label)
      let branchValue = "";
      const userAny = user as any;
      let branchNameOrId = "";

      if (user.branch && typeof user.branch === "string") {
        branchNameOrId = user.branch;
      } else if (
        userAny.branches &&
        Array.isArray(userAny.branches) &&
        userAny.branches.length > 0
      ) {
        // Handle array format: branches[0].branch_name
        branchNameOrId =
          userAny.branches[0]?.branch_name ||
          userAny.branches[0]?.name ||
          userAny.branches[0]?.id ||
          "";
      } else if (user.branch && typeof user.branch === "object") {
        branchNameOrId =
          (user.branch as any).branch_name ||
          (user.branch as any).name ||
          (user.branch as any).id ||
          String(user.branch);
      } else if (user.branch) {
        branchNameOrId = String(user.branch);
      }

      // Find branch ID from branchesData by matching name or ID
      if (branchNameOrId && branches && branches.length > 0) {
        const foundBranch = branches.find((b: any) => {
          const bLabel = b.label || b.name || "";
          const bValue = b.value || b.id || "";
          return (
            bLabel === branchNameOrId ||
            bValue === branchNameOrId ||
            String(bValue) === String(branchNameOrId) ||
            bLabel.includes(branchNameOrId) ||
            branchNameOrId.includes(bLabel.split(" /")[0])
          ); // Match branch_name part
        });
        branchValue = foundBranch?.value || foundBranch?.id || branchNameOrId;
      } else {
        branchValue = branchNameOrId;
      }

      // Extract position value - could be string, object with label/value, or nested in positions object
      let userPosition = "";
      if (user.position && typeof user.position === "string") {
        userPosition = user.position;
      } else if (userAny.positions) {
        // Handle object format: positions.label or positions.value
        if (typeof userAny.positions === "object") {
          userPosition =
            userAny.positions.label ||
            userAny.positions.name ||
            userAny.positions.value ||
            "";
        } else if (typeof userAny.positions === "string") {
          userPosition = userAny.positions;
        }
      }

      // Find position ID if user.position is a name, otherwise use as-is
      // Positions come as { value: string, label: string } from API
      const foundPosition = positions.find(
        (p: any) =>
          p.label === userPosition ||
          p.name === userPosition ||
          p.value === userPosition ||
          p.id === userPosition ||
          String(p.value) === String(userPosition)
      );
      const positionId =
        foundPosition?.value || foundPosition?.id || userPosition;

      // Extract role value - could be string, object, or array
      let userRole = "";
      if (user.role && typeof user.role === "string") {
        userRole = user.role;
      } else if (
        userAny.roles &&
        Array.isArray(userAny.roles) &&
        userAny.roles.length > 0
      ) {
        // Handle array format: roles[0].name
        userRole = userAny.roles[0]?.name || userAny.roles[0]?.value || "";
      } else if (user.role && typeof user.role === "object") {
        userRole = (user.role as any).name || (user.role as any).value || "";
      }

      // If position contains "manager", role must be evaluator
      if (isManagerPosition(positionId)) {
        userRole = "evaluator";
      }

      // Fetch employeeId from account data if not already in user object
      const fetchEmployeeId = async () => {
        // Check for employeeId in different possible field names
        const employeeId =
          user.employeeId ||
          (user as any).employee_id ||
          (user as any).employeeId;

        if (!employeeId) {
          try {
            const accounts = await apiService.getAllUsers();
            const account = accounts.find(
              (acc: any) =>
                acc.id === user.id ||
                acc.employeeId === user.id ||
                acc.employee_id === user.id ||
                acc.user_id === user.id
            );

            // Try different field names for employeeId
            const foundEmployeeId =
              account?.employeeId ||
              account?.employee_id ||
              account?.emp_id ||
              account?.id;

            if (foundEmployeeId) {
              setFormData((prev) => ({
                ...prev,
                employeeId: foundEmployeeId,
              }));
              setEmployeeIdInput(formatEmployeeId(foundEmployeeId));
              return;
            }
          } catch (error) {
            console.error("Error fetching employeeId:", error);
          }
        }
      };

      // Get employeeId from user object (check multiple possible field names)
      const userEmployeeId =
        user.employeeId ||
        (user as any).employee_id ||
        (user as any).emp_id ||
        undefined;

      // Split name into first and last name if name exists, otherwise use fname/lname
      let fname = "";
      let lname = "";
      if (user.name) {
        const nameParts = user.name.trim().split(/\s+/);
        fname = nameParts[0] || "";
        lname = nameParts.slice(1).join(" ") || "";
      } else {
        fname = (user as any).fname || user.fname || "";
        lname = (user as any).lname || user.lname || "";
      }

      // Extract department value - could be string or nested in departments object/array
      let departmentValue = "";
      if (user.department && typeof user.department === "string") {
        departmentValue = user.department;
      } else if (
        userAny.departments &&
        Array.isArray(userAny.departments) &&
        userAny.departments.length > 0
      ) {
        departmentValue =
          userAny.departments[0]?.name || userAny.departments[0] || "";
      } else if (
        userAny.departments &&
        typeof userAny.departments === "object"
      ) {
        departmentValue = userAny.departments.name || "";
      }

      setFormData({
        id: user.id,
        name: user.name || `${fname} ${lname}`.trim() || "",
        fname: fname,
        lname: lname,
        email: user.email || "",
        position: positionId,
        // Clear department if branch is NOT HO/none/Head Office (i.e., regular branch)
        department: isBranchHOOrNone(branchValue) ? departmentValue : "",
        branch: branchValue,
        role: userRole,
        username: user.username || "",
        password: user.password || "",
        contact: user.contact || "",
        hireDate: user.hireDate || "",
        isActive:
          user.isActive !== undefined
            ? user.isActive
            : userAny.is_active === "active" || userAny.is_active === true,
        signature: user.signature || "",
        employeeId: userEmployeeId,
      });
      setErrors({});

      // Reset employee ID edit state when user changes
      setIsEmployeeIdEditable(false);
      setEmployeeIdInput("");

      // Set employeeId input if we have it, otherwise fetch it
      if (userEmployeeId) {
        setEmployeeIdInput(formatEmployeeId(userEmployeeId));
      } else {
        fetchEmployeeId();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.fname?.trim()) {
      newErrors.fname = "First name is required";
    }

    if (!formData.lname?.trim()) {
      newErrors.lname = "Last name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Position can be a number (ID) or string, check if it's truthy
    const positionValue =
      formData.position !== undefined && formData.position !== null
        ? String(formData.position).trim()
        : "";
    if (!positionValue) {
      newErrors.position = "Position is required";
    }

    // Department is only required if branch IS HO/none/Head Office
    if (isBranchHOOrNone(formData.branch) && !formData.department.trim()) {
      newErrors.department = "Department is required";
    }

    // Branch can be a number (ID) or string, check if it's truthy
    const branchValue =
      formData.branch !== undefined && formData.branch !== null
        ? String(formData.branch).trim()
        : "";
    if (!branchValue) {
      newErrors.branch = "Branch is required";
    }

    // Role can be a string, check if it's truthy
    const roleValue =
      formData.role !== undefined && formData.role !== null
        ? String(formData.role).trim()
        : "";
    if (!roleValue) {
      newErrors.role = "Role is required";
    }

    if (formData.username && !formData.username.trim()) {
      newErrors.username = "Username cannot be empty if provided";
    }

    if (
      formData.contact &&
      !/^\d{10,15}$/.test(formData.contact.replace(/\D/g, ""))
    ) {
      newErrors.contact = "Please enter a valid phone number";
    }

    if (formData.password && formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters long";
    }

    // Validate Employee ID format if it was edited (should be 10 digits)
    if (formData.employeeId) {
      const employeeIdString = formData.employeeId.toString();
      if (employeeIdString.length !== 10) {
        newErrors.employeeId = "Employee ID must be exactly 10 digits";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof User, value: string | boolean) => {
    // If branch is changed to a regular branch (not HO/none/Head Office), clear department
    if (
      field === "branch" &&
      typeof value === "string" &&
      !isBranchHOOrNone(value)
    ) {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
        department: "", // Clear department when branch is a regular branch (not HO/none)
      }));
    }
    // If position is changed to any position with "manager" in the name, automatically set role to evaluator
    else if (
      field === "position" &&
      typeof value === "string" &&
      isManagerPosition(value)
    ) {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
        role: "evaluator", // Auto-set role to evaluator for manager positions
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    }

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const handleSave = async () => {
    if (validateForm()) {
      console.log("Starting save process...");
      setIsSaving(true);
      try {
        // Simulate a delay to show the loading animation
        await new Promise((resolve) => setTimeout(resolve, 1000));
        console.log("Calling onSave...");

        // Combine fname and lname into name for saving (for backward compatibility)
        const dataToSave = {
          ...formData,
          name:
            `${formData.fname || ""} ${formData.lname || ""}`.trim() ||
            formData.name ||
            "",
        };

        await onSave(dataToSave);
        console.log("Save completed, refreshing table...");

        // Refresh the table if onRefresh callback is provided
        // This ensures the table updates with the latest data
        if (onRefresh) {
          try {
            await onRefresh();
            // Small delay to ensure state updates propagate
            await new Promise((resolve) => setTimeout(resolve, 100));
          } catch (error: any) {
            if (error.response?.data?.errors) {
              const backendErrors: Record<string, string> = {};

              Object.keys(error.response.data.errors).forEach((field) => {
                backendErrors[field] = error.response.data.errors[field][0];
              });
              setErrors(backendErrors);
            }
          }
        }

        // Don't show success message here - let handleSaveUser show it
        // This prevents duplicate success messages
        onClose();
      } catch (error: any) {
        if (error.response?.data?.errors) {
          const backendErrors: Record<string, string> = {};

          Object.keys(error.response.data.errors).forEach((field) => {
            backendErrors[field] = error.response.data.errors[field][0];
          });
          setErrors(backendErrors);
        }
      } finally {
        console.log("Setting isSaving to false...");
        setIsSaving(false);
      }
    }
  };

  const handleCancel = () => {
    setErrors({});
    setIsEmployeeIdEditable(false);
    setEmployeeIdInput("");
    setAdminPassword("");
    setPasswordError("");
    onClose();
  };

  if (!user) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChangeAction={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-6 bg-blue-100 animate-popup">
          <DialogHeader className="pb-6">
            <DialogTitle className="text-xl font-semibold">
              Edit User Information
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Update the user's information below. All fields marked with * are
              required.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-2">
            {/* Employee ID - Editable for Admins and HR with Password Verification */}
            <div className="space-y-2">
              <Label htmlFor="employeeId">Employee ID</Label>
              {canEditEmployeeId && isEmployeeIdEditable ? (
                <Input
                  id="employeeId"
                  value={employeeIdInput}
                  onChange={(e) => handleEmployeeIdChange(e.target.value)}
                  placeholder="1234-567890"
                  maxLength={11}
                  className="bg-white"
                />
              ) : (
                <Input
                  id="employeeId"
                  value={
                    formData.employeeId
                      ? formatEmployeeId(formData.employeeId)
                      : ""
                  }
                  disabled={!canEditEmployeeId}
                  readOnly={canEditEmployeeId ? !isEmployeeIdEditable : true}
                  onFocus={
                    canEditEmployeeId ? handleEmployeeIdFocus : undefined
                  }
                  onClick={
                    canEditEmployeeId ? handleEmployeeIdFocus : undefined
                  }
                  style={canEditEmployeeId ? { cursor: "pointer" } : undefined}
                  className={
                    canEditEmployeeId
                      ? "bg-gray-100 cursor-pointer hover:bg-gray-200"
                      : "bg-gray-100 cursor-not-allowed"
                  }
                  title={
                    canEditEmployeeId
                      ? `Click to edit (requires ${
                          isAdmin ? "admin" : "HR"
                        } password)`
                      : "Employee ID assigned during registration"
                  }
                />
              )}
              <p className="text-xs text-gray-500">
                {canEditEmployeeId
                  ? isEmployeeIdEditable
                    ? "Editing enabled. Enter 10-digit Employee ID (format: 1234-567890)"
                    : `Click to edit (requires ${
                        isAdmin ? "admin" : "HR"
                      } password verification)`
                  : "Employee ID assigned during registration"}
              </p>
              {errors.employeeId && (
                <p className="text-sm text-red-500">{errors.employeeId}</p>
              )}
            </div>

            {/* First Name */}
            <div className="space-y-2">
              <Label htmlFor="fname">First Name *</Label>
              <Input
                id="fname"
                value={formData.fname || ""}
                onChange={(e) => handleInputChange("fname", e.target.value)}
                className={errors.fname ? "border-red-500 " : "bg-white"}
                placeholder="Enter first name"
              />
              {errors.fname && (
                <p className="text-sm text-red-500">{errors.fname}</p>
              )}
            </div>

            {/* Last Name */}
            <div className="space-y-2">
              <Label htmlFor="lname">Last Name *</Label>
              <Input
                id="lname"
                value={formData.lname || ""}
                onChange={(e) => handleInputChange("lname", e.target.value)}
                className={errors.lname ? "border-red-500 " : "bg-white"}
                placeholder="Enter last name"
              />
              {errors.lname && (
                <p className="text-sm text-red-500">{errors.lname}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                className={errors.email ? "border-red-500" : "bg-white"}
                placeholder="Enter email address"
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email}</p>
              )}
            </div>

            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={formData.username || ""}
                onChange={(e) => handleInputChange("username", e.target.value)}
                className={errors.username ? "border-red-500" : "bg-white"}
                placeholder="Enter username"
              />
              {errors.username && (
                <p className="text-sm text-red-500">{errors.username}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password || ""}
                  onChange={(e) =>
                    handleInputChange("password", e.target.value)
                  }
                  className={
                    errors.password ? "border-red-500 pr-10" : "pr-10 bg-white"
                  }
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  {showPassword ? (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password}</p>
              )}
              <p className="text-xs text-gray-500">
                Leave empty to keep current password
              </p>
            </div>

            {/* Contact */}
            <div className="space-y-2">
              <Label htmlFor="contact">Contact Number</Label>
              <Input
                id="contact"
                type="tel"
                value={formData.contact || ""}
                onChange={(e) => {
                  // Only allow numbers, spaces, hyphens, and parentheses (for formatting)
                  const value = e.target.value.replace(/[^\d\s\-()]/g, "");
                  handleInputChange("contact", value);
                }}
                onKeyDown={(e) => {
                  // Allow: backspace, delete, tab, escape, enter, and arrow keys
                  if (
                    [8, 9, 27, 13, 46, 37, 38, 39, 40].indexOf(e.keyCode) !==
                      -1 ||
                    // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
                    (e.keyCode === 65 && e.ctrlKey === true) ||
                    (e.keyCode === 67 && e.ctrlKey === true) ||
                    (e.keyCode === 86 && e.ctrlKey === true) ||
                    (e.keyCode === 88 && e.ctrlKey === true) ||
                    // Allow: home, end, left, right
                    (e.keyCode >= 35 && e.keyCode <= 39)
                  ) {
                    return;
                  }
                  // Ensure that it is a number and stop the keypress
                  if (
                    (e.shiftKey || e.keyCode < 48 || e.keyCode > 57) &&
                    (e.keyCode < 96 || e.keyCode > 105) &&
                    e.key !== " " &&
                    e.key !== "-" &&
                    e.key !== "(" &&
                    e.key !== ")"
                  ) {
                    e.preventDefault();
                  }
                }}
                className={errors.contact ? "border-red-500" : "bg-white"}
                placeholder="Enter contact number (numbers only)"
              />
              {errors.contact && (
                <p className="text-sm text-red-500">{errors.contact}</p>
              )}
            </div>

            {/* Position */}
            <div className="space-y-2 w-2/3">
              <Label htmlFor="position">Position *</Label>
              <Combobox
                options={
                  positions.length > 0 &&
                  typeof positions[0] === "object" &&
                  "value" in positions[0] &&
                  "label" in positions[0]
                    ? positions // Already in correct format { value, label }
                    : positions.map((p: any) => ({
                        value: p.value || p.id || p,
                        label: p.label || p.name || p,
                      }))
                }
                value={formData.position}
                onValueChangeAction={(value) =>
                  handleInputChange("position", value as string)
                }
                placeholder="Select position"
                searchPlaceholder="Search positions..."
                emptyText="No positions found."
                className={errors.position ? "border-red-500" : "bg-white"}
              />
              {errors.position && (
                <p className="text-sm text-red-500">{errors.position}</p>
              )}
            </div>

            {/* Department - Show only if branch is HO, Head Office, or none */}
            {formData.branch === 126 && (
              <div className="space-y-2 w-1/2">
                <Label htmlFor="department">Department *</Label>
                <Combobox
                  options={departments.map((dept: any) => ({
                    value: dept,
                    label: dept,
                  }))}
                  value={formData.department}
                  onValueChangeAction={(value) =>
                    handleInputChange("department", value as string)
                  }
                  placeholder="Select department"
                  searchPlaceholder="Search departments..."
                  emptyText="No departments found."
                  className={errors.department ? "border-red-500" : "bg-white"}
                />
                {errors.department && (
                  <p className="text-sm text-red-500">{errors.department}</p>
                )}
              </div>
            )}

            {/* Branch */}
            <div className="space-y-2 w-1/2">
              <Label htmlFor="branch">Branch *</Label>
              <Combobox
                options={
                  Array.isArray(branches) &&
                  branches.length > 0 &&
                  typeof branches[0] === "object" &&
                  !("value" in branches[0])
                    ? (branches as { id: string; name: string }[]).map((b) => ({
                        value: b.name,
                        label: b.name,
                      }))
                    : (branches as string[])
                }
                value={formData.branch || ""}
                onValueChangeAction={(value) =>
                  handleInputChange("branch", value as string)
                }
                placeholder="Select branch"
                searchPlaceholder="Search branches..."
                emptyText="No branches found."
                className={errors.branch ? "border-red-500" : ""}
              />
              {errors.branch && (
                <p className="text-sm text-red-500">{errors.branch}</p>
              )}
            </div>

            {/* Role */}
            <div className="space-y-2 w-1/2">
              <Label htmlFor="role">Role *</Label>
              <Combobox
                options={[
                  { value: "admin", label: "Admin" },
                  { value: "hr", label: "HR" },
                  { value: "evaluator", label: "Evaluator" },
                  { value: "employee", label: "Employee" },
                ]}
                value={formData.role || ""}
                onValueChangeAction={(value) =>
                  handleInputChange("role", value as string)
                }
                placeholder="Select role"
                searchPlaceholder="Search roles..."
                emptyText="No roles found."
                className={errors.role ? "border-red-500" : ""}
                disabled={isManagerPosition(formData.position)}
              />
              {errors.role && (
                <p className="text-sm text-red-500">{errors.role}</p>
              )}
              {isManagerPosition(formData.position) && (
                <p className="text-xs text-gray-500">
                  Role is automatically set to "Evaluator" for manager positions
                </p>
              )}
            </div>

            {/* Hire Date */}
            <div className="space-y-2 w-1/2">
              <Label htmlFor="hireDate">Hire Date</Label>
              <Input
                id="hireDate"
                type="date"
                value={formData.hireDate || ""}
                onChange={(e) => handleInputChange("hireDate", e.target.value)}
                placeholder="Select hire date"
              />
            </div>

            {/* Active Status */}
            <div className="space-y-2 w-1/2">
              <Label htmlFor="isActive">Status</Label>
              <Combobox
                options={[
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                ]}
                value={formData.isActive ? "active" : "inactive"}
                onValueChangeAction={(value) =>
                  handleInputChange("isActive", value === "active")
                }
                placeholder="Select status"
                searchPlaceholder="Search status..."
                emptyText="No status found."
              />
            </div>
          </div>

          <DialogFooter className="flex justify-end space-x-3 pt-6 mt-6 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="px-6"
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="bg-blue-600 hover:bg-blue-700 px-6"
              disabled={isSaving}
            >
              {isSaving ? (
                <div className="flex items-center space-x-2">
                  <LoadingAnimation size="sm" variant="spinner" color="blue" />
                  <span>Saving...</span>
                </div>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin Password Verification Modal */}
      <Dialog
        open={isPasswordModalOpen}
        onOpenChangeAction={(open) => {
          if (!open) {
            setIsPasswordModalOpen(false);
            setAdminPassword("");
            setPasswordError("");
          }
        }}
      >
        <DialogContent className="max-w-lg w-full mx-4 p-6">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl font-semibold">
              {isAdmin ? "Admin" : "HR"} Password Verification
            </DialogTitle>
            <DialogDescription className="text-gray-600 pt-2">
              Please enter your {isAdmin ? "admin" : "HR"} password to edit the
              Employee ID.
            </DialogDescription>
          </DialogHeader>
          {(() => {
            const lockoutStatus = checkLockoutStatus();
            if (lockoutStatus.isLockedOut && lockoutStatus.lockoutUntil) {
              const hoursRemaining = Math.ceil(
                (lockoutStatus.lockoutUntil.getTime() - new Date().getTime()) /
                  (1000 * 60 * 60)
              );
              return (
                <div className="space-y-6 py-4">
                  {/* Lockout GIF */}
                  <div className="flex justify-center">
                    <LazyGif
                      src="/sec.gif"
                      alt="Account locked animation"
                      className="w-40 h-40 object-contain"
                      containerClassName="flex justify-center"
                      shouldLoad={isPasswordModalOpen}
                    />
                  </div>

                  {/* Lockout Message */}
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <svg
                          className="h-5 w-5 text-red-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                          />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-red-800">
                          Account Locked
                        </h3>
                        <p className="text-sm text-red-700 mt-1">
                          Your account has been temporarily locked due to
                          multiple failed password attempts. this is for the
                          security of the user. if you are not the admin, please
                          log out immediately.
                        </p>
                        <p className="text-sm text-red-700 mt-2 font-semibold">
                          Please try again in {hoursRemaining} hour(s).
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }
            return (
              <div className="space-y-6 py-4">
                <div className="space-y-3">
                  <Label
                    htmlFor="adminPassword"
                    className="text-sm font-medium"
                  >
                    {isAdmin ? "Admin" : "HR"} Password
                  </Label>
                  <Input
                    id="adminPassword"
                    type="password"
                    value={adminPassword}
                    onChange={(e) => {
                      setAdminPassword(e.target.value);
                      setPasswordError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !isVerifyingPassword) {
                        handleVerifyPassword();
                      }
                    }}
                    placeholder={`Enter ${isAdmin ? "admin" : "HR"} password`}
                    className={`w-full h-11 px-4 ${
                      passwordError
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                        : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    } bg-white`}
                    disabled={isVerifyingPassword}
                    autoFocus
                  />
                  {passwordError && (
                    <p className="text-sm text-red-500 mt-1">{passwordError}</p>
                  )}
                  {(() => {
                    const status = checkLockoutStatus();
                    if (
                      !status.isLockedOut &&
                      status.remainingAttempts !== undefined &&
                      status.remainingAttempts < 6
                    ) {
                      return (
                        <p className="text-xs text-amber-600 mt-1">
                          ⚠️ {status.remainingAttempts} attempt(s) remaining
                          before 24-hour lockout
                        </p>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
            );
          })()}
          <DialogFooter className="flex justify-end space-x-3 pt-4 mt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => {
                setIsPasswordModalOpen(false);
                setAdminPassword("");
                setPasswordError("");
              }}
              disabled={isVerifyingPassword}
              className="px-6 min-w-[100px]"
            >
              {checkLockoutStatus().isLockedOut ? "Close" : "Cancel"}
            </Button>
            {!checkLockoutStatus().isLockedOut && (
              <Button
                onClick={handleVerifyPassword}
                disabled={isVerifyingPassword || !adminPassword.trim()}
                className="bg-blue-600 hover:bg-blue-700 px-6 min-w-[100px]"
              >
                {isVerifyingPassword ? (
                  <div className="flex items-center justify-center space-x-2">
                    <LoadingAnimation
                      size="sm"
                      variant="spinner"
                      color="white"
                    />
                    <span>Verifying...</span>
                  </div>
                ) : (
                  "Verify"
                )}
              </Button>
            )}
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
                Please wait while we save your changes. This may take a few
                moments.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EditUserModal;
