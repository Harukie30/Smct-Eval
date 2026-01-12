'use client';

import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { approveEvaluation } from '@/lib/approvalService';
import { useEmployeeSignatureByEvaluation } from '@/hooks/useEmployeeSignature';

type Submission = {
  id: number;
  employeeName: string;
  category?: string;
  rating?: number;
  submittedAt: string;
  status: string;
  evaluator?: string;
  evaluationData?: any;
  employeeId?: number;
  employeeEmail?: string;
  evaluatorId?: number;
  evaluatorName?: string;
  period?: string;
  overallRating?: string;
  // Approval-related properties
  approvalStatus?: string;
  employeeSignature?: string | null;
  employeeApprovedAt?: string | null;
  evaluatorSignature?: string | null;
  evaluatorApprovedAt?: string | null;
};

interface ApprovalData {
  id: string;
  approvedAt: string;
  employeeSignature: string;
  employeeName: string;
  employeeEmail: string;
}

interface ViewResultsModalProps {
  isOpen: boolean;
  onCloseAction: () => void;
  submission: Submission | null;
  onApprove?: (submissionId: string) => void;
  isApproved?: boolean;
  approvalData?: ApprovalData | null;
  currentUserName?: string;
  currentUserSignature?: string; // New prop for current user's signature
  showApprovalButton?: boolean; // New prop to control approval button visibility
  isEvaluatorView?: boolean; // New prop to indicate if this is being viewed by evaluator
}

// Helper functions for rating calculations
const getRatingLabel = (score: number) => {
  if (score >= 4.5) return 'Outstanding';
  if (score >= 4.0) return 'Exceeds Expectations';
  if (score >= 3.5) return 'Meets Expectations';
  if (score >= 2.5) return 'Needs Improvement';
  return 'Unsatisfactory';
};

const calculateScore = (scores: string[]) => {
  const validScores = scores.filter(score => score && score !== '').map(score => parseFloat(score));
  if (validScores.length === 0) return 0;
  return validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
};

const getRatingColorForLabel = (rating: string) => {
  switch (rating) {
    case 'Outstanding':
    case 'Exceeds Expectations':
      return 'text-green-700 bg-green-100';
    case 'Needs Improvement':
    case 'Unsatisfactory':
      return 'text-red-700 bg-red-100';
    case 'Meets Expectations':
      return 'text-yellow-700 bg-yellow-100';
    default:
      return 'text-gray-500 bg-gray-100';
  }
};

// Function to get quarter from date
const getQuarterFromDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Unknown';
    
    const month = date.getMonth() + 1; // getMonth() returns 0-11
    const year = date.getFullYear();
    
    if (month >= 1 && month <= 3) return `Q1 ${year}`;
    if (month >= 4 && month <= 6) return `Q2 ${year}`;
    if (month >= 7 && month <= 9) return `Q3 ${year}`;
    if (month >= 10 && month <= 12) return `Q4 ${year}`;
    
    return 'Unknown';
  } catch (error) {
    return 'Unknown';
  }
};

const getQuarterColor = (quarter: string) => {
  if (quarter.includes('Q1')) return 'bg-blue-100 text-blue-800';
  if (quarter.includes('Q2')) return 'bg-green-100 text-green-800';
  if (quarter.includes('Q3')) return 'bg-yellow-100 text-yellow-800';
  if (quarter.includes('Q4')) return 'bg-purple-100 text-purple-800';
  return 'bg-gray-100 text-gray-800';
};

