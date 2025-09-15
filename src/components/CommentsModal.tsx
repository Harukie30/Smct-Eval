'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CommentSection {
  title: string;
  comments: string[];
  scores?: string[];
}

interface CommentsModalProps {
  isOpen: boolean;
  onCloseAction: () => void;
  employeeName: string;
  employeeEmail?: string;
  department?: string;
  position?: string;
  evaluatorName?: string;
  evaluationDate?: string;
  category?: string;
  overallRating?: number;
  overallComments?: string;
  evaluationData?: any;
}

const getRatingColor = (rating: number) => {
  if (rating >= 4.5) return 'text-green-600 bg-green-100';
  if (rating >= 4.0) return 'text-blue-600 bg-blue-100';
  if (rating >= 3.5) return 'text-yellow-600 bg-yellow-100';
  return 'text-red-600 bg-red-100';
};

const getRatingLabel = (score: number) => {
  if (score >= 4.5) return 'Outstanding';
  if (score >= 4.0) return 'Exceeds Expectations';
  if (score >= 3.5) return 'Meets Expectations';
  if (score >= 2.5) return 'Needs Improvement';
  return 'Unsatisfactory';
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

const calculateScore = (scores: string[]) => {
  const validScores = scores.filter(score => score && score !== '').map(score => parseFloat(score));
  if (validScores.length === 0) return 0;
  return validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
};

export default function CommentsModal({
  isOpen,
  onCloseAction,
  employeeName,
  employeeEmail,
  department,
  position,
  evaluatorName,
  evaluationDate,
  category,
  overallRating,
  overallComments,
  evaluationData
}: CommentsModalProps) {
  
  const getCommentSections = (): CommentSection[] => {
    if (!evaluationData) return [];
    
    const sections: CommentSection[] = [];
    
    // Job Knowledge Comments
    const jobKnowledgeComments = [
      evaluationData.jobKnowledgeComments1,
      evaluationData.jobKnowledgeComments2,
      evaluationData.jobKnowledgeComments3
    ].filter(comment => comment && comment.trim());
    
    if (jobKnowledgeComments.length > 0) {
      sections.push({
        title: 'Job Knowledge',
        comments: jobKnowledgeComments,
        scores: [
          evaluationData.jobKnowledgeScore1,
          evaluationData.jobKnowledgeScore2,
          evaluationData.jobKnowledgeScore3
        ].filter(score => score && score !== '')
      });
    }
    
    // Quality of Work Comments
    const qualityComments = [
      evaluationData.qualityOfWorkComments1,
      evaluationData.qualityOfWorkComments2,
      evaluationData.qualityOfWorkComments3,
      evaluationData.qualityOfWorkComments4,
      evaluationData.qualityOfWorkComments5
    ].filter(comment => comment && comment.trim());
    
    if (qualityComments.length > 0) {
      sections.push({
        title: 'Quality of Work',
        comments: qualityComments,
        scores: [
          evaluationData.qualityOfWorkScore1,
          evaluationData.qualityOfWorkScore2,
          evaluationData.qualityOfWorkScore3,
          evaluationData.qualityOfWorkScore4,
          evaluationData.qualityOfWorkScore5
        ].filter(score => score && score !== '')
      });
    }
    
    // Adaptability Comments
    const adaptabilityComments = [
      evaluationData.adaptabilityComments1,
      evaluationData.adaptabilityComments2,
      evaluationData.adaptabilityComments3
    ].filter(comment => comment && comment.trim());
    
    if (adaptabilityComments.length > 0) {
      sections.push({
        title: 'Adaptability',
        comments: adaptabilityComments,
        scores: [
          evaluationData.adaptabilityScore1,
          evaluationData.adaptabilityScore2,
          evaluationData.adaptabilityScore3
        ].filter(score => score && score !== '')
      });
    }
    
    // Teamwork Comments
    const teamworkComments = [
      evaluationData.teamworkComments1,
      evaluationData.teamworkComments2,
      evaluationData.teamworkComments3
    ].filter(comment => comment && comment.trim());
    
    if (teamworkComments.length > 0) {
      sections.push({
        title: 'Teamwork',
        comments: teamworkComments,
        scores: [
          evaluationData.teamworkScore1,
          evaluationData.teamworkScore2,
          evaluationData.teamworkScore3
        ].filter(score => score && score !== '')
      });
    }
    
    // Reliability Comments
    const reliabilityComments = [
      evaluationData.reliabilityComments1,
      evaluationData.reliabilityComments2,
      evaluationData.reliabilityComments3,
      evaluationData.reliabilityComments4
    ].filter(comment => comment && comment.trim());
    
    if (reliabilityComments.length > 0) {
      sections.push({
        title: 'Reliability',
        comments: reliabilityComments,
        scores: [
          evaluationData.reliabilityScore1,
          evaluationData.reliabilityScore2,
          evaluationData.reliabilityScore3,
          evaluationData.reliabilityScore4
        ].filter(score => score && score !== '')
      });
    }
    
    // Ethical Comments
    if (evaluationData.ethicalComments && evaluationData.ethicalComments.trim()) {
      sections.push({
        title: 'Ethical & Professional Behavior',
        comments: [evaluationData.ethicalComments],
        scores: [
          evaluationData.ethicalScore1,
          evaluationData.ethicalScore2,
          evaluationData.ethicalScore3,
          evaluationData.ethicalScore4
        ].filter(score => score && score !== '')
      });
    }
    
    // Customer Service Comments
    if (evaluationData.customerServiceComments && evaluationData.customerServiceComments.trim()) {
      sections.push({
        title: 'Customer Service',
        comments: [evaluationData.customerServiceComments],
        scores: [
          evaluationData.customerServiceScore1,
          evaluationData.customerServiceScore2,
          evaluationData.customerServiceScore3,
          evaluationData.customerServiceScore4,
          evaluationData.customerServiceScore5
        ].filter(score => score && score !== '')
      });
    }
    
    return sections;
  };

  const commentSections = getCommentSections();

  return (
    <Dialog open={isOpen} onOpenChangeAction={onCloseAction}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">
            Feedback Comments
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Employee Information Header */}
          <Card className="bg-gray-50">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{employeeName}</h3>
                  {employeeEmail && (
                    <p className="text-sm text-gray-600">{employeeEmail}</p>
                  )}
                  {position && (
                    <p className="text-sm text-gray-600">{position}</p>
                  )}
                  {department && (
                    <Badge variant="outline" className="mt-1">
                      {department}
                    </Badge>
                  )}
                </div>
                <div className="text-right">
                  {category && (
                    <Badge className="bg-blue-100 text-blue-800 mb-2">
                      {category}
                    </Badge>
                  )}
                  {overallRating && (
                    <div className="mb-2">
                      <Badge className={`${getRatingColor(overallRating)}`}>
                        {overallRating.toFixed(1)}/5 - {getRatingLabel(overallRating)}
                      </Badge>
                    </div>
                  )}
                  {evaluatorName && (
                    <p className="text-sm text-gray-600">Evaluator: {evaluatorName}</p>
                  )}
                  {evaluationDate && (
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600">
                        {new Date(evaluationDate).toLocaleDateString()}
                      </p>
                      <Badge className={getQuarterColor(getQuarterFromDate(evaluationDate))}>
                        {getQuarterFromDate(evaluationDate)}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Overall Comments */}
          {overallComments && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Overall Assessment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-gray-800 whitespace-pre-wrap">{overallComments}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Detailed Comments by Category */}
          {commentSections.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Detailed Feedback by Category</h3>
              {commentSections.map((section, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-semibold text-gray-900">
                        {section.title}
                      </CardTitle>
                      {section.scores && section.scores.length > 0 && (
                        <Badge className="bg-gray-100 text-gray-800">
                          Avg: {calculateScore(section.scores).toFixed(1)}/5
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {section.comments.map((comment, commentIndex) => (
                        <div key={commentIndex} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <div className="flex items-start justify-between">
                            <p className="text-gray-800 whitespace-pre-wrap flex-1">{comment}</p>
                            {section.scores && section.scores[commentIndex] && (
                              <Badge className="ml-3 bg-white border border-gray-300 text-gray-700">
                                {section.scores[commentIndex]}/5
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Priority Areas for Improvement */}
          {evaluationData && (evaluationData.priorityArea1 || evaluationData.priorityArea2 || evaluationData.priorityArea3) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Priority Areas for Improvement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {evaluationData.priorityArea1 && (
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                      <span className="font-medium text-sm text-yellow-800">1. </span>
                      <span className="text-yellow-800">{evaluationData.priorityArea1}</span>
                    </div>
                  )}
                  {evaluationData.priorityArea2 && (
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                      <span className="font-medium text-sm text-yellow-800">2. </span>
                      <span className="text-yellow-800">{evaluationData.priorityArea2}</span>
                    </div>
                  )}
                  {evaluationData.priorityArea3 && (
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                      <span className="font-medium text-sm text-yellow-800">3. </span>
                      <span className="text-yellow-800">{evaluationData.priorityArea3}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Remarks */}
          {evaluationData && evaluationData.remarks && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Additional Remarks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <p className="text-gray-800 whitespace-pre-wrap">{evaluationData.remarks}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* No Comments Message */}
          {commentSections.length === 0 && !overallComments && (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-gray-500">
                  <p className="text-lg mb-2">No detailed comments available</p>
                  <p className="text-sm">This evaluation may not contain specific feedback comments.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onCloseAction} variant="outline">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
