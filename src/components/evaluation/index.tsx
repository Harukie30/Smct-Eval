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
import OverallAssessment from './OverallAssessment';
import WelcomeStep from './WelcomeStep';
import { EvaluationData } from './types';
import { storeEvaluationResult } from '@/lib/evaluationStorage';
import clientDataService from '@/lib/clientDataService';
import { createEvaluationNotification } from '@/lib/notificationUtils';

const steps = [
  { id: 1, title: 'Employee Information / Job Knowledge', component: Step1 },
  { id: 2, title: 'Quality of Work', component: Step2 },
  { id: 3, title: 'Adaptability', component: Step3 },
  { id: 4, title: 'Teamwork', component: Step4 },
  { id: 5, title: 'Reliability', component: Step5 },
  { id: 6, title: 'Ethical & Professional Behavior', component: Step6 },
  { id: 7, title: 'Customer Service', component: Step7 },
  { id: 8, title: 'Overall Assessment', component: OverallAssessment },
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
    hireDate: string;
    signature?: string;
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

export default function EvaluationForm({ employee, currentUser, onCloseAction, onCancelAction }: EvaluationFormProps) {
  console.log('EvaluationForm received employee:', employee); // Debug log
  
  const [currentStep, setCurrentStep] = useState(0); // 0 = welcome step, 1-8 = actual steps
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
    employeeId: employee?.id?.toString() || '',
    employeeName: employee?.name || '',
    position: employee?.position || '',
    department: employee?.department || '',
    branch: employee?.branch || '',
    role: employee?.role || '',
    hireDate: employee?.hireDate || '',
    supervisor: '',
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
    jobKnowledgeScore1: '',
    jobKnowledgeScore2: '',
    jobKnowledgeScore3: '',
    jobKnowledgeComments1: '',
    jobKnowledgeComments2: '',
    jobKnowledgeComments3: '',
    qualityOfWorkScore1: '',
    qualityOfWorkScore2: '',
    qualityOfWorkScore3: '',
    qualityOfWorkScore4: '',
    qualityOfWorkScore5: '',
    qualityOfWorkComments1: '',
    qualityOfWorkComments2: '',
    qualityOfWorkComments3: '',
    qualityOfWorkComments4: '',
    qualityOfWorkComments5: '',
    adaptabilityScore1: '',
    adaptabilityScore2: '',
    adaptabilityScore3: '',
    adaptabilityComments1: '',
    adaptabilityComments2: '',
    adaptabilityComments3: '',
    teamworkScore1: '',
    teamworkScore2: '',
    teamworkScore3: '',
    teamworkComments1: '',
    teamworkComments2: '',
    teamworkComments3: '',
    reliabilityScore1: '',
    reliabilityScore2: '',
    reliabilityScore3: '',
    reliabilityScore4: '',
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
    ethicalScore1: '',
    ethicalScore2: '',
    ethicalScore3: '',
    ethicalScore4: '',
    ethicalRating1: '',
    ethicalRating2: '',
    ethicalRating3: '',
    ethicalRating4: '',
    ethicalExplanation1: '',
    ethicalExplanation2: '',
    ethicalExplanation3: '',
    ethicalExplanation4: '',
    ethicalComments: '',
    customerServiceScore1: '',
    customerServiceScore2: '',
    customerServiceScore3: '',
    customerServiceScore4: '',
    customerServiceScore5: '',
    customerServiceExplanation1: '',
    customerServiceExplanation2: '',
    customerServiceExplanation3: '',
    customerServiceExplanation4: '',
    customerServiceExplanation5: '',
    customerServiceComments: '',
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
  
  console.log('Initial evaluation data:', {
    employeeId: evaluationData.employeeId,
    employeeName: evaluationData.employeeName,
    position: evaluationData.position,
    department: evaluationData.department,
    branch: evaluationData.branch,
    hireDate: evaluationData.hireDate,
  }); // Debug log
  const [isEvaluatorApproved, setIsEvaluatorApproved] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  // Update evaluation data when employee prop changes
  useEffect(() => {
    if (employee) {
      console.log('Updating evaluation data with employee:', employee); // Debug log
      setEvaluationData(prev => ({
        ...prev,
        employeeId: employee.id.toString(),
        employeeName: employee.name,
        position: employee.position,
        department: employee.department,
        branch: employee.branch || '',
        role: employee.role,
        hireDate: employee.hireDate,
      }));
    }
  }, [employee]);

  const updateEvaluationData = useCallback((updates: Partial<EvaluationData>) => {
    console.log('updateEvaluationData called with:', updates); // Debug log
    setEvaluationData(prev => {
      const newData = { ...prev, ...updates };
      console.log('New evaluation data:', newData); // Debug log
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
        
        // Check if all job knowledge scores are filled
        const hasJobKnowledgeScores = (
          evaluationData.jobKnowledgeScore1 && evaluationData.jobKnowledgeScore1 !== '' &&
          evaluationData.jobKnowledgeScore2 && evaluationData.jobKnowledgeScore2 !== '' &&
          evaluationData.jobKnowledgeScore3 && evaluationData.jobKnowledgeScore3 !== ''
        );
        
        // Check if basic employee information is filled
        const hasBasicInfo = (
          evaluationData.supervisor && evaluationData.supervisor.trim() !== '' &&
          evaluationData.coverageFrom && evaluationData.coverageFrom.trim() !== '' &&
          evaluationData.coverageTo && evaluationData.coverageTo.trim() !== ''
        );
        
        return hasReviewType && hasJobKnowledgeScores && hasBasicInfo;
      case 2: // Quality of Work
        return (
          evaluationData.qualityOfWorkScore1 && evaluationData.qualityOfWorkScore1 !== '' &&
          evaluationData.qualityOfWorkScore2 && evaluationData.qualityOfWorkScore2 !== '' &&
          evaluationData.qualityOfWorkScore3 && evaluationData.qualityOfWorkScore3 !== '' &&
          evaluationData.qualityOfWorkScore4 && evaluationData.qualityOfWorkScore4 !== '' &&
          evaluationData.qualityOfWorkScore5 && evaluationData.qualityOfWorkScore5 !== ''
        );
      case 3: // Adaptability
        return (
          evaluationData.adaptabilityScore1 && evaluationData.adaptabilityScore1 !== '' &&
          evaluationData.adaptabilityScore2 && evaluationData.adaptabilityScore2 !== '' &&
          evaluationData.adaptabilityScore3 && evaluationData.adaptabilityScore3 !== ''
        );
      case 4: // Teamwork
        return (
          evaluationData.teamworkScore1 && evaluationData.teamworkScore1 !== '' &&
          evaluationData.teamworkScore2 && evaluationData.teamworkScore2 !== '' &&
          evaluationData.teamworkScore3 && evaluationData.teamworkScore3 !== ''
        );
      case 5: // Reliability
        return (
          evaluationData.reliabilityScore1 && evaluationData.reliabilityScore1 !== '' &&
          evaluationData.reliabilityScore2 && evaluationData.reliabilityScore2 !== '' &&
          evaluationData.reliabilityScore3 && evaluationData.reliabilityScore3 !== '' &&
          evaluationData.reliabilityScore4 && evaluationData.reliabilityScore4 !== '' 
        );
      case 6: // Ethical & Professional Behavior
        return (
          evaluationData.ethicalScore1 && evaluationData.ethicalScore1 !== '' &&
          evaluationData.ethicalScore2 && evaluationData.ethicalScore2 !== '' &&
          evaluationData.ethicalScore3 && evaluationData.ethicalScore3 !== '' &&
          evaluationData.ethicalScore4 && evaluationData.ethicalScore4 !== ''
        );
      case 7: // Customer Service
        return (
          evaluationData.customerServiceScore1 && evaluationData.customerServiceScore1 !== '' &&
          evaluationData.customerServiceScore2 && evaluationData.customerServiceScore2 !== '' &&
          evaluationData.customerServiceScore3 && evaluationData.customerServiceScore3 !== '' &&
          evaluationData.customerServiceScore4 && evaluationData.customerServiceScore4 !== '' &&
          evaluationData.customerServiceScore5 && evaluationData.customerServiceScore5 !== ''
        );
      case 8: // Overall Assessment
        return true; // No validation required for step 8
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
      case 8: return 'Overall Assessment';
      default: return 'evaluation';
    }
  };

  // Get validation message for incomplete steps
  const getValidationMessage = () => {
    switch (currentStep) {
      case 1: // Employee Information & Job Knowledge
        if (!evaluationData.reviewTypeProbationary3 && !evaluationData.reviewTypeProbationary5 && 
            !evaluationData.reviewTypeRegularQ1 && !evaluationData.reviewTypeRegularQ2 && 
            !evaluationData.reviewTypeRegularQ3 && !evaluationData.reviewTypeRegularQ4 && 
            !evaluationData.reviewTypeOthersImprovement && 
            (!evaluationData.reviewTypeOthersCustom || evaluationData.reviewTypeOthersCustom.trim() === '')) {
          return 'Please select at least one review type';
        }
        if (!evaluationData.supervisor || evaluationData.supervisor.trim() === '') {
          return 'Please enter supervisor name';
        }
        if (!evaluationData.coverageFrom || evaluationData.coverageFrom.trim() === '') {
          return 'Please select coverage from date';
        }
        if (!evaluationData.coverageTo || evaluationData.coverageTo.trim() === '') {
          return 'Please select coverage to date';
        }
        if (!evaluationData.jobKnowledgeScore1 || evaluationData.jobKnowledgeScore1 === '') {
          return 'Please complete all job knowledge scores';
        }
        return 'Please complete all required fields';
      case 8: // Overall Assessment
        return 'Please complete all required fields';
      default:
        return 'Please complete all scores for this step';
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
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
    console.log('🚀 confirmSubmit called');
    try {
      // Validate that all required fields are completed before submission
      console.log('🔍 Checking if current step is complete...');
      if (!isCurrentStepComplete()) {
        console.log('❌ Step validation failed:', getValidationMessage());
        alert(`Cannot submit evaluation: ${getValidationMessage()}`);
        return;
      }
      console.log('✅ Step validation passed');

      // No additional validation needed for step 8

      // Calculate overall rating from evaluation data
      const overallRating = calculateOverallRating(evaluationData);
      
      // Store in localStorage for frontend-only mode
      const employeeResult = storeEvaluationResult({
        employeeId: parseInt(evaluationData.employeeId),
        employeeEmail: employee?.email || `${evaluationData.employeeName.toLowerCase().replace(/\s+/g, '.')}@smct.com`,
        employeeName: evaluationData.employeeName,
        evaluatorId: currentUser?.id || 1,
        evaluatorName: currentUser?.name || 'Evaluator',
        evaluationData: {
          ...evaluationData,
          overallRating,
          // Ensure evaluator signature is included
          evaluatorSignatureImage: evaluationData.evaluatorSignatureImage || currentUser?.signature || '',
          evaluatorSignature: evaluationData.evaluatorSignature || currentUser?.name || 'Evaluator',
          evaluatorSignatureDate: evaluationData.evaluatorSignatureDate || new Date().toISOString().split('T')[0]
        },
        status: 'completed',
        period: new Date().toISOString().slice(0, 7), // YYYY-MM format
        overallRating
      });

      console.log('Evaluation stored in localStorage:', employeeResult);

      // Also store in client data service for consistency
      try {
        await clientDataService.createSubmission({
          employeeId: parseInt(evaluationData.employeeId),
          employeeName: evaluationData.employeeName,
          employeeEmail: employee?.email || `${evaluationData.employeeName.toLowerCase().replace(/\s+/g, '.')}@smct.com`,
          evaluatorId: currentUser?.id || 1,
          evaluatorName: currentUser?.name || 'Evaluator',
          evaluationData: {
            ...evaluationData,
            overallRating,
            // Ensure evaluator signature is included
            evaluatorSignatureImage: evaluationData.evaluatorSignatureImage || currentUser?.signature || '',
            evaluatorSignature: evaluationData.evaluatorSignature || currentUser?.name || 'Evaluator',
            evaluatorSignatureDate: evaluationData.evaluatorSignatureDate || new Date().toISOString().split('T')[0],
            // Include supervisor/evaluator info
            supervisor: evaluationData.supervisor || currentUser?.name || 'Evaluator',
          },
          status: 'completed',
          period: new Date().toISOString().slice(0, 7), // YYYY-MM format
          overallRating,
          submittedAt: new Date().toISOString(),
          category: 'Performance Review',
          evaluator: currentUser?.name || 'Evaluator',
        });
        console.log('Also stored in client data service with evaluator:', currentUser?.name);
      } catch (clientError) {
        console.log('Client data service storage failed, but localStorage storage succeeded:', clientError);
      }
      
      // Create notification for evaluators and HR
      try {
        await createEvaluationNotification(
          evaluationData.employeeName || employee?.name || 'Employee',
          currentUser?.name || 'Current Evaluator'
        );
      } catch (notificationError) {
        console.warn('Failed to create notification:', notificationError);
        // Don't fail the submission if notification creation fails
      }
      
      // Show success dialog instead of alert
      console.log('🎉 Evaluation submitted successfully!');
      
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

  // Helper function to calculate overall rating
  const calculateOverallRating = (data: EvaluationData): string => {
    const scores: number[] = [];
    
    // Collect all numeric scores
    Object.entries(data).forEach(([key, value]) => {
      if (key.includes('Score') && typeof value === 'string' && value !== '') {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          scores.push(numValue);
        }
      }
    });
    
    // Calculate average
    if (scores.length === 0) return '0';
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    return (Math.round(average * 10) / 10).toString(); // Round to 1 decimal place and return as string
  };

  const CurrentStepComponent = currentStep === 0 ? WelcomeStep : steps[currentStep - 1].component;

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
                  {steps.map((step, index) => (
                    <div key={step.id} className="flex items-center">
                      {/* Step Circle */}
                      <div
                        className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold transition-all duration-200 relative z-10 ${
                          index + 1 === currentStep
                            ? 'bg-blue-500 text-white shadow-md scale-110'
                            : index + 1 < currentStep
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-200 text-gray-500'
                        }`}
                      >
                        {step.id}
                      </div>
                      
                      {/* Connecting Line */}
                      {index < steps.length - 1 && (
                        <div className="w-16 h-1 mx-2 relative">
                          <div className="absolute inset-0 bg-gray-200 rounded-full"></div>
                          <div 
                            className={`absolute inset-0 rounded-full transition-all duration-500 ${
                              index + 1 < currentStep ? 'bg-green-500' : 'bg-gray-200'
                            }`}
                            style={{ width: index + 1 < currentStep ? '100%' : '0%' }}
                          ></div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="text-center">
                <span className="text-sm font-medium text-gray-700">
                  Step {currentStep} of {steps.length}: {steps[currentStep - 1].title}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step Content */}
        {currentStep === 0 ? (
          <Card key={`welcome-${welcomeAnimationKey}`} className="welcome-step-animate">
            <CardContent>
              <CurrentStepComponent
                data={evaluationData}
                updateDataAction={updateEvaluationData}
                employee={employee}
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
              {currentStep === 8 ? (
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
                  employee={employee}
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

        {/* Navigation Buttons - Only show for steps 1-7, not for Overall Assessment */}
        {currentStep > 0 && currentStep < 8 && (
          <div className="flex justify-between mt-6">
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="px-6"
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
                className="px-6 text-red-600 border-red-300 hover:bg-red-50"
              >
                Cancel Evaluation
              </Button>
            </div>

            <div className="flex flex-col gap-2">
              <TooltipProvider>
                {currentStep >= 1 && currentStep <= 7 && !isCurrentStepComplete() ? (
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
                        className="px-6 bg-blue-500 text-white hover:bg-blue-600 hover:text-white"
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
            className="px-4 bg-blue-500 text-white hover:bg-blue-600 hover:text-white"
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
            className="px-4"
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
            className="px-8 py-2 bg-green-600 text-white hover:bg-green-700"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
