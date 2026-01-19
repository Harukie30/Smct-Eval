'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertTriangle } from 'lucide-react';
import Step1 from './Step1';
import Step2 from './Step2';
import Step3 from './Step3';
import Step4 from './Step4';
import Step5 from './Step5';
import Step6 from './Step6';
import Step7 from './Step7';
import Step8 from './Step8';
import OverallAssessment from './OverallAssessment';
import WelcomeStep from './WelcomeStep';
import { EvaluationData } from './types';
import { storeEvaluationResult } from '@/lib/evaluationStorage';
import { apiService } from '@/lib/apiService';
import { createEvaluationNotification } from '@/lib/notificationUtils';
import { useAuth } from '@/contexts/UserContext';

const steps = [
  { id: 1, title: 'Employee Information / Job Knowledge', component: Step1 },
  { id: 2, title: 'Quality of Work', component: Step2 },
  { id: 3, title: 'Adaptability', component: Step3 },
  { id: 4, title: 'Teamwork', component: Step4 },
  { id: 5, title: 'Reliability', component: Step5 },
  { id: 6, title: 'Ethical & Professional Behavior', component: Step6 },
  { id: 7, title: 'Customer Service', component: Step7 },
  { id: 8, title: 'Managerial Skills', component: Step8 },
  { id: 9, title: 'Overall Assessment', component: OverallAssessment },
];

interface EvaluationFormProps {
  employee?: {
    id: number;
    name: string;
    email: string;
    position: string;
    department: string;
    branch?: string;
    role: string;
    signature?: string;
    employeeId?: string; // Formatted employee ID from registration (e.g., "1234-567890")
    hireDate?: string; // Date hired - required by some step components
  };
  currentUser?: {
    id: number;
    name: string;
    email: string;
    position: string;
    department: string;
    role: string;
    signature?: string;
  };
  onCloseAction?: () => void;
  onCancelAction?: () => void;
}