export default function ViewResultsModal({ isOpen, onCloseAction, submission, onApprove, isApproved = false, approvalData = null, currentUserName, currentUserSignature, showApprovalButton = false, isEvaluatorView = false }: ViewResultsModalProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [approvalError, setApprovalError] = useState('');

  // Fetch employee signature for this evaluation
  const { signature: employeeSignature, loading: signatureLoading, error: signatureError } = useEmployeeSignatureByEvaluation(submission?.id || null);

  if (!submission) return null;


  // Handle approval API call
  const handleApproveEvaluation = async () => {
    if (!submission.id) {
      setApprovalError('Invalid submission ID');
      return;
    }

    setIsApproving(true);
    setApprovalError('');

    try {
      // For development: Use mock service
      // For production: Replace with actual API call
      const result = await approveEvaluation({
        submissionId: submission.id,
        employeeId: submission.employeeId || 0,
        approvedAt: new Date().toISOString(),
        employeeName: currentUserName || submission.employeeName
      });

      // Call the parent component's onApprove callback if provided
      if (onApprove) {
        onApprove(submission.id.toString());
      }

      // Show success message
      console.log('✅ Evaluation approved successfully:', result);
      
      // TODO: Replace with actual API call when backend is ready:
      /*
      const response = await fetch('/api/evaluations/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          submissionId: submission.id,
          employeeId: submission.employeeId,
          approvedAt: new Date().toISOString(),
          employeeName: currentUserName || submission.employeeName
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      */
      
    } catch (error) {
      console.error('❌ Error approving evaluation:', error);
      setApprovalError('Failed to approve evaluation. Please try again.');
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChangeAction={onCloseAction}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto p-6 animate-popup">
        <div className="space-y-8">
          <div className="flex items-center justify-between border-b border-gray-200 pb-4">
            <h2 className="text-3xl font-bold text-gray-900">Evaluation Details</h2>
            <Button
              onClick={onCloseAction}
              className="px-4 py-2 bg-blue-500 text-white hover:bg-red-600 hover:text-white cursor-pointer"
            >
             🗙 Close
            </Button>
          </div>

          <div className="space-y-8">
            {/* Header Information */}
            <Card className="shadow-md">
              <CardHeader className="bg-gray-50 border-b border-gray-200">
                <CardTitle className="text-xl font-semibold text-gray-900">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Employee Name</Label>
                    <p className="text-lg font-semibold">{submission.employeeName}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Category</Label>
                    <Badge className="bg-blue-100 text-blue-800">{submission.category || 'Performance Review'}</Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Submitted Date</Label>
                    <p className="text-lg">{new Date(submission.submittedAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Quarter</Label>
                    <Badge className={getQuarterColor(getQuarterFromDate(submission.submittedAt))}>
                      {getQuarterFromDate(submission.submittedAt)}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Immediate Supervisor</Label>
                    <p className="text-lg">{submission.evaluationData?.supervisor || 'Not specified'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Overall Rating</Label>
                    <p className="text-lg font-semibold">
                      {submission.evaluationData ? (
                        (() => {
                          const jobKnowledgeScore = calculateScore([submission.evaluationData.jobKnowledgeScore1, submission.evaluationData.jobKnowledgeScore2, submission.evaluationData.jobKnowledgeScore3]);
                          const qualityOfWorkScore = calculateScore([submission.evaluationData.qualityOfWorkScore1, submission.evaluationData.qualityOfWorkScore2, submission.evaluationData.qualityOfWorkScore3, submission.evaluationData.qualityOfWorkScore4, submission.evaluationData.qualityOfWorkScore5]);
                          const adaptabilityScore = calculateScore([submission.evaluationData.adaptabilityScore1, submission.evaluationData.adaptabilityScore2, submission.evaluationData.adaptabilityScore3]);
                          const teamworkScore = calculateScore([submission.evaluationData.teamworkScore1, submission.evaluationData.teamworkScore2, submission.evaluationData.teamworkScore3]);
                          const reliabilityScore = calculateScore([submission.evaluationData.reliabilityScore1, submission.evaluationData.reliabilityScore2, submission.evaluationData.reliabilityScore3, submission.evaluationData.reliabilityScore4]);
                          const ethicalScore = calculateScore([submission.evaluationData.ethicalScore1, submission.evaluationData.ethicalScore2, submission.evaluationData.ethicalScore3, submission.evaluationData.ethicalScore4]);
                          const customerServiceScore = calculateScore([submission.evaluationData.customerServiceScore1, submission.evaluationData.customerServiceScore2, submission.evaluationData.customerServiceScore3, submission.evaluationData.customerServiceScore4, submission.evaluationData.customerServiceScore5]);

                          const overallWeightedScore = (
                            (jobKnowledgeScore * 0.20) +
                            (qualityOfWorkScore * 0.20) +
                            (adaptabilityScore * 0.10) +
                            (teamworkScore * 0.10) +
                            (reliabilityScore * 0.05) +
                            (ethicalScore * 0.05) +
                            (customerServiceScore * 0.30)
                          );

                          return `${Math.round(overallWeightedScore * 10) / 10}/5`;
                        })()
                      ) : (
                        `${submission.rating || 0}/5`
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>


            {/* Review Type Section */}
            {submission.evaluationData && (
              <Card className="shadow-md">
                <CardHeader className="bg-gray-50 border-b border-gray-200">
                  <CardTitle className="text-xl font-semibold text-gray-900">Review Type</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                            
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* For Probationary */}
                    <div className="space-y-3">
                      <h5 className="font-medium text-gray-800">For Probationary</h5>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center ${submission.evaluationData.reviewTypeProbationary3 ? 'bg-green-500' : 'bg-gray-300'}`}>
                            {submission.evaluationData.reviewTypeProbationary3 && (
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            )}
                          </div>
                          <span className="text-sm text-gray-700">3 months</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center ${submission.evaluationData.reviewTypeProbationary5 ? 'bg-green-500' : 'bg-gray-300'}`}>
                            {submission.evaluationData.reviewTypeProbationary5 && (
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            )}
                          </div>
                          <span className="text-sm text-gray-700">5 months</span>
                        </div>
                      </div>
                    </div>

                    {/* For Regular */}
                    <div className="space-y-3">
                      <h5 className="font-medium text-gray-800">For Regular</h5>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center ${submission.evaluationData.reviewTypeRegularQ1 ? 'bg-green-500' : 'bg-gray-300'}`}>
                            {submission.evaluationData.reviewTypeRegularQ1 && (
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            )}
                          </div>
                          <span className="text-sm text-gray-700">Q1 review</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center ${submission.evaluationData.reviewTypeRegularQ2 ? 'bg-green-500' : 'bg-gray-300'}`}>
                            {submission.evaluationData.reviewTypeRegularQ2 && (
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            )}
                          </div>
                          <span className="text-sm text-gray-700">Q2 review</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center ${submission.evaluationData.reviewTypeRegularQ3 ? 'bg-green-500' : 'bg-gray-300'}`}>
                            {submission.evaluationData.reviewTypeRegularQ3 && (
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            )}
                          </div>
                          <span className="text-sm text-gray-700">Q3 review</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center ${submission.evaluationData.reviewTypeRegularQ4 ? 'bg-green-500' : 'bg-gray-300'}`}>
                            {submission.evaluationData.reviewTypeRegularQ4 && (
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            )}
                          </div>
                          <span className="text-sm text-gray-700">Q4 review</span>
                        </div>
                      </div>
                    </div>

                    {/* Others */}
                    <div className="space-y-3">
                      <h5 className="font-medium text-gray-800">Others</h5>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center ${submission.evaluationData.reviewTypeOthersImprovement ? 'bg-green-500' : 'bg-gray-300'}`}>
                            {submission.evaluationData.reviewTypeOthersImprovement && (
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            )}
                          </div>
                          <span className="text-sm text-gray-700">Performance Improvement</span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center ${submission.evaluationData.reviewTypeOthersCustom ? 'bg-green-500' : 'bg-gray-300'}`}>
                              {submission.evaluationData.reviewTypeOthersCustom && (
                                <div className="w-2 h-2 bg-white rounded-full"></div>
                              )}
                            </div>
                            <span className="text-sm text-gray-700">Others:</span>
                          </div>
                          {submission.evaluationData.reviewTypeOthersCustom && (
                            <div className="ml-6 p-2 bg-gray-50 border border-gray-200 rounded text-sm text-gray-700">
                              {submission.evaluationData.reviewTypeOthersCustom}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 1: Job Knowledge */}
            {submission.evaluationData && (
              <Card className="shadow-md">
                <CardHeader className="bg-blue-50 border-b border-blue-200">
                  <CardTitle className="text-xl font-semibold text-blue-900">I. JOB KNOWLEDGE</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="text-sm text-gray-600 mb-4">
                    Demonstrates understanding of job responsibilities. Applies knowledge to tasks and projects. Stays updated in relevant areas.
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">Behavioral Indicators</th>
                          <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">Example</th>
                          <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-900 w-24">Score</th>
                          <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-900 w-32">Rating</th>
                          <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">Comments</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Mastery in Core Competencies and Job Functions (L.E.A.D.E.R.)</td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Demonstrates comprehensive understanding of job requirements and applies knowledge effectively.</td>
                          <td className="border border-gray-300 px-4 py-3 text-center font-medium">{submission.evaluationData.jobKnowledgeScore1 || ''}</td>
                          <td className="border border-gray-300 px-4 py-3 text-center">
                            <div className={`px-2 py-1 rounded text-sm font-medium ${
                              submission.evaluationData.jobKnowledgeScore1 === '5' ? 'bg-green-100 text-green-800' : 
                              submission.evaluationData.jobKnowledgeScore1 === '4' ? 'bg-blue-100 text-blue-800' :
                              submission.evaluationData.jobKnowledgeScore1 === '3' ? 'bg-yellow-100 text-yellow-800' :
                              submission.evaluationData.jobKnowledgeScore1 === '2' ? 'bg-orange-100 text-orange-800' :
                              submission.evaluationData.jobKnowledgeScore1 === '1' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {submission.evaluationData.jobKnowledgeScore1 === '5' ? 'Outstanding' : 
                               submission.evaluationData.jobKnowledgeScore1 === '4' ? 'Exceeds Expectation' :
                               submission.evaluationData.jobKnowledgeScore1 === '3' ? 'Meets Expectations' :
                               submission.evaluationData.jobKnowledgeScore1 === '2' ? 'Needs Improvement' :
                               submission.evaluationData.jobKnowledgeScore1 === '1' ? 'Unsatisfactory' : 'Not Rated'}
                            </div>
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700 bg-yellow-50">{submission.evaluationData.jobKnowledgeComments1 || ''}</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Keeps Documentation Updated</td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Maintains current and accurate documentation for projects and processes.</td>
                          <td className="border border-gray-300 px-4 py-3 text-center font-medium">{submission.evaluationData.jobKnowledgeScore2 || ''}</td>
                          <td className="border border-gray-300 px-4 py-3 text-center">
                            <div className={`px-2 py-1 rounded text-sm font-medium ${
                              submission.evaluationData.jobKnowledgeScore2 === '5' ? 'bg-green-100 text-green-800' : 
                              submission.evaluationData.jobKnowledgeScore2 === '4' ? 'bg-blue-100 text-blue-800' :
                              submission.evaluationData.jobKnowledgeScore2 === '3' ? 'bg-yellow-100 text-yellow-800' :
                              submission.evaluationData.jobKnowledgeScore2 === '2' ? 'bg-orange-100 text-orange-800' :
                              submission.evaluationData.jobKnowledgeScore2 === '1' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {submission.evaluationData.jobKnowledgeScore2 === '5' ? 'Outstanding' : 
                               submission.evaluationData.jobKnowledgeScore2 === '4' ? 'Exceeds Expectation' :
                               submission.evaluationData.jobKnowledgeScore2 === '3' ? 'Meets Expectations' :
                               submission.evaluationData.jobKnowledgeScore2 === '2' ? 'Needs Improvement' :
                               submission.evaluationData.jobKnowledgeScore2 === '1' ? 'Unsatisfactory' : 'Not Rated'}
                            </div>
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700 bg-yellow-50">{submission.evaluationData.jobKnowledgeComments2 || ''}</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Problem Solving</td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Effectively identifies and resolves work-related challenges using job knowledge.</td>
                          <td className="border border-gray-300 px-4 py-3 text-center font-medium">{submission.evaluationData.jobKnowledgeScore3 || ''}</td>
                          <td className="border border-gray-300 px-4 py-3 text-center">
                            <div className={`px-2 py-1 rounded text-sm font-medium ${
                              submission.evaluationData.jobKnowledgeScore3 === '5' ? 'bg-green-100 text-green-800' : 
                              submission.evaluationData.jobKnowledgeScore3 === '4' ? 'bg-blue-100 text-blue-800' :
                              submission.evaluationData.jobKnowledgeScore3 === '3' ? 'bg-yellow-100 text-yellow-800' :
                              submission.evaluationData.jobKnowledgeScore3 === '2' ? 'bg-orange-100 text-orange-800' :
                              submission.evaluationData.jobKnowledgeScore3 === '1' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {submission.evaluationData.jobKnowledgeScore3 === '5' ? 'Outstanding' : 
                               submission.evaluationData.jobKnowledgeScore3 === '4' ? 'Exceeds Expectation' :
                               submission.evaluationData.jobKnowledgeScore3 === '3' ? 'Meets Expectations' :
                               submission.evaluationData.jobKnowledgeScore3 === '2' ? 'Needs Improvement' :
                               submission.evaluationData.jobKnowledgeScore3 === '1' ? 'Unsatisfactory' : 'Not Rated'}
                            </div>
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700 bg-yellow-50">{submission.evaluationData.jobKnowledgeComments3 || ''}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Quality of Work */}
            {submission.evaluationData && (
              <Card className="shadow-md">
                <CardHeader className="bg-green-50 border-b border-green-200">
                  <CardTitle className="text-xl font-semibold text-green-900">II. QUALITY OF WORK</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="text-sm text-gray-600 mb-4">
                    Accuracy and precision in completing tasks. Attention to detail. Consistency in delivering high-quality results. Timely completion of tasks and projects. Effective use of resources. Ability to meet deadlines.
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">Behavioral Indicators</th>
                          <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">Example</th>
                          <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-900 w-24">Score</th>
                          <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-900 w-32">Rating</th>
                          <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">Comments</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Meets Standards and Requirements</td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Consistently delivers work that meets or exceeds established standards and requirements.</td>
                          <td className="border border-gray-300 px-4 py-3 text-center font-medium">{submission.evaluationData.qualityOfWorkScore1 || ''}</td>
                          <td className="border border-gray-300 px-4 py-3 text-center">
                            <div className={`px-2 py-1 rounded text-sm font-medium ${
                              submission.evaluationData.qualityOfWorkScore1 === '5' ? 'bg-green-100 text-green-800' : 
                              submission.evaluationData.qualityOfWorkScore1 === '4' ? 'bg-blue-100 text-blue-800' :
                              submission.evaluationData.qualityOfWorkScore1 === '3' ? 'bg-yellow-100 text-yellow-800' :
                              submission.evaluationData.qualityOfWorkScore1 === '2' ? 'bg-orange-100 text-orange-800' :
                              submission.evaluationData.qualityOfWorkScore1 === '1' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {submission.evaluationData.qualityOfWorkScore1 === '5' ? 'Outstanding' : 
                               submission.evaluationData.qualityOfWorkScore1 === '4' ? 'Exceeds Expectation' :
                               submission.evaluationData.qualityOfWorkScore1 === '3' ? 'Meets Expectations' :
                               submission.evaluationData.qualityOfWorkScore1 === '2' ? 'Needs Improvement' :
                               submission.evaluationData.qualityOfWorkScore1 === '1' ? 'Unsatisfactory' : 'Not Rated'}
                            </div>
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700 bg-yellow-50">{submission.evaluationData.qualityOfWorkComments1 || ''}</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Timeliness (L.E.A.D.E.R.)</td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Completes tasks and projects within established deadlines and timeframes.</td>
                          <td className="border border-gray-300 px-4 py-3 text-center font-medium">{submission.evaluationData.qualityOfWorkScore2 || ''}</td>
                          <td className="border border-gray-300 px-4 py-3 text-center">
                            <div className={`px-2 py-1 rounded text-sm font-medium ${
                              submission.evaluationData.qualityOfWorkScore2 === '5' ? 'bg-green-100 text-green-800' : 
                              submission.evaluationData.qualityOfWorkScore2 === '4' ? 'bg-blue-100 text-blue-800' :
                              submission.evaluationData.qualityOfWorkScore2 === '3' ? 'bg-yellow-100 text-yellow-800' :
                              submission.evaluationData.qualityOfWorkScore2 === '2' ? 'bg-orange-100 text-orange-800' :
                              submission.evaluationData.qualityOfWorkScore2 === '1' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {submission.evaluationData.qualityOfWorkScore2 === '5' ? 'Outstanding' : 
                               submission.evaluationData.qualityOfWorkScore2 === '4' ? 'Exceeds Expectation' :
                               submission.evaluationData.qualityOfWorkScore2 === '3' ? 'Meets Expectations' :
                               submission.evaluationData.qualityOfWorkScore2 === '2' ? 'Needs Improvement' :
                               submission.evaluationData.qualityOfWorkScore2 === '1' ? 'Unsatisfactory' : 'Not Rated'}
                            </div>
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700 bg-yellow-50">{submission.evaluationData.qualityOfWorkComments2 || ''}</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Work Output Volume (L.E.A.D.E.R.)</td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Produces an appropriate volume of work output relative to role expectations.</td>
                          <td className="border border-gray-300 px-4 py-3 text-center font-medium">{submission.evaluationData.qualityOfWorkScore3 || ''}</td>
                          <td className="border border-gray-300 px-4 py-3 text-center">
                            <div className={`px-2 py-1 rounded text-sm font-medium ${
                              submission.evaluationData.qualityOfWorkScore3 === '5' ? 'bg-green-100 text-green-800' : 
                              submission.evaluationData.qualityOfWorkScore3 === '4' ? 'bg-blue-100 text-blue-800' :
                              submission.evaluationData.qualityOfWorkScore3 === '3' ? 'bg-yellow-100 text-yellow-800' :
                              submission.evaluationData.qualityOfWorkScore3 === '2' ? 'bg-orange-100 text-orange-800' :
                              submission.evaluationData.qualityOfWorkScore3 === '1' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {submission.evaluationData.qualityOfWorkScore3 === '5' ? 'Outstanding' : 
                               submission.evaluationData.qualityOfWorkScore3 === '4' ? 'Exceeds Expectation' :
                               submission.evaluationData.qualityOfWorkScore3 === '3' ? 'Meets Expectations' :
                               submission.evaluationData.qualityOfWorkScore3 === '2' ? 'Needs Improvement' :
                               submission.evaluationData.qualityOfWorkScore3 === '1' ? 'Unsatisfactory' : 'Not Rated'}
                            </div>
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700 bg-yellow-50">{submission.evaluationData.qualityOfWorkComments3 || ''}</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Consistency in Performance (L.E.A.D.E.R.)</td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Maintains consistent quality and performance standards across all tasks and projects.</td>
                          <td className="border border-gray-300 px-4 py-3 text-center font-medium">{submission.evaluationData.qualityOfWorkScore4 || ''}</td>
                          <td className="border border-gray-300 px-4 py-3 text-center">
                            <div className={`px-2 py-1 rounded text-sm font-medium ${
                              submission.evaluationData.qualityOfWorkScore4 === '5' ? 'bg-green-100 text-green-800' : 
                              submission.evaluationData.qualityOfWorkScore4 === '4' ? 'bg-blue-100 text-blue-800' :
                              submission.evaluationData.qualityOfWorkScore4 === '3' ? 'bg-yellow-100 text-yellow-800' :
                              submission.evaluationData.qualityOfWorkScore4 === '2' ? 'bg-orange-100 text-orange-800' :
                              submission.evaluationData.qualityOfWorkScore4 === '1' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {submission.evaluationData.qualityOfWorkScore4 === '5' ? 'Outstanding' : 
                               submission.evaluationData.qualityOfWorkScore4 === '4' ? 'Exceeds Expectation' :
                               submission.evaluationData.qualityOfWorkScore4 === '3' ? 'Meets Expectations' :
                               submission.evaluationData.qualityOfWorkScore4 === '2' ? 'Needs Improvement' :
                               submission.evaluationData.qualityOfWorkScore4 === '1' ? 'Unsatisfactory' : 'Not Rated'}
                            </div>
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700 bg-yellow-50">{submission.evaluationData.qualityOfWorkComments4 || ''}</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Attention to Detail</td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Demonstrates thoroughness and accuracy in work, catching and correcting errors.</td>
                          <td className="border border-gray-300 px-4 py-3 text-center font-medium">{submission.evaluationData.qualityOfWorkScore5 || ''}</td>
                          <td className="border border-gray-300 px-4 py-3 text-center">
                            <div className={`px-2 py-1 rounded text-sm font-medium ${
                              submission.evaluationData.qualityOfWorkScore5 === '5' ? 'bg-green-100 text-green-800' : 
                              submission.evaluationData.qualityOfWorkScore5 === '4' ? 'bg-blue-100 text-blue-800' :
                              submission.evaluationData.qualityOfWorkScore5 === '3' ? 'bg-yellow-100 text-yellow-800' :
                              submission.evaluationData.qualityOfWorkScore5 === '2' ? 'bg-orange-100 text-orange-800' :
                              submission.evaluationData.qualityOfWorkScore5 === '1' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {submission.evaluationData.qualityOfWorkScore5 === '5' ? 'Outstanding' : 
                               submission.evaluationData.qualityOfWorkScore5 === '4' ? 'Exceeds Expectation' :
                               submission.evaluationData.qualityOfWorkScore5 === '3' ? 'Meets Expectations' :
                               submission.evaluationData.qualityOfWorkScore5 === '2' ? 'Needs Improvement' :
                               submission.evaluationData.qualityOfWorkScore5 === '1' ? 'Unsatisfactory' : 'Not Rated'}
                            </div>
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700 bg-yellow-50">{submission.evaluationData.qualityOfWorkComments5 || ''}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Adaptability */}
            {submission.evaluationData && (
              <Card className="shadow-md">
                <CardHeader className="bg-yellow-50 border-b border-yellow-200">
                  <CardTitle className="text-xl font-semibold text-yellow-900">III. ADAPTABILITY</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="text-sm text-gray-600 mb-4">
                    Flexibility in handling change. Ability to work effectively in diverse situations. Resilience in the face of challenges.
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">Behavioral Indicators</th>
                          <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">Example</th>
                          <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-900 w-24">Score</th>
                          <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-900 w-32">Rating</th>
                          <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">Comments</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Openness to Change (attitude towards change)</td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Demonstrates a positive attitude and openness to new ideas and major changes at work</td>
                          <td className="border border-gray-300 px-4 py-3 text-center font-medium">{submission.evaluationData.adaptabilityScore1 || ''}</td>
                          <td className="border border-gray-300 px-4 py-3 text-center">
                            <div className={`px-2 py-1 rounded text-sm font-medium ${
                              submission.evaluationData.adaptabilityScore1 === '5' ? 'bg-green-100 text-green-800' : 
                              submission.evaluationData.adaptabilityScore1 === '4' ? 'bg-blue-100 text-blue-800' :
                              submission.evaluationData.adaptabilityScore1 === '3' ? 'bg-yellow-100 text-yellow-800' :
                              submission.evaluationData.adaptabilityScore1 === '2' ? 'bg-orange-100 text-orange-800' :
                              submission.evaluationData.adaptabilityScore1 === '1' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {submission.evaluationData.adaptabilityScore1 === '5' ? 'Outstanding' : 
                               submission.evaluationData.adaptabilityScore1 === '4' ? 'Exceeds Expectation' :
                               submission.evaluationData.adaptabilityScore1 === '3' ? 'Meets Expectations' :
                               submission.evaluationData.adaptabilityScore1 === '2' ? 'Needs Improvement' :
                               submission.evaluationData.adaptabilityScore1 === '1' ? 'Unsatisfactory' : 'Not Rated'}
                            </div>
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700 bg-yellow-50">{submission.evaluationData.adaptabilityComments1 || ''}</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Flexibility in Job Role (ability to adapt to changes)</td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Adapts to changes in job responsibilities and willingly takes on new tasks</td>
                          <td className="border border-gray-300 px-4 py-3 text-center font-medium">{submission.evaluationData.adaptabilityScore2 || ''}</td>
                          <td className="border border-gray-300 px-4 py-3 text-center">
                            <div className={`px-2 py-1 rounded text-sm font-medium ${
                              submission.evaluationData.adaptabilityScore2 === '5' ? 'bg-green-100 text-green-800' : 
                              submission.evaluationData.adaptabilityScore2 === '4' ? 'bg-blue-100 text-blue-800' :
                              submission.evaluationData.adaptabilityScore2 === '3' ? 'bg-yellow-100 text-yellow-800' :
                              submission.evaluationData.adaptabilityScore2 === '2' ? 'bg-orange-100 text-orange-800' :
                              submission.evaluationData.adaptabilityScore2 === '1' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {submission.evaluationData.adaptabilityScore2 === '5' ? 'Outstanding' : 
                               submission.evaluationData.adaptabilityScore2 === '4' ? 'Exceeds Expectation' :
                               submission.evaluationData.adaptabilityScore2 === '3' ? 'Meets Expectations' :
                               submission.evaluationData.adaptabilityScore2 === '2' ? 'Needs Improvement' :
                               submission.evaluationData.adaptabilityScore2 === '1' ? 'Unsatisfactory' : 'Not Rated'}
                            </div>
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700 bg-yellow-50">{submission.evaluationData.adaptabilityComments2 || ''}</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Resilience in the Face of Challenges</td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Maintains a positive attitude and performance under challenging or difficult conditions</td>
                          <td className="border border-gray-300 px-4 py-3 text-center font-medium">{submission.evaluationData.adaptabilityScore3 || ''}</td>
                          <td className="border border-gray-300 px-4 py-3 text-center">
                            <div className={`px-2 py-1 rounded text-sm font-medium ${
                              submission.evaluationData.adaptabilityScore3 === '5' ? 'bg-green-100 text-green-800' : 
                              submission.evaluationData.adaptabilityScore3 === '4' ? 'bg-blue-100 text-blue-800' :
                              submission.evaluationData.adaptabilityScore3 === '3' ? 'bg-yellow-100 text-yellow-800' :
                              submission.evaluationData.adaptabilityScore3 === '2' ? 'bg-orange-100 text-orange-800' :
                              submission.evaluationData.adaptabilityScore3 === '1' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {submission.evaluationData.adaptabilityScore3 === '5' ? 'Outstanding' : 
                               submission.evaluationData.adaptabilityScore3 === '4' ? 'Exceeds Expectation' :
                               submission.evaluationData.adaptabilityScore3 === '3' ? 'Meets Expectations' :
                               submission.evaluationData.adaptabilityScore3 === '2' ? 'Needs Improvement' :
                               submission.evaluationData.adaptabilityScore3 === '1' ? 'Unsatisfactory' : 'Not Rated'}
                            </div>
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700 bg-yellow-50">{submission.evaluationData.adaptabilityComments3 || ''}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 4: Teamwork */}
            {submission.evaluationData && (
              <Card className="shadow-md">
                <CardHeader className="bg-purple-50 border-b border-purple-200">
                  <CardTitle className="text-xl font-semibold text-purple-900">IV. TEAMWORK</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="text-sm text-gray-600 mb-4">
                    Ability to work well with others. Contribution to team goals and projects. Supportiveness of team members.
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">Behavioral Indicators</th>
                          <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">Example</th>
                          <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-900 w-24">Score</th>
                          <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-900 w-32">Rating</th>
                          <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">Comments</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Active Participation in Team Activities</td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Actively participates in team meetings and projects. Contributes ideas and feedback during discussions. Engages in team tasks to achieve group goals.</td>
                          <td className="border border-gray-300 px-4 py-3 text-center font-medium">{submission.evaluationData.teamworkScore1 || ''}</td>
                          <td className="border border-gray-300 px-4 py-3 text-center">
                            <div className={`px-2 py-1 rounded text-sm font-medium ${
                              submission.evaluationData.teamworkScore1 === '5' ? 'bg-green-100 text-green-800' : 
                              submission.evaluationData.teamworkScore1 === '4' ? 'bg-blue-100 text-blue-800' :
                              submission.evaluationData.teamworkScore1 === '3' ? 'bg-yellow-100 text-yellow-800' :
                              submission.evaluationData.teamworkScore1 === '2' ? 'bg-orange-100 text-orange-800' :
                              submission.evaluationData.teamworkScore1 === '1' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {submission.evaluationData.teamworkScore1 === '5' ? 'Outstanding' : 
                               submission.evaluationData.teamworkScore1 === '4' ? 'Exceeds Expectation' :
                               submission.evaluationData.teamworkScore1 === '3' ? 'Meets Expectations' :
                               submission.evaluationData.teamworkScore1 === '2' ? 'Needs Improvement' :
                               submission.evaluationData.teamworkScore1 === '1' ? 'Unsatisfactory' : 'Not Rated'}
                            </div>
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700 bg-yellow-50">{submission.evaluationData.teamworkComments1 || ''}</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Promotion of a Positive Team Culture</td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Interacts positively with coworkers. Fosters inclusive team culture. Provides support and constructive feedback. Promotes teamwork and camaraderie.</td>
                          <td className="border border-gray-300 px-4 py-3 text-center font-medium">{submission.evaluationData.teamworkScore2 || ''}</td>
                          <td className="border border-gray-300 px-4 py-3 text-center">
                            <div className={`px-2 py-1 rounded text-sm font-medium ${
                              submission.evaluationData.teamworkScore2 === '5' ? 'bg-green-100 text-green-800' : 
                              submission.evaluationData.teamworkScore2 === '4' ? 'bg-blue-100 text-blue-800' :
                              submission.evaluationData.teamworkScore2 === '3' ? 'bg-yellow-100 text-yellow-800' :
                              submission.evaluationData.teamworkScore2 === '2' ? 'bg-orange-100 text-orange-800' :
                              submission.evaluationData.teamworkScore2 === '1' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {submission.evaluationData.teamworkScore2 === '5' ? 'Outstanding' : 
                               submission.evaluationData.teamworkScore2 === '4' ? 'Exceeds Expectation' :
                               submission.evaluationData.teamworkScore2 === '3' ? 'Meets Expectations' :
                               submission.evaluationData.teamworkScore2 === '2' ? 'Needs Improvement' :
                               submission.evaluationData.teamworkScore2 === '1' ? 'Unsatisfactory' : 'Not Rated'}
                            </div>
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700 bg-yellow-50">{submission.evaluationData.teamworkComments2 || ''}</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Effective Communication</td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Communicates openly and clearly with team members. Shares information and updates in a timely manner. Ensures important details are communicated clearly.</td>
                          <td className="border border-gray-300 px-4 py-3 text-center font-medium">{submission.evaluationData.teamworkScore3 || ''}</td>
                          <td className="border border-gray-300 px-4 py-3 text-center">
                            <div className={`px-2 py-1 rounded text-sm font-medium ${
                              submission.evaluationData.teamworkScore3 === '5' ? 'bg-green-100 text-green-800' : 
                              submission.evaluationData.teamworkScore3 === '4' ? 'bg-blue-100 text-blue-800' :
                              submission.evaluationData.teamworkScore3 === '3' ? 'bg-yellow-100 text-yellow-800' :
                              submission.evaluationData.teamworkScore3 === '2' ? 'bg-orange-100 text-orange-800' :
                              submission.evaluationData.teamworkScore3 === '1' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {submission.evaluationData.teamworkScore3 === '5' ? 'Outstanding' : 
                               submission.evaluationData.teamworkScore3 === '4' ? 'Exceeds Expectation' :
                               submission.evaluationData.teamworkScore3 === '3' ? 'Meets Expectations' :
                               submission.evaluationData.teamworkScore3 === '2' ? 'Needs Improvement' :
                               submission.evaluationData.teamworkScore3 === '1' ? 'Unsatisfactory' : 'Not Rated'}
                            </div>
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700 bg-yellow-50">{submission.evaluationData.teamworkComments3 || ''}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 5: Reliability */}
            {submission.evaluationData && (
              <Card className="shadow-md">
                <CardHeader className="bg-indigo-50 border-b border-indigo-200">
                  <CardTitle className="text-xl font-semibold text-indigo-900">V. RELIABILITY</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="text-sm text-gray-600 mb-4">
                    Consistency in attendance and punctuality. Meeting commitments and fulfilling responsibilities.
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">Behavioral Indicators</th>
                          <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">Example</th>
                          <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-900 w-24">Score</th>
                          <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-900 w-32">Rating</th>
                          <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">Comments</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Consistent Attendance</td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Demonstrates regular attendance by being present at work as scheduled</td>
                          <td className="border border-gray-300 px-4 py-3 text-center font-medium">{submission.evaluationData.reliabilityScore1 || ''}</td>
                          <td className="border border-gray-300 px-4 py-3 text-center">
                            <div className={`px-2 py-1 rounded text-sm font-medium ${
                              submission.evaluationData.reliabilityScore1 === '5' ? 'bg-green-100 text-green-800' : 
                              submission.evaluationData.reliabilityScore1 === '4' ? 'bg-blue-100 text-blue-800' :
                              submission.evaluationData.reliabilityScore1 === '3' ? 'bg-yellow-100 text-yellow-800' :
                              submission.evaluationData.reliabilityScore1 === '2' ? 'bg-orange-100 text-orange-800' :
                              submission.evaluationData.reliabilityScore1 === '1' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {submission.evaluationData.reliabilityScore1 === '5' ? 'Outstanding' : 
                               submission.evaluationData.reliabilityScore1 === '4' ? 'Exceeds Expectation' :
                               submission.evaluationData.reliabilityScore1 === '3' ? 'Meets Expectations' :
                               submission.evaluationData.reliabilityScore1 === '2' ? 'Needs Improvement' :
                               submission.evaluationData.reliabilityScore1 === '1' ? 'Unsatisfactory' : 'Not Rated'}
                            </div>
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700 bg-yellow-50">{submission.evaluationData.reliabilityComments1 || ''}</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Punctuality</td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Arrives at work and meetings on time or before the scheduled time</td>
                          <td className="border border-gray-300 px-4 py-3 text-center font-medium">{submission.evaluationData.reliabilityScore2 || ''}</td>
                          <td className="border border-gray-300 px-4 py-3 text-center">
                            <div className={`px-2 py-1 rounded text-sm font-medium ${
                              submission.evaluationData.reliabilityScore2 === '5' ? 'bg-green-100 text-green-800' : 
                              submission.evaluationData.reliabilityScore2 === '4' ? 'bg-blue-100 text-blue-800' :
                              submission.evaluationData.reliabilityScore2 === '3' ? 'bg-yellow-100 text-yellow-800' :
                              submission.evaluationData.reliabilityScore2 === '2' ? 'bg-orange-100 text-orange-800' :
                              submission.evaluationData.reliabilityScore2 === '1' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {submission.evaluationData.reliabilityScore2 === '5' ? 'Outstanding' : 
                               submission.evaluationData.reliabilityScore2 === '4' ? 'Exceeds Expectation' :
                               submission.evaluationData.reliabilityScore2 === '3' ? 'Meets Expectations' :
                               submission.evaluationData.reliabilityScore2 === '2' ? 'Needs Improvement' :
                               submission.evaluationData.reliabilityScore2 === '1' ? 'Unsatisfactory' : 'Not Rated'}
                            </div>
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700 bg-yellow-50">{submission.evaluationData.reliabilityComments2 || ''}</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Follows Through on Commitments</td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Follows through on assignments from and commitments made to coworkers or superiors</td>
                          <td className="border border-gray-300 px-4 py-3 text-center font-medium">{submission.evaluationData.reliabilityScore3 || ''}</td>
                          <td className="border border-gray-300 px-4 py-3 text-center">
                            <div className={`px-2 py-1 rounded text-sm font-medium ${
                              submission.evaluationData.reliabilityScore3 === '5' ? 'bg-green-100 text-green-800' : 
                              submission.evaluationData.reliabilityScore3 === '4' ? 'bg-blue-100 text-blue-800' :
                              submission.evaluationData.reliabilityScore3 === '3' ? 'bg-yellow-100 text-yellow-800' :
                              submission.evaluationData.reliabilityScore3 === '2' ? 'bg-orange-100 text-orange-800' :
                              submission.evaluationData.reliabilityScore3 === '1' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {submission.evaluationData.reliabilityScore3 === '5' ? 'Outstanding' : 
                               submission.evaluationData.reliabilityScore3 === '4' ? 'Exceeds Expectation' :
                               submission.evaluationData.reliabilityScore3 === '3' ? 'Meets Expectations' :
                               submission.evaluationData.reliabilityScore3 === '2' ? 'Needs Improvement' :
                               submission.evaluationData.reliabilityScore3 === '1' ? 'Unsatisfactory' : 'Not Rated'}
                            </div>
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700 bg-yellow-50">{submission.evaluationData.reliabilityComments3 || ''}</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Reliable Handling of Routine Tasks</td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Demonstrates reliability in completing routine tasks without oversight</td>
                          <td className="border border-gray-300 px-4 py-3 text-center font-medium">{submission.evaluationData.reliabilityScore4 || ''}</td>
                          <td className="border border-gray-300 px-4 py-3 text-center">
                            <div className={`px-2 py-1 rounded text-sm font-medium ${
                              submission.evaluationData.reliabilityScore4 === '5' ? 'bg-green-100 text-green-800' : 
                              submission.evaluationData.reliabilityScore4 === '4' ? 'bg-blue-100 text-blue-800' :
                              submission.evaluationData.reliabilityScore4 === '3' ? 'bg-yellow-100 text-yellow-800' :
                              submission.evaluationData.reliabilityScore4 === '2' ? 'bg-orange-100 text-orange-800' :
                              submission.evaluationData.reliabilityScore4 === '1' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {submission.evaluationData.reliabilityScore4 === '5' ? 'Outstanding' : 
                               submission.evaluationData.reliabilityScore4 === '4' ? 'Exceeds Expectation' :
                               submission.evaluationData.reliabilityScore4 === '3' ? 'Meets Expectations' :
                               submission.evaluationData.reliabilityScore4 === '2' ? 'Needs Improvement' :
                               submission.evaluationData.reliabilityScore4 === '1' ? 'Unsatisfactory' : 'Not Rated'}
                            </div>
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700 bg-yellow-50">{submission.evaluationData.reliabilityComments4 || ''}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 6: Ethical & Professional Behavior */}
            {submission.evaluationData && (
              <Card className="shadow-md">
                <CardHeader className="bg-red-50 border-b border-red-200">
                  <CardTitle className="text-xl font-semibold text-red-900">VI. ETHICAL & PROFESSIONAL BEHAVIOR</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="text-sm text-gray-600 mb-4">
                    Complies with company policies and ethical standards. Accountability for one's actions. Professionalism in interactions with coworkers and clients.
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">Behavioral Indicators</th>
                          <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">Example</th>
                          <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-900 w-24">Score</th>
                          <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-900 w-32">Rating</th>
                          <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">Comments</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Follows Company Policies</td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Complies with company rules, regulations, and memorandums</td>
                          <td className="border border-gray-300 px-4 py-3 text-center font-medium">{submission.evaluationData.ethicalScore1 || ''}</td>
                          <td className="border border-gray-300 px-4 py-3 text-center">
                            <div className={`px-2 py-1 rounded text-sm font-medium ${
                              submission.evaluationData.ethicalScore1 === '5' ? 'bg-green-100 text-green-800' : 
                              submission.evaluationData.ethicalScore1 === '4' ? 'bg-blue-100 text-blue-800' :
                              submission.evaluationData.ethicalScore1 === '3' ? 'bg-yellow-100 text-yellow-800' :
                              submission.evaluationData.ethicalScore1 === '2' ? 'bg-orange-100 text-orange-800' :
                              submission.evaluationData.ethicalScore1 === '1' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {submission.evaluationData.ethicalScore1 === '5' ? 'Outstanding' : 
                               submission.evaluationData.ethicalScore1 === '4' ? 'Exceeds Expectation' :
                               submission.evaluationData.ethicalScore1 === '3' ? 'Meets Expectations' :
                               submission.evaluationData.ethicalScore1 === '2' ? 'Needs Improvement' :
                               submission.evaluationData.ethicalScore1 === '1' ? 'Unsatisfactory' : 'Not Rated'}
                            </div>
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700 bg-yellow-50">{submission.evaluationData.ethicalExplanation1 || ''}</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Professionalism (L.E.A.D.E.R.)</td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Maintains a high level of professionalism in all work interactions</td>
                          <td className="border border-gray-300 px-4 py-3 text-center font-medium">{submission.evaluationData.ethicalScore2 || ''}</td>
                          <td className="border border-gray-300 px-4 py-3 text-center">
                            <div className={`px-2 py-1 rounded text-sm font-medium ${
                              submission.evaluationData.ethicalScore2 === '5' ? 'bg-green-100 text-green-800' : 
                              submission.evaluationData.ethicalScore2 === '4' ? 'bg-blue-100 text-blue-800' :
                              submission.evaluationData.ethicalScore2 === '3' ? 'bg-yellow-100 text-yellow-800' :
                              submission.evaluationData.ethicalScore2 === '2' ? 'bg-orange-100 text-orange-800' :
                              submission.evaluationData.ethicalScore2 === '1' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {submission.evaluationData.ethicalScore2 === '5' ? 'Outstanding' : 
                               submission.evaluationData.ethicalScore2 === '4' ? 'Exceeds Expectation' :
                               submission.evaluationData.ethicalScore2 === '3' ? 'Meets Expectations' :
                               submission.evaluationData.ethicalScore2 === '2' ? 'Needs Improvement' :
                               submission.evaluationData.ethicalScore2 === '1' ? 'Unsatisfactory' : 'Not Rated'}
                            </div>
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700 bg-yellow-50">{submission.evaluationData.ethicalExplanation2 || ''}</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Accountability for Mistakes (L.E.A.D.E.R.)</td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Takes responsibility for errors and actively works to correct mistakes</td>
                          <td className="border border-gray-300 px-4 py-3 text-center font-medium">{submission.evaluationData.ethicalScore3 || ''}</td>
                          <td className="border border-gray-300 px-4 py-3 text-center">
                            <div className={`px-2 py-1 rounded text-sm font-medium ${
                              submission.evaluationData.ethicalScore3 === '5' ? 'bg-green-100 text-green-800' : 
                              submission.evaluationData.ethicalScore3 === '4' ? 'bg-blue-100 text-blue-800' :
                              submission.evaluationData.ethicalScore3 === '3' ? 'bg-yellow-100 text-yellow-800' :
                              submission.evaluationData.ethicalScore3 === '2' ? 'bg-orange-100 text-orange-800' :
                              submission.evaluationData.ethicalScore3 === '1' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {submission.evaluationData.ethicalScore3 === '5' ? 'Outstanding' : 
                               submission.evaluationData.ethicalScore3 === '4' ? 'Exceeds Expectation' :
                               submission.evaluationData.ethicalScore3 === '3' ? 'Meets Expectations' :
                               submission.evaluationData.ethicalScore3 === '2' ? 'Needs Improvement' :
                               submission.evaluationData.ethicalScore3 === '1' ? 'Unsatisfactory' : 'Not Rated'}
                            </div>
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700 bg-yellow-50">{submission.evaluationData.ethicalExplanation3 || ''}</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Respect for Others (L.E.A.D.E.R.)</td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Treats all individuals fairly and with respect, regardless of background or position</td>
                          <td className="border border-gray-300 px-4 py-3 text-center font-medium">{submission.evaluationData.ethicalScore4 || ''}</td>
                          <td className="border border-gray-300 px-4 py-3 text-center">
                            <div className={`px-2 py-1 rounded text-sm font-medium ${
                              submission.evaluationData.ethicalScore4 === '5' ? 'bg-green-100 text-green-800' : 
                              submission.evaluationData.ethicalScore4 === '4' ? 'bg-blue-100 text-blue-800' :
                              submission.evaluationData.ethicalScore4 === '3' ? 'bg-yellow-100 text-yellow-800' :
                              submission.evaluationData.ethicalScore4 === '2' ? 'bg-orange-100 text-orange-800' :
                              submission.evaluationData.ethicalScore4 === '1' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {submission.evaluationData.ethicalScore4 === '5' ? 'Outstanding' : 
                               submission.evaluationData.ethicalScore4 === '4' ? 'Exceeds Expectation' :
                               submission.evaluationData.ethicalScore4 === '3' ? 'Meets Expectations' :
                               submission.evaluationData.ethicalScore4 === '2' ? 'Needs Improvement' :
                               submission.evaluationData.ethicalScore4 === '1' ? 'Unsatisfactory' : 'Not Rated'}
                            </div>
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700 bg-yellow-50">{submission.evaluationData.ethicalExplanation4 || ''}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 7: Customer Service */}
            {submission.evaluationData && (
              <Card className="shadow-md">
                <CardHeader className="bg-teal-50 border-b border-teal-200">
                  <CardTitle className="text-xl font-semibold text-teal-900">VII. CUSTOMER SERVICE</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="text-sm text-gray-600 mb-4">
                    Customer satisfaction. Responsiveness to customer needs. Professional and positive interactions with customers.
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">Behavioral Indicators</th>
                          <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">Example</th>
                          <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-900 w-24">Score</th>
                          <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-900 w-32">Rating</th>
                          <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">Comments</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Listening & Understanding</td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Listens to customers and displays understanding of customer needs and concerns</td>
                          <td className="border border-gray-300 px-4 py-3 text-center font-medium">{submission.evaluationData.customerServiceScore1 || ''}</td>
                          <td className="border border-gray-300 px-4 py-3 text-center">
                            <div className={`px-2 py-1 rounded text-sm font-medium ${
                              submission.evaluationData.customerServiceScore1 === '5' ? 'bg-green-100 text-green-800' : 
                              submission.evaluationData.customerServiceScore1 === '4' ? 'bg-blue-100 text-blue-800' :
                              submission.evaluationData.customerServiceScore1 === '3' ? 'bg-yellow-100 text-yellow-800' :
                              submission.evaluationData.customerServiceScore1 === '2' ? 'bg-orange-100 text-orange-800' :
                              submission.evaluationData.customerServiceScore1 === '1' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {submission.evaluationData.customerServiceScore1 === '5' ? 'Outstanding' : 
                               submission.evaluationData.customerServiceScore1 === '4' ? 'Exceeds Expectation' :
                               submission.evaluationData.customerServiceScore1 === '3' ? 'Meets Expectations' :
                               submission.evaluationData.customerServiceScore1 === '2' ? 'Needs Improvement' :
                               submission.evaluationData.customerServiceScore1 === '1' ? 'Unsatisfactory' : 'Not Rated'}
                            </div>
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700 bg-yellow-50">{submission.evaluationData.customerServiceExplanation1 || ''}</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Problem-Solving for Customer Satisfaction</td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Proactively identifies and solves customer problems to ensure satisfaction</td>
                          <td className="border border-gray-300 px-4 py-3 text-center font-medium">{submission.evaluationData.customerServiceScore2 || ''}</td>
                          <td className="border border-gray-300 px-4 py-3 text-center">
                            <div className={`px-2 py-1 rounded text-sm font-medium ${
                              submission.evaluationData.customerServiceScore2 === '5' ? 'bg-green-100 text-green-800' : 
                              submission.evaluationData.customerServiceScore2 === '4' ? 'bg-blue-100 text-blue-800' :
                              submission.evaluationData.customerServiceScore2 === '3' ? 'bg-yellow-100 text-yellow-800' :
                              submission.evaluationData.customerServiceScore2 === '2' ? 'bg-orange-100 text-orange-800' :
                              submission.evaluationData.customerServiceScore2 === '1' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {submission.evaluationData.customerServiceScore2 === '5' ? 'Outstanding' : 
                               submission.evaluationData.customerServiceScore2 === '4' ? 'Exceeds Expectation' :
                               submission.evaluationData.customerServiceScore2 === '3' ? 'Meets Expectations' :
                               submission.evaluationData.customerServiceScore2 === '2' ? 'Needs Improvement' :
                               submission.evaluationData.customerServiceScore2 === '1' ? 'Unsatisfactory' : 'Not Rated'}
                            </div>
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700 bg-yellow-50">{submission.evaluationData.customerServiceExplanation2 || ''}</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Product Knowledge for Customer Support (L.E.A.D.E.R.)</td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Possesses comprehensive product knowledge to assist customers effectively</td>
                          <td className="border border-gray-300 px-4 py-3 text-center font-medium">{submission.evaluationData.customerServiceScore3 || ''}</td>
                          <td className="border border-gray-300 px-4 py-3 text-center">
                            <div className={`px-2 py-1 rounded text-sm font-medium ${
                              submission.evaluationData.customerServiceScore3 === '5' ? 'bg-green-100 text-green-800' : 
                              submission.evaluationData.customerServiceScore3 === '4' ? 'bg-blue-100 text-blue-800' :
                              submission.evaluationData.customerServiceScore3 === '3' ? 'bg-yellow-100 text-yellow-800' :
                              submission.evaluationData.customerServiceScore3 === '2' ? 'bg-orange-100 text-orange-800' :
                              submission.evaluationData.customerServiceScore3 === '1' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {submission.evaluationData.customerServiceScore3 === '5' ? 'Outstanding' : 
                               submission.evaluationData.customerServiceScore3 === '4' ? 'Exceeds Expectation' :
                               submission.evaluationData.customerServiceScore3 === '3' ? 'Meets Expectations' :
                               submission.evaluationData.customerServiceScore3 === '2' ? 'Needs Improvement' :
                               submission.evaluationData.customerServiceScore3 === '1' ? 'Unsatisfactory' : 'Not Rated'}
                            </div>
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700 bg-yellow-50">{submission.evaluationData.customerServiceExplanation3 || ''}</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Positive and Professional Attitude (L.E.A.D.E.R.)</td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Maintains a positive and professional demeanor, particularly during customer interactions</td>
                          <td className="border border-gray-300 px-4 py-3 text-center font-medium">{submission.evaluationData.customerServiceScore4 || ''}</td>
                          <td className="border border-gray-300 px-4 py-3 text-center">
                            <div className={`px-2 py-1 rounded text-sm font-medium ${
                              submission.evaluationData.customerServiceScore4 === '5' ? 'bg-green-100 text-green-800' : 
                              submission.evaluationData.customerServiceScore4 === '4' ? 'bg-blue-100 text-blue-800' :
                              submission.evaluationData.customerServiceScore4 === '3' ? 'bg-yellow-100 text-yellow-800' :
                              submission.evaluationData.customerServiceScore4 === '2' ? 'bg-orange-100 text-orange-800' :
                              submission.evaluationData.customerServiceScore4 === '1' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {submission.evaluationData.customerServiceScore4 === '5' ? 'Outstanding' : 
                               submission.evaluationData.customerServiceScore4 === '4' ? 'Exceeds Expectation' :
                               submission.evaluationData.customerServiceScore4 === '3' ? 'Meets Expectations' :
                               submission.evaluationData.customerServiceScore4 === '2' ? 'Needs Improvement' :
                               submission.evaluationData.customerServiceScore4 === '1' ? 'Unsatisfactory' : 'Not Rated'}
                            </div>
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700 bg-yellow-50">{submission.evaluationData.customerServiceExplanation4 || ''}</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Timely Resolution of Customer Issues (L.E.A.D.E.R.)</td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Resolves customer issues promptly and efficiently</td>
                          <td className="border border-gray-300 px-4 py-3 text-center font-medium">{submission.evaluationData.customerServiceScore5 || ''}</td>
                          <td className="border border-gray-300 px-4 py-3 text-center">
                            <div className={`px-2 py-1 rounded text-sm font-medium ${
                              submission.evaluationData.customerServiceScore5 === '5' ? 'bg-green-100 text-green-800' : 
                              submission.evaluationData.customerServiceScore5 === '4' ? 'bg-blue-100 text-blue-800' :
                              submission.evaluationData.customerServiceScore5 === '3' ? 'bg-yellow-100 text-yellow-800' :
                              submission.evaluationData.customerServiceScore5 === '2' ? 'bg-orange-100 text-orange-800' :
                              submission.evaluationData.customerServiceScore5 === '1' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {submission.evaluationData.customerServiceScore5 === '5' ? 'Outstanding' : 
                               submission.evaluationData.customerServiceScore5 === '4' ? 'Exceeds Expectation' :
                               submission.evaluationData.customerServiceScore5 === '3' ? 'Meets Expectations' :
                               submission.evaluationData.customerServiceScore5 === '2' ? 'Needs Improvement' :
                               submission.evaluationData.customerServiceScore5 === '1' ? 'Unsatisfactory' : 'Not Rated'}
                            </div>
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700 bg-yellow-50">{submission.evaluationData.customerServiceExplanation5 || ''}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Performance Assessment Table */}
            {submission.evaluationData && (
              <Card className="shadow-md">
                <CardHeader className="bg-gray-50 border-b border-gray-200">
                  <CardTitle className="text-xl font-semibold text-gray-900">Performance Assessment Summary</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border-2 border-gray-400">
                        <thead>
                          <tr className="bg-gray-200">
                            <th className="border-2 border-gray-400 px-4 py-3 text-left font-bold text-gray-900 text-base">
                              Performance Criteria
                            </th>
                            <th className="border-2 border-gray-400 px-4 py-3 text-center font-bold text-gray-900 text-base w-32">
                              Rating
                            </th>
                            <th className="border-2 border-gray-400 px-4 py-3 text-center font-bold text-gray-900 text-base w-24">
                              Score
                            </th>
                            <th className="border-2 border-gray-400 px-4 py-3 text-center font-bold text-gray-900 text-base w-24">
                              Weight (%)
                            </th>
                            <th className="border-2 border-gray-400 px-4 py-3 text-center font-bold text-gray-900 text-base w-32">
                              Weighted Score
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* Job Knowledge */}
                          <tr>
                            <td className="border-2 border-gray-400 px-4 py-3 text-sm text-gray-700 font-medium">
                              Job Knowledge
                            </td>
                            <td className="border-2 border-gray-400 px-4 py-3 text-center">
                              <div className="flex items-center justify-center space-x-1">
                                <span className={`px-2 py-1 rounded text-sm font-bold ${getRatingColorForLabel(getRatingLabel(calculateScore([submission.evaluationData.jobKnowledgeScore1, submission.evaluationData.jobKnowledgeScore2, submission.evaluationData.jobKnowledgeScore3])))}`}>
                                  {getRatingLabel(calculateScore([submission.evaluationData.jobKnowledgeScore1, submission.evaluationData.jobKnowledgeScore2, submission.evaluationData.jobKnowledgeScore3]))}
                                </span>
                              </div>
                            </td>
                            <td className="border-2 border-gray-400 px-4 py-3 text-center font-bold text-base">
                              {Math.round(calculateScore([submission.evaluationData.jobKnowledgeScore1, submission.evaluationData.jobKnowledgeScore2, submission.evaluationData.jobKnowledgeScore3]) * 10) / 10}
                            </td>
                            <td className="border-2 border-gray-400 px-4 py-3 text-center font-bold text-base">
                              20%
                            </td>
                            <td className="border-2 border-gray-400 px-4 py-3 text-center font-bold text-base">
                              {Math.round(calculateScore([submission.evaluationData.jobKnowledgeScore1, submission.evaluationData.jobKnowledgeScore2, submission.evaluationData.jobKnowledgeScore3]) * 0.20 * 10) / 10}
                            </td>
                          </tr>

                          {/* Quality of Work */}
                          <tr>
                            <td className="border-2 border-gray-400 px-4 py-3 text-sm text-gray-700 font-medium">
                              Quality of Work
                            </td>
                            <td className="border-2 border-gray-400 px-4 py-3 text-center">
                              <div className="flex items-center justify-center space-x-1">
                                <span className={`px-2 py-1 rounded text-sm font-bold ${getRatingColorForLabel(getRatingLabel(calculateScore([submission.evaluationData.qualityOfWorkScore1, submission.evaluationData.qualityOfWorkScore2, submission.evaluationData.qualityOfWorkScore3, submission.evaluationData.qualityOfWorkScore4, submission.evaluationData.qualityOfWorkScore5])))}`}>
                                  {getRatingLabel(calculateScore([submission.evaluationData.qualityOfWorkScore1, submission.evaluationData.qualityOfWorkScore2, submission.evaluationData.qualityOfWorkScore3, submission.evaluationData.qualityOfWorkScore4, submission.evaluationData.qualityOfWorkScore5]))}
                                </span>
                              </div>
                            </td>
                            <td className="border-2 border-gray-400 px-4 py-3 text-center font-bold text-base">
                              {calculateScore([submission.evaluationData.qualityOfWorkScore1, submission.evaluationData.qualityOfWorkScore2, submission.evaluationData.qualityOfWorkScore3, submission.evaluationData.qualityOfWorkScore4, submission.evaluationData.qualityOfWorkScore5]).toFixed(2)}
                            </td>
                            <td className="border-2 border-gray-400 px-4 py-3 text-center font-bold text-base">
                              20%
                            </td>
                            <td className="border-2 border-gray-400 px-4 py-3 text-center font-bold text-base">
                              {(calculateScore([submission.evaluationData.qualityOfWorkScore1, submission.evaluationData.qualityOfWorkScore2, submission.evaluationData.qualityOfWorkScore3, submission.evaluationData.qualityOfWorkScore4, submission.evaluationData.qualityOfWorkScore5]) * 0.20).toFixed(2)}
                            </td>
                          </tr>

                          {/* Adaptability */}
                          <tr>
                            <td className="border-2 border-gray-400 px-4 py-3 text-sm text-gray-700 font-medium">
                              Adaptability
                            </td>
                            <td className="border-2 border-gray-400 px-4 py-3 text-center">
                              <div className="flex items-center justify-center space-x-1">
                                <span className={`px-2 py-1 rounded text-sm font-bold ${getRatingColorForLabel(getRatingLabel(calculateScore([submission.evaluationData.adaptabilityScore1, submission.evaluationData.adaptabilityScore2, submission.evaluationData.adaptabilityScore3])))}`}>
                                  {getRatingLabel(calculateScore([submission.evaluationData.adaptabilityScore1, submission.evaluationData.adaptabilityScore2, submission.evaluationData.adaptabilityScore3]))}
                                </span>
                              </div>
                            </td>
                            <td className="border-2 border-gray-400 px-4 py-3 text-center font-bold text-base">
                              {calculateScore([submission.evaluationData.adaptabilityScore1, submission.evaluationData.adaptabilityScore2, submission.evaluationData.adaptabilityScore3]).toFixed(2)}
                            </td>
                            <td className="border-2 border-gray-400 px-4 py-3 text-center font-bold text-base">
                              10%
                            </td>
                            <td className="border-2 border-gray-400 px-4 py-3 text-center font-bold text-base">
                              {(calculateScore([submission.evaluationData.adaptabilityScore1, submission.evaluationData.adaptabilityScore2, submission.evaluationData.adaptabilityScore3]) * 0.10).toFixed(2)}
                            </td>
                          </tr>

                          {/* Teamwork */}
                          <tr>
                            <td className="border-2 border-gray-400 px-4 py-3 text-sm text-gray-700 font-medium">
                              Teamwork
                            </td>
                            <td className="border-2 border-gray-400 px-4 py-3 text-center">
                              <div className="flex items-center justify-center space-x-1">
                                <span className={`px-2 py-1 rounded text-sm font-bold ${getRatingColorForLabel(getRatingLabel(calculateScore([submission.evaluationData.teamworkScore1, submission.evaluationData.teamworkScore2, submission.evaluationData.teamworkScore3])))}`}>
                                  {getRatingLabel(calculateScore([submission.evaluationData.teamworkScore1, submission.evaluationData.teamworkScore2, submission.evaluationData.teamworkScore3]))}
                                </span>
                              </div>
                            </td>
                            <td className="border-2 border-gray-400 px-4 py-3 text-center font-bold text-base">
                              {calculateScore([submission.evaluationData.teamworkScore1, submission.evaluationData.teamworkScore2, submission.evaluationData.teamworkScore3]).toFixed(2)}
                            </td>
                            <td className="border-2 border-gray-400 px-4 py-3 text-center font-bold text-base">
                              10%
                            </td>
                            <td className="border-2 border-gray-400 px-4 py-3 text-center font-bold text-base">
                              {(calculateScore([submission.evaluationData.teamworkScore1, submission.evaluationData.teamworkScore2, submission.evaluationData.teamworkScore3]) * 0.10).toFixed(2)}
                            </td>
                          </tr>

                          {/* Reliability */}
                          <tr>
                            <td className="border-2 border-gray-400 px-4 py-3 text-sm text-gray-700 font-medium">
                              Reliability
                            </td>
                            <td className="border-2 border-gray-400 px-4 py-3 text-center">
                              <div className="flex items-center justify-center space-x-1">
                                <span className={`px-2 py-1 rounded text-sm font-bold ${getRatingColorForLabel(getRatingLabel(calculateScore([submission.evaluationData.reliabilityScore1, submission.evaluationData.reliabilityScore2, submission.evaluationData.reliabilityScore3, submission.evaluationData.reliabilityScore4])))}`}>
                                  {getRatingLabel(calculateScore([submission.evaluationData.reliabilityScore1, submission.evaluationData.reliabilityScore2, submission.evaluationData.reliabilityScore3, submission.evaluationData.reliabilityScore4]))}
                                </span>
                              </div>
                            </td>
                            <td className="border-2 border-gray-400 px-4 py-3 text-center font-bold text-base">
                              {calculateScore([submission.evaluationData.reliabilityScore1, submission.evaluationData.reliabilityScore2, submission.evaluationData.reliabilityScore3, submission.evaluationData.reliabilityScore4]).toFixed(2)}
                            </td>
                            <td className="border-2 border-gray-400 px-4 py-3 text-center font-bold text-base">
                              5%
                            </td>
                            <td className="border-2 border-gray-400 px-4 py-3 text-center font-bold text-base">
                              {(calculateScore([submission.evaluationData.reliabilityScore1, submission.evaluationData.reliabilityScore2, submission.evaluationData.reliabilityScore3, submission.evaluationData.reliabilityScore4]) * 0.05).toFixed(2)}
                            </td>
                          </tr>

                          {/* Ethical & Professional Behavior */}
                          <tr>
                            <td className="border-2 border-gray-400 px-4 py-3 text-sm text-gray-700 font-medium">
                              Ethical & Professional Behavior
                            </td>
                            <td className="border-2 border-gray-400 px-4 py-3 text-center">
                              <div className="flex items-center justify-center space-x-1">
                                <span className={`px-2 py-1 rounded text-sm font-bold ${getRatingColorForLabel(getRatingLabel(calculateScore([submission.evaluationData.ethicalScore1, submission.evaluationData.ethicalScore2, submission.evaluationData.ethicalScore3, submission.evaluationData.ethicalScore4])))}`}>
                                  {getRatingLabel(calculateScore([submission.evaluationData.ethicalScore1, submission.evaluationData.ethicalScore2, submission.evaluationData.ethicalScore3, submission.evaluationData.ethicalScore4]))}
                                </span>
                              </div>
                            </td>
                            <td className="border-2 border-gray-400 px-4 py-3 text-center font-bold text-base">
                              {calculateScore([submission.evaluationData.ethicalScore1, submission.evaluationData.ethicalScore2, submission.evaluationData.ethicalScore3, submission.evaluationData.ethicalScore4]).toFixed(2)}
                            </td>
                            <td className="border-2 border-gray-400 px-4 py-3 text-center font-bold text-base">
                              5%
                            </td>
                            <td className="border-2 border-gray-400 px-4 py-3 text-center font-bold text-base">
                              {(calculateScore([submission.evaluationData.ethicalScore1, submission.evaluationData.ethicalScore2, submission.evaluationData.ethicalScore3, submission.evaluationData.ethicalScore4]) * 0.05).toFixed(2)}
                            </td>
                          </tr>

                          {/* Customer Service */}
                          <tr>
                            <td className="border-2 border-gray-400 px-4 py-3 text-sm text-gray-700 font-medium">
                              Customer Service
                            </td>
                            <td className="border-2 border-gray-400 px-4 py-3 text-center">
                              <div className="flex items-center justify-center space-x-1">
                                <span className={`px-2 py-1 rounded text-sm font-bold ${getRatingColorForLabel(getRatingLabel(calculateScore([submission.evaluationData.customerServiceScore1, submission.evaluationData.customerServiceScore2, submission.evaluationData.customerServiceScore3, submission.evaluationData.customerServiceScore4, submission.evaluationData.customerServiceScore5])))}`}>
                                  {getRatingLabel(calculateScore([submission.evaluationData.customerServiceScore1, submission.evaluationData.customerServiceScore2, submission.evaluationData.customerServiceScore3, submission.evaluationData.customerServiceScore4, submission.evaluationData.customerServiceScore5]))}
                                </span>
                              </div>
                            </td>
                            <td className="border-2 border-gray-400 px-4 py-3 text-center font-bold text-base">
                              {calculateScore([submission.evaluationData.customerServiceScore1, submission.evaluationData.customerServiceScore2, submission.evaluationData.customerServiceScore3, submission.evaluationData.customerServiceScore4, submission.evaluationData.customerServiceScore5]).toFixed(2)}
                            </td>
                            <td className="border-2 border-gray-400 px-4 py-3 text-center font-bold text-base">
                              30%
                            </td>
                            <td className="border-2 border-gray-400 px-4 py-3 text-center font-bold text-base">
                              {(calculateScore([submission.evaluationData.customerServiceScore1, submission.evaluationData.customerServiceScore2, submission.evaluationData.customerServiceScore3, submission.evaluationData.customerServiceScore4, submission.evaluationData.customerServiceScore5]) * 0.30).toFixed(2)}
                            </td>
                          </tr>

                          {/* Overall Performance Rating */}
                          <tr className="bg-gray-100">
                            <td colSpan={4} className="border-2 border-gray-400 px-4 py-3 text-sm font-bold text-gray-700">
                              Overall Performance Rating
                            </td>
                            <td className="border-2 border-gray-400 px-4 py-3 text-center font-bold text-lg">
                              {(() => {
                                const jobKnowledgeScore = calculateScore([submission.evaluationData.jobKnowledgeScore1, submission.evaluationData.jobKnowledgeScore2, submission.evaluationData.jobKnowledgeScore3]);
                                const qualityOfWorkScore = calculateScore([submission.evaluationData.qualityOfWorkScore1, submission.evaluationData.qualityOfWorkScore2, submission.evaluationData.qualityOfWorkScore3, submission.evaluationData.qualityOfWorkScore4, submission.evaluationData.qualityOfWorkScore5]);
                                const adaptabilityScore = calculateScore([submission.evaluationData.adaptabilityScore1, submission.evaluationData.adaptabilityScore2, submission.evaluationData.adaptabilityScore3]);
                                const teamworkScore = calculateScore([submission.evaluationData.teamworkScore1, submission.evaluationData.teamworkScore2, submission.evaluationData.teamworkScore3]);
                                const reliabilityScore = calculateScore([submission.evaluationData.reliabilityScore1, submission.evaluationData.reliabilityScore2, submission.evaluationData.reliabilityScore3, submission.evaluationData.reliabilityScore4]);
                                const ethicalScore = calculateScore([submission.evaluationData.ethicalScore1, submission.evaluationData.ethicalScore2, submission.evaluationData.ethicalScore3, submission.evaluationData.ethicalScore4]);
                                const customerServiceScore = calculateScore([submission.evaluationData.customerServiceScore1, submission.evaluationData.customerServiceScore2, submission.evaluationData.customerServiceScore3, submission.evaluationData.customerServiceScore4, submission.evaluationData.customerServiceScore5]);

                                const overallWeightedScore = (
                                  (jobKnowledgeScore * 0.20) +
                                  (qualityOfWorkScore * 0.20) +
                                  (adaptabilityScore * 0.10) +
                                  (teamworkScore * 0.10) +
                                  (reliabilityScore * 0.05) +
                                  (ethicalScore * 0.05) +
                                  (customerServiceScore * 0.30)
                                ).toFixed(2);

                                return overallWeightedScore;
                              })()}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Final Results */}
                    <div className="mt-6 flex justify-center items-center space-x-8">
                      <div className="text-center">
                        <div className="text-4xl font-bold text-gray-700">
                          {(() => {
                            const jobKnowledgeScore = calculateScore([submission.evaluationData.jobKnowledgeScore1, submission.evaluationData.jobKnowledgeScore2, submission.evaluationData.jobKnowledgeScore3]);
                            const qualityOfWorkScore = calculateScore([submission.evaluationData.qualityOfWorkScore1, submission.evaluationData.qualityOfWorkScore2, submission.evaluationData.qualityOfWorkScore3, submission.evaluationData.qualityOfWorkScore4, submission.evaluationData.qualityOfWorkScore5]);
                            const adaptabilityScore = calculateScore([submission.evaluationData.adaptabilityScore1, submission.evaluationData.adaptabilityScore2, submission.evaluationData.adaptabilityScore3]);
                            const teamworkScore = calculateScore([submission.evaluationData.teamworkScore1, submission.evaluationData.teamworkScore2, submission.evaluationData.teamworkScore3]);
                            const reliabilityScore = calculateScore([submission.evaluationData.reliabilityScore1, submission.evaluationData.reliabilityScore2, submission.evaluationData.reliabilityScore3, submission.evaluationData.reliabilityScore4]);
                            const ethicalScore = calculateScore([submission.evaluationData.ethicalScore1, submission.evaluationData.ethicalScore2, submission.evaluationData.ethicalScore3, submission.evaluationData.ethicalScore4]);
                            const customerServiceScore = calculateScore([submission.evaluationData.customerServiceScore1, submission.evaluationData.customerServiceScore2, submission.evaluationData.customerServiceScore3, submission.evaluationData.customerServiceScore4, submission.evaluationData.customerServiceScore5]);

                            const overallWeightedScore = (
                              (jobKnowledgeScore * 0.20) +
                              (qualityOfWorkScore * 0.20) +
                              (adaptabilityScore * 0.10) +
                              (teamworkScore * 0.10) +
                              (reliabilityScore * 0.05) +
                              (ethicalScore * 0.05) +
                              (customerServiceScore * 0.30)
                            );

                            return (overallWeightedScore / 5 * 100).toFixed(2);
                          })()}%
                        </div>
                        <div className="text-base text-gray-500 mt-1">Performance Score</div>
                      </div>
                      <div className={`px-8 py-4 rounded-lg font-bold text-white text-xl ${(() => {
                        const jobKnowledgeScore = calculateScore([submission.evaluationData.jobKnowledgeScore1, submission.evaluationData.jobKnowledgeScore2, submission.evaluationData.jobKnowledgeScore3]);
                        const qualityOfWorkScore = calculateScore([submission.evaluationData.qualityOfWorkScore1, submission.evaluationData.qualityOfWorkScore2, submission.evaluationData.qualityOfWorkScore3, submission.evaluationData.qualityOfWorkScore4, submission.evaluationData.qualityOfWorkScore5]);
                        const adaptabilityScore = calculateScore([submission.evaluationData.adaptabilityScore1, submission.evaluationData.adaptabilityScore2, submission.evaluationData.adaptabilityScore3]);
                        const teamworkScore = calculateScore([submission.evaluationData.teamworkScore1, submission.evaluationData.teamworkScore2, submission.evaluationData.teamworkScore3]);
                        const reliabilityScore = calculateScore([submission.evaluationData.reliabilityScore1, submission.evaluationData.reliabilityScore2, submission.evaluationData.reliabilityScore3, submission.evaluationData.reliabilityScore4]);
                        const ethicalScore = calculateScore([submission.evaluationData.ethicalScore1, submission.evaluationData.ethicalScore2, submission.evaluationData.ethicalScore3, submission.evaluationData.ethicalScore4]);
                        const customerServiceScore = calculateScore([submission.evaluationData.customerServiceScore1, submission.evaluationData.customerServiceScore2, submission.evaluationData.customerServiceScore3, submission.evaluationData.customerServiceScore4, submission.evaluationData.customerServiceScore5]);

                        const overallWeightedScore = (
                          (jobKnowledgeScore * 0.20) +
                          (qualityOfWorkScore * 0.20) +
                          (adaptabilityScore * 0.10) +
                          (teamworkScore * 0.10) +
                          (reliabilityScore * 0.05) +
                          (ethicalScore * 0.05) +
                          (customerServiceScore * 0.30)
                        );

                        return overallWeightedScore >= 3.0 ? 'bg-green-600' : 'bg-red-600';
                      })()}`}>
                        {(() => {
                          const jobKnowledgeScore = calculateScore([submission.evaluationData.jobKnowledgeScore1, submission.evaluationData.jobKnowledgeScore2, submission.evaluationData.jobKnowledgeScore3]);
                          const qualityOfWorkScore = calculateScore([submission.evaluationData.qualityOfWorkScore1, submission.evaluationData.qualityOfWorkScore2, submission.evaluationData.qualityOfWorkScore3, submission.evaluationData.qualityOfWorkScore4, submission.evaluationData.qualityOfWorkScore5]);
                          const adaptabilityScore = calculateScore([submission.evaluationData.adaptabilityScore1, submission.evaluationData.adaptabilityScore2, submission.evaluationData.adaptabilityScore3]);
                          const teamworkScore = calculateScore([submission.evaluationData.teamworkScore1, submission.evaluationData.teamworkScore2, submission.evaluationData.teamworkScore3]);
                          const reliabilityScore = calculateScore([submission.evaluationData.reliabilityScore1, submission.evaluationData.reliabilityScore2, submission.evaluationData.reliabilityScore3, submission.evaluationData.reliabilityScore4]);
                          const ethicalScore = calculateScore([submission.evaluationData.ethicalScore1, submission.evaluationData.ethicalScore2, submission.evaluationData.ethicalScore3, submission.evaluationData.ethicalScore4]);
                          const customerServiceScore = calculateScore([submission.evaluationData.customerServiceScore1, submission.evaluationData.customerServiceScore2, submission.evaluationData.customerServiceScore3, submission.evaluationData.customerServiceScore4, submission.evaluationData.customerServiceScore5]);

                          const overallWeightedScore = (
                            (jobKnowledgeScore * 0.20) +
                            (qualityOfWorkScore * 0.20) +
                            (adaptabilityScore * 0.10) +
                            (teamworkScore * 0.10) +
                            (reliabilityScore * 0.05) +
                            (ethicalScore * 0.05) +
                            (customerServiceScore * 0.30)
                          );

                          return overallWeightedScore >= 3.0 ? 'PASS' : 'FAIL';
                        })()}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Priority Areas for Improvement */}
            {submission.evaluationData && (submission.evaluationData.priorityArea1 || submission.evaluationData.priorityArea2 || submission.evaluationData.priorityArea3) && (
              <Card>
                <CardContent className="pt-6 pb-4">
                  <h4 className="font-semibold text-lg text-gray-900 mb-4">Priority Areas for Improvement</h4>
                  <div className="space-y-3">
                    {submission.evaluationData.priorityArea1 && (
                      <div className="p-3 bg-yellow-50 border border-gray-300 rounded-md">
                        <span className="font-medium text-sm">1. </span>
                        <span className="text-sm text-gray-700">{submission.evaluationData.priorityArea1}</span>
                      </div>
                    )}
                    {submission.evaluationData.priorityArea2 && (
                      <div className="p-3 bg-yellow-50 border border-gray-300 rounded-md">
                        <span className="font-medium text-sm">2. </span>
                        <span className="text-sm text-gray-700">{submission.evaluationData.priorityArea2}</span>
                      </div>
                    )}
                    {submission.evaluationData.priorityArea3 && (
                      <div className="p-3 bg-yellow-50 border border-gray-300 rounded-md">
                        <span className="font-medium text-sm">3. </span>
                        <span className="text-sm text-gray-700">{submission.evaluationData.priorityArea3}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Remarks */}
            {submission.evaluationData && submission.evaluationData.remarks && (
              <Card>
                <CardContent className="pt-6 pb-4">
                  <h4 className="font-semibold text-lg text-gray-900 mb-4">Remarks</h4>
                  <div className="p-3 bg-yellow-50 border border-gray-300 rounded-md">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{submission.evaluationData.remarks}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Acknowledgement */}
            {submission.evaluationData && (
              <Card>
                <CardContent className="pt-6 pb-4">
                  <h4 className="font-semibold text-lg text-gray-900 mb-4">Acknowledgement</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    I hereby acknowledge that the Evaluator has explained to me, to the best of their ability, 
                    and in a manner I fully understand, my performance and respective rating on this performance evaluation.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Employee Section */}
                    <div className="space-y-4">
                      {/* Signature area */}
                      <div className="text-center">
                        <div className="h-20 border-2 border-dashed border-white rounded-lg flex items-center justify-center bg-gray-50 relative">
                          {/* Name as background text - always show */}
                          <span className="text-md text-gray-900 font-bold">
                            {submission.employeeName || 'Employee Name'}
                          </span>
                          {/* Signature overlay - centered and overlapping */}
                          {signatureLoading ? (
                            <div className="absolute top-7 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xs text-gray-500">
                              Loading signature...
                            </div>
                          ) : signatureError ? (
                            <div className="absolute top-7 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xs text-red-500">
                              Error loading signature
                            </div>
                          ) : ((isApproved || approvalData?.employeeSignature || submission.employeeSignature) && (employeeSignature?.signature || approvalData?.employeeSignature || submission.employeeSignature)) && (
                            <img 
                              src={employeeSignature?.signature || approvalData?.employeeSignature || submission.employeeSignature || ''} 
                              alt="Employee Signature" 
                              className="absolute top-7 left-1/2 transform -translate-x-1/2 -translate-y-1/2 max-h-16 max-w-full object-contain"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          )}
                        </div>
                      </div>
                      
                      {/* Action Section - Only show if showApprovalButton is true */}
                      {showApprovalButton && (
                        <div className="mt-6 space-y-4">
                          {/* Approve Button - Only show if not approved */}
                          {!isApproved && (
                            <div className="space-y-3">
                              <div className="flex justify-center">
                                <Button
                                  onClick={handleApproveEvaluation}
                                  disabled={!submission.id || isApproving}
                                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-sm font-medium disabled:bg-gray-400 disabled:cursor-not-allowed shadow-sm"
                                >
                                  {isApproving ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                      Approving...
                                    </>
                                  ) : (
                                    '✓ Approve Evaluation'
                                  )}
                                </Button>
                              </div>
                              <p className="text-xs text-gray-500 text-center">
                                Click to acknowledge and approve this evaluation
                              </p>
                              {approvalError && (
                                <p className="text-xs text-red-600 bg-red-50 p-3 rounded">
                                  {approvalError}
                                </p>
                              )}
                            </div>
                          )}
                          
                          {/* Approved Status - Only show if approved */}
                          {isApproved && (
                            <div className="space-y-3 px-4 md:px-0">
                              <div className="flex items-center justify-center space-x-2">
                                <Badge className="bg-green-100 text-green-800 px-4 py-2 text-sm font-medium">
                                  ✓ Evaluation Approved
                                </Badge>
                              </div>
                              <p className="text-xs text-gray-500 text-center">
                                Approved on {approvalData?.approvedAt ? new Date(approvalData.approvedAt).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                }) : 'Unknown date'}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Employee Name and Date */}
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-900">
                          {submission.employeeName || 'Employee Name'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {submission.employeeApprovedAt ? new Date(submission.employeeApprovedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          }) : 'Not approved yet'}
                        </p>
                      </div>
                      
                    </div>

                    {/* Evaluator Section */}
                    <div className="space-y-4">
                      {/* Signature area */}
                      <div className="text-center">
                        <div className="h-20 border-2 border-dashed border-white rounded-lg flex items-center justify-center bg-gray-50 relative">
                          {/* Name as background text - always show */}
                          <span className="text-md text-gray-900 font-bold">
                            {submission.evaluator || submission.evaluationData?.evaluatorSignature || submission.evaluationData?.evaluatorName || 'Evaluator Name'}
                          </span>
                          {/* Signature overlay - automatically show when signature exists */}
                          {(submission.evaluatorSignature || submission.evaluationData?.evaluatorSignatureImage || submission.evaluationData?.evaluatorSignature) ? (
                            <img 
                              src={submission.evaluatorSignature || submission.evaluationData?.evaluatorSignatureImage || submission.evaluationData?.evaluatorSignature}
                              alt="Evaluator Signature" 
                              className="absolute top-7 left-1/2 transform -translate-x-1/2 -translate-y-1/2 max-h-16 max-w-full object-contain"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <span className="absolute top-7 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-gray-400 text-sm">No signature</span>
                          )}
                        </div>
                      </div>
                      
                      {/* Evaluator Name and Date */}
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-900">
                          {submission.evaluator || submission.evaluationData?.evaluatorSignature || submission.evaluationData?.evaluatorName || 'Evaluator Name'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {submission.evaluatorApprovedAt || submission.evaluationData?.evaluatorSignatureDate ? new Date(submission.evaluatorApprovedAt || submission.evaluationData?.evaluatorSignatureDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          }) : 'Not specified'}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
