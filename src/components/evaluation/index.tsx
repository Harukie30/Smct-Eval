"use client";

import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";
import Step1 from "./Step1";
import Step2 from "./Step2";
import Step3 from "./Step3";
import Step4 from "./Step4";
import Step5 from "./Step5";
import Step6 from "./Step6";
import Step7 from "./Step7";
import OverallAssessment from "./OverallAssessment";
import WelcomeStep from "./WelcomeStep";
import { EvaluationPayload } from "./types";
import { storeEvaluationResult } from "@/lib/evaluationStorage";
import { apiService } from "@/lib/apiService";
import { createEvaluationNotification } from "@/lib/notificationUtils";
import { User, useAuth } from "../../contexts/UserContext";

const steps = [
  { id: 1, title: "Employee Information / Job Knowledge", component: Step1 },
  { id: 2, title: "Quality of Work", component: Step2 },
  { id: 3, title: "Adaptability", component: Step3 },
  { id: 4, title: "Teamwork", component: Step4 },
  { id: 5, title: "Reliability", component: Step5 },
  { id: 6, title: "Ethical & Professional Behavior", component: Step6 },
  { id: 7, title: "Customer Service", component: Step7 },
  { id: 8, title: "Overall Assessment", component: OverallAssessment },
];

interface EvaluationFormProps {
  employee?: User | null;
  onCloseAction?: () => void;
  onCancelAction?: () => void;
}

export default function EvaluationForm({
  employee,
  onCloseAction,
  onCancelAction,
}: EvaluationFormProps) {
  const [currentStep, setCurrentStep] = useState(0); // 0 = welcome step, 1-8 = actual steps
  const [welcomeAnimationKey, setWelcomeAnimationKey] = useState(0);
  const { user } = useAuth();
  const [form, setForm] = useState<EvaluationPayload>({
    hireDate: "",
    rating: 0,
    coverageFrom: "",
    coverageTo: "",
    reviewTypeProbationary: "",
    reviewTypeRegular: "",
    reviewTypeOthersImprovement: false,
    reviewTypeOthersCustom: "",
    priorityArea1: "",
    priorityArea2: "",
    priorityArea3: "",
    remarks: "",
    jobKnowledgeScore1: 0,
    jobKnowledgeScore2: 0,
    jobKnowledgeScore3: 0,
    jobKnowledgeComments1: "",
    jobKnowledgeComments2: "",
    jobKnowledgeComments3: "",
    qualityOfWorkScore1: 0,
    qualityOfWorkScore2: 0,
    qualityOfWorkScore3: 0,
    qualityOfWorkScore4: 0,
    qualityOfWorkScore5: 0,
    qualityOfWorkComments1: "",
    qualityOfWorkComments2: "",
    qualityOfWorkComments3: "",
    qualityOfWorkComments4: "",
    qualityOfWorkComments5: "",
    adaptabilityScore1: 0,
    adaptabilityScore2: 0,
    adaptabilityScore3: 0,
    adaptabilityComments1: "",
    adaptabilityComments2: "",
    adaptabilityComments3: "",
    teamworkScore1: 0,
    teamworkScore2: 0,
    teamworkScore3: 0,
    teamworkComments1: "",
    teamworkComments2: "",
    teamworkComments3: "",
    reliabilityScore1: 0,
    reliabilityScore2: 0,
    reliabilityScore3: 0,
    reliabilityScore4: 0,
    reliabilityComments1: "",
    reliabilityComments2: "",
    reliabilityComments3: "",
    reliabilityComments4: "",
    ethicalScore1: 0,
    ethicalScore2: 0,
    ethicalScore3: 0,
    ethicalScore4: 0,
    ethicalExplanation1: "",
    ethicalExplanation2: "",
    ethicalExplanation3: "",
    ethicalExplanation4: "",
    customerServiceScore1: 0,
    customerServiceScore2: 0,
    customerServiceScore3: 0,
    customerServiceScore4: 0,
    customerServiceScore5: 0,
    customerServiceExplanation1: "",
    customerServiceExplanation2: "",
    customerServiceExplanation3: "",
    customerServiceExplanation4: "",
    customerServiceExplanation5: "",
  });

  const updateDataAction = (updates: Partial<EvaluationPayload>) => {
    setForm((prev) => ({
      ...prev,
      ...updates,
    }));
  };

  // Reset animation when returning to welcome step or on initial mount
  useEffect(() => {
    if (currentStep === 0) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        setWelcomeAnimationKey((prev) => prev + 1);
      }, 10);
    }
  }, [currentStep]);

  // Trigger animation on initial mount
  useEffect(() => {
    setWelcomeAnimationKey((prev) => prev + 1);
  }, []);

  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  const startEvaluation = () => {
    setCurrentStep(1);
  };

  // Check if current step scores are complete
  const isCurrentStepComplete = () => {
    switch (currentStep) {
      case 1: // Employee Information & Job Knowledge
        // Check if at least one review type is selected
        const hasReviewType =
          form.reviewTypeProbationary ||
          form.reviewTypeProbationary ||
          form.reviewTypeRegular ||
          form.reviewTypeOthersImprovement ||
          (form.reviewTypeOthersCustom &&
            form.reviewTypeOthersCustom.trim() !== "");

        // Check if all job knowledge scores are filled
        const hasJobKnowledgeScores =
          form.jobKnowledgeScore1 &&
          form.jobKnowledgeScore1 !== 0 &&
          form.jobKnowledgeScore2 &&
          form.jobKnowledgeScore2 !== 0 &&
          form.jobKnowledgeScore3 &&
          form.jobKnowledgeScore3 !== 0;

        // Check if basic employee information is filled
        const hasBasicInfo =
          form.coverageFrom &&
          form.coverageFrom !== "" &&
          form.coverageTo &&
          form.coverageTo !== "";

        // Check if coverage dates are valid (coverageFrom must be before coverageTo and not before hireDate)
        const hasValidCoverageDates = (() => {
          if (!hasBasicInfo) return false;
          try {
            // Convert to date strings in YYYY-MM-DD format for reliable comparison
            const fromDateStr = typeof form.coverageFrom === "string" 
              ? form.coverageFrom 
              : new Date(form.coverageFrom).toISOString().split("T")[0];
            const toDateStr = typeof form.coverageTo === "string"
              ? form.coverageTo
              : new Date(form.coverageTo).toISOString().split("T")[0];
            
            // Validate date strings are in correct format
            if (!fromDateStr || !toDateStr || fromDateStr.length !== 10 || toDateStr.length !== 10) {
              return false;
            }
            
            // Check if fromDate is before toDate (string comparison works for YYYY-MM-DD format)
            if (fromDateStr >= toDateStr) {
              return false;
            }
            
            // Check if coverageFrom is not before date hired
            if (form.hireDate) {
              const hireDateStr = typeof form.hireDate === "string"
                ? form.hireDate
                : new Date(form.hireDate).toISOString().split("T")[0];
              if (hireDateStr && hireDateStr.length === 10 && fromDateStr < hireDateStr) {
                return false;
              }
            }
            return true;
          } catch (error) {
            return false;
          }
        })();

        return hasReviewType && hasJobKnowledgeScores && hasBasicInfo && hasValidCoverageDates;
      case 2: // Quality of Work
        return (
          form.qualityOfWorkScore1 &&
          form.qualityOfWorkScore1 !== 0 &&
          form.qualityOfWorkScore2 &&
          form.qualityOfWorkScore2 !== 0 &&
          form.qualityOfWorkScore3 &&
          form.qualityOfWorkScore3 !== 0 &&
          form.qualityOfWorkScore4 &&
          form.qualityOfWorkScore4 !== 0 &&
          form.qualityOfWorkScore5 &&
          form.qualityOfWorkScore5 !== 0
        );
      case 3: // Adaptability
        return (
          form.adaptabilityScore1 &&
          form.adaptabilityScore1 !== 0 &&
          form.adaptabilityScore2 &&
          form.adaptabilityScore2 !== 0 &&
          form.adaptabilityScore3 &&
          form.adaptabilityScore3 !== 0
        );
      case 4: // Teamwork
        return (
          form.teamworkScore1 &&
          form.teamworkScore1 !== 0 &&
          form.teamworkScore2 &&
          form.teamworkScore2 !== 0 &&
          form.teamworkScore3 &&
          form.teamworkScore3 !== 0
        );
      case 5: // Reliability
        return (
          form.reliabilityScore1 &&
          form.reliabilityScore1 !== 0 &&
          form.reliabilityScore2 &&
          form.reliabilityScore2 !== 0 &&
          form.reliabilityScore3 &&
          form.reliabilityScore3 !== 0 &&
          form.reliabilityScore4 &&
          form.reliabilityScore4 !== 0
        );
      case 6: // Ethical & Professional Behavior
        return (
          form.ethicalScore1 &&
          form.ethicalScore1 !== 0 &&
          form.ethicalScore2 &&
          form.ethicalScore2 !== 0 &&
          form.ethicalScore3 &&
          form.ethicalScore3 !== 0 &&
          form.ethicalScore4 &&
          form.ethicalScore4 !== 0
        );
      case 7: // Customer Service
        return (
          form.customerServiceScore1 &&
          form.customerServiceScore1 !== 0 &&
          form.customerServiceScore2 &&
          form.customerServiceScore2 !== 0 &&
          form.customerServiceScore3 &&
          form.customerServiceScore3 !== 0 &&
          form.customerServiceScore4 &&
          form.customerServiceScore4 !== 0 &&
          form.customerServiceScore5 &&
          form.customerServiceScore5 !== 0
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
      case 1:
        return "Employee Information & Job Knowledge";
      case 2:
        return "Quality of Work";
      case 3:
        return "Adaptability";
      case 4:
        return "Teamwork";
      case 5:
        return "Reliability";
      case 6:
        return "Ethical & Professional Behavior";
      case 7:
        return "Customer Service";
      case 8:
        return "Overall Assessment";
      default:
        return "evaluation";
    }
  };

  // Get validation message for incomplete steps
  const getValidationMessage = () => {
    switch (currentStep) {
      case 1: // Employee Information & Job Knowledge
        if (
          !form.reviewTypeProbationary &&
          !form.reviewTypeRegular &&
          !form.reviewTypeOthersImprovement &&
          (!form.reviewTypeOthersCustom ||
            form.reviewTypeOthersCustom.trim() === "")
        ) {
          return "Please select at least one review type";
        }

        if (!form.coverageFrom || form.coverageFrom === "") {
          return "Please select Performance Coverage 'From' date";
        }
        if (!form.coverageTo || form.coverageTo === "") {
          return "Please select Performance Coverage 'To' date";
        }
        // Check if coverage dates are valid (coverageFrom must be before coverageTo and not before hireDate)
        if (form.coverageFrom && form.coverageTo) {
          try {
            // Convert to date strings in YYYY-MM-DD format for reliable comparison
            const fromDateStr = typeof form.coverageFrom === "string" 
              ? form.coverageFrom 
              : new Date(form.coverageFrom).toISOString().split("T")[0];
            const toDateStr = typeof form.coverageTo === "string"
              ? form.coverageTo
              : new Date(form.coverageTo).toISOString().split("T")[0];
            
            if (fromDateStr && toDateStr && fromDateStr.length === 10 && toDateStr.length === 10) {
              // Check if fromDate is before toDate (string comparison works for YYYY-MM-DD format)
              if (fromDateStr >= toDateStr) {
                return "Performance Coverage 'From' date must be earlier than 'To' date";
              }
              // Check if coverageFrom is before date hired
              if (form.hireDate) {
                const hireDateStr = typeof form.hireDate === "string"
                  ? form.hireDate
                  : new Date(form.hireDate).toISOString().split("T")[0];
                if (hireDateStr && hireDateStr.length === 10 && fromDateStr < hireDateStr) {
                  return "Performance Coverage cannot start before Date Hired";
                }
              }
            }
          } catch (error) {
            return "Please enter valid Performance Coverage dates";
          }
        }
        if (
          !form.jobKnowledgeScore1 ||
          form.jobKnowledgeScore1 === 0 ||
          !form.jobKnowledgeScore2 ||
          form.jobKnowledgeScore2 === 0 ||
          !form.jobKnowledgeScore1 ||
          form.jobKnowledgeScore3 === 0
        ) {
          return "Please complete all job knowledge scores";
        }

        return "Please complete all required fields";
      case 8: // Overall Assessment
        return "Please complete all required fields";
      default:
        return "Please complete all scores for this step";
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

  // const handleApprove = () => {
  //   // Mark the evaluation as approved by the evaluator
  //   setIsEvaluatorApproved(true);

  //   // Show success message
  //   alert(
  //     "Evaluation approved by evaluator! The evaluation is now ready for employee review."
  //   );
  // };

  const handleSuccessDialogClose = () => {
    setShowSuccessDialog(false);
    // Close the main evaluation modal
    if (onCloseAction) {
      onCloseAction();
    }
  };

  // submission confirmation
  const confirmSubmit = async () => {
    try {
      const empID = employee?.id;
      if (empID) {
        const response = await apiService.createSubmission(empID, form);
      }
      setShowSuccessDialog(true);
    } catch (clientError) {
      console.log(
        "Client data service storage failed, but localStorage storage succeeded:",
        clientError
      );
    }
  };

  // Helper function to calculate overall rating
  // const calculateOverallRating = (data: EvaluationPayload): string => {
  //   const scores: number[] = [];

  //   // Collect all numeric scores
  //   Object.entries(data).forEach(([key, value]) => {
  //     if (key.includes("Score") && typeof value === "string" && value !== "") {
  //       const numValue = parseFloat(value);
  //       if (!isNaN(numValue)) {
  //         scores.push(numValue);
  //       }
  //     }
  //   });

  //   // Calculate average
  //   if (scores.length === 0) return "0";
  //   const average =
  //     scores.reduce((sum, score) => sum + score, 0) / scores.length;
  //   return (Math.round(average * 10) / 10).toString(); // Round to 1 decimal place and return as string
  // };

  const CurrentStepComponent =
    currentStep === 0 ? WelcomeStep : steps[currentStep - 1].component;

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
          0%,
          100% {
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
                                ? "bg-blue-500 text-white shadow-md scale-110"
                                : index + 1 < currentStep
                                ? "bg-green-500 text-white"
                                : "bg-gray-200 text-gray-500"
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
                                  index + 1 < currentStep
                                    ? "bg-green-500"
                                    : "bg-gray-200"
                                }`}
                                style={{
                                  width:
                                    index + 1 < currentStep ? "100%" : "0%",
                                }}
                              ></div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="text-center">
                    <span className="text-sm font-medium text-gray-700">
                      Step {currentStep} of {steps.length}:{" "}
                      {steps[currentStep - 1].title}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step Content */}
            {currentStep === 0 ? (
              <Card
                key={`welcome-${welcomeAnimationKey}`}
                className="welcome-step-animate"
              >
                <CardContent>
                  <CurrentStepComponent
                    data={form}
                    updateDataAction={updateDataAction}
                    employee={employee}
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
                      data={form}
                      updateDataAction={updateDataAction}
                      employee={employee}
                      onSubmitAction={handleSubmit}
                      onPreviousAction={prevStep}
                      onCloseAction={handleCloseAfterSubmission}
                    />
                  ) : (
                    <CurrentStepComponent
                      data={form}
                      updateDataAction={updateDataAction}
                      employee={employee}
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
                    {currentStep >= 1 &&
                    currentStep <= 7 &&
                    !isCurrentStepComplete() ? (
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
        <DialogContent
          className="max-w-md m-8"
          style={{
            animation: "dialogPopup 0.3s ease-out",
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Cancel Evaluation
            </DialogTitle>
          </DialogHeader>
          <div className="py-3 bg-red-50 p-4 mx-2 my-2">
            <p className="text-gray-600">
              Are you sure you want to cancel this evaluation? All progress will
              be lost and cannot be recovered.
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
                setForm({
                  hireDate: "",
                  rating: 0,
                  coverageFrom: "",
                  coverageTo: "",
                  reviewTypeProbationary: "",
                  reviewTypeRegular: "",
                  reviewTypeOthersImprovement: false,
                  reviewTypeOthersCustom: "",
                  priorityArea1: "",
                  priorityArea2: "",
                  priorityArea3: "",
                  remarks: "",
                  jobKnowledgeScore1: 0,
                  jobKnowledgeScore2: 0,
                  jobKnowledgeScore3: 0,
                  jobKnowledgeComments1: "",
                  jobKnowledgeComments2: "",
                  jobKnowledgeComments3: "",
                  qualityOfWorkScore1: 0,
                  qualityOfWorkScore2: 0,
                  qualityOfWorkScore3: 0,
                  qualityOfWorkScore4: 0,
                  qualityOfWorkScore5: 0,
                  qualityOfWorkComments1: "",
                  qualityOfWorkComments2: "",
                  qualityOfWorkComments3: "",
                  qualityOfWorkComments4: "",
                  qualityOfWorkComments5: "",
                  adaptabilityScore1: 0,
                  adaptabilityScore2: 0,
                  adaptabilityScore3: 0,
                  adaptabilityComments1: "",
                  adaptabilityComments2: "",
                  adaptabilityComments3: "",
                  teamworkScore1: 0,
                  teamworkScore2: 0,
                  teamworkScore3: 0,
                  teamworkComments1: "",
                  teamworkComments2: "",
                  teamworkComments3: "",
                  reliabilityScore1: 0,
                  reliabilityScore2: 0,
                  reliabilityScore3: 0,
                  reliabilityScore4: 0,
                  reliabilityComments1: "",
                  reliabilityComments2: "",
                  reliabilityComments3: "",
                  reliabilityComments4: "",
                  ethicalScore1: 0,
                  ethicalScore2: 0,
                  ethicalScore3: 0,
                  ethicalScore4: 0,
                  ethicalExplanation1: "",
                  ethicalExplanation2: "",
                  ethicalExplanation3: "",
                  ethicalExplanation4: "",
                  customerServiceScore1: 0,
                  customerServiceScore2: 0,
                  customerServiceScore3: 0,
                  customerServiceScore4: 0,
                  customerServiceScore5: 0,
                  customerServiceExplanation1: "",
                  customerServiceExplanation2: "",
                  customerServiceExplanation3: "",
                  customerServiceExplanation4: "",
                  customerServiceExplanation5: "",
                });
              }}
              className="px-4"
            >
              Cancel Evaluation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog
        open={showSuccessDialog}
        onOpenChangeAction={setShowSuccessDialog}
      >
        <DialogContent
          className="max-w-md m-8 success-dialog"
          style={{
            animation: "dialogPopup 0.3s ease-out",
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-900 flex items-center justify-center gap-2">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-green-600 check-animation"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  style={{
                    strokeDasharray: "20",
                    strokeDashoffset: "20",
                    animation: "drawCheck 0.6s ease-in-out 0.3s forwards",
                  }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              Evaluation Submitted Successfully!
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-green-50 p-4 rounded-lg mb-4 success-message">
              <p className="text-gray-700 text-center">
                🎉 Your evaluation has been submitted successfully!
                <br />
                The employee can now view their results in their dashboard.
              </p>
            </div>
            <div className="text-sm text-gray-600 text-center">
              <p>
                <strong>Employee:</strong>{" "}
                {employee?.fname + " " + employee?.lname}
              </p>
              <p>
                <strong>Submitted:</strong>{" "}
                {new Date().toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
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
