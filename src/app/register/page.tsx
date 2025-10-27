"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import SignaturePad from "@/components/SignaturePad";
import { AlertDialog } from "@/components/ui/alert-dialog";
import Link from "next/link";
import PageTransition from "@/components/PageTransition";
import { CONFIG } from "../../../config/config";
import { id } from "date-fns/locale";
import clientDataService from "@/lib/clientDataService.api";

interface FormDataType {
  fname: string;
  lname: string;
  username: string;
  email: string;
  contact: string;
  position_id: number | string;
  branch_id: number | string;
  department_id?: number | string ;
  password: string;
  password_confirmation: string;
  signature: string;
}

export default function RegisterPage() {
  const [isRegisterButtonClicked, setIsRegisterButtonClicked] = useState(false);
  const [positions, setPositions] = useState<{value: string , label: string}[]>([]);
  const [branches, setBranches] = useState<{value: string, label: string}[]>([]);
  const [departments, setDepartments] = useState<{value: string, label: string}[]>([]);
  const [alertDialog, setAlertDialog] = useState({
    open: false,
    title: "",
    description: "",
    type: "info" as "success" | "error" | "warning" | "info",
    onConfirm: () => {},
  });
  const [formData, setFormData] = useState<FormDataType>({
    fname: "",
    lname: "",
    username: "",
    email: "",
    contact: "",
    department_id: "",
    position_id: 0,
    branch_id: 0,
    password: "",
    password_confirmation: "",
    signature: "",
  });
  const [signatureError, setSignatureError] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    [key: string]: any;
  }>({});

 // Load positions from client data service.api
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch positions using client data service
        const positionsData = await clientDataService.getPositions();
        setPositions(positionsData);

        // Fetch departments using client data service
        const departmentsData = await clientDataService.getDepartments();
        setDepartments(departmentsData);

        // Fetch departments using client data service
        const branchData = await clientDataService.getBranches();
        setBranches(branchData);
        
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);


  const showAlert = (
    title: string,
    description: string,
    type: "success" | "error" | "warning" | "info",
    onConfirm?: () => void
  ) => {
    setAlertDialog({
      open: true,
      title,
      description,
      type,
      onConfirm: onConfirm || (() => {}),
    });
  };

  // Real-time validation functions
  const validateField = (fieldName: string, value: string) => {
    const errors = { ...fieldErrors };

    switch (fieldName) {
      case "email":
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errors.email = "Please enter a valid email address";
        }
        break;
      case "password":
        if (value && value.length < 8) {
          errors.password = "Password must be at least 8 characters";
        } else if (value && !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
          errors.password =
            "Password must contain uppercase, lowercase, and number";
        } else {
          delete errors.password;
        }
        break;
      case "password_confirmation":
        if (value && value !== formData.password) {
          errors.password_confirmation = "Passwords do not match";
        } else {
          delete errors.password_confirmation;
        }
        break;
      case "contact":
        if (value && !/^\d{11}$/.test(value)) {
          errors.contact = "Contact number must be exactly 11 digits";
        } else {
          delete errors.contact;
        }
        break;
      default:
        if (value.trim() === "") {
          errors[fieldName] = "This field is required";
        } else {
          delete errors[fieldName];
        }
    }

    setFieldErrors(errors);
  };

  const handleRegisterSubmit = async (e: any) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.fname.trim()) {
      showAlert("Missing Information", "First name is required!", "error");
      return;
    }

    if (!formData.lname.trim()) {
      showAlert("Missing Information", "Last name is required!", "error");
      return;
    }

    if (!formData.username.trim()) {
      showAlert("Missing Information", "Username is required!", "error");
      return;
    }

    if (!formData.email.trim()) {
      showAlert("Missing Information", "Email is required!", "error");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      showAlert(
        "Invalid Email",
        "Please enter a valid email address!",
        "error"
      );
      return;
    }

    if (!formData.contact.trim()) {
      showAlert("Missing Information", "Contact number is required!", "error");
      return;
    }

    if (!formData.position_id) {
      showAlert("Missing Information", "Please select your position!", "error");
      return;
    }

    if (!formData.branch_id) {
      showAlert("Missing Information", "Please select your branch!", "error");
      return;
    }

    // Validate passwords match
    if (formData.password !== formData.password_confirmation) {
      showAlert(
        "Password Mismatch",
        "Passwords do not match! Please try again.",
        "error"
      );
      return;
    }

    // Validate password length
    if (formData.password.length < 8) {
      showAlert(
        "Password Too Short",
        "Password must be at least 8 characters long!",
        "warning"
      );
      return;
    }

    // Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
    if (!passwordRegex.test(formData.password)) {
      showAlert(
        "Weak Password",
        "Password must contain at least one uppercase letter, one lowercase letter, and one number!",
        "warning"
      );
      return;
    }

    // Validate signature
    if (!formData.signature) {
      setSignatureError(true);
      showAlert(
        "Signature Required",
        "Please draw your digital signature to complete the registration!",
        "warning"
      );
      return;
    }

    setIsRegisterButtonClicked(true);
    // Then send the POST request with the user registration data

    const formDataToUpload = new FormData();

    formDataToUpload.append("fname", formData?.fname);
    formDataToUpload.append("lname", formData.lname);
    formDataToUpload.append("username", formData.username);
    formDataToUpload.append("email", formData.email);
    formDataToUpload.append("contact", formData.contact);
    formDataToUpload.append("position_id", String(formData.position_id));
    formDataToUpload.append("branch_id", String(formData.branch_id));
    formDataToUpload.append("department_id", String(formData.department_id));
    formDataToUpload.append("password", formData.password);
    formDataToUpload.append("password_confirmation",formData.password_confirmation);
    formDataToUpload.append("signature", formData.signature);

        try {
          const data = await clientDataService.registerUser(formDataToUpload);

          showAlert(
            "Registration Successful!",
            "Account registration submitted successfully! Your registration is pending approval. You will be notified once approved.",
            "success",
            () => {
              // Reset form
              setFormData({
                fname: "",
                lname: "",
                username: "",
                email: "",
                contact: "",
                position_id: 0,
                department_id: 0,
                branch_id: 0,
                password: "",
                password_confirmation: "",
                signature: "",
              });
              setSignatureError(false);
              // Redirect to login page
              window.location.href = "/";
            })
        }catch (error : any ) {
          // console.error(error);
            if (error.status === 422) {
              setFieldErrors(error.errors);
            }
            if (error.status === 400) {
              setFieldErrors({
                signature: [error.message],
              });
            }
        }finally{
            setIsRegisterButtonClicked(false);
        }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Main Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-white via-blue-50 to-blue-600"></div>

      {/* Single Geometric Pattern Overlay - Gradient from left to right */}
      <div className="absolute inset-0">
        <svg
          className="w-full h-full"
          viewBox="0 0 1000 1000"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            {/* Gradient mask for fading effect */}
            <linearGradient id="fadeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop
                offset="0%"
                style={{ stopColor: "rgba(255,255,255,0)", stopOpacity: 0 }}
              />
              <stop
                offset="30%"
                style={{ stopColor: "rgba(255,255,255,0)", stopOpacity: 0 }}
              />
              <stop
                offset="60%"
                style={{ stopColor: "rgba(255,255,255,0.3)", stopOpacity: 0.3 }}
              />
              <stop
                offset="100%"
                style={{ stopColor: "rgba(255,255,255,1)", stopOpacity: 1 }}
              />
            </linearGradient>

            {/* Single hexagon pattern */}
            <pattern
              id="hexagons"
              x="0"
              y="0"
              width="100"
              height="87"
              patternUnits="userSpaceOnUse"
            >
              <polygon
                points="50,8 75,25 75,62 50,79 25,62 25,25"
                fill="rgba(59, 130, 246, 0.12)"
                stroke="rgba(59, 130, 246, 0.3)"
                strokeWidth="0.8"
              />
            </pattern>
          </defs>

          {/* Apply single pattern with gradient mask */}
          <rect
            width="100%"
            height="100%"
            fill="url(#hexagons)"
            mask="url(#patternMask)"
          />

          {/* Create mask for gradient effect */}
          <mask id="patternMask">
            <rect width="100%" height="100%" fill="url(#fadeGradient)" />
          </mask>
        </svg>
      </div>

      {/* Single Geometric Elements - Hexagons only */}
      <div className="absolute top-20 right-20 w-24 h-24 opacity-30">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <polygon
            points="50,10 80,30 80,70 50,90 20,70 20,30"
            fill="rgba(59, 130, 246, 0.2)"
            stroke="rgba(59, 130, 246, 0.4)"
            strokeWidth="1"
          />
        </svg>
      </div>

      <div className="absolute bottom-32 right-40 w-20 h-20 opacity-35">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <polygon
            points="50,5 85,25 85,75 50,95 15,75 15,25"
            fill="rgba(59, 130, 246, 0.15)"
            stroke="rgba(59, 130, 246, 0.3)"
            strokeWidth="1"
          />
        </svg>
      </div>

      <div className="absolute top-40 left-20 w-16 h-16 opacity-5">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <polygon
            points="50,15 75,35 75,65 50,85 25,65 25,35"
            fill="rgba(59, 130, 246, 0.08)"
            stroke="rgba(59, 130, 246, 0.15)"
            strokeWidth="0.5"
          />
        </svg>
      </div>

      {/* Right side additional hexagons */}
      <div className="absolute top-1/2 right-10 w-12 h-12 opacity-20">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <polygon
            points="50,10 80,30 80,70 50,90 20,70 20,30"
            fill="rgba(59, 130, 246, 0.1)"
            stroke="rgba(59, 130, 246, 0.25)"
            strokeWidth="0.8"
          />
        </svg>
      </div>

      <div className="absolute bottom-1/2 right-20 w-10 h-10 opacity-25">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <polygon
            points="50,10 80,30 80,70 50,90 20,70 20,30"
            fill="rgba(59, 130, 246, 0.12)"
            stroke="rgba(59, 130, 246, 0.2)"
            strokeWidth="0.6"
          />
        </svg>
      </div>
      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-4 py-12">
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
          <PageTransition>
            <Card className="w-full max-w-lg shadow-2xl transform scale-105 bg-white/95 backdrop-blur-sm border-0 relative z-10">
              <CardHeader className="space-y-4">
                {/* Logo at the top of the card */}
                <div className="flex justify-center mb-4">
                  <Link href="/" className="flex items-center space-x-2">
                    <img
                      src="/smct.png"
                      alt="SMCT Group of Companies"
                      className="h-16 w-auto"
                    />
                  </Link>
                </div>
                <CardTitle className="text-2xl text-center text-blue-700">
                  Create your account
                </CardTitle>
                <CardDescription className="text-center">
                  Join us to start your performance evaluation journey
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={  handleRegisterSubmit}>
                  <div className="space-y-4">
                    {/* Personal Information */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fname">First name</Label>
                        <Input
                          id="fname"
                          placeholder="John"
                          value={formData.fname}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              fname: e.target.value,
                            });
                            validateField("fname", e.target.value);
                          }}
                          className={fieldErrors?.fname ? "border-red-500" : ""}
                        />
                        {fieldErrors?.fname && (
                          <p className="text-sm text-red-500">
                            {fieldErrors.fname}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lname">Last name</Label>
                        <Input
                          id="lname"
                          placeholder="Doe"
                          value={formData.lname}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              lname: e.target.value,
                            });
                            validateField("lname", e.target.value);
                          }}
                          className={fieldErrors?.lname ? "border-red-500" : ""}
                        />
                        {fieldErrors?.lname && (
                          <p className="text-sm text-red-500">
                            {fieldErrors?.lname}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        placeholder="johndoe"
                        value={formData.username}
                        onChange={(e) =>
                          setFormData({ ...formData, username: e.target.value })
                        }
                        className={
                          fieldErrors?.username ? "border-red-500" : ""
                        }
                      />
                      {fieldErrors?.username && (
                        <p className="text-sm text-red-500">
                          {fieldErrors?.username}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="registerEmail">Email</Label>
                      <Input
                        id="registerEmail"
                        type="email"
                        placeholder="name@company.com"
                        value={formData.email}
                        onChange={(e) => {
                          setFormData({ ...formData, email: e.target.value });
                          validateField("email", e.target.value);
                        }}
                        className={fieldErrors?.email ? "border-red-500" : ""}
                      />
                      {fieldErrors?.email && (
                        <p className="text-sm text-red-500">
                          {fieldErrors?.email}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contact">Contact Number</Label>
                      <Input
                        id="contact"
                        type="tel"
                        placeholder="09123456789"
                        value={formData.contact}
                        onChange={(e) => {
                          // Only allow numbers and limit to 11 digits
                          const value = e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 11);
                          setFormData({ ...formData, contact: value });
                          validateField("contact", value);
                        }}
                        onKeyPress={(e) => {
                          // Prevent non-numeric input
                          if (!/[0-9]/.test(e.key)) {
                            e.preventDefault();
                          }
                        }}
                        maxLength={11}
                        className={fieldErrors?.contact ? "border-red-500" : ""}
                      />
                      {fieldErrors?.contact && (
                        <p className="text-sm text-red-500">
                          {fieldErrors?.contact}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="position">Position</Label>
                      <Combobox
                        options={positions}
                        value={formData.position_id}
                        onValueChangeAction={(value) => {
                          setFormData({ ...formData, position_id: value });
                        }}
                        placeholder="Select your position"
                        searchPlaceholder="Search positions..."
                        emptyText="No positions found."
                        className="w-1/2"
                        error={fieldErrors?.position_id}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="branch">Branch</Label>
                      <Combobox
                        options={branches}
                        value={formData.branch_id}
                        onValueChangeAction={(value) =>
                          setFormData({ ...formData, branch_id: value })
                        }
                        placeholder="Select your branch"
                        searchPlaceholder="Search branches..."
                        emptyText="No branches found."
                        className="w-1/2"
                        error={fieldErrors?.branch_id}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="department">Department</Label>
                      <Combobox
                        options={departments}
                        value={String(formData.department_id)}
                        onValueChangeAction={(value) =>
                          setFormData({ ...formData, department_id: value })
                        }
                        placeholder="Select your branch"
                        searchPlaceholder="Search branches..."
                        emptyText="No branches found."
                        className="w-1/2"
                        error={fieldErrors?.department_id}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="registerPassword">Password</Label>
                      <Input
                        id="registerPassword"
                        type="password"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            password: e.target.value,
                          });
                          validateField("password", e.target.value);
                        }}
                        className={
                          fieldErrors?.password ? "border-red-500" : ""
                        }
                      />
                      {fieldErrors?.password && (
                        <p className="text-sm text-red-500">
                          {fieldErrors?.password}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password_confirmation">
                        Confirm password
                      </Label>
                      <Input
                        id="password_confirmation"
                        type="password"
                        placeholder="••••••••"
                        value={formData.password_confirmation}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            password_confirmation: e.target.value,
                          });
                          validateField(
                            "password_confirmation",
                            e.target.value
                          );
                        }}
                        className={
                          fieldErrors?.password_confirmation
                            ? "border-red-500"
                            : ""
                        }
                      />
                      {fieldErrors?.password_confirmation && (
                        <p className="text-sm text-red-500">
                          {fieldErrors?.password_confirmation}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signature">Digital Signature *</Label>
                      <SignaturePad
                        value={formData.signature}
                        onChangeAction={(signature) => {
                          setFormData({ ...formData, signature });
                          if (signature && signatureError) {
                            setSignatureError(false);
                          }
                        }}
                        className="w-full"
                        required={true}
                        hasError={signatureError}
                      />
                      <p className="text-sm text-gray-500">
                        By drawing your signature above, you agree to the terms
                        and conditions of this registration.
                      </p>
                      {fieldErrors?.signature && (
                        <small className="text-red-500">
                          {fieldErrors?.signature}
                        </small>
                      )}
                    </div>

                    <Button
                      type="submit"
                      className={`w-full bg-blue-600 text-white hover:bg-green-700 transition-all duration-300 ${
                        isRegisterButtonClicked
                          ? "transform scale-95 bg-blue-700 shadow-inner"
                          : "hover:scale-105 hover:shadow-lg active:scale-95"
                      }`}
                      disabled={isRegisterButtonClicked}
                    >
                      {isRegisterButtonClicked ? (
                        <span className="flex items-center justify-center">
                          <svg
                            className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Creating...
                        </span>
                      ) : (
                        "Create account"
                      )}
                    </Button>
                  </div>
                </form>

                <div className="text-center pt-4">
                  <p className="text-sm text-gray-600">
                    Already have an account?{" "}
                    <Link
                      href="/"
                      className="text-blue-600 hover:underline font-medium"
                    >
                      Sign in here
                    </Link>
                  </p>
                </div>
              </CardContent>
            </Card>
          </PageTransition>
        </div>
      </main>

      {/* Alert Dialog */}
      <AlertDialog
        open={alertDialog.open}
        onOpenChangeAction={(open) =>
          setAlertDialog((prev) => ({ ...prev, open }))
        }
        title={alertDialog.title}
        description={alertDialog.description}
        type={alertDialog.type}
        onConfirm={alertDialog.onConfirm}
        confirmText="OK"
      />
    </div>
  );
}