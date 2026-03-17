import Step1 from "../Step1";
import Step2 from "../newStep2";
import Step3 from "../Step3";
import Step4 from "../Step4";
import Step5 from "../Step5";
import Step6 from "../Step6";
import Step8 from "../Step8";
import OverallAssessmentAreaManager from "../OverallAssessmentAreaManager";
import { EvaluationStepConfig } from "../types";

// Area Manager evaluation configuration - excludes Customer Service step
// Used for AVP evaluating Area Managers
export const areaManagerEvaluationSteps: EvaluationStepConfig[] = [
  { id: 1, title: "Employee Information / Job Knowledge", component: Step1 },
  { id: 2, title: "Quality of Work", component: Step2 },
  { id: 3, title: "Adaptability", component: Step3 },
  { id: 4, title: "Teamwork", component: Step4 },
  { id: 5, title: "Reliability", component: Step5 },
  { id: 6, title: "Ethical & Professional Behavior", component: Step6 },
  { id: 7, title: "Managerial Skills", component: Step8 },
  { id: 8, title: "Overall Assessment", component: OverallAssessmentAreaManager },
];
