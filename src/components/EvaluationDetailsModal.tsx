'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

interface EvaluationDetailsModalProps {
  isOpen: boolean;
  onCloseAction: () => void;
  evaluationData: any;
  approvalData?: any;
  isApproved?: boolean;
}

export default function EvaluationDetailsModal({ 
  isOpen, 
  onCloseAction, 
  evaluationData,
  approvalData,
  isApproved = false
}: EvaluationDetailsModalProps) {
  if (!evaluationData) return null;

  const { evaluationData: data, evaluatorName, submittedAt, period, overallRating } = evaluationData;

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-600';
    if (rating >= 3.5) return 'text-blue-600';
    if (rating >= 2.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRatingLabel = (rating: number) => {
    if (rating >= 4.5) return 'Excellent';
    if (rating >= 3.5) return 'Good';
    if (rating >= 2.5) return 'Satisfactory';
    return 'Needs Improvement';
  };

  return (
    <Dialog open={isOpen} onOpenChangeAction={onCloseAction}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-2xl font-bold">Performance Evaluation Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Header Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Evaluator</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-lg font-semibold text-gray-900">{evaluatorName}</p>
              </CardContent>
            </Card>
            
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Period</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-lg font-semibold text-gray-900">{period}</p>
              </CardContent>
            </Card>
            
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Overall Rating</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center space-x-3">
                  <span className={`text-2xl font-bold ${getRatingColor(overallRating)}`}>
                    {overallRating}/5
                  </span>
                  <Badge className={`${
                    overallRating >= 4.5 ? 'bg-green-100 text-green-800' :
                    overallRating >= 3.5 ? 'bg-blue-100 text-blue-800' :
                    overallRating >= 2.5 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {getRatingLabel(overallRating)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Evaluation Date */}
          <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg border">
            <strong>Evaluation Date:</strong> {new Date(submittedAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>

          {/* Detailed Ratings */}
          {data && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Detailed Ratings</h3>
              
              {/* Technical Skills */}
              {data.technicalSkills && (
                <Card className="shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold text-gray-900">Technical Skills</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.entries(data.technicalSkills).map(([skill, rating]: [string, any]) => (
                      <div key={skill} className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="capitalize font-medium text-gray-700">{skill.replace(/([A-Z])/g, ' $1').trim()}</span>
                          <span className={`font-semibold ${getRatingColor(rating)}`}>
                            {rating}/5
                          </span>
                        </div>
                        <Progress value={(rating / 5) * 100} className="h-2" />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Soft Skills */}
              {data.softSkills && (
                <Card className="shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold text-gray-900">Soft Skills</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.entries(data.softSkills).map(([skill, rating]: [string, any]) => (
                      <div key={skill} className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="capitalize font-medium text-gray-700">{skill.replace(/([A-Z])/g, ' $1').trim()}</span>
                          <span className={`font-semibold ${getRatingColor(rating)}`}>
                            {rating}/5
                          </span>
                        </div>
                        <Progress value={(rating / 5) * 100} className="h-2" />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Goals */}
              {data.goals && (
                <Card className="shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold text-gray-900">Goal Achievement</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.entries(data.goals).map(([goal, rating]: [string, any]) => (
                      <div key={goal} className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="capitalize font-medium text-gray-700">{goal.replace(/([A-Z])/g, ' $1').trim()}</span>
                          <span className={`font-semibold ${getRatingColor(rating)}`}>
                            {rating}/5
                          </span>
                        </div>
                        <Progress value={(rating / 5) * 100} className="h-2" />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Comments */}
              {data.comments && (
                <Card className="shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold text-gray-900">Comments & Feedback</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(data.comments).map(([category, comment]: [string, any]) => (
                        <div key={category} className="space-y-2">
                          <h4 className="font-medium text-sm text-gray-700 mb-2">
                            {category.replace(/([A-Z])/g, ' $1').trim()}
                          </h4>
                          <p className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg border border-gray-200">
                            {comment || 'No comment provided'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        {/* Employee Signature Section - if approved */}
        {isApproved && approvalData && (
          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold text-gray-900">Employee Signature</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-4">
                {/* Signature area */}
                <div className="h-16 border-b border-gray-300 flex items-center justify-center">
                  {approvalData.employeeSignature ? (
                    <img 
                      src={approvalData.employeeSignature} 
                      alt="Employee Signature" 
                      className="h-12 max-w-full object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <span className="text-gray-400 text-sm">No signature</span>
                  )}
                </div>

                {/* Printed Name */}
                <p className="text-sm font-medium text-gray-900">
                  {approvalData.employeeName || 'Employee Name'}
                </p>

                {/* Date and Status */}
                <div className="space-y-2">
                  <div className="flex items-center justify-center space-x-2">
                    <span className="text-sm text-gray-600">Date:</span>
                    <span className="text-sm text-gray-700">
                      {new Date(approvalData.approvedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <Badge className="bg-green-100 text-green-800">
                      ✓ Approved
                    </Badge>
                    <span className="text-sm text-gray-600">Acknowledged</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Close Button */}
        <div className="flex justify-end pt-6 border-t border-gray-200 mt-6">
          <Button onClick={onCloseAction} variant="outline" className="px-6">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
