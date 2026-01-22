import Step1 from "../Step1";
import Step2 from "../Step2";
import Step3 from "../Step3";
import Step4 from "../Step4";
import Step5 from "../Step5";
import Step6 from "../Step6";
import Step7 from "../Step7";
import OverallAssessment from "../OverallAssessment";
import { EvaluationStepConfig } from "../types";

// Standard employee evaluation configuration (Steps 1-7 + Overall Assessment)
export const employeeEvaluationSteps: EvaluationStepConfig[] = [
  { id: 1, title: "Employee Information / Job Knowledge", component: Step1 },
  { id: 2, title: "Quality of Work", component: Step2 },
  { id: 3, title: "Adaptability", component: Step3 },
  { id: 4, title: "Teamwork", component: Step4 },
  { id: 5, title: "Reliability", component: Step5 },
  { id: 6, title: "Ethical & Professional Behavior", component: Step6 },
  { id: 7, title: "Customer Service", component: Step7 },
  { id: 8, title: "Overall Assessment", component: OverallAssessment },
];

