'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X, AlertTriangle, Printer, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { EvaluationData } from './types';
import { format } from 'date-fns';
import { useState } from 'react';
import { submitEvaluation } from '@/lib/evaluationSubmissionService';

interface ConfirmModalProps {
  open: boolean;
  onCloseAction: () => void;
  onConfirmAction: () => void;
  data: EvaluationData;
}

const getRatingIcon = (rating: string) => {
  switch (rating) {
    case 'Outstanding':
    case 'Exceeds Expectations':
      return <Check className="h-4 w-4 text-green-600" />;
    case 'Needs Improvement':
    case 'Unsatisfactory':
      return <X className="h-4 w-4 text-red-600" />;
    case 'Meets Expectations':
      return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    default:
      return null;
  }
};

const getRatingColor = (rating: string) => {
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

export default function ConfirmModal({ open, onCloseAction, onConfirmAction, data }: ConfirmModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState('');
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  // Calculate scores from individual evaluations
  const jobKnowledgeScore = calculateScore([data.jobKnowledgeScore1, data.jobKnowledgeScore2, data.jobKnowledgeScore3]);
  const qualityOfWorkScore = calculateScore([data.qualityOfWorkScore1, data.qualityOfWorkScore2, data.qualityOfWorkScore3, data.qualityOfWorkScore4, data.qualityOfWorkScore5]);
  const adaptabilityScore = calculateScore([data.adaptabilityScore1, data.adaptabilityScore2, data.adaptabilityScore3]);
  const teamworkScore = calculateScore([data.teamworkScore1, data.teamworkScore2, data.teamworkScore3]);
  const reliabilityScore = calculateScore([data.reliabilityScore1, data.reliabilityScore2, data.reliabilityScore3, data.reliabilityScore4]);
  const ethicalScore = calculateScore([data.ethicalScore1, data.ethicalScore2, data.ethicalScore3, data.ethicalScore4]);
  const customerServiceScore = calculateScore([data.customerServiceScore1, data.customerServiceScore2, data.customerServiceScore3, data.customerServiceScore4, data.customerServiceScore5]);

  // Calculate weighted scores
  const jobKnowledgeWeighted = (jobKnowledgeScore * 0.20).toFixed(2);
  const qualityOfWorkWeighted = (qualityOfWorkScore * 0.20).toFixed(2);
  const adaptabilityWeighted = (adaptabilityScore * 0.10).toFixed(2);
  const teamworkWeighted = (teamworkScore * 0.10).toFixed(2);
  const reliabilityWeighted = (reliabilityScore * 0.05).toFixed(2);
  const ethicalWeighted = (ethicalScore * 0.05).toFixed(2);
  const customerServiceWeighted = (customerServiceScore * 0.30).toFixed(2);

  // Calculate overall weighted score
  const overallWeightedScore = (
    parseFloat(jobKnowledgeWeighted) +
    parseFloat(qualityOfWorkWeighted) +
    parseFloat(adaptabilityWeighted) +
    parseFloat(teamworkWeighted) +
    parseFloat(reliabilityWeighted) +
    parseFloat(ethicalWeighted) +
    parseFloat(customerServiceWeighted)
  ).toFixed(2);

  const overallPercentage = (parseFloat(overallWeightedScore) / 5 * 100).toFixed(2);
  const isPass = parseFloat(overallWeightedScore) >= 3.0;

  const isComplete = 
    jobKnowledgeScore > 0 && 
    qualityOfWorkScore > 0 && 
    adaptabilityScore > 0 && 
    teamworkScore > 0 && 
    reliabilityScore > 0 && 
    ethicalScore > 0 && 
    customerServiceScore > 0;

  const handleSubmitEvaluation = async (isRetry = false) => {
    if (!isComplete) {
      setSubmissionError('Please complete all required fields before submitting.');
      return;
    }

    setIsSubmitting(true);
    setSubmissionError('');
    setSubmissionSuccess(false);

    try {
      // Get evaluator name from localStorage or use a default
      const storedUser = localStorage.getItem('authenticatedUser');
      const evaluatorName = storedUser ? JSON.parse(storedUser).name : 'Evaluator';

      // Submit evaluation via API
      const result = await submitEvaluation(data, evaluatorName);

      console.log('✅ Evaluation submitted successfully:', result);
      
      // Show success state
      setSubmissionSuccess(true);
      setRetryCount(0); // Reset retry count on success
      
      // Call the parent's confirm action after successful submission
      setTimeout(() => {
        onConfirmAction();
      }, 2000);

      // TODO: Replace with actual API call when backend is ready:
      /*
      const response = await fetch('/api/evaluations/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          evaluationData: data,
          evaluatorName,
          submittedAt: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      */
      
    } catch (error) {
      console.error('❌ Error submitting evaluation:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit evaluation. Please try again.';
      
      // Add retry information to error message
      if (isRetry) {
        setSubmissionError(`${errorMessage} (Retry ${retryCount + 1}/3)`);
      } else {
        setSubmissionError(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    if (retryCount < 3) {
      setRetryCount(prev => prev + 1);
      handleSubmitEvaluation(true);
    }
  };

  const handlePrint = () => {
    const printContent = document.createElement('div');
    printContent.innerHTML = `
      <style>
        @media print {
          body { margin: 0; padding: 10px; font-family: Arial, sans-serif; font-size: 10px; }
          .print-header { text-align: center; margin-bottom: 15px; border-bottom: 1px solid #000; padding-bottom: 10px; }
          .print-title { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
          .print-subtitle { font-size: 12px; color: #666; }
          .print-section { margin-bottom: 12px; page-break-inside: avoid; }
          .print-section-title { font-size: 14px; font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #ccc; padding-bottom: 3px; }
          .print-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px; margin-bottom: 8px; }
          .print-field { margin-bottom: 5px; }
          .print-label { font-weight: bold; color: #666; font-size: 9px; }
          .print-value { font-size: 10px; margin-top: 1px; }
          .print-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; page-break-inside: avoid; }
          .print-table th, .print-table td { border: 1px solid #000; padding: 4px 6px; text-align: left; font-size: 9px; }
          .print-table th { background-color: #f0f0f0; font-weight: bold; }
          .print-results { text-align: center; margin: 8px 0; }
          .print-percentage { font-size: 20px; font-weight: bold; }
          .print-status { display: inline-block; padding: 5px 10px; border-radius: 3px; color: white; font-weight: bold; font-size: 12px; }
          .print-status.pass { background-color: #16a34a; }
          .print-status.fail { background-color: #dc2626; }
          .print-priority { background-color: #fefce8; border: 1px solid #e5e7eb; padding: 5px; margin-bottom: 5px; border-radius: 3px; font-size: 9px; }
          .print-remarks { background-color: #fefce8; border: 1px solid #e5e7eb; padding: 8px; border-radius: 3px; font-size: 9px; }
          .print-signature { background-color: #fefce8; border: 1px solid #e5e7eb; padding: 5px; margin-bottom: 5px; border-radius: 3px; min-height: 25px; font-size: 9px; }
          .print-signature-label { text-align: center; font-size: 8px; color: #666; margin-top: 2px; }
          .print-signature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          .print-checkbox { margin-right: 4px; }
          .print-step { page-break-before: auto; margin-bottom: 8px; }
          .print-step:first-child { page-break-before: auto; }
          .print-description { font-size: 9px; margin-bottom: 8px; color: #666; }
          .print-compact-table { font-size: 8px; }
          .print-compact-table th, .print-compact-table td { padding: 2px 4px; }
          .print-summary { margin-top: 10px; }
          .no-print { display: none !important; }
        }
      </style>
      
      <div class="print-header">
        <div class="print-title">COMPLETE PERFORMANCE EVALUATION REPORT</div>
        <div class="print-subtitle">Employee Performance Evaluation - All Steps (1-7)</div>
      </div>

      <!-- STEP 1 & 2: Review Type & Employee Information -->
      <div class="print-section">
        <div class="print-section-title">STEP 1: REVIEW TYPE & STEP 2: EMPLOYEE INFORMATION</div>
        <div class="print-grid">
          <div class="print-field">
            <div class="print-label">Review Type:</div>
            <div class="print-value">
              ${data.reviewTypeProbationary3 ? '✓ 3m' : '☐ 3m'} | ${data.reviewTypeProbationary5 ? '✓ 5m' : '☐ 5m'} | 
              ${data.reviewTypeRegularQ1 ? '✓ Q1' : '☐ Q1'} | ${data.reviewTypeRegularQ2 ? '✓ Q2' : '☐ Q2'} | 
              ${data.reviewTypeRegularQ3 ? '✓ Q3' : '☐ Q3'} | ${data.reviewTypeRegularQ4 ? '✓ Q4' : '☐ Q4'}
              ${data.reviewTypeOthersImprovement ? ' | ✓ PI' : ''}
              ${data.reviewTypeOthersCustom ? ` | ${data.reviewTypeOthersCustom}` : ''}
            </div>
          </div>
          <div class="print-field">
            <div class="print-label">Employee:</div>
            <div class="print-value">${data.employeeName || 'Not specified'} (${data.employeeId || 'ID: N/A'})</div>
          </div>
          <div class="print-field">
            <div class="print-label">Position:</div>
            <div class="print-value">${data.position || 'Not specified'} - ${data.department || 'Dept: N/A'}</div>
          </div>
          <div class="print-field">
            <div class="print-label">Branch & Supervisor:</div>
            <div class="print-value">${data.branch || 'Branch: N/A'} | ${data.supervisor || 'Sup: N/A'}</div>
          </div>
          <div class="print-field">
            <div class="print-label">Hire Date & Coverage:</div>
            <div class="print-value">${data.hireDate || 'Hire: N/A'} | ${data.coverageFrom && data.coverageTo ? `${format(new Date(data.coverageFrom), 'MMM dd, yyyy')} - ${format(new Date(data.coverageTo), 'MMM dd, yyyy')}` : 'Coverage: N/A'}</div>
          </div>
        </div>
      </div>

      <!-- STEP 3: Job Knowledge -->
      <div class="print-section">
        <div class="print-section-title">STEP 3: JOB KNOWLEDGE</div>
        <p class="print-description">Demonstrates understanding of job responsibilities. Applies knowledge to tasks and projects.</p>
        <table class="print-table print-compact-table">
          <thead>
            <tr>
              <th style="width: 35%;">Behavioral Indicators</th>
              <th style="width: 35%;">Example</th>
              <th style="width: 8%;">Score</th>
              <th style="width: 12%;">Rating</th>
              <th style="width: 10%;">Comments</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Mastery in Core Competencies (L.E.A.D.E.R.)</td>
              <td>Demonstrates comprehensive understanding of job requirements</td>
              <td>${data.jobKnowledgeScore1 || ''}</td>
              <td>${data.jobKnowledgeScore1 ? getRatingLabel(parseFloat(data.jobKnowledgeScore1)) : 'N/A'}</td>
              <td>${data.jobKnowledgeComments1 || ''}</td>
            </tr>
            <tr>
              <td>Keeps Documentation Updated</td>
              <td>Maintains current and accurate documentation</td>
              <td>${data.jobKnowledgeScore2 || ''}</td>
              <td>${data.jobKnowledgeScore2 ? getRatingLabel(parseFloat(data.jobKnowledgeScore2)) : 'N/A'}</td>
              <td>${data.jobKnowledgeComments2 || ''}</td>
            </tr>
            <tr>
              <td>Problem Solving</td>
              <td>Effectively identifies and resolves work challenges</td>
              <td>${data.jobKnowledgeScore3 || ''}</td>
              <td>${data.jobKnowledgeScore3 ? getRatingLabel(parseFloat(data.jobKnowledgeScore3)) : 'N/A'}</td>
              <td>${data.jobKnowledgeComments3 || ''}</td>
            </tr>
          </tbody>
        </table>
        <div class="print-results">
          <strong>Avg: ${jobKnowledgeScore.toFixed(2)} | ${getRatingLabel(jobKnowledgeScore)}</strong>
        </div>
      </div>

      <!-- STEP 4: Quality of Work -->
      <div class="print-section">
        <div class="print-section-title">STEP 4: QUALITY OF WORK</div>
        <p class="print-description">Accuracy and precision in completing tasks. Attention to detail. Consistency in delivering high-quality results.</p>
        <table class="print-table print-compact-table">
          <thead>
            <tr>
              <th style="width: 35%;">Behavioral Indicators</th>
              <th style="width: 35%;">Example</th>
              <th style="width: 8%;">Score</th>
              <th style="width: 12%;">Rating</th>
              <th style="width: 10%;">Comments</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Meets Standards and Requirements</td>
              <td>Consistently delivers work that meets standards</td>
              <td>${data.qualityOfWorkScore1 || ''}</td>
              <td>${data.qualityOfWorkScore1 ? getRatingLabel(parseFloat(data.qualityOfWorkScore1)) : 'N/A'}</td>
              <td>${data.qualityOfWorkComments1 || ''}</td>
            </tr>
            <tr>
              <td>Timeliness (L.E.A.D.E.R.)</td>
              <td>Completes tasks within established deadlines</td>
              <td>${data.qualityOfWorkScore2 || ''}</td>
              <td>${data.qualityOfWorkScore2 ? getRatingLabel(parseFloat(data.qualityOfWorkScore2)) : 'N/A'}</td>
              <td>${data.qualityOfWorkComments2 || ''}</td>
            </tr>
            <tr>
              <td>Work Output Volume (L.E.A.D.E.R.)</td>
              <td>Produces appropriate volume of work output</td>
              <td>${data.qualityOfWorkScore3 || ''}</td>
              <td>${data.qualityOfWorkScore3 ? getRatingLabel(parseFloat(data.qualityOfWorkScore3)) : 'N/A'}</td>
              <td>${data.qualityOfWorkComments3 || ''}</td>
            </tr>
            <tr>
              <td>Consistency in Performance (L.E.A.D.E.R.)</td>
              <td>Maintains consistent quality standards</td>
              <td>${data.qualityOfWorkScore4 || ''}</td>
              <td>${data.qualityOfWorkScore4 ? getRatingLabel(parseFloat(data.qualityOfWorkScore4)) : 'N/A'}</td>
              <td>${data.qualityOfWorkComments4 || ''}</td>
            </tr>
            <tr>
              <td>Attention to Detail</td>
              <td>Demonstrates thoroughness and accuracy</td>
              <td>${data.qualityOfWorkScore5 || ''}</td>
              <td>${data.qualityOfWorkScore5 ? getRatingLabel(parseFloat(data.qualityOfWorkScore5)) : 'N/A'}</td>
              <td>${data.qualityOfWorkComments5 || ''}</td>
            </tr>
          </tbody>
        </table>
        <div class="print-results">
          <strong>Avg: ${qualityOfWorkScore.toFixed(2)} | ${getRatingLabel(qualityOfWorkScore)}</strong>
        </div>
      </div>

      <!-- STEP 5: Adaptability -->
      <div class="print-section print-step">
        <div class="print-section-title">STEP 5: ADAPTABILITY</div>
        <p style="margin-bottom: 15px; font-size: 14px;">
          Flexibility in handling change. Ability to work effectively in diverse situations. Resilience in the face of challenges.
        </p>
        <table class="print-table">
          <thead>
            <tr>
              <th>Behavioral Indicators</th>
              <th>Example</th>
              <th>Score</th>
              <th>Rating</th>
              <th>Comments</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Openness to Change (attitude towards change)</td>
              <td>Demonstrates a positive attitude and openness to new ideas and major changes at work</td>
              <td>${data.adaptabilityScore1 || ''}</td>
              <td>${data.adaptabilityScore1 ? getRatingLabel(parseFloat(data.adaptabilityScore1)) : 'Not Rated'}</td>
              <td>${data.adaptabilityComments1 || ''}</td>
            </tr>
            <tr>
              <td>Flexibility in Job Role (ability to adapt to changes)</td>
              <td>Adapts to changes in job responsibilities and willingly takes on new tasks</td>
              <td>${data.adaptabilityScore2 || ''}</td>
              <td>${data.adaptabilityScore2 ? getRatingLabel(parseFloat(data.adaptabilityScore2)) : 'Not Rated'}</td>
              <td>${data.adaptabilityComments2 || ''}</td>
            </tr>
            <tr>
              <td>Resilience in the Face of Challenges</td>
              <td>Maintains a positive attitude and performance under challenging or difficult conditions</td>
              <td>${data.adaptabilityScore3 || ''}</td>
              <td>${data.adaptabilityScore3 ? getRatingLabel(parseFloat(data.adaptabilityScore3)) : 'Not Rated'}</td>
              <td>${data.adaptabilityComments3 || ''}</td>
            </tr>
          </tbody>
        </table>
        <div class="print-results">
          <strong>Average: ${adaptabilityScore.toFixed(2)} | Rating: ${getRatingLabel(adaptabilityScore)}</strong>
        </div>
      </div>

      <!-- STEP 6: Teamwork -->
      <div class="print-section print-step">
        <div class="print-section-title">STEP 6: TEAMWORK</div>
        <p style="margin-bottom: 15px; font-size: 14px;">
          Ability to work well with others. Contribution to team goals and projects. Supportiveness of team members.
        </p>
        <table class="print-table">
          <thead>
            <tr>
              <th>Behavioral Indicators</th>
              <th>Example</th>
              <th>Score</th>
              <th>Rating</th>
              <th>Comments</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Active Participation in Team Activities</td>
              <td>Actively participates in team meetings and projects. Contributes ideas and feedback during discussions.</td>
              <td>${data.teamworkScore1 || ''}</td>
              <td>${data.teamworkScore1 ? getRatingLabel(parseFloat(data.teamworkScore1)) : 'Not Rated'}</td>
              <td>${data.teamworkComments1 || ''}</td>
            </tr>
            <tr>
              <td>Promotion of a Positive Team Culture</td>
              <td>Interacts positively with coworkers. Fosters inclusive team culture. Provides support and constructive feedback.</td>
              <td>${data.teamworkScore2 || ''}</td>
              <td>${data.teamworkScore2 ? getRatingLabel(parseFloat(data.teamworkScore2)) : 'Not Rated'}</td>
              <td>${data.teamworkComments2 || ''}</td>
            </tr>
            <tr>
              <td>Effective Communication</td>
              <td>Communicates openly and clearly with team members. Shares information and updates in a timely manner.</td>
              <td>${data.teamworkScore3 || ''}</td>
              <td>${data.teamworkScore3 ? getRatingLabel(parseFloat(data.teamworkScore3)) : 'Not Rated'}</td>
              <td>${data.teamworkComments3 || ''}</td>
            </tr>
          </tbody>
        </table>
        <div class="print-results">
          <strong>Average: ${teamworkScore.toFixed(2)} | Rating: ${getRatingLabel(teamworkScore)}</strong>
        </div>
      </div>

      <!-- STEP 7: Reliability -->
      <div class="print-section print-step">
        <div class="print-section-title">STEP 7: RELIABILITY</div>
        <p style="margin-bottom: 15px; font-size: 14px;">
          Consistency in attendance and punctuality. Meeting commitments and fulfilling responsibilities.
        </p>
        <table class="print-table">
          <thead>
            <tr>
              <th>Behavioral Indicators</th>
              <th>Example</th>
              <th>Score</th>
              <th>Rating</th>
              <th>Comments</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Consistent Attendance</td>
              <td>Demonstrates regular attendance by being present at work as scheduled</td>
              <td>${data.reliabilityScore1 || ''}</td>
              <td>${data.reliabilityScore1 ? getRatingLabel(parseFloat(data.reliabilityScore1)) : 'Not Rated'}</td>
              <td>${data.reliabilityComments1 || ''}</td>
            </tr>
            <tr>
              <td>Punctuality</td>
              <td>Arrives at work and meetings on time or before the scheduled time</td>
              <td>${data.reliabilityScore2 || ''}</td>
              <td>${data.reliabilityScore2 ? getRatingLabel(parseFloat(data.reliabilityScore2)) : 'Not Rated'}</td>
              <td>${data.reliabilityComments2 || ''}</td>
            </tr>
            <tr>
              <td>Follows Through on Commitments</td>
              <td>Follows through on assignments from and commitments made to coworkers or superiors</td>
              <td>${data.reliabilityScore3 || ''}</td>
              <td>${data.reliabilityScore3 ? getRatingLabel(parseFloat(data.reliabilityScore3)) : 'Not Rated'}</td>
              <td>${data.reliabilityComments3 || ''}</td>
            </tr>
            <tr>
              <td>Reliable Handling of Routine Tasks</td>
              <td>Demonstrates reliability in completing routine tasks without oversight</td>
              <td>${data.reliabilityScore4 || ''}</td>
              <td>${data.reliabilityScore4 ? getRatingLabel(parseFloat(data.reliabilityScore4)) : 'Not Rated'}</td>
              <td>${data.reliabilityComments4 || ''}</td>
            </tr>
          </tbody>
        </table>
        <div class="print-results">
          <strong>Average: ${reliabilityScore.toFixed(2)} | Rating: ${getRatingLabel(reliabilityScore)}</strong>
        </div>
      </div>

      <!-- STEP 8: Ethical & Professional Behavior -->
      <div class="print-section print-step">
        <div class="print-section-title">STEP 8: ETHICAL & PROFESSIONAL BEHAVIOR</div>
        <p style="margin-bottom: 15px; font-size: 14px;">
          Complies with company policies and ethical standards. Accountability for one's actions. Professionalism in interactions.
        </p>
        <table class="print-table">
          <thead>
            <tr>
              <th>Behavioral Indicators</th>
              <th>Example</th>
              <th>Score</th>
              <th>Rating</th>
              <th>Comments</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Follows Company Policies</td>
              <td>Complies with company rules, regulations, and memorandums</td>
              <td>${data.ethicalScore1 || ''}</td>
              <td>${data.ethicalScore1 ? getRatingLabel(parseFloat(data.ethicalScore1)) : 'Not Rated'}</td>
              <td>${data.ethicalExplanation1 || ''}</td>
            </tr>
            <tr>
              <td>Professionalism (L.E.A.D.E.R.)</td>
              <td>Maintains a high level of professionalism in all work interactions</td>
              <td>${data.ethicalScore2 || ''}</td>
              <td>${data.ethicalScore2 ? getRatingLabel(parseFloat(data.ethicalScore2)) : 'Not Rated'}</td>
              <td>${data.ethicalExplanation2 || ''}</td>
            </tr>
            <tr>
              <td>Accountability for Mistakes (L.E.A.D.E.R.)</td>
              <td>Takes responsibility for errors and actively works to correct mistakes</td>
              <td>${data.ethicalScore3 || ''}</td>
              <td>${data.ethicalScore3 ? getRatingLabel(parseFloat(data.ethicalScore3)) : 'Not Rated'}</td>
              <td>${data.ethicalExplanation3 || ''}</td>
            </tr>
            <tr>
              <td>Respect for Others (L.E.A.D.E.R.)</td>
              <td>Treats all individuals fairly and with respect, regardless of background or position</td>
              <td>${data.ethicalScore4 || ''}</td>
              <td>${data.ethicalScore4 ? getRatingLabel(parseFloat(data.ethicalScore4)) : 'Not Rated'}</td>
              <td>${data.ethicalExplanation4 || ''}</td>
            </tr>
          </tbody>
        </table>
        <div class="print-results">
          <strong>Average: ${ethicalScore.toFixed(2)} | Rating: ${getRatingLabel(ethicalScore)}</strong>
        </div>
      </div>

      <!-- STEP 9: Customer Service -->
      <div class="print-section print-step">
        <div class="print-section-title">STEP 9: CUSTOMER SERVICE</div>
        <p style="margin-bottom: 15px; font-size: 14px;">
          Customer satisfaction. Responsiveness to customer needs. Professional and positive interactions with customers.
        </p>
        <table class="print-table">
          <thead>
            <tr>
              <th>Behavioral Indicators</th>
              <th>Example</th>
              <th>Score</th>
              <th>Rating</th>
              <th>Comments</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Listening & Understanding</td>
              <td>Listens to customers and displays understanding of customer needs and concerns</td>
              <td>${data.customerServiceScore1 || ''}</td>
              <td>${data.customerServiceScore1 ? getRatingLabel(parseFloat(data.customerServiceScore1)) : 'Not Rated'}</td>
              <td>${data.customerServiceExplanation1 || ''}</td>
            </tr>
            <tr>
              <td>Problem-Solving for Customer Satisfaction</td>
              <td>Proactively identifies and solves customer problems to ensure satisfaction</td>
              <td>${data.customerServiceScore2 || ''}</td>
              <td>${data.customerServiceScore2 ? getRatingLabel(parseFloat(data.customerServiceScore2)) : 'Not Rated'}</td>
              <td>${data.customerServiceExplanation2 || ''}</td>
            </tr>
            <tr>
              <td>Product Knowledge for Customer Support (L.E.A.D.E.R.)</td>
              <td>Possesses comprehensive product knowledge to assist customers effectively</td>
              <td>${data.customerServiceScore3 || ''}</td>
              <td>${data.customerServiceScore3 ? getRatingLabel(parseFloat(data.customerServiceScore3)) : 'Not Rated'}</td>
              <td>${data.customerServiceExplanation3 || ''}</td>
            </tr>
            <tr>
              <td>Positive and Professional Attitude (L.E.A.D.E.R.)</td>
              <td>Maintains a positive and professional demeanor, particularly during customer interactions</td>
              <td>${data.customerServiceScore4 || ''}</td>
              <td>${data.customerServiceScore4 ? getRatingLabel(parseFloat(data.customerServiceScore4)) : 'Not Rated'}</td>
              <td>${data.customerServiceExplanation4 || ''}</td>
            </tr>
            <tr>
              <td>Timely Resolution of Customer Issues (L.E.A.D.E.R.)</td>
              <td>Resolves customer issues promptly and efficiently</td>
              <td>${data.customerServiceScore5 || ''}</td>
              <td>${data.customerServiceScore5 ? getRatingLabel(parseFloat(data.customerServiceScore5)) : 'Not Rated'}</td>
              <td>${data.customerServiceExplanation5 || ''}</td>
            </tr>
          </tbody>
        </table>
        <div class="print-results">
          <strong>Average: ${customerServiceScore.toFixed(2)} | Rating: ${getRatingLabel(customerServiceScore)}</strong>
        </div>
      </div>

      <!-- COMPACT EVALUATION SUMMARY -->
      <div class="print-section print-summary">
        <div class="print-section-title">EVALUATION SUMMARY</div>
        <div class="print-grid">
          <div class="print-field">
            <div class="print-label">Job Knowledge:</div>
            <div class="print-value">${jobKnowledgeScore.toFixed(2)} (${getRatingLabel(jobKnowledgeScore)}) - 20%</div>
          </div>
          <div class="print-field">
            <div class="print-label">Quality of Work:</div>
            <div class="print-value">${qualityOfWorkScore.toFixed(2)} (${getRatingLabel(qualityOfWorkScore)}) - 20%</div>
          </div>
          <div class="print-field">
            <div class="print-label">Adaptability:</div>
            <div class="print-value">${adaptabilityScore.toFixed(2)} (${getRatingLabel(adaptabilityScore)}) - 10%</div>
          </div>
          <div class="print-field">
            <div class="print-label">Teamwork:</div>
            <div class="print-value">${teamworkScore.toFixed(2)} (${getRatingLabel(teamworkScore)}) - 10%</div>
          </div>
          <div class="print-field">
            <div class="print-label">Reliability:</div>
            <div class="print-value">${reliabilityScore.toFixed(2)} (${getRatingLabel(reliabilityScore)}) - 5%</div>
          </div>
          <div class="print-field">
            <div class="print-label">Ethical Behavior:</div>
            <div class="print-value">${ethicalScore.toFixed(2)} (${getRatingLabel(ethicalScore)}) - 5%</div>
          </div>
          <div class="print-field">
            <div class="print-label">Customer Service:</div>
            <div class="print-value">${customerServiceScore.toFixed(2)} (${getRatingLabel(customerServiceScore)}) - 30%</div>
          </div>
        </div>
        
        <div class="print-results">
          <div class="print-percentage">${overallPercentage}%</div>
          <div style="margin-bottom: 8px;">Performance Score</div>
          <div class="print-status ${isPass ? 'pass' : 'fail'}">${isPass ? 'PASS' : 'FAIL'}</div>
        </div>
      </div>

      <!-- FINAL SECTIONS -->
      <div class="print-section">
        <div class="print-section-title">PRIORITY AREAS, REMARKS & ACKNOWLEDGEMENT</div>
        
        ${data.priorityArea1 || data.priorityArea2 || data.priorityArea3 ? `
        <div style="margin-bottom: 8px;">
          <strong>Priority Areas:</strong><br>
          ${data.priorityArea1 ? `1. ${data.priorityArea1}<br>` : ''}
          ${data.priorityArea2 ? `2. ${data.priorityArea2}<br>` : ''}
          ${data.priorityArea3 ? `3. ${data.priorityArea3}` : ''}
        </div>
        ` : ''}
        
        ${data.remarks ? `
        <div style="margin-bottom: 8px;">
          <strong>Remarks:</strong> ${data.remarks}
        </div>
        ` : ''}
        
        <div style="margin-bottom: 8px;">
          <strong>Acknowledgement:</strong> I hereby acknowledge that the Evaluator has explained to me, to the best of their ability, 
          and in a manner I fully understand, my performance and respective rating on this performance evaluation.
        </div>
        
        <div class="print-signature-grid">
          <div>
            <div class="print-signature">${data.employeeSignature || 'Employee signature not provided'}</div>
            <div class="print-signature-label">Employee's Name & Signature</div>
            <div style="margin-top: 5px; font-size: 8px;">
              <strong>Date:</strong> ${data.employeeSignatureDate || new Date().toISOString().split('T')[0]}
            </div>
          </div>
          <div>
            <div class="print-signature">${data.evaluatorSignature || 'Evaluator signature not provided'}</div>
            <div class="print-signature-label">Evaluator's Name & Signature</div>
            <div style="margin-top: 5px; font-size: 8px;">
              <strong>Date:</strong> ${data.evaluatorSignatureDate || new Date().toISOString().split('T')[0]}
            </div>
          </div>
        </div>
      </div>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent.innerHTML);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    } else {
      alert('Please allow popups to print the evaluation.');
    }
  };

  return (
    <Dialog open={open} onOpenChangeAction={onCloseAction}>
      <DialogContent className="max-w-4xl w-[90vw] max-h-[85vh] overflow-y-auto p-6">
                 <DialogHeader className="mb-4">
           <DialogTitle className="text-2xl font-bold text-gray-900">
             OVERALL PERFORMANCE ASSESSMENT - CONFIRMATION
           </DialogTitle>
           <DialogDescription className="text-base text-gray-600 mt-1">
             Please review the complete evaluation results before submitting. This action cannot be undone.
           </DialogDescription>
         </DialogHeader>

                 <div className="space-y-6">
           {/* Employee Information */}
           <Card>
             <CardContent className="pt-6 pb-4">
               <h4 className="font-semibold text-lg text-gray-900 mb-4">Employee Information</h4>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 block mb-1">Name:</span>
                                     <p className="font-medium text-base">{data.employeeName || 'Not specified'}</p>
                 </div>
                 <div>
                   <span className="text-gray-500 block mb-1">Position:</span>
                   <p className="font-medium text-base">{data.position || 'Not specified'}</p>
                 </div>
                 <div>
                   <span className="text-gray-500 block mb-1">Department:</span>
                   <p className="font-medium text-base">{data.department || 'Not specified'}</p>
                 </div>
                 <div>
                   <span className="text-gray-500 block mb-1">Supervisor:</span>
                   <p className="font-medium text-base">{data.supervisor || 'Not specified'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

                     {/* Performance Assessment Table */}
           <Card>
             <CardContent className="pt-6 pb-4">
               <h4 className="font-semibold text-lg text-gray-900 mb-4">Performance Assessment Summary</h4>
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
                           <span className={`px-2 py-1 rounded text-sm font-bold ${getRatingColor(getRatingLabel(jobKnowledgeScore))}`}>
                             {getRatingLabel(jobKnowledgeScore)}
                           </span>
                           {getRatingIcon(getRatingLabel(jobKnowledgeScore))}
                         </div>
                       </td>
                       <td className="border-2 border-gray-400 px-4 py-3 text-center font-bold text-base">
                         {jobKnowledgeScore.toFixed(2)}
                       </td>
                       <td className="border-2 border-gray-400 px-4 py-3 text-center font-bold text-base">
                         20%
                       </td>
                       <td className="border-2 border-gray-400 px-4 py-3 text-center font-bold text-base">
                         {jobKnowledgeWeighted}
                       </td>
                    </tr>

                    {/* Quality of Work */}
                    <tr>
                                             <td className="border-2 border-gray-400 px-4 py-3 text-sm text-gray-700 font-medium">
                         Quality of Work
                       </td>
                       <td className="border-2 border-gray-400 px-4 py-3 text-center">
                         <div className="flex items-center justify-center space-x-1">
                           <span className={`px-2 py-1 rounded text-sm font-bold ${getRatingColor(getRatingLabel(qualityOfWorkScore))}`}>
                             {getRatingLabel(qualityOfWorkScore)}
                           </span>
                           {getRatingIcon(getRatingLabel(qualityOfWorkScore))}
                         </div>
                       </td>
                       <td className="border-2 border-gray-400 px-4 py-3 text-center font-bold text-base">
                         {qualityOfWorkScore.toFixed(2)}
                       </td>
                       <td className="border-2 border-gray-400 px-4 py-3 text-center font-bold text-base">
                         20%
                       </td>
                       <td className="border-2 border-gray-400 px-4 py-3 text-center font-bold text-base">
                         {qualityOfWorkWeighted}
                       </td>
                    </tr>

                    {/* Adaptability */}
                    <tr>
                                             <td className="border-2 border-gray-400 px-4 py-3 text-sm text-gray-700 font-medium">
                         Adaptability
                       </td>
                       <td className="border-2 border-gray-400 px-4 py-3 text-center">
                         <div className="flex items-center justify-center space-x-1">
                           <span className={`px-2 py-1 rounded text-sm font-bold ${getRatingColor(getRatingLabel(adaptabilityScore))}`}>
                             {getRatingLabel(adaptabilityScore)}
                           </span>
                           {getRatingIcon(getRatingLabel(adaptabilityScore))}
                         </div>
                       </td>
                       <td className="border-2 border-gray-400 px-4 py-3 text-center font-bold text-base">
                         {adaptabilityScore.toFixed(2)}
                       </td>
                       <td className="border-2 border-gray-400 px-4 py-3 text-center font-bold text-base">
                         10%
                       </td>
                       <td className="border-2 border-gray-400 px-4 py-3 text-center font-bold text-base">
                         {adaptabilityWeighted}
                       </td>
                    </tr>

                    {/* Teamwork */}
                    <tr>
                                             <td className="border-2 border-gray-400 px-4 py-3 text-sm text-gray-700 font-medium">
                         Teamwork
                       </td>
                       <td className="border-2 border-gray-400 px-4 py-3 text-center">
                         <div className="flex items-center justify-center space-x-1">
                           <span className={`px-2 py-1 rounded text-sm font-bold ${getRatingColor(getRatingLabel(teamworkScore))}`}>
                             {getRatingLabel(teamworkScore)}
                           </span>
                           {getRatingIcon(getRatingLabel(teamworkScore))}
                         </div>
                       </td>
                       <td className="border-2 border-gray-400 px-4 py-3 text-center font-bold text-base">
                         {teamworkScore.toFixed(2)}
                       </td>
                       <td className="border-2 border-gray-400 px-4 py-3 text-center font-bold text-base">
                         10%
                       </td>
                       <td className="border-2 border-gray-400 px-4 py-3 text-center font-bold text-base">
                         {teamworkWeighted}
                       </td>
                    </tr>

                    {/* Reliability */}
                    <tr>
                                             <td className="border-2 border-gray-400 px-4 py-3 text-sm text-gray-700 font-medium">
                         Reliability
                       </td>
                       <td className="border-2 border-gray-400 px-4 py-3 text-center">
                         <div className="flex items-center justify-center space-x-1">
                           <span className={`px-2 py-1 rounded text-sm font-bold ${getRatingColor(getRatingLabel(reliabilityScore))}`}>
                             {getRatingLabel(reliabilityScore)}
                           </span>
                           {getRatingIcon(getRatingLabel(reliabilityScore))}
                         </div>
                       </td>
                       <td className="border-2 border-gray-400 px-4 py-3 text-center font-bold text-base">
                         {reliabilityScore.toFixed(2)}
                       </td>
                       <td className="border-2 border-gray-400 px-4 py-3 text-center font-bold text-base">
                         5%
                       </td>
                       <td className="border-2 border-gray-400 px-4 py-3 text-center font-bold text-base">
                         {reliabilityWeighted}
                       </td>
                    </tr>

                    {/* Ethical & Professional Behavior */}
                    <tr>
                                             <td className="border-2 border-gray-400 px-4 py-3 text-sm text-gray-700 font-medium">
                         Ethical & Professional Behavior
                       </td>
                       <td className="border-2 border-gray-400 px-4 py-3 text-center">
                         <div className="flex items-center justify-center space-x-1">
                           <span className={`px-2 py-1 rounded text-sm font-bold ${getRatingColor(getRatingLabel(ethicalScore))}`}>
                             {getRatingLabel(ethicalScore)}
                           </span>
                           {getRatingIcon(getRatingLabel(ethicalScore))}
                         </div>
                       </td>
                       <td className="border-2 border-gray-400 px-4 py-3 text-center font-bold text-base">
                         {ethicalScore.toFixed(2)}
                       </td>
                       <td className="border-2 border-gray-400 px-4 py-3 text-center font-bold text-base">
                         5%
                       </td>
                       <td className="border-2 border-gray-400 px-4 py-3 text-center font-bold text-base">
                         {ethicalWeighted}
                       </td>
                    </tr>

                    {/* Customer Service */}
                    <tr>
                                             <td className="border-2 border-gray-400 px-4 py-3 text-sm text-gray-700 font-medium">
                         Customer Service
                       </td>
                       <td className="border-2 border-gray-400 px-4 py-3 text-center">
                         <div className="flex items-center justify-center space-x-1">
                           <span className={`px-2 py-1 rounded text-sm font-bold ${getRatingColor(getRatingLabel(customerServiceScore))}`}>
                             {getRatingLabel(customerServiceScore)}
                           </span>
                           {getRatingIcon(getRatingLabel(customerServiceScore))}
                         </div>
                       </td>
                       <td className="border-2 border-gray-400 px-4 py-3 text-center font-bold text-base">
                         {customerServiceScore.toFixed(2)}
                       </td>
                       <td className="border-2 border-gray-400 px-4 py-3 text-center font-bold text-base">
                         30%
                       </td>
                       <td className="border-2 border-gray-400 px-4 py-3 text-center font-bold text-base">
                         {customerServiceWeighted}
                       </td>
                    </tr>

                                         {/* Overall Performance Rating */}
                     <tr className="bg-gray-100">
                       <td colSpan={4} className="border-2 border-gray-400 px-4 py-3 text-sm font-bold text-gray-700">
                         Overall Performance Rating
                       </td>
                       <td className="border-2 border-gray-400 px-4 py-3 text-center font-bold text-lg">
                         {overallWeightedScore}
                       </td>
                     </tr>
                  </tbody>
                </table>
              </div>

                             {/* Final Results */}
               <div className="mt-6 flex justify-center items-center space-x-8">
                 <div className="text-center">
                   <div className="text-4xl font-bold text-gray-700">{overallPercentage}%</div>
                   <div className="text-base text-gray-500 mt-1">Performance Score</div>
                 </div>
                 <div className={`px-8 py-4 rounded-lg font-bold text-white text-xl ${isPass ? 'bg-green-600' : 'bg-red-600'}`}>
                   {isPass ? 'PASS' : 'FAIL'}
                 </div>
               </div>
            </CardContent>
          </Card>

                     {/* Validation Warning */}
           {!isComplete && (
             <Card className="bg-red-50 border-red-200">
               <CardContent className="pt-4">
                 <div className="flex items-start gap-2">
                   <div className="text-red-600 text-base">⚠️</div>
                   <div>
                     <h4 className="font-medium text-red-800 mb-1 text-sm">Incomplete Evaluation</h4>
                     <p className="text-xs text-red-700">
                       Please complete all required performance criteria before submitting the evaluation.
                     </p>
                   </div>
                 </div>
               </CardContent>
             </Card>
           )}

           {/* Submission Notice */}
           <Card className="bg-blue-50 border-blue-200">
             <CardContent className="pt-4">
               <div className="flex items-start gap-2">
                 <div className="text-blue-600 text-base">ℹ️</div>
                 <div>
                   <h4 className="font-medium text-blue-800 mb-1 text-sm">Submission Notice</h4>
                   <ul className="text-xs text-blue-700 space-y-1">
                     <li>• This evaluation will be automatically sent to the employee, HR department, and administrator</li>
                     <li>• All parties will receive email notifications with the evaluation details</li>
                     <li>• This evaluation will be stored in the HR system for performance management</li>
                     <li>• You cannot edit this evaluation after submission</li>
                     <li>• The overall performance score will determine pass/fail status</li>
                     <li>• The employee can view and approve the evaluation in their dashboard</li>
                   </ul>
                 </div>
               </div>
             </CardContent>
           </Card>
        </div>

        {/* Priority Areas for Improvement */}
        <Card>
          <CardContent className="pt-6 pb-4">
            <h4 className="font-semibold text-lg text-gray-900 mb-4">Priority Areas for Improvement</h4>
            <div className="space-y-3">
              {data.priorityArea1 && (
                <div className="p-3 bg-yellow-50 border border-gray-300 rounded-md">
                  <span className="font-medium text-sm">1. </span>
                  <span className="text-sm text-gray-700">{data.priorityArea1}</span>
                </div>
              )}
              {data.priorityArea2 && (
                <div className="p-3 bg-yellow-50 border border-gray-300 rounded-md">
                  <span className="font-medium text-sm">2. </span>
                  <span className="text-sm text-gray-700">{data.priorityArea2}</span>
                </div>
              )}
              {data.priorityArea3 && (
                <div className="p-3 bg-yellow-50 border border-gray-300 rounded-md">
                  <span className="font-medium text-sm">3. </span>
                  <span className="text-sm text-gray-700">{data.priorityArea3}</span>
                </div>
              )}
              {!data.priorityArea1 && !data.priorityArea2 && !data.priorityArea3 && (
                <p className="text-sm text-gray-500 italic">No priority areas specified</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Remarks */}
        {data.remarks && (
          <Card>
            <CardContent className="pt-6 pb-4">
              <h4 className="font-semibold text-lg text-gray-900 mb-4">Remarks</h4>
              <div className="p-3 bg-yellow-50 border border-gray-300 rounded-md">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{data.remarks}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Acknowledgement */}
        <Card>
          <CardContent className="pt-6 pb-4">
            <h4 className="font-semibold text-lg text-gray-900 mb-4">Acknowledgement</h4>
            <p className="text-sm text-gray-600 mb-4">
              I hereby acknowledge that the Evaluator has explained to me, to the best of their ability, 
              and in a manner I fully understand, my performance and respective rating on this performance evaluation.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Employee Section */}
              <div className="space-y-3">
                <div className="p-3 bg-yellow-50 border border-gray-300 rounded-md min-h-[40px]">
                  <p className="text-sm text-gray-700">{data.employeeSignature || 'Employee signature not provided'}</p>
                </div>
                <p className="text-center text-sm text-gray-600">Employee's Name & Signature</p>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">Date:</span>
                  <span className="text-sm text-gray-700">{data.employeeSignatureDate || new Date().toISOString().split('T')[0]}</span>
                </div>
              </div>

              {/* Evaluator Section */}
              <div className="space-y-3">
                <div className="p-3 bg-yellow-50 border border-gray-300 rounded-md min-h-[40px]">
                  <p className="text-sm text-gray-700">{data.evaluatorSignature || 'Evaluator signature not provided'}</p>
                </div>
                <p className="text-center text-sm text-gray-600">Evaluator's Name & Signature</p>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">Date:</span>
                  <span className="text-sm text-gray-700">{data.evaluatorSignatureDate || new Date().toISOString().split('T')[0]}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submission Status Messages */}
        {submissionSuccess && (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <h4 className="font-medium text-green-800 mb-1">Evaluation Submitted Successfully!</h4>
                  <p className="text-sm text-green-700">
                    The evaluation has been sent to the employee, HR department, and administrator. 
                    All parties will receive notifications.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {submissionError && (
          <Card className="bg-red-50 border-red-200">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <div className="flex-1">
                  <h4 className="font-medium text-red-800 mb-1">Submission Failed</h4>
                  <p className="text-sm text-red-700">{submissionError}</p>
                </div>
                {retryCount < 3 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRetry}
                    disabled={isSubmitting}
                    className="ml-2 text-red-600 border-red-300 hover:bg-red-100"
                  >
                    Retry
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <DialogFooter className="flex space-x-4 mt-6">
          <Button 
            variant="outline" 
            onClick={handlePrint}
            disabled={isSubmitting}
            className="px-6 py-2 text-base"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print Evaluation
          </Button>
          <Button 
            variant="outline" 
            onClick={onCloseAction}
            disabled={isSubmitting}
            className="px-6 py-2 text-base"
          >
            Review & Edit
          </Button>
          <Button 
            onClick={() => handleSubmitEvaluation()}
            disabled={!isComplete || isSubmitting}
            className="px-6 py-2 text-base bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Submitting...
              </>
            ) : submissionSuccess ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Submitted Successfully
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                {isComplete ? 'Submit to Employee, HR & Admin' : 'Complete Required Fields'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