export default function ManagerEvaluationForm({ employee, currentUser, onCloseAction, onCancelAction }: EvaluationFormProps) {
  const { user } = useAuth();
  
  // Check if evaluator's branch is HO (Head Office)
  const isEvaluatorHO = () => {
    if (!user?.branches) return false;
    
    // Handle branches as array
    if (Array.isArray(user.branches)) {
      const branch = user.branches[0];
      if (branch) {
        const branchName = branch.branch_name?.toUpperCase() || "";
        const branchCode = branch.branch_code?.toUpperCase() || "";
        return branchName === "HO" || branchCode === "HO" || branchName.includes("HEAD OFFICE");
      }
    }
    
    // Handle branches as object
    if (typeof user.branches === 'object') {
      const branchName = (user.branches as any)?.branch_name?.toUpperCase() || "";
      const branchCode = (user.branches as any)?.branch_code?.toUpperCase() || "";
      return branchName === "HO" || branchCode === "HO" || branchName.includes("HEAD OFFICE");
    }
    
    return false;
  };

  const isHO = isEvaluatorHO();
  
  // Filter steps based on HO status - remove Step 7 for HO evaluators
  const filteredSteps = isHO ? steps.filter(step => step.id !== 7) : steps;
  
  const [currentStep, setCurrentStep] = useState(0); // 0 = welcome step, 1-9 = actual steps
  const [welcomeAnimationKey, setWelcomeAnimationKey] = useState(0);
  
  // Reset animation when returning to welcome step or on initial mount
  useEffect(() => {
    if (currentStep === 0) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        setWelcomeAnimationKey(prev => prev + 1);
      }, 10);
    }
  }, [currentStep]);
  
  // Trigger animation on initial mount
  useEffect(() => {
    setWelcomeAnimationKey(prev => prev + 1);
  }, []);
  
  const [evaluationData, setEvaluationData] = useState<EvaluationData>({
    employeeId: employee?.employeeId || employee?.id?.toString() || '',
    employeeName: employee?.name || '',
    position: employee?.position || '',
    department: employee?.department || '',
    branch: employee?.branch || '',
    role: employee?.role || '',
    supervisor: '',
    hireDate: '',
    coverageFrom: '',
    coverageTo: '',
    others: '',
    reviewTypeProbationary3: false,
    reviewTypeProbationary5: false,
    reviewTypeRegularQ1: false,
    reviewTypeRegularQ2: false,
    reviewTypeRegularQ3: false,
    reviewTypeRegularQ4: false,
    reviewTypeOthersImprovement: false,
    reviewTypeOthersCustom: '',
    jobKnowledgeScore1: 0,
    jobKnowledgeScore2: 0,
    jobKnowledgeScore3: 0,
    jobKnowledgeComments1: '',
    jobKnowledgeComments2: '',
    jobKnowledgeComments3: '',
    qualityOfWorkScore1: 0,
    qualityOfWorkScore2: 0,
    qualityOfWorkScore3: 0,
    qualityOfWorkScore4: 0,
    qualityOfWorkScore5: 0,
    qualityOfWorkComments1: '',
    qualityOfWorkComments2: '',
    qualityOfWorkComments3: '',
    qualityOfWorkComments4: '',
    qualityOfWorkComments5: '',
    adaptabilityScore1: 0,
    adaptabilityScore2: 0,
    adaptabilityScore3: 0,
    adaptabilityComments1: '',
    adaptabilityComments2: '',
    adaptabilityComments3: '',
    teamworkScore1: 0,
    teamworkScore2: 0,
    teamworkScore3: 0,
    teamworkComments1: '',
    teamworkComments2: '',
    teamworkComments3: '',
    reliabilityScore1: 0,
    reliabilityScore2: 0,
    reliabilityScore3: 0,
    reliabilityScore4: 0,
    reliabilityComments1: '',
    reliabilityComments2: '',
    reliabilityComments3: '',
    reliabilityComments4: '',
    communication: 0,
    communicationComments: '',
    teamwork: 0,
    teamworkComments: '',
    problemSolving: 0,
    problemSolvingComments: '',
    leadership: 0,
    leadershipComments: '',
    ethicalScore1: 0,
    ethicalScore2: 0,
    ethicalScore3: 0,
    ethicalScore4: 0,
    ethicalRating1: '',
    ethicalRating2: '',
    ethicalRating3: '',
    ethicalRating4: '',
    ethicalExplanation1: '',
    ethicalExplanation2: '',
    ethicalExplanation3: '',
    ethicalExplanation4: '',
    ethicalComments: '',
    customerServiceScore1: 0,
    customerServiceScore2: 0,
    customerServiceScore3: 0,
    customerServiceScore4: 0,
    customerServiceScore5: 0,
    customerServiceExplanation1: '',
    customerServiceExplanation2: '',
    customerServiceExplanation3: '',
    customerServiceExplanation4: '',
    customerServiceExplanation5: '',
    customerServiceComments: '',
    managerialSkillsScore1: 0,
    managerialSkillsScore2: 0,
    managerialSkillsScore3: 0,
    managerialSkillsScore4: 0,
    managerialSkillsScore5: 0,
    managerialSkillsScore6: 0,
    managerialSkillsExplanation1: '',
    managerialSkillsExplanation2: '',
    managerialSkillsExplanation3: '',
    managerialSkillsExplanation4: '',
    managerialSkillsExplanation5: '',
    managerialSkillsExplanation6: '',
    managerialSkillsComments: '',
    overallRating: '',
    overallComments: '',
    recommendations: '',
    priorityArea1: '',
    priorityArea2: '',
    priorityArea3: '',
    remarks: '',
    employeeSignature: '',
    employeeSignatureDate: '',
    evaluatorSignature: '',
    evaluatorSignatureDate: '',
    evaluatorSignatureImage: '',
    evaluatorApproved: false,
    evaluatorApprovedAt: '',
  });
  
  const [isEvaluatorApproved, setIsEvaluatorApproved] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  // Update evaluation data when employee prop changes
  useEffect(() => {
    if (employee) {
      setEvaluationData(prev => {
        // Only update if the values have actually changed to prevent infinite loops
        const newEmployeeId = employee.employeeId || employee.id.toString();
        const newEmployeeName = employee.name || '';
        const newPosition = employee.position || '';
        const newDepartment = employee.department || '';
        const newBranch = employee.branch || '';
        const newRole = employee.role || '';
        
        // Normalize previous values for comparison
        const prevEmployeeId = prev.employeeId || '';
        const prevEmployeeName = prev.employeeName || '';
        const prevPosition = prev.position || '';
        const prevDepartment = prev.department || '';
        const prevBranch = prev.branch || '';
        const prevRole = prev.role || '';
        
        if (
          prevEmployeeId !== newEmployeeId ||
          prevEmployeeName !== newEmployeeName ||
          prevPosition !== newPosition ||
          prevDepartment !== newDepartment ||
          prevBranch !== newBranch ||
          prevRole !== newRole
        ) {
          return {
            ...prev,
            employeeId: newEmployeeId,
            employeeName: newEmployeeName,
            position: newPosition,
            department: newDepartment,
            branch: newBranch,
            role: newRole,
          };
        }
        return prev; // Return previous state if nothing changed
      });
    }
  }, [employee?.id, employee?.employeeId, employee?.name, employee?.position, employee?.department, employee?.branch, employee?.role]);

  const updateEvaluationData = useCallback((updates: Partial<EvaluationData>) => {
    setEvaluationData(prev => {
      const newData = { ...prev, ...updates };
      return newData;
    });
  }, []);

  const startEvaluation = () => {
    setCurrentStep(1);
  };

  // Check if current step scores are complete
  const isCurrentStepComplete = () => {
    switch (currentStep) {
      case 1: // Employee Information & Job Knowledge
        // Check if at least one review type is selected
        const hasReviewType = (
          evaluationData.reviewTypeProbationary3 ||
          evaluationData.reviewTypeProbationary5 ||
          evaluationData.reviewTypeRegularQ1 ||
          evaluationData.reviewTypeRegularQ2 ||
          evaluationData.reviewTypeRegularQ3 ||
          evaluationData.reviewTypeRegularQ4 ||
          evaluationData.reviewTypeOthersImprovement ||
          (evaluationData.reviewTypeOthersCustom && evaluationData.reviewTypeOthersCustom.trim() !== '')
        );
        
        // Check if all employee information is filled
        const hasEmployeeInfo = (
          evaluationData.employeeName && evaluationData.employeeName.trim() !== '' &&
          evaluationData.employeeId && evaluationData.employeeId.trim() !== '' &&
          evaluationData.position && evaluationData.position.trim() !== '' &&
          evaluationData.department && evaluationData.department.trim() !== '' &&
          evaluationData.branch && evaluationData.branch.trim() !== ''
        );
        
        // Check if all job knowledge scores are filled
        const hasJobKnowledgeScores = (
          evaluationData.jobKnowledgeScore1 && evaluationData.jobKnowledgeScore1 !== 0 &&
          evaluationData.jobKnowledgeScore2 && evaluationData.jobKnowledgeScore2 !== 0 &&
          evaluationData.jobKnowledgeScore3 && evaluationData.jobKnowledgeScore3 !== 0
        );
        
        // Check if basic evaluation information is filled
        const hasBasicInfo = (
          evaluationData.supervisor && evaluationData.supervisor.trim() !== '' &&
          evaluationData.coverageFrom && evaluationData.coverageFrom.trim() !== '' &&
          evaluationData.coverageTo && evaluationData.coverageTo.trim() !== ''
        );
        
        return hasReviewType && hasEmployeeInfo && hasJobKnowledgeScores && hasBasicInfo;
      case 2: // Quality of Work
        // Check if evaluator is HO
        const isEvaluatorHO = () => {
          if (!user?.branches) return false;
          
          // Handle branches as array
          if (Array.isArray(user.branches)) {
            const branch = user.branches[0];
            if (branch) {
              const branchName = branch.branch_name?.toUpperCase() || "";
              const branchCode = branch.branch_code?.toUpperCase() || "";
              return branchName === "HO" || branchCode === "HO" || branchName.includes("HEAD OFFICE");
            }
          }
          
          // Handle branches as object
          if (typeof user.branches === 'object') {
            const branchName = (user.branches as any)?.branch_name?.toUpperCase() || "";
            const branchCode = (user.branches as any)?.branch_code?.toUpperCase() || "";
            return branchName === "HO" || branchCode === "HO" || branchName.includes("HEAD OFFICE");
          }
          
          return false;
        };
        
        const isHO = isEvaluatorHO();
        
        return (
          evaluationData.qualityOfWorkScore1 && evaluationData.qualityOfWorkScore1 !== 0 &&
          evaluationData.qualityOfWorkScore2 && evaluationData.qualityOfWorkScore2 !== 0 &&
          evaluationData.qualityOfWorkScore3 && evaluationData.qualityOfWorkScore3 !== 0 &&
          evaluationData.qualityOfWorkScore4 && evaluationData.qualityOfWorkScore4 !== 0 &&
          // qualityOfWorkScore5 is only required if not HO
          (isHO || (evaluationData.qualityOfWorkScore5 && evaluationData.qualityOfWorkScore5 !== 0))
        );
      case 3: // Adaptability
        return (
          evaluationData.adaptabilityScore1 && evaluationData.adaptabilityScore1 !== 0 &&
          evaluationData.adaptabilityScore2 && evaluationData.adaptabilityScore2 !== 0 &&
          evaluationData.adaptabilityScore3 && evaluationData.adaptabilityScore3 !== 0
        );
      case 4: // Teamwork
        return (
          evaluationData.teamworkScore1 && evaluationData.teamworkScore1 !== 0 &&
          evaluationData.teamworkScore2 && evaluationData.teamworkScore2 !== 0 &&
          evaluationData.teamworkScore3 && evaluationData.teamworkScore3 !== 0
        );
      case 5: // Reliability
        return (
          evaluationData.reliabilityScore1 && evaluationData.reliabilityScore1 !== 0 &&
          evaluationData.reliabilityScore2 && evaluationData.reliabilityScore2 !== 0 &&
          evaluationData.reliabilityScore3 && evaluationData.reliabilityScore3 !== 0 &&
          evaluationData.reliabilityScore4 && evaluationData.reliabilityScore4 !== 0 
        );
      case 6: // Ethical & Professional Behavior
        return (
          evaluationData.ethicalScore1 && evaluationData.ethicalScore1 !== 0 &&
          evaluationData.ethicalScore2 && evaluationData.ethicalScore2 !== 0 &&
          evaluationData.ethicalScore3 && evaluationData.ethicalScore3 !== 0 &&
          evaluationData.ethicalScore4 && evaluationData.ethicalScore4 !== 0
        );
      case 7: // Customer Service
        // Check if evaluator is HO - Step 7 is not applicable for HO
        const isEvaluatorHO_Step7 = () => {
          if (!user?.branches) return false;
          
          // Handle branches as array
          if (Array.isArray(user.branches)) {
            const branch = user.branches[0];
            if (branch) {
              const branchName = branch.branch_name?.toUpperCase() || "";
              const branchCode = branch.branch_code?.toUpperCase() || "";
              return branchName === "HO" || branchCode === "HO" || branchName.includes("HEAD OFFICE");
            }
          }
          
          // Handle branches as object
          if (typeof user.branches === 'object') {
            const branchName = (user.branches as any)?.branch_name?.toUpperCase() || "";
            const branchCode = (user.branches as any)?.branch_code?.toUpperCase() || "";
            return branchName === "HO" || branchCode === "HO" || branchName.includes("HEAD OFFICE");
          }
          
          return false;
        };
        
        const isHO_Step7 = isEvaluatorHO_Step7();
        
        // Step 7 is always valid for HO evaluators (not applicable)
        if (isHO_Step7) {
          return true;
        }
        
        // For non-HO evaluators, require all customer service scores
        return (
          evaluationData.customerServiceScore1 && evaluationData.customerServiceScore1 !== 0 &&
          evaluationData.customerServiceScore2 && evaluationData.customerServiceScore2 !== 0 &&
          evaluationData.customerServiceScore3 && evaluationData.customerServiceScore3 !== 0 &&
          evaluationData.customerServiceScore4 && evaluationData.customerServiceScore4 !== 0 &&
          evaluationData.customerServiceScore5 && evaluationData.customerServiceScore5 !== 0
        );
      case 8: // Managerial Skills
        return (
          evaluationData.managerialSkillsScore1 && evaluationData.managerialSkillsScore1 !== 0 &&
          evaluationData.managerialSkillsScore2 && evaluationData.managerialSkillsScore2 !== 0 &&
          evaluationData.managerialSkillsScore3 && evaluationData.managerialSkillsScore3 !== 0 &&
          evaluationData.managerialSkillsScore4 && evaluationData.managerialSkillsScore4 !== 0 &&
          evaluationData.managerialSkillsScore5 && evaluationData.managerialSkillsScore5 !== 0 &&
          evaluationData.managerialSkillsScore6 && evaluationData.managerialSkillsScore6 !== 0
        );
      case 9: // Overall Assessment
        return true; // No validation required for step 9
      default:
        return true; // For other steps, allow progression
    }
  };

  // Get step name for tooltip
  const getStepName = () => {
    switch (currentStep) {
      case 1: return 'Employee Information & Job Knowledge';
      case 2: return 'Quality of Work';
      case 3: return 'Adaptability';
      case 4: return 'Teamwork';
      case 5: return 'Reliability';
      case 6: return 'Ethical & Professional Behavior';
      case 7: return 'Customer Service';
      case 8: return 'Managerial Skills';
      case 9: return 'Overall Assessment';
      default: return 'evaluation';
    }
  };

  // Get validation message for incomplete steps
  const getValidationMessage = () => {
    switch (currentStep) {
      case 1: // Employee Information & Job Knowledge
        // Check review type first
        if (!evaluationData.reviewTypeProbationary3 && !evaluationData.reviewTypeProbationary5 && 
            !evaluationData.reviewTypeRegularQ1 && !evaluationData.reviewTypeRegularQ2 && 
            !evaluationData.reviewTypeRegularQ3 && !evaluationData.reviewTypeRegularQ4 && 
            !evaluationData.reviewTypeOthersImprovement && 
            (!evaluationData.reviewTypeOthersCustom || evaluationData.reviewTypeOthersCustom.trim() === '')) {
          return 'Please select at least one review type';
        }
        // Check employee information
        if (!evaluationData.employeeName || evaluationData.employeeName.trim() === '') {
          return 'Employee name is required';
        }
        if (!evaluationData.employeeId || evaluationData.employeeId.trim() === '') {
          return 'Employee ID is required';
        }
        if (!evaluationData.position || evaluationData.position.trim() === '') {
          return 'Position is required';
        }
        if (!evaluationData.department || evaluationData.department.trim() === '') {
          return 'Department is required';
        }
        if (!evaluationData.branch || evaluationData.branch.trim() === '') {
          return 'Branch is required';
        }
        // Check evaluation information
        if (!evaluationData.supervisor || evaluationData.supervisor.trim() === '') {
          return 'Please enter supervisor name';
        }
        if (!evaluationData.coverageFrom || evaluationData.coverageFrom.trim() === '') {
          return 'Please select coverage from date';
        }
        if (!evaluationData.coverageTo || evaluationData.coverageTo.trim() === '') {
          return 'Please select coverage to date';
        }
        // Check job knowledge scores
        if (!evaluationData.jobKnowledgeScore1 || evaluationData.jobKnowledgeScore1 === 0) {
          return 'Please complete all job knowledge scores (Score 1)';
        }
        if (!evaluationData.jobKnowledgeScore2 || evaluationData.jobKnowledgeScore2 === 0) {
          return 'Please complete all job knowledge scores (Score 2)';
        }
        if (!evaluationData.jobKnowledgeScore3 || evaluationData.jobKnowledgeScore3 === 0) {
          return 'Please complete all job knowledge scores (Score 3)';
        }
        return 'Please complete all required fields';
      case 2: // Quality of Work
        if (!evaluationData.qualityOfWorkScore1 || evaluationData.qualityOfWorkScore1 === 0) {
          return 'Please complete all quality of work scores (Score 1)';
        }
        if (!evaluationData.qualityOfWorkScore2 || evaluationData.qualityOfWorkScore2 === 0) {
          return 'Please complete all quality of work scores (Score 2)';
        }
        if (!evaluationData.qualityOfWorkScore3 || evaluationData.qualityOfWorkScore3 === 0) {
          return 'Please complete all quality of work scores (Score 3)';
        }
        if (!evaluationData.qualityOfWorkScore4 || evaluationData.qualityOfWorkScore4 === 0) {
          return 'Please complete all quality of work scores (Score 4)';
        }
        // Check if evaluator is HO
        const isEvaluatorHO_Step2 = () => {
          if (!user?.branches) return false;
          if (Array.isArray(user.branches)) {
            const branch = user.branches[0];
            if (branch) {
              const branchName = branch.branch_name?.toUpperCase() || "";
              const branchCode = branch.branch_code?.toUpperCase() || "";
              return branchName === "HO" || branchCode === "HO" || branchName.includes("HEAD OFFICE");
            }
          }
          if (typeof user.branches === 'object') {
            const branchName = (user.branches as any)?.branch_name?.toUpperCase() || "";
            const branchCode = (user.branches as any)?.branch_code?.toUpperCase() || "";
            return branchName === "HO" || branchCode === "HO" || branchName.includes("HEAD OFFICE");
          }
          return false;
        };
        if (!isEvaluatorHO_Step2() && (!evaluationData.qualityOfWorkScore5 || evaluationData.qualityOfWorkScore5 === 0)) {
          return 'Please complete all quality of work scores (Score 5)';
        }
        return 'Please complete all quality of work scores';
      case 3: // Adaptability
        if (!evaluationData.adaptabilityScore1 || evaluationData.adaptabilityScore1 === 0) {
          return 'Please complete all adaptability scores (Score 1)';
        }
        if (!evaluationData.adaptabilityScore2 || evaluationData.adaptabilityScore2 === 0) {
          return 'Please complete all adaptability scores (Score 2)';
        }
        if (!evaluationData.adaptabilityScore3 || evaluationData.adaptabilityScore3 === 0) {
          return 'Please complete all adaptability scores (Score 3)';
        }
        return 'Please complete all adaptability scores';
      case 4: // Teamwork
        if (!evaluationData.teamworkScore1 || evaluationData.teamworkScore1 === 0) {
          return 'Please complete all teamwork scores (Score 1)';
        }
        if (!evaluationData.teamworkScore2 || evaluationData.teamworkScore2 === 0) {
          return 'Please complete all teamwork scores (Score 2)';
        }
        if (!evaluationData.teamworkScore3 || evaluationData.teamworkScore3 === 0) {
          return 'Please complete all teamwork scores (Score 3)';
        }
        return 'Please complete all teamwork scores';
      case 5: // Reliability
        if (!evaluationData.reliabilityScore1 || evaluationData.reliabilityScore1 === 0) {
          return 'Please complete all reliability scores (Score 1)';
        }
        if (!evaluationData.reliabilityScore2 || evaluationData.reliabilityScore2 === 0) {
          return 'Please complete all reliability scores (Score 2)';
        }
        if (!evaluationData.reliabilityScore3 || evaluationData.reliabilityScore3 === 0) {
          return 'Please complete all reliability scores (Score 3)';
        }
        if (!evaluationData.reliabilityScore4 || evaluationData.reliabilityScore4 === 0) {
          return 'Please complete all reliability scores (Score 4)';
        }
        return 'Please complete all reliability scores';
      case 6: // Ethical & Professional Behavior
        if (!evaluationData.ethicalScore1 || evaluationData.ethicalScore1 === 0) {
          return 'Please complete all ethical & professional behavior scores (Score 1)';
        }
        if (!evaluationData.ethicalScore2 || evaluationData.ethicalScore2 === 0) {
          return 'Please complete all ethical & professional behavior scores (Score 2)';
        }
        if (!evaluationData.ethicalScore3 || evaluationData.ethicalScore3 === 0) {
          return 'Please complete all ethical & professional behavior scores (Score 3)';
        }
        if (!evaluationData.ethicalScore4 || evaluationData.ethicalScore4 === 0) {
          return 'Please complete all ethical & professional behavior scores (Score 4)';
        }
        return 'Please complete all ethical & professional behavior scores';
      case 7: // Customer Service
        // Check if evaluator is HO - Step 7 is not applicable for HO
        const isEvaluatorHO_Step7 = () => {
          if (!user?.branches) return false;
          if (Array.isArray(user.branches)) {
            const branch = user.branches[0];
            if (branch) {
              const branchName = branch.branch_name?.toUpperCase() || "";
              const branchCode = branch.branch_code?.toUpperCase() || "";
              return branchName === "HO" || branchCode === "HO" || branchName.includes("HEAD OFFICE");
            }
          }
          if (typeof user.branches === 'object') {
            const branchName = (user.branches as any)?.branch_name?.toUpperCase() || "";
            const branchCode = (user.branches as any)?.branch_code?.toUpperCase() || "";
            return branchName === "HO" || branchCode === "HO" || branchName.includes("HEAD OFFICE");
          }
          return false;
        };
        if (isEvaluatorHO_Step7()) {
          return ''; // Step 7 is not applicable for HO
        }
        if (!evaluationData.customerServiceScore1 || evaluationData.customerServiceScore1 === 0) {
          return 'Please complete all customer service scores (Score 1)';
        }
        if (!evaluationData.customerServiceScore2 || evaluationData.customerServiceScore2 === 0) {
          return 'Please complete all customer service scores (Score 2)';
        }
        if (!evaluationData.customerServiceScore3 || evaluationData.customerServiceScore3 === 0) {
          return 'Please complete all customer service scores (Score 3)';
        }
        if (!evaluationData.customerServiceScore4 || evaluationData.customerServiceScore4 === 0) {
          return 'Please complete all customer service scores (Score 4)';
        }
        if (!evaluationData.customerServiceScore5 || evaluationData.customerServiceScore5 === 0) {
          return 'Please complete all customer service scores (Score 5)';
        }
        return 'Please complete all customer service scores';
      case 8: // Managerial Skills
        if (!evaluationData.managerialSkillsScore1 || evaluationData.managerialSkillsScore1 === 0) {
          return 'Please complete all managerial skills scores (Score 1)';
        }
        if (!evaluationData.managerialSkillsScore2 || evaluationData.managerialSkillsScore2 === 0) {
          return 'Please complete all managerial skills scores (Score 2)';
        }
        if (!evaluationData.managerialSkillsScore3 || evaluationData.managerialSkillsScore3 === 0) {
          return 'Please complete all managerial skills scores (Score 3)';
        }
        if (!evaluationData.managerialSkillsScore4 || evaluationData.managerialSkillsScore4 === 0) {
          return 'Please complete all managerial skills scores (Score 4)';
        }
        if (!evaluationData.managerialSkillsScore5 || evaluationData.managerialSkillsScore5 === 0) {
          return 'Please complete all managerial skills scores (Score 5)';
        }
        if (!evaluationData.managerialSkillsScore6 || evaluationData.managerialSkillsScore6 === 0) {
          return 'Please complete all managerial skills scores (Score 6)';
        }
        return 'Please complete all managerial skills scores';
      case 9: // Overall Assessment
        return 'Please complete all required fields';
      default:
        return 'Please complete all scores for this step';
    }
  };

  const nextStep = () => {
    // Validate current step before proceeding
    if (!isCurrentStepComplete()) {
      // Show validation message to user
      const message = getValidationMessage();
      alert(message || 'Please complete all required fields before proceeding to the next step.');
      return;
    }
    
    // For HO evaluators, skip Step 7 (go from Step 6 to Step 8)
    if (isHO && currentStep === 6) {
      setCurrentStep(8); // Skip Step 7, go directly to Step 8
    } else if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    // For HO evaluators, skip Step 7 when going back (go from Step 8 to Step 6)
    if (isHO && currentStep === 8) {
      setCurrentStep(6); // Skip Step 7, go directly to Step 6
    } else if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    // Direct submission - no modal needed
    confirmSubmit();
  };

  const handleCloseAfterSubmission = () => {
    // Close the modal after successful submission
    if (onCloseAction) {
      onCloseAction();
    }
  };

  const handleApprove = () => {
    // Mark the evaluation as approved by the evaluator
    setIsEvaluatorApproved(true);
    
    // Update the evaluation data to mark it as approved
    updateEvaluationData({
      evaluatorApproved: true,
      evaluatorApprovedAt: new Date().toISOString()
    });
    
    // Show success message
    alert('Evaluation approved by evaluator! The evaluation is now ready for employee review.');
  };

  const handleSuccessDialogClose = () => {
    setShowSuccessDialog(false);
    // Close the main evaluation modal
    if (onCloseAction) {
      onCloseAction();
    }
  };

  const confirmSubmit = async () => {
    try {
      // Validate that all required fields are completed before submission
      if (!isCurrentStepComplete()) {
        alert(`Cannot submit evaluation: ${getValidationMessage()}`);
        return;
      }

      // No additional validation needed for step 8

      // Calculate overall rating from evaluation data (weighted calculation)
      const calculatedRating = calculateOverallRating(evaluationData);
      
      // Create updated evaluation data with calculated rating
      const updatedEvaluationData = {
        ...evaluationData,
        rating: calculatedRating, // Ensure rating is set - this should override any existing rating value
      };
      
      // Store in localStorage for frontend-only mode
      const employeeResult = storeEvaluationResult({
        employeeId: parseInt(evaluationData.employeeId),
        employeeEmail: employee?.email || `${evaluationData.employeeName.toLowerCase().replace(/\s+/g, '.')}@smct.com`,
        employeeName: evaluationData.employeeName,
        evaluatorId: currentUser?.id || 1,
        evaluatorName: currentUser?.name || 'Evaluator',
        evaluationData: {
          ...updatedEvaluationData,
          overallRating: calculatedRating,
          // Ensure evaluator signature is included
          evaluatorSignatureImage: evaluationData.evaluatorSignatureImage || currentUser?.signature || '',
          evaluatorSignature: evaluationData.evaluatorSignature || currentUser?.name || 'Evaluator',
          evaluatorSignatureDate: evaluationData.evaluatorSignatureDate || new Date().toISOString().split('T')[0]
        },
        status: 'completed',
        period: new Date().toISOString().slice(0, 7), // YYYY-MM format
        overallRating: calculatedRating.toString() // Convert to string for storage
      });

      // Also store in client data service for consistency
      try {
        // Build submission payload - ensure rating is explicitly set
        const submissionPayload = {
          ...updatedEvaluationData,
            // Ensure evaluator signature is included
            evaluatorSignatureImage: evaluationData.evaluatorSignatureImage || currentUser?.signature || '',
            evaluatorSignature: evaluationData.evaluatorSignature || currentUser?.name || 'Evaluator',
            evaluatorSignatureDate: evaluationData.evaluatorSignatureDate || new Date().toISOString().split('T')[0],
            // Include supervisor/evaluator info
            supervisor: evaluationData.supervisor || currentUser?.name || 'Evaluator',
          overallRating: calculatedRating,
          // CRITICAL: Set rating LAST to ensure it's not overwritten
          rating: calculatedRating,
        } as any;
        
        // Recompute rating directly from the final payload scores to ensure accuracy
        const average = (vals: any[]) => {
          const numbers = vals
            .map((v) => (typeof v === 'string' ? parseFloat(v) : Number(v)))
            .filter((v) => typeof v === 'number' && !isNaN(v));
          if (numbers.length === 0) return 0;
          return numbers.reduce((a, b) => a + b, 0) / numbers.length;
        };

        const jobKnowledgeScore = average([
          (submissionPayload as any).jobKnowledgeScore1,
          (submissionPayload as any).jobKnowledgeScore2,
          (submissionPayload as any).jobKnowledgeScore3,
        ]);
        const qualityOfWorkScore = average([
          (submissionPayload as any).qualityOfWorkScore1,
          (submissionPayload as any).qualityOfWorkScore2,
          (submissionPayload as any).qualityOfWorkScore3,
          (submissionPayload as any).qualityOfWorkScore4,
          (submissionPayload as any).qualityOfWorkScore5,
        ]);
        const adaptabilityScore = average([
          (submissionPayload as any).adaptabilityScore1,
          (submissionPayload as any).adaptabilityScore2,
          (submissionPayload as any).adaptabilityScore3,
        ]);
        const teamworkScore = average([
          (submissionPayload as any).teamworkScore1,
          (submissionPayload as any).teamworkScore2,
          (submissionPayload as any).teamworkScore3,
        ]);
        const reliabilityScore = average([
          (submissionPayload as any).reliabilityScore1,
          (submissionPayload as any).reliabilityScore2,
          (submissionPayload as any).reliabilityScore3,
          (submissionPayload as any).reliabilityScore4,
        ]);
        const ethicalScore = average([
          (submissionPayload as any).ethicalScore1,
          (submissionPayload as any).ethicalScore2,
          (submissionPayload as any).ethicalScore3,
          (submissionPayload as any).ethicalScore4,
        ]);
        const customerServiceScore = average([
          (submissionPayload as any).customerServiceScore1,
          (submissionPayload as any).customerServiceScore2,
          (submissionPayload as any).customerServiceScore3,
          (submissionPayload as any).customerServiceScore4,
          (submissionPayload as any).customerServiceScore5,
        ]);

        const recomputed = (
          jobKnowledgeScore * 0.20 +
          qualityOfWorkScore * 0.20 +
          adaptabilityScore * 0.10 +
          teamworkScore * 0.10 +
          reliabilityScore * 0.05 +
          ethicalScore * 0.05 +
          customerServiceScore * 0.30
        );

        const recomputedRounded = Math.round(recomputed * 10) / 10;
        
        // Ensure rating is set correctly in the payload
        (submissionPayload as any).rating = recomputedRounded;
        
        await apiService.createSubmission(
          parseInt(evaluationData.employeeId),
          submissionPayload
        );
      } catch (clientError) {
        // Silently handle client data service storage failure - localStorage storage already succeeded
      }
      
      // Create notification for evaluators and HR
      try {
        await createEvaluationNotification(
          evaluationData.employeeName || employee?.name || 'Employee',
          currentUser?.name || 'Current Evaluator',
          parseInt(evaluationData.employeeId),
          employee?.email
        );
      } catch (notificationError) {
        console.warn('Failed to create notification:', notificationError);
        // Don't fail the submission if notification creation fails
      }
      
      // Show success dialog instead of alert
      // Manually trigger a storage event for same-tab updates
      // This helps the HR dashboard refresh even when in the same tab
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'submissions',
        newValue: Date.now().toString(),
        oldValue: (Date.now() - 1).toString(),
        storageArea: localStorage,
        url: window.location.href
      }));
      
      setShowSuccessDialog(true);
    } catch (error) {
      console.error('Error submitting evaluation:', error);
      alert(`Error submitting evaluation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Helper function to calculate weighted overall rating (matches ViewResultsModal calculation)
  const calculateOverallRating = (data: EvaluationData): number => {
    // Helper to calculate average score for a category
    const calculateScore = (scores: (string | number | undefined)[]): number => {
      const validScores = scores
        .filter(score => score !== undefined && score !== '' && score !== null)
        .map(score => typeof score === 'string' ? parseFloat(score) : score)
        .filter(score => !isNaN(score as number)) as number[];
      
      if (validScores.length === 0) return 0;
      return validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
    };

    // Calculate scores for each category
    const jobKnowledgeScore = calculateScore([
      data.jobKnowledgeScore1,
      data.jobKnowledgeScore2,
      data.jobKnowledgeScore3
    ]);
    
    const qualityOfWorkScore = calculateScore([
      data.qualityOfWorkScore1,
      data.qualityOfWorkScore2,
      data.qualityOfWorkScore3,
      data.qualityOfWorkScore4,
      data.qualityOfWorkScore5
    ]);
    
    const adaptabilityScore = calculateScore([
      data.adaptabilityScore1,
      data.adaptabilityScore2,
      data.adaptabilityScore3
    ]);
    
    const teamworkScore = calculateScore([
      data.teamworkScore1,
      data.teamworkScore2,
      data.teamworkScore3
    ]);
    
    const reliabilityScore = calculateScore([
      data.reliabilityScore1,
      data.reliabilityScore2,
      data.reliabilityScore3,
      data.reliabilityScore4
    ]);
    
    const ethicalScore = calculateScore([
      data.ethicalScore1,
      data.ethicalScore2,
      data.ethicalScore3,
      data.ethicalScore4
    ]);
    
    const customerServiceScore = calculateScore([
      data.customerServiceScore1,
      data.customerServiceScore2,
      data.customerServiceScore3,
      data.customerServiceScore4,
      data.customerServiceScore5
    ]);

    // Calculate weighted overall score (matches ViewResultsModal)
    const overallWeightedScore = (
      (jobKnowledgeScore * 0.20) +
      (qualityOfWorkScore * 0.20) +
      (adaptabilityScore * 0.10) +
      (teamworkScore * 0.10) +
      (reliabilityScore * 0.05) +
      (ethicalScore * 0.05) +
      (customerServiceScore * 0.30)
    );

    // Round to 1 decimal place
    return Math.round(overallWeightedScore * 10) / 10;
  };

  // Get the current step component - handle Step 7 skipping for HO
  const getCurrentStepComponent = () => {
    if (currentStep === 0) return WelcomeStep;
    if (isHO && currentStep === 7) return Step8; // Skip Step 7 for HO
    return steps[currentStep - 1].component;
  };
  
  const CurrentStepComponent = getCurrentStepComponent();

  return (
    <>
      <style jsx>{`
        @keyframes dialogPopup {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        @keyframes drawCheck {
          to {
            stroke-dashoffset: 0;
          }
        }
        
        @keyframes successBounce {
          0% {
            transform: scale(0.9);
            opacity: 0;
          }
          50% {
            transform: scale(1.05);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        .check-animation {
          animation: drawCheck 0.6s ease-in-out 0.3s forwards;
        }
        
        .success-dialog {
          animation: successBounce 0.5s ease-out;
        }
        
        .success-message {
          animation: pulse 2s ease-in-out infinite;
        }
        
        @keyframes pulse {
          0%, 100% {
            background-color: rgb(240 253 244);
          }
          50% {
            background-color: rgb(220 252 231);
          }
        }
        
        @keyframes welcomePopup {
          0% {
            transform: scale(0.9) translateY(20px);
            opacity: 0;
          }
          50% {
            transform: scale(1.02) translateY(-5px);
            opacity: 0.9;
          }
          100% {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }
        
        .welcome-step-animate {
          animation: welcomePopup 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
        }
        
        /* Ensure animation works even inside containers */
        .evaluation-container .welcome-step-animate {
          animation: welcomePopup 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
          transform-origin: center;
        }
      `}</style>
      <div className="max-h-[95vh] bg-gradient-to-br from-blue-50 to-indigo-100 p-6 overflow-y-auto">
      <div className="w-full mx-auto px-4">
        <div className="max-w-5xl mx-auto">

        {/* Step Numbers Indicator */}
        {currentStep > 0 && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex justify-center mb-4">
                <div className="flex items-center">
                      {filteredSteps.map((step, index) => {
                        // Determine if this step is current or completed
                        const isCurrentStep = step.id === currentStep || (isHO && currentStep === 7 && step.id === 8);
                        const isCompleted = step.id < currentStep || (isHO && currentStep === 7 && step.id < 8);
                        
                        return (
                          <div key={step.id} className="flex items-center">
                            {/* Step Circle */}
                            <div
                              className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold transition-all duration-200 relative z-10 ${
                                isCurrentStep
                                  ? 'bg-blue-500 text-white shadow-md scale-110'
                                  : isCompleted
                                  ? 'bg-green-500 text-white'
                                  : 'bg-gray-200 text-gray-500'
                              }`}
                            >
                              {step.id}
                            </div>
                            
                            {/* Connecting Line */}
                            {index < filteredSteps.length - 1 && (
                              <div className="w-16 h-1 mx-2 relative">
                                <div className="absolute inset-0 bg-gray-200 rounded-full"></div>
                                <div 
                                  className={`absolute inset-0 rounded-full transition-all duration-500 ${
                                    isCompleted ? 'bg-green-500' : 'bg-gray-200'
                                  }`}
                                  style={{ width: isCompleted ? '100%' : '0%' }}
                                ></div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                </div>
              </div>
              
              <div className="text-center">
                <span className="text-sm font-medium text-gray-700">
                  Step {currentStep === 7 && isHO ? 8 : currentStep} of {filteredSteps.length}: {currentStep === 7 && isHO ? filteredSteps[filteredSteps.length - 1].title : steps[currentStep - 1].title}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step Content */}
        {currentStep === 0 ? (
          <Card key={`welcome-${welcomeAnimationKey}`} className="welcome-step-animate">
            <CardContent>
              <WelcomeStep
                data={evaluationData}
                updateDataAction={updateEvaluationData}
                employee={employee ? {
                  id: employee.id,
                  name: employee.name,
                  email: employee.email,
                  position: employee.position,
                  department: employee.department,
                  role: employee.role
                } : undefined}
                currentUser={currentUser}
                onStartAction={startEvaluation}
                onBackAction={onCloseAction}
              />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                  {currentStep}
                </span>
                {steps[currentStep - 1].title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentStep === 9 ? (
                <OverallAssessment
                  data={evaluationData}
                  updateDataAction={updateEvaluationData}
                  employee={employee}
                  currentUser={currentUser}
                  onSubmitAction={handleSubmit}
                  onPreviousAction={prevStep}
                  onCloseAction={handleCloseAfterSubmission}
                />
              ) : (
                <CurrentStepComponent
                  data={evaluationData}
                  updateDataAction={updateEvaluationData}
                  employee={employee ? {
                    ...employee,
                    hireDate: employee.hireDate || ''
                  } : undefined}
                  currentUser={currentUser}
                  onStartAction={startEvaluation}
                  onNextAction={nextStep}
                  onSubmitAction={handleSubmit}
                  onPreviousAction={prevStep}
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons - Only show for steps 1-8, not for Overall Assessment */}
        {currentStep > 0 && currentStep < 9 && (
          <div className="flex justify-between mt-6">
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="px-6 cursor-pointer text-white hover:scale-110 transition-transform duration-200 bg-blue-500 hover:bg-blue-500 hover:text-white"
              >
                Previous
              </Button>
              
              <Button
                variant="outline"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowCancelDialog(true);
                }}
                className="px-6 text-red-600 bg-red-500 text-white border-red-300 hover:bg-red-500 hover:text-white cursor-pointer hover:scale-110 transition-transform duration-200"
              >
                Cancel Evaluation
              </Button>
            </div>

            <div className="flex flex-col gap-2">
              <TooltipProvider>
                {currentStep >= 1 && currentStep <= 8 && !isCurrentStepComplete() ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        onClick={(e) => {
                          e.preventDefault();
                          // Button is disabled, do nothing
                        }}
                        className="px-6 opacity-50 cursor-not-allowed"
                      >
                        Next
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{getValidationMessage()}</p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        onClick={nextStep} 
                        className="px-6 bg-blue-500 text-white hover:bg-green-600 hover:text-white cursor-pointer hover:scale-110 transition-transform duration-200"
                      >
                        Next
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Proceed to the next step</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </TooltipProvider>
              
            </div>
          </div>
        )}
        </div>
      </div>

    </div>

    {/* Cancel Evaluation Dialog */}
    <Dialog open={showCancelDialog} onOpenChangeAction={setShowCancelDialog}>
      <DialogContent className="max-w-md m-8" style={{
        animation: 'dialogPopup 0.3s ease-out'
      }}>
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Cancel Evaluation
          </DialogTitle>
        </DialogHeader>
        <div className="py-3 bg-red-50 p-4 mx-2 my-2">
          <p className="text-gray-600">
            Are you sure you want to cancel this evaluation? All progress will be lost and cannot be recovered.
          </p>
        </div>
        <DialogFooter className="flex gap-3">
          <Button
            variant="outline"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowCancelDialog(false);
            }}
            className="px-4 bg-blue-500 text-white hover:bg-blue-600 hover:text-white cursor-pointer hover:scale-110 transition-transform duration-200"
          >
            Keep Editing
          </Button>
          <Button
            variant="destructive"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowCancelDialog(false);
              if (onCancelAction) {
                onCancelAction();
              } else if (onCloseAction) {
                onCloseAction();
              }
            }}
            className="px-4 cursor-pointer hover:scale-110 transition-transform duration-200s"
          >
            Cancel Evaluation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Success Dialog */}
    <Dialog open={showSuccessDialog} onOpenChangeAction={setShowSuccessDialog}>
      <DialogContent className="max-w-md m-8 success-dialog" style={{
        animation: 'dialogPopup 0.3s ease-out'
      }}>
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-900 flex items-center justify-center gap-2">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <svg 
                className="w-5 h-5 text-green-600 check-animation" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                style={{
                  strokeDasharray: '20',
                  strokeDashoffset: '20',
                  animation: 'drawCheck 0.6s ease-in-out 0.3s forwards'
                }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            Evaluation Submitted Successfully!
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <div className="bg-green-50 p-4 rounded-lg mb-4 success-message">
            <p className="text-gray-700 text-center">
              🎉 Your evaluation has been submitted successfully!<br/>
              The employee can now view their results in their dashboard.
            </p>
          </div>
          <div className="text-sm text-gray-600 text-center">
            <p><strong>Employee:</strong> {evaluationData.employeeName}</p>
            <p><strong>Submitted:</strong> {new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
          </div>
        </div>
        <DialogFooter className="flex justify-center">
          <Button
            onClick={handleSuccessDialogClose}
            className="px-8 py-2 bg-green-600 text-white hover:bg-green-700 cursor-pointer"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
