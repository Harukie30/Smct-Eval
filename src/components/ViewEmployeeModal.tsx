"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  X,
  Mail,
  Briefcase,
  Building2,
  User,
  Hash,
  Phone,
  Shield,
  UserCircle,
  Calendar,
  MapPin,
  FileText,
} from "lucide-react";

interface Employee {
  id: number;
  fname: string;
  lname: string;
  emp_id: number;
  email: string;
  positions: any;
  departments: any;
  branches: any;
  hireDate: Date;
  roles: any;
  username: string;
  password: string;
  is_active: string;
  avatar?: string | null;
  bio?: string | null;
  contact?: string;
  created_at: string;
  updated_at?: string;
}

interface ViewEmployeeModalProps {
  isOpen: boolean;
  onCloseAction: () => void;
  employee: Employee | null;
  onStartEvaluationAction: (employee: Employee) => void;
  onViewSubmissionAction: (submission: any) => void;
  designVariant?: "default" | "admin"; // New prop for design variant
}

export default function ViewEmployeeModal({
  isOpen,
  onCloseAction,
  employee,
  onStartEvaluationAction,
  onViewSubmissionAction,
  designVariant = "default",
}: ViewEmployeeModalProps) {
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState("");
  const [employeeEvaluationData, setEmployeeEvaluationData] = useState<any[]>(
    []
  );
  const [isLoadingEmployeeData, setIsLoadingEmployeeData] = useState(false);
  const [employeeDataError, setEmployeeDataError] = useState<string | null>(
    null
  );
  let empId = "";

  if (employee?.emp_id && employee.emp_id.toString().length > 4) {
    const s = String(employee.emp_id);
    empId = `${s.slice(0, 4)}-${s.slice(4)}`;
  }

  // API Functions for Employee Data Tracking
  const fetchEmployeeEvaluationHistory = async (
    employeeId: number,
    employeeName: string
  ) => {
    setIsLoadingEmployeeData(true);
    setEmployeeDataError(null);

    try {
      console.log("Fetching evaluation history for employee:", {
        employeeId,
        employeeName,
      });

      // Get all submissions from localStorage
      const allSubmissions = JSON.parse(
        localStorage.getItem("evaluationSubmissions") || "[]"
      );

      // Filter submissions for this specific employee
      const employeeSubmissions = allSubmissions.filter(
        (submission: any) =>
          submission.employeeId === employeeId ||
          submission.employeeName === employeeName ||
          submission.employeeEmail === employee?.email
      );

      console.log(
        "Found submissions for employee:",
        employeeSubmissions.length
      );

      setEmployeeEvaluationData(employeeSubmissions);
      console.log("Employee evaluation data loaded:", employeeSubmissions);

      return employeeSubmissions;
    } catch (err) {
      console.error("Error fetching employee evaluation history:", err);
      setEmployeeDataError("Failed to load employee evaluation data");
      throw err;
    } finally {
      setIsLoadingEmployeeData(false);
    }
  };

  const getEmployeePerformanceMetrics = (employeeData: any[]) => {
    if (!employeeData || employeeData.length === 0) {
      return {
        totalEvaluations: 0,
        averageRating: 0,
        highestRating: 0,
        lowestRating: 0,
        categories: [],
        quarterlyBreakdown: {},
        performanceTrend: "stable",
      };
    }

    const ratings = employeeData
      .map((sub) => sub.rating || 0)
      .filter((r) => r > 0);
    const categories = [
      ...new Set(employeeData.map((sub) => sub.category).filter(Boolean)),
    ];

    // Calculate quarterly breakdown
    const quarterlyBreakdown = employeeData.reduce((acc, submission) => {
      const date = new Date(submission.submittedAt);
      const quarter = `Q${Math.ceil(
        (date.getMonth() + 1) / 3
      )} ${date.getFullYear()}`;

      if (!acc[quarter]) {
        acc[quarter] = { count: 0, totalRating: 0, submissions: [] };
      }

      acc[quarter].count += 1;
      acc[quarter].totalRating += submission.rating || 0;
      acc[quarter].submissions.push(submission);

      return acc;
    }, {});

    // Calculate performance trend
    const sortedByDate = employeeData.sort(
      (a, b) =>
        new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
    );

    let performanceTrend = "stable";
    if (sortedByDate.length >= 2) {
      const recent = sortedByDate.slice(-3).map((s) => s.rating || 0);
      const older = sortedByDate.slice(0, -3).map((s) => s.rating || 0);

      if (recent.length > 0 && older.length > 0) {
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

        if (recentAvg > olderAvg + 0.5) performanceTrend = "improving";
        else if (recentAvg < olderAvg - 0.5) performanceTrend = "declining";
      }
    }

    return {
      totalEvaluations: employeeData.length,
      averageRating:
        ratings.length > 0
          ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2)
          : 0,
      highestRating: Math.max(...ratings, 0),
      lowestRating: Math.min(...ratings, 5),
      categories,
      quarterlyBreakdown,
      performanceTrend,
    };
  };

  // Fetch data when modal opens
  useEffect(() => {
    if (isOpen && employee) {
      fetchEmployeeEvaluationHistory(employee.emp_id, employee.fname || "");
    }
  }, [isOpen, employee]);

  if (!employee) return null;

  // Design variant styles
  const isAdminVariant = designVariant === "admin";

  return (
    <Dialog open={isOpen} onOpenChangeAction={onCloseAction}>
      <DialogContent
        className={`max-w-3xl max-h-[80vh] overflow-y-auto p-6 animate-popup ${
          isAdminVariant
            ? "bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100"
            : "bg-gradient-to-br from-blue-50 to-indigo-50"
        }`}
      >
        <DialogHeader
          className={`pb-6 ${
            isAdminVariant
              ? "border-b-2 border-slate-300"
              : "border-b border-gray-200"
          }`}
        >
          <DialogTitle
            className={`text-2xl font-bold flex items-center gap-2 ${
              isAdminVariant ? "text-slate-800" : "text-gray-900"
            }`}
          >
            <User
              className={`w-6 h-6 ${
                isAdminVariant ? "text-slate-700" : "text-blue-600"
              }`}
            />
            Employee Profile
          </DialogTitle>
          <DialogDescription
            className={`text-base mt-2 ${
              isAdminVariant ? "text-slate-600" : "text-gray-600"
            }`}
          >
            Complete employee information and evaluation history
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Employee Header Card */}
          <Card
            className={`${
              isAdminVariant
                ? "bg-gradient-to-br from-slate-100 to-slate-200 border-2 border-slate-400 shadow-xl"
                : "bg-white border-2 border-blue-200 shadow-lg"
            }`}
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-6">
                <div className="flex-1">
                  <h2
                    className={`text-3xl font-bold mb-2 ${
                      isAdminVariant ? "text-slate-800" : "text-black"
                    }`}
                  >
                    {employee.fname + " " + employee.lname || "Not Assigned"}
                  </h2>
                  <div className="flex flex-wrap gap-3 mt-3">
                    <Badge
                      variant="outline"
                      className={`text-base px-3 py-1 ${
                        isAdminVariant
                          ? "bg-slate-100 text-slate-800 border-slate-400"
                          : "bg-blue-50 text-blue-700 border-blue-300"
                      }`}
                    >
                      <Briefcase className="w-4 h-4 mr-1.5" />
                      {employee.positions.label || "Not Assigned"}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-base px-3 py-1 ${
                        isAdminVariant
                          ? "bg-slate-200 text-slate-800 border-slate-500"
                          : "bg-purple-50 text-purple-700 border-purple-300"
                      }`}
                    >
                      <Building2 className="w-4 h-4 mr-1.5" />
                      {employee.departments?.department_name || "Not Assigned"}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-base px-3 py-1 ${
                        isAdminVariant
                          ? "bg-slate-300 text-slate-900 border-slate-600"
                          : "bg-green-50 text-green-700 border-green-300"
                      }`}
                    >
                      <Shield className="w-4 h-4 mr-1.5" />
                      {employee.roles[0].name || "Not Assigned"}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Employee Information Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Employee ID Card */}
            <Card
              className={`${
                isAdminVariant
                  ? "bg-slate-50 border-2 border-slate-300 shadow-md hover:shadow-lg"
                  : "bg-white border border-gray-200 shadow-sm hover:shadow-md"
              } transition-shadow`}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isAdminVariant ? "bg-slate-200" : "bg-blue-100"
                    }`}
                  >
                    <Hash
                      className={`w-5 h-5 ${
                        isAdminVariant ? "text-slate-700" : "text-blue-600"
                      }`}
                    />
                  </div>
                  <div>
                    <Label
                      className={`text-xs font-medium uppercase tracking-wide ${
                        isAdminVariant ? "text-slate-600" : "text-gray-500"
                      }`}
                    >
                      Employee ID
                    </Label>
                    <p
                      className={`text-lg font-semibold mt-1 ${
                        isAdminVariant ? "text-slate-800" : "text-black"
                      }`}
                    >
                      {empId}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Email Card */}
            <Card
              className={`${
                isAdminVariant
                  ? "bg-slate-50 border-2 border-slate-300 shadow-md hover:shadow-lg"
                  : "bg-white border border-gray-200 shadow-sm hover:shadow-md"
              } transition-shadow`}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isAdminVariant ? "bg-slate-200" : "bg-green-100"
                    }`}
                  >
                    <Mail
                      className={`w-5 h-5 ${
                        isAdminVariant ? "text-slate-700" : "text-green-600"
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Label
                      className={`text-xs font-medium uppercase tracking-wide ${
                        isAdminVariant ? "text-slate-600" : "text-gray-500"
                      }`}
                    >
                      Email Address
                    </Label>
                    <p
                      className={`text-sm font-medium mt-1 truncate ${
                        isAdminVariant ? "text-slate-800" : "text-black"
                      }`}
                    >
                      {employee.email || "Not Assigned"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Username Card */}
            {employee.username && (
              <Card
                className={`${
                  isAdminVariant
                    ? "bg-slate-50 border-2 border-slate-300 shadow-md hover:shadow-lg"
                    : "bg-white border border-gray-200 shadow-sm hover:shadow-md"
                } transition-shadow`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isAdminVariant ? "bg-slate-200" : "bg-indigo-100"
                      }`}
                    >
                      <UserCircle
                        className={`w-5 h-5 ${
                          isAdminVariant ? "text-slate-700" : "text-indigo-600"
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Label
                        className={`text-xs font-medium uppercase tracking-wide ${
                          isAdminVariant ? "text-slate-600" : "text-gray-500"
                        }`}
                      >
                        Username
                      </Label>
                      <p
                        className={`text-sm font-medium mt-1 ${
                          isAdminVariant ? "text-slate-800" : "text-black"
                        }`}
                      >
                        {employee.username}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Contact Card */}
            {employee.contact && (
              <Card
                className={`${
                  isAdminVariant
                    ? "bg-slate-50 border-2 border-slate-300 shadow-md hover:shadow-lg"
                    : "bg-white border border-gray-200 shadow-sm hover:shadow-md"
                } transition-shadow`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isAdminVariant ? "bg-slate-200" : "bg-teal-100"
                      }`}
                    >
                      <Phone
                        className={`w-5 h-5 ${
                          isAdminVariant ? "text-slate-700" : "text-teal-600"
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Label
                        className={`text-xs font-medium uppercase tracking-wide ${
                          isAdminVariant ? "text-slate-600" : "text-gray-500"
                        }`}
                      >
                        Contact Number
                      </Label>
                      <p
                        className={`text-sm font-medium mt-1 ${
                          isAdminVariant ? "text-slate-800" : "text-black"
                        }`}
                      >
                        {employee.contact}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Position Card */}
            <Card
              className={`${
                isAdminVariant
                  ? "bg-slate-50 border-2 border-slate-300 shadow-md hover:shadow-lg"
                  : "bg-white border border-gray-200 shadow-sm hover:shadow-md"
              } transition-shadow`}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isAdminVariant ? "bg-slate-200" : "bg-orange-100"
                    }`}
                  >
                    <Briefcase
                      className={`w-5 h-5 ${
                        isAdminVariant ? "text-slate-700" : "text-orange-600"
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Label
                      className={`text-xs font-medium uppercase tracking-wide ${
                        isAdminVariant ? "text-slate-600" : "text-gray-500"
                      }`}
                    >
                      Position
                    </Label>
                    <p
                      className={`text-sm font-medium mt-1 ${
                        isAdminVariant ? "text-slate-800" : "text-black"
                      }`}
                    >
                      {employee.positions.label || "Not Assigned"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Department Card */}
            <Card
              className={`${
                isAdminVariant
                  ? "bg-slate-50 border-2 border-slate-300 shadow-md hover:shadow-lg"
                  : "bg-white border border-gray-200 shadow-sm hover:shadow-md"
              } transition-shadow`}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isAdminVariant ? "bg-slate-200" : "bg-purple-100"
                    }`}
                  >
                    <Building2
                      className={`w-5 h-5 ${
                        isAdminVariant ? "text-slate-700" : "text-purple-600"
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Label
                      className={`text-xs font-medium uppercase tracking-wide ${
                        isAdminVariant ? "text-slate-600" : "text-gray-500"
                      }`}
                    >
                      Department
                    </Label>
                    <p
                      className={`text-sm font-medium mt-1 ${
                        isAdminVariant ? "text-slate-800" : "text-black"
                      }`}
                    >
                      {employee.departments?.department_name || "Not Assigned"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Branch Card */}
            {employee.branches.branch_name && (
              <Card
                className={`${
                  isAdminVariant
                    ? "bg-slate-50 border-2 border-slate-300 shadow-md hover:shadow-lg"
                    : "bg-white border border-gray-200 shadow-sm hover:shadow-md"
                } transition-shadow`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isAdminVariant ? "bg-slate-200" : "bg-cyan-100"
                      }`}
                    >
                      <MapPin
                        className={`w-5 h-5 ${
                          isAdminVariant ? "text-slate-700" : "text-cyan-600"
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Label
                        className={`text-xs font-medium uppercase tracking-wide ${
                          isAdminVariant ? "text-slate-600" : "text-gray-500"
                        }`}
                      >
                        Branch
                      </Label>
                      <p
                        className={`text-sm font-medium mt-1 ${
                          isAdminVariant ? "text-slate-800" : "text-black"
                        }`}
                      >
                        {employee.branches.branch_name}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Created Date Card */}
            {employee.created_at && (
              <Card
                className={`${
                  isAdminVariant
                    ? "bg-slate-50 border-2 border-slate-300 shadow-md hover:shadow-lg"
                    : "bg-white border border-gray-200 shadow-sm hover:shadow-md"
                } transition-shadow`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isAdminVariant ? "bg-slate-200" : "bg-pink-100"
                      }`}
                    >
                      <Calendar
                        className={`w-5 h-5 ${
                          isAdminVariant ? "text-slate-700" : "text-pink-600"
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Label
                        className={`text-xs font-medium uppercase tracking-wide ${
                          isAdminVariant ? "text-slate-600" : "text-gray-500"
                        }`}
                      >
                        Created Date
                      </Label>
                      <p
                        className={`text-sm font-medium mt-1 ${
                          isAdminVariant ? "text-slate-800" : "text-black"
                        }`}
                      >
                        {new Date(employee.created_at).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Bio Section */}
          {employee.bio && (
            <Card
              className={`${
                isAdminVariant
                  ? "bg-slate-50 border-2 border-slate-300 shadow-md"
                  : "bg-white border border-gray-200 shadow-sm"
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isAdminVariant ? "bg-slate-200" : "bg-amber-100"
                    }`}
                  >
                    <FileText
                      className={`w-5 h-5 ${
                        isAdminVariant ? "text-slate-700" : "text-amber-600"
                      }`}
                    />
                  </div>
                  <div className="flex-1">
                    <Label
                      className={`text-xs font-medium uppercase tracking-wide ${
                        isAdminVariant ? "text-slate-600" : "text-gray-500"
                      }`}
                    >
                      Bio
                    </Label>
                    <p
                      className={`text-sm mt-1 ${
                        isAdminVariant ? "text-slate-800" : "text-black"
                      }`}
                    >
                      {employee.bio}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Performance Metrics Section */}
          {employeeEvaluationData.length > 0 && (
            <Card
              className={`${
                isAdminVariant
                  ? "bg-gradient-to-br from-slate-100 to-slate-200 border-2 border-slate-400 shadow-xl"
                  : "bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 shadow-lg"
              }`}
            >
              <CardContent className="p-6">
                <h4
                  className={`text-xl font-bold mb-6 flex items-center gap-2 ${
                    isAdminVariant ? "text-slate-800" : "text-black"
                  }`}
                >
                  <Briefcase
                    className={`w-5 h-5 ${
                      isAdminVariant ? "text-slate-700" : "text-blue-600"
                    }`}
                  />
                  Performance Overview
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(() => {
                    const metrics = getEmployeePerformanceMetrics(
                      employeeEvaluationData
                    );
                    return (
                      <>
                        <div
                          className={`rounded-lg p-4 text-center shadow-md border-2 ${
                            isAdminVariant
                              ? "bg-slate-50 border-slate-300"
                              : "bg-white border border-gray-200"
                          }`}
                        >
                          <div
                            className={`text-3xl font-bold mb-1 ${
                              isAdminVariant
                                ? "text-slate-700"
                                : "text-blue-600"
                            }`}
                          >
                            {metrics.totalEvaluations}
                          </div>
                          <div
                            className={`text-xs font-medium uppercase tracking-wide ${
                              isAdminVariant
                                ? "text-slate-600"
                                : "text-gray-600"
                            }`}
                          >
                            Total Evaluations
                          </div>
                        </div>
                        <div
                          className={`rounded-lg p-4 text-center shadow-md border-2 ${
                            isAdminVariant
                              ? "bg-slate-50 border-slate-300"
                              : "bg-white border border-gray-200"
                          }`}
                        >
                          <div
                            className={`text-3xl font-bold mb-1 ${
                              isAdminVariant
                                ? "text-slate-700"
                                : "text-green-600"
                            }`}
                          >
                            {metrics.averageRating}
                          </div>
                          <div
                            className={`text-xs font-medium uppercase tracking-wide ${
                              isAdminVariant
                                ? "text-slate-600"
                                : "text-gray-600"
                            }`}
                          >
                            Average Rating
                          </div>
                        </div>
                        <div
                          className={`rounded-lg p-4 text-center shadow-md border-2 ${
                            isAdminVariant
                              ? "bg-slate-50 border-slate-300"
                              : "bg-white border border-gray-200"
                          }`}
                        >
                          <div
                            className={`text-3xl font-bold mb-1 ${
                              isAdminVariant
                                ? "text-slate-700"
                                : "text-purple-600"
                            }`}
                          >
                            {metrics.highestRating}
                          </div>
                          <div
                            className={`text-xs font-medium uppercase tracking-wide ${
                              isAdminVariant
                                ? "text-slate-600"
                                : "text-gray-600"
                            }`}
                          >
                            Highest Rating
                          </div>
                        </div>
                        <div
                          className={`rounded-lg p-4 text-center shadow-md border-2 ${
                            isAdminVariant
                              ? "bg-slate-50 border-slate-300"
                              : "bg-white border border-gray-200"
                          }`}
                        >
                          <div
                            className={`text-3xl font-bold mb-1 ${
                              isAdminVariant
                                ? "text-slate-700"
                                : "text-orange-600"
                            }`}
                          >
                            {metrics.performanceTrend === "improving"
                              ? "↗"
                              : metrics.performanceTrend === "declining"
                              ? "↘"
                              : "→"}
                          </div>
                          <div
                            className={`text-xs font-medium uppercase tracking-wide capitalize ${
                              isAdminVariant
                                ? "text-slate-600"
                                : "text-gray-600"
                            }`}
                          >
                            {metrics.performanceTrend}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div
            className={`flex justify-end gap-3 pt-4 ${
              isAdminVariant
                ? "border-t-2 border-slate-300"
                : "border-t border-gray-200"
            }`}
          >
            <Button
              onClick={onCloseAction}
              className="bg-blue-600 hover:bg-red-700 text-white"
            >
              <X className="w-4 h-4 mr-2 " />
              Close
            </Button>
            {!isAdminVariant && (
              <Button
                onClick={() => onStartEvaluationAction(employee)}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Evaluate Employee
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
