"use client";

import EvaluationForm from "../evaluation";
import Step1 from "../evaluation/Step1";
import Step2 from "../evaluation/Step2";
import Step3 from "../evaluation/Step3";
import Step4 from "../evaluation/Step4";
import Step5 from "../evaluation/Step5";
import Step6 from "../evaluation/Step6";
import Step7 from "../evaluation/Step7";
import Step8 from "../evaluation/Step8";
import OverallAssessmentBasic from "../evaluation/OverallAssessmentBasic";
import { EvaluationStepConfig } from "../evaluation/types";
import { User } from "../../contexts/UserContext";

// Manager evaluation configuration - Steps 1-8 (all standard steps) + Step 8 (Managerial Skills) + Overall Assessment
// Note: Step 8 here is Managerial Skills, and Step 9 would be Overall Assessment
const managerSteps: EvaluationStepConfig[] = [
  { id: 1, title: "Employee Information / Job Knowledge", component: Step1 },
  { id: 2, title: "Quality of Work", component: Step2 },
  { id: 3, title: "Adaptability", component: Step3 },
  { id: 4, title: "Teamwork", component: Step4 },
  { id: 5, title: "Reliability", component: Step5 },
  { id: 6, title: "Ethical & Professional Behavior", component: Step6 },
  { id: 7, title: "Customer Service", component: Step7 },
  { id: 8, title: "Managerial Skills", component: Step8 },
  { id: 9, title: "Overall Assessment", component: OverallAssessmentBasic },
];

interface ManagerEvaluationFormProps {
  employee?: {
    id: number;
    name: string;
    email: string;
    position: string;
    department: string;
    branch?: string;
    role?: string;
    employeeId?: string;
    hireDate: string;
  } | null;
  onCloseAction?: () => void;
  onCancelAction?: () => void;
}

export default function ManagerEvaluationForm({
  employee,
  onCloseAction,
  onCancelAction,
}: ManagerEvaluationFormProps) {
  // Convert the employee prop to match the User type expected by EvaluationForm
  const convertedEmployee: User | null = employee
    ? {
        id: employee.id,
        fname: employee.name.split(" ")[0] || "",
        lname: employee.name.split(" ").slice(1).join(" ") || "",
        username: employee.email || "",
        contact: 0, // Default value as contact is required
        email: employee.email,
        position_id: 0, // Default value as position_id is required
        positions: { label: employee.position, name: employee.position },
        department_id: "",
        departments: { department_name: employee.department },
        branch_id: "",
        branches: employee.branch ? { branch_name: employee.branch } : undefined,
        roles: employee.role ? [{ name: employee.role }] : undefined,
        emp_id: employee.employeeId,
        is_active: "1",
        notifications: [],
        notification_counts: 0,
        approvedSignatureReset: 0,
        requestSignatureReset: 0,
        date_hired: employee.hireDate,
      } as User
    : null;

  return (
    <EvaluationForm
      employee={convertedEmployee}
      onCloseAction={onCloseAction}
      onCancelAction={onCancelAction}
      steps={managerSteps}
      evaluationType="default"
    />
  );
}

