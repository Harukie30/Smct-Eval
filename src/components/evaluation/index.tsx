'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
  };
  onCloseAction?: () => void;
  onCancelAction?: () => void;
}

export default function EvaluationForm({ employee, currentUser, onCloseAction, onCancelAction }: EvaluationFormProps) {
  console.log('EvaluationForm received employee:', employee); // Debug log
  
  const [currentStep, setCurrentStep] = useState(0); // 0 = welcome step, 1-8 = actual steps
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
    overallRating: 0,
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
      case 1: // Job Knowledge
        return (
          evaluationData.jobKnowledgeScore1 && evaluationData.jobKnowledgeScore1 !== '' &&
          evaluationData.jobKnowledgeScore2 && evaluationData.jobKnowledgeScore2 !== '' &&
          evaluationData.jobKnowledgeScore3 && evaluationData.jobKnowledgeScore3 !== ''
        );
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
          evaluationData.reliabilityScore3 && evaluationData.reliabilityScore3 !== ''
        );
      case 6: // Ethical & Professional Behavior
        return (
          evaluationData.ethicalScore1 && evaluationData.ethicalScore1 !== '' &&
          evaluationData.ethicalScore2 && evaluationData.ethicalScore2 !== '' &&
          evaluationData.ethicalScore3 && evaluationData.ethicalScore3 !== ''
        );
      case 7: // Customer Service
        return (
          evaluationData.customerServiceScore1 && evaluationData.customerServiceScore1 !== '' &&
          evaluationData.customerServiceScore2 && evaluationData.customerServiceScore2 !== '' &&
          evaluationData.customerServiceScore3 && evaluationData.customerServiceScore3 !== ''
        );
      default:
        return true; // For other steps, allow progression
    }
  };

  // Get step name for tooltip
  const getStepName = () => {
    switch (currentStep) {
      case 1: return 'Job Knowledge';
      case 2: return 'Quality of Work';
      case 3: return 'Adaptability';
      case 4: return 'Teamwork';
      case 5: return 'Reliability';
      case 6: return 'Ethical & Professional Behavior';
      case 7: return 'Customer Service';
      default: return 'evaluation';
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

  const confirmSubmit = async () => {
    try {
      // Calculate overall rating from evaluation data
      const overallRating = calculateOverallRating(evaluationData);
      
      // Store in localStorage for frontend-only mode
      const employeeResult = storeEvaluationResult({
        employeeId: parseInt(evaluationData.employeeId),
        employeeEmail: employee?.email || `${evaluationData.employeeName.toLowerCase().replace(/\s+/g, '.')}@smct.com`,
        employeeName: evaluationData.employeeName,
        evaluatorId: 1, // You can make this dynamic based on current user
        evaluatorName: 'Current Evaluator', // You can make this dynamic
        evaluationData: {
          ...evaluationData,
          overallRating
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
          evaluatorId: 1, // You can make this dynamic based on current user
          evaluatorName: 'Current Evaluator', // You can make this dynamic
          evaluationData: {
            ...evaluationData,
            overallRating
          },
          status: 'completed',
          period: new Date().toISOString().slice(0, 7), // YYYY-MM format
          overallRating,
          submittedAt: new Date().toISOString(),
          category: 'Performance Review',
          evaluator: 'Current Evaluator',
        });
        console.log('Also stored in client data service');
      } catch (clientError) {
        console.log('Client data service storage failed, but localStorage storage succeeded:', clientError);
      }
      
      // Show success message
      alert('Evaluation submitted successfully! The employee can now see their results.');
      
      // Close the form
      if (onCloseAction) {
        onCloseAction();
      }
    } catch (error) {
      console.error('Error submitting evaluation:', error);
      alert(`Error submitting evaluation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Helper function to calculate overall rating
  const calculateOverallRating = (data: EvaluationData): number => {
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
    if (scores.length === 0) return 0;
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    return Math.round(average * 10) / 10; // Round to 1 decimal place
  };

  const CurrentStepComponent = currentStep === 0 ? WelcomeStep : steps[currentStep - 1].component;

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-8">

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
          <Card>
            <CardContent>
              <CurrentStepComponent
                data={evaluationData}
                updateDataAction={updateEvaluationData}
                employee={employee}
                currentUser={currentUser}
                onStartAction={startEvaluation}
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
              <CurrentStepComponent
                data={evaluationData}
                updateDataAction={updateEvaluationData}
                employee={employee}
                currentUser={currentUser}
                onStartAction={startEvaluation}
                onNextAction={nextStep}
                onSubmitAction={handleSubmit}
                onPreviousAction={prevStep}
                onApproveAction={currentStep === 8 ? handleApprove : undefined}
                isApproved={currentStep === 8 ? isEvaluatorApproved : false}
              />
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
                onClick={() => {
                  if (onCancelAction) {
                    onCancelAction();
                  } else if (confirm('Are you sure you want to cancel this evaluation? All progress will be lost.')) {
                    if (onCloseAction) {
                      onCloseAction();
                    }
                  }
                }}
                className="px-6 text-red-600 border-red-300 hover:bg-red-50"
              >
                Cancel Evaluation
              </Button>
            </div>

            <div className="flex flex-col gap-2">
              {currentStep >= 1 && currentStep <= 7 && !isCurrentStepComplete() ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        onClick={nextStep} 
                        className="px-6"
                        disabled={true}
                      >
                        Next
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Please complete all {getStepName()} scores to continue</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <Button 
                  onClick={nextStep} 
                  className="px-6"
                >
                  Next
                </Button>
              )}
              {currentStep >= 1 && currentStep <= 7 && !isCurrentStepComplete() && (
                <p className="text-sm text-gray-500 text-center">
                  Please complete all {getStepName()} scores to continue
                </p>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
