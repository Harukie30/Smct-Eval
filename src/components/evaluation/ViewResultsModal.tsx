'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Printer, X } from 'lucide-react';
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

export default function ViewResultsModal({ isOpen, onCloseAction, submission, onApprove, 
  isApproved = false, approvalData = null, currentUserName, currentUserSignature, 
  showApprovalButton = false, isEvaluatorView = false }: ViewResultsModalProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [approvalError, setApprovalError] = useState('');
  const printContentRef = useRef<HTMLDivElement>(null);

  // Fetch employee signature for this evaluation
  const { signature: employeeSignature, loading: signatureLoading, error: signatureError } = useEmployeeSignatureByEvaluation(submission?.id || null);

  // Handle print functionality - prints the entire modal content
  const handlePrint = () => {
    if (!printContentRef.current) {
      console.warn('Print content not available');
      return;
    }

    // Clone the content without no-print elements
    const clonedContent = printContentRef.current.cloneNode(true) as HTMLElement;
    const noPrintElements = clonedContent.querySelectorAll('.no-print');
    noPrintElements.forEach(el => el.remove());

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      // Get all styles from the current document
      const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map(el => {
          if (el.tagName === 'STYLE') {
            return `<style>${el.innerHTML}</style>`;
          } else if (el.tagName === 'LINK') {
            return `<link rel="stylesheet" href="${(el as HTMLLinkElement).href}">`;
          }
          return '';
        })
        .join('\n');

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${submission ? `Evaluation Details - ${submission.employeeName}` : 'Evaluation Details'}</title>
            ${styles}
            <style>
              @page { 
                size: A4; 
                margin: 1.5cm; 
              }
              @media print {
                * {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                body { 
                  font-family: Arial, sans-serif; 
                  font-size: 13px; 
                  line-height: 1.4;
                  color: #000;
                  padding: 0;
                  margin: 40px;
                }
                .no-print { display: none !important; }
                /* Form container with border - only outer border */
                .space-y-8 {
                  border: 2px solid #000 !important;
                  padding: 25px !important;
                  background: white !important;
                }
                /* Remove all shadow and border classes in print */
                .shadow-md,
                .shadow-sm {
                  box-shadow: none !important;
                  border: none !important;
                  background: transparent !important;
                }
                /* Remove all container backgrounds and borders except form container */
                div:not(.space-y-8) {
                  background: transparent !important;
                  background-color: transparent !important;
                }
                /* Only allow borders on tables, input lines, and form container */
                div:not(.space-y-8):not([class*="print-signature"]):not([class*="print-date"]):not([class*="print-priority"]):not([class*="print-remarks"]) {
                  border: none !important;
                }
                /* Title styling */
                h1, h2, h3 {
                  text-align: center !important;
                  margin: 5px 0 !important;
                }
                h1 {
                  font-size: 16px !important;
                  font-weight: bold !important;
                }
                h3 {
                  font-size: 14px !important;
                  font-weight: bold !important;
                  margin-top: 10px !important;
                }
                /* Completely remove all card styling in print - no borders, no backgrounds, no containers */
                [class*="Card"],
                [class*="Card"] * {
                  border: none !important;
                  box-shadow: none !important;
                  background: transparent !important;
                  background-color: transparent !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  border-radius: 0 !important;
                }
                [class*="CardContent"] {
                  padding: 0 !important;
                  border: none !important;
                  background: transparent !important;
                  background-color: transparent !important;
                }
                [class*="CardHeader"] {
                  display: none !important;
                  border: none !important;
                  background: transparent !important;
                }
                /* Remove any gray backgrounds */
                .bg-gray-50,
                .bg-gray-100,
                .bg-gray-200,
                .bg-yellow-50 {
                  background: transparent !important;
                  background-color: transparent !important;
                }
                /* Remove all borders from cards */
                .border,
                .border-b,
                .border-2,
                .border-gray-200,
                .border-gray-300 {
                  border: none !important;
                }
                /* Review Type - checkbox group style */
                .print-review-type {
                  display: flex !important;
                  justify-content: space-between !important;
                  margin-top: 10px !important;
                  font-size: 13px !important;
                }
                .print-review-type > div {
                  text-align: left !important;
                  padding: 0 !important;
                }
                .print-review-type h5 {
                  font-weight: normal !important;
                  margin-bottom: 5px !important;
                }
                .print-review-type .space-y-2,
                .print-review-type .space-y-3 {
                  margin: 0 !important;
                }
                .print-review-type .space-y-2 > *,
                .print-review-type .space-y-3 > * {
                  margin: 2px 0 !important;
                }
                /* Basic Information - two column layout with horizontal alignment */
                .print-basic-info {
                  display: grid !important;
                  grid-template-columns: 1fr 1fr !important;
                  gap: 0 !important;
                  margin-top: 10px !important;
                  column-gap: 30px !important;
                  row-gap: 5px !important;
                }
                .print-basic-info > div {
                  display: flex !important;
                  justify-content: flex-start !important;
                  align-items: baseline !important;
                  gap: 4px !important;
                  margin: 0 !important;
                  font-size: 13px !important;
                  text-align: left !important;
                  padding: 0 !important;
                }
                /* Row 1: Employee Name (left) | Date Hired (right) */
                .print-basic-info > div:nth-child(1) {
                  grid-column: 1 !important;
                  grid-row: 1 !important;
                }
                .print-basic-info > div:nth-child(5) {
                  grid-column: 2 !important;
                  grid-row: 1 !important;
                }
                /* Row 2: Employee Number (left) | Immediate Supervisor (right) */
                .print-basic-info > div:nth-child(2) {
                  grid-column: 1 !important;
                  grid-row: 2 !important;
                }
                .print-basic-info > div:nth-child(6) {
                  grid-column: 2 !important;
                  grid-row: 2 !important;
                }
                /* Row 3: Position (left) | Performance Coverage (right) */
                .print-basic-info > div:nth-child(3) {
                  grid-column: 1 !important;
                  grid-row: 3 !important;
                }
                .print-basic-info > div:nth-child(7) {
                  grid-column: 2 !important;
                  grid-row: 3 !important;
                }
                /* Row 4: Department/Branch (left only) */
                .print-basic-info > div:nth-child(4) {
                  grid-column: 1 !important;
                  grid-row: 4 !important;
                }
                .print-basic-info > div > label {
                  font-weight: bold !important;
                  width: auto !important;
                  flex-shrink: 0 !important;
                  margin-right: 0 !important;
                }
                .print-basic-info > div > p {
                  border-bottom: 1px solid #000 !important;
                  flex: 1 !important;
                  min-width: 0 !important;
                  height: auto !important;
                  line-height: 1 !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  padding-bottom: 1px !important;
                  text-align: left !important;
                }
                /* Remove block display from label in print */
                .print-basic-info .print-label {
                  display: inline !important;
                  margin-bottom: 0 !important;
                }
                .print-basic-info .print-value {
                  display: inline !important;
                }
                /* Table styling */
                table {
                  width: 100% !important;
                  border-collapse: collapse !important;
                  margin-top: 10px !important;
                }
                table, td, th {
                  border: 1px solid #000 !important;
                  padding: 5px !important;
                  font-size: 13px !important;
                }
                th {
                  background-color: #d9d9d9 !important;
                  font-weight: bold !important;
                }
                tr { page-break-inside: avoid; }
                thead { display: table-header-group; }
                img { max-width: 100%; height: auto; page-break-inside: avoid; }
                /* Section titles */
                h4 {
                  font-weight: bold !important;
                  margin-top: 8px !important;
                  border-bottom: 2px solid #000 !important;
                  padding-bottom: 2px !important;
                  font-size: 12px !important;
                  text-transform: uppercase !important;
                  margin-bottom: 3px !important;
                }
                /* Priority Areas and Remarks - large box style */
                .print-priority-box,
                .print-remarks-box {
                  width: 100% !important;
                  height: 60px !important;
                  border: 1px solid #000 !important;
                  margin-top: 3px !important;
                  padding: 2px !important;
                  background: white !important;
                  background-color: white !important;
                }
                /* Remove gray backgrounds from priority area items in print */
                .print-priority-box .bg-yellow-50,
                .print-remarks-box .bg-yellow-50 {
                  background: transparent !important;
                  background-color: transparent !important;
                  border: none !important;
                  padding: 1px 2px !important;
                  margin: 1px 0 !important;
                }
                /* Reduce font size in Priority Areas */
                .print-priority-box span,
                .print-priority-box .text-sm {
                  font-size: 9px !important;
                  line-height: 1.2 !important;
                }
                /* Reduce spacing between Priority Area items */
                .print-priority-box.space-y-3 > * {
                  margin-top: 1px !important;
                  margin-bottom: 1px !important;
                }
                /* Acknowledgement section */
                .print-acknowledgement {
                  display: flex !important;
                  justify-content: space-between !important;
                  margin-top: 10px !important;
                }
                .print-acknowledgement > div {
                  width: 45% !important;
                  text-align: center !important;
                }
                /* Signature boxes - print format - remove all containers */
                .print-acknowledgement .h-20,
                .print-acknowledgement [class*="border-dashed"],
                .print-acknowledgement [class*="rounded"] {
                  border: none !important;
                  background: transparent !important;
                  background-color: transparent !important;
                  height: auto !important;
                  padding: 0 !important;
                  border-radius: 0 !important;
                }
                .print-acknowledgement .h-20 > span:not(.print-signature-line) {
                  display: none !important;
                }
                .print-signature-line {
                  border-bottom: 1px solid #000 !important;
                  width: 100% !important;
                  height: 15px !important;
                  margin-bottom: 2px !important;
                  display: block !important;
                  background: transparent !important;
                }
                .print-acknowledgement img {
                  display: none !important;
                }
                /* Remove all rounded corners and borders from signature containers */
                .print-acknowledgement [class*="rounded-lg"],
                .print-acknowledgement [class*="border-2"] {
                  border: none !important;
                  border-radius: 0 !important;
                  background: transparent !important;
                }
                /* Date box */
                .print-date-box {
                  border-bottom: 1px solid #000 !important;
                  width: 150px !important;
                  height: 18px !important;
                  display: inline-block !important;
                  padding: 0 5px !important;
                }
                .print-date-section {
                  margin-top: 8px !important;
                  font-size: 11px !important;
                }
                /* Acknowledgement text */
                .print-acknowledgement p {
                  font-size: 11px !important;
                  margin-bottom: 8px !important;
                  line-height: 1.3 !important;
                }
                /* Hide signature images and complex styling in print */
                .print-acknowledgement .h-20 {
                  position: relative !important;
                }
                .print-acknowledgement .h-20 > span:not(.print-signature-line) {
                  display: none !important;
                }
                .print-acknowledgement .h-20 img {
                  display: none !important;
                }
                .print-signature-line {
                  position: absolute !important;
                  top: 50% !important;
                  left: 0 !important;
                  right: 0 !important;
                  transform: translateY(-50%) !important;
                }
                /* Hide detailed step sections in print */
                .hide-in-print {
                  display: none !important;
                }
                /* Overall Assessment table */
                .print-overall-assessment-wrapper [class*="Card"] {
                  border: none !important;
                  box-shadow: none !important;
                  padding: 0 !important;
                  margin: 0 !important;
                  background: transparent !important;
                }
                .print-overall-assessment-wrapper [class*="CardContent"] {
                  padding: 0 !important;
                  border: none !important;
                  background: transparent !important;
                }
                .print-overall-assessment-wrapper h3 {
                  font-size: 12px !important;
                  margin-bottom: 2px !important;
                  margin-top: 5px !important;
                }
                .print-overall-assessment-table {
                  border: none !important;
                  width: 100% !important;
                  border-collapse: collapse !important;
                  margin-top: 3px !important;
                  margin-bottom: 5px !important;
                }
                .print-overall-assessment-table th,
                .print-overall-assessment-table td {
                  border: 1px solid #000 !important;
                  padding: 2px 4px !important;
                  font-size: 10px !important;
                  text-align: center !important;
                  line-height: 1.2 !important;
                }
                .print-overall-assessment-table th {
                  background-color: #d9d9d9 !important;
                  font-weight: bold !important;
                  padding: 3px 4px !important;
                }
                .print-overall-assessment-table td:first-child {
                  text-align: left !important;
                }
                .print-overall-assessment-table tbody tr:last-child {
                  background-color: #e8e8e8 !important;
                  font-weight: bold !important;
                }
                .print-overall-assessment-table tbody tr:last-child td:first-child {
                  text-align: right !important;
                }
                /* Hide rating badges in print */
                .print-overall-assessment-table .px-2,
                .print-overall-assessment-table span[class*="px-2"],
                .print-overall-assessment-table .rounded {
                  background: transparent !important;
                  padding: 0 !important;
                  border-radius: 0 !important;
                  color: #000 !important;
                  border: none !important;
                }
                /* Hide Performance Score section in print */
                .print-performance-score-wrapper {
                  display: none !important;
                }
                /* Remove spacing between sections */
                .space-y-8 > * {
                  margin-bottom: 0 !important;
                }
              }
            </style>
          </head>
          <body>
            ${clonedContent.innerHTML}
          </body>
        </html>
      `);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };


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
          <div ref={printContentRef} className="space-y-8">
            <div className="flex items-center justify-between border-b border-gray-200 pb-4 no-print">
            <h2 className="text-3xl font-bold text-gray-900">Evaluation Details</h2>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-gray-600 text-white hover:bg-gray-700 flex items-center gap-2"
                >
                  <Printer className="h-4 w-4" />
                  Print
                </Button>
            <Button
              onClick={onCloseAction}
              className="px-4 py-2 bg-blue-500 text-white hover:bg-red-600 hover:text-white"
            >
             🗙 Close
            </Button>
              </div>
          </div>

          <div className="space-y-8">
            {/* Title */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Performance Review Form (HEAD OFFICE) Rank and File I & II</h1>
                  </div>

            {/* Review Type Section */}
            {submission.evaluationData && (
              <Card className="shadow-md">
                <CardContent className="p-6">
                            
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print-review-type">
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

            {/* Header Information */}
            <Card className="shadow-md">
              <CardContent className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 print-basic-info">
                  <div className="print-info-row">
                    <Label className="text-sm font-medium text-gray-600 block mb-1 print-label">Employee Name:</Label>
                    <p className="text-lg font-semibold text-gray-900 print-value">{submission.employeeName}</p>
                  </div>
                  <div className="print-info-row">
                    <Label className="text-sm font-medium text-gray-600 block mb-1 print-label">Employee Number:</Label>
                    <p className="text-lg text-gray-900 print-value">{submission.evaluationData?.employeeId || submission.employeeId || 'N/A'}</p>
                  </div>
                  <div className="print-info-row">
                    <Label className="text-sm font-medium text-gray-600 block mb-1 print-label">Position:</Label>
                    <p className="text-lg text-gray-900 print-value">{submission.evaluationData?.position || 'Not specified'}</p>
                  </div>
                  <div className="print-info-row">
                    <Label className="text-sm font-medium text-gray-600 block mb-1 print-label">Department/Branch:</Label>
                    <p className="text-lg text-gray-900 print-value">{submission.evaluationData?.department || 'Not specified'}{submission.evaluationData?.branch ? ` / ${submission.evaluationData.branch}` : ''}</p>
                  </div>
                  <div className="print-info-row">
                    <Label className="text-sm font-medium text-gray-600 block mb-1 print-label">Date Hired:</Label>
                    <p className="text-lg text-gray-900 print-value">
                      {submission.evaluationData?.hireDate 
                        ? new Date(submission.evaluationData.hireDate).toLocaleDateString() 
                        : 'Not specified'}
                    </p>
                  </div>
                  <div className="print-info-row">
                    <Label className="text-sm font-medium text-gray-600 block mb-1 print-label">Immediate Supervisor:</Label>
                    <p className="text-lg text-gray-900 print-value">{submission.evaluationData?.supervisor || 'Not specified'}</p>
                  </div>
                  <div className="print-info-row">
                    <Label className="text-sm font-medium text-gray-600 block mb-1 print-label">Performance Coverage:</Label>
                    <p className="text-lg text-gray-900 print-value">
                      {submission.evaluationData?.coverageFrom && submission.evaluationData?.coverageTo
                        ? `${new Date(submission.evaluationData.coverageFrom).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} - ${new Date(submission.evaluationData.coverageTo).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`
                        : 'Not specified'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 1: Job Knowledge */}
            {submission.evaluationData && (
              <Card className="shadow-md hide-in-print">
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
              <Card className="shadow-md hide-in-print">
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
              <Card className="shadow-md hide-in-print">
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
              <Card className="shadow-md hide-in-print">
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
              <Card className="shadow-md hide-in-print">
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
              <Card className="shadow-md hide-in-print">
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
              <Card className="shadow-md hide-in-print">
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
              <div className="print-overall-assessment-wrapper">
              <Card className="shadow-md">
                <CardContent className="p-6">
                  <div className="space-y-6">
                      <h3 className="text-base font-semibold text-gray-900 mb-4">Overall Assessment</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse border-2 border-gray-400 print-overall-assessment-table">
                        <thead>
                          <tr className="bg-gray-200">
                            <th className="border-2 border-gray-400 px-4 py-3 text-left font-bold text-gray-900 text-base print-criteria-col">
                              Performance Criteria
                            </th>
                            <th className="border-2 border-gray-400 px-4 py-3 text-center font-bold text-gray-900 text-base w-32 print-rating-col">
                              Rating
                            </th>
                            <th className="border-2 border-gray-400 px-4 py-3 text-center font-bold text-gray-900 text-base w-24 print-score-col">
                              Score
                            </th>
                            <th className="border-2 border-gray-400 px-4 py-3 text-center font-bold text-gray-900 text-base w-24 print-weight-col">
                              Weight (%)
                            </th>
                            <th className="border-2 border-gray-400 px-4 py-3 text-center font-bold text-gray-900 text-base w-32 print-weighted-col">
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
                      <div className="mt-6 flex justify-center items-center space-x-8 print-performance-score-wrapper">
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
              </div>
            )}

            {/* Priority Areas for Improvement */}
            {submission.evaluationData && (submission.evaluationData.priorityArea1 || submission.evaluationData.priorityArea2 || submission.evaluationData.priorityArea3) && (
              <Card>
                <CardContent className="pt-6 pb-4">
                  <h4 className="font-semibold text-lg text-gray-900 mb-4">Priority Areas for Improvement</h4>
                  <div className="space-y-3 print-priority-box">
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
                  <div className="p-3 bg-yellow-50 border border-gray-300 rounded-md print-remarks-box">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print-acknowledgement">
                    {/* Employee Section */}
                    <div className="space-y-4">
                      {/* Signature area */}
                      <div className="text-center">
                        <div className="h-20 border-2 border-dashed border-white rounded-lg flex items-center justify-center bg-gray-50 relative">
                          {/* Print signature line */}
                          <div className="print-signature-line"></div>
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
                        <div className="text-xs text-gray-500 mt-1">Employee's Name & Signature</div>
                      </div>
                      
                      {/* Action Section - Only show if showApprovalButton is true */}
                      {showApprovalButton && (
                        <div className="mt-6 space-y-4 no-print">
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
                      
                      {/* Employee Date */}
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mt-1 print-date-value">
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
                          {/* Print signature line */}
                          <div className="print-signature-line"></div>
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
                        <div className="text-xs text-gray-500 mt-1">Evaluator's Name & Signature</div>
                      </div>
                      
                      {/* Evaluator Date */}
                      <div className="text-center">
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
                  {/* Date section */}
                  <div className="mt-5 print-date-section">
                    <span>Date: </span>
                    <span className="print-date-box">
                      {(submission.employeeApprovedAt || submission.evaluatorApprovedAt || submission.submittedAt)
                        ? new Date(submission.employeeApprovedAt || submission.evaluatorApprovedAt || submission.submittedAt).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })
                        : new Date().toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })}
                    </span>
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
