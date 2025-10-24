'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Minus, Target, Award, Users, Shield, Heart, Zap } from 'lucide-react';

interface PerformanceTrendModalProps {
  isOpen: boolean;
  onCloseAction: () => void;
  submissions: any[];
  calculateOverallRatingAction: (evaluationData: any) => number;
}

export default function PerformanceTrendModal({ 
  isOpen, 
  onCloseAction, 
  submissions, 
  calculateOverallRatingAction 
}: PerformanceTrendModalProps) {
  
  const getCategoryScores = () => {
    if (submissions.length === 0) return [];

    const categoryTotals: { [key: string]: { total: number; count: number } } = {};
    
    submissions.forEach(submission => {
      if (!submission.evaluationData) return;
      
      const data = submission.evaluationData;
      
      // Job Knowledge
      const jobKnowledgeScores = [data.jobKnowledgeScore1, data.jobKnowledgeScore2, data.jobKnowledgeScore3]
        .filter(score => score && score !== '').map(score => parseFloat(score));
      if (jobKnowledgeScores.length > 0) {
        const avg = jobKnowledgeScores.reduce((sum, score) => sum + score, 0) / jobKnowledgeScores.length;
        if (!categoryTotals.jobKnowledge) categoryTotals.jobKnowledge = { total: 0, count: 0 };
        categoryTotals.jobKnowledge.total += avg;
        categoryTotals.jobKnowledge.count++;
      }

      // Quality of Work
      const qualityScores = [data.qualityOfWorkScore1, data.qualityOfWorkScore2, data.qualityOfWorkScore3, data.qualityOfWorkScore4, data.qualityOfWorkScore5]
        .filter(score => score && score !== '').map(score => parseFloat(score));
      if (qualityScores.length > 0) {
        const avg = qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;
        if (!categoryTotals.qualityOfWork) categoryTotals.qualityOfWork = { total: 0, count: 0 };
        categoryTotals.qualityOfWork.total += avg;
        categoryTotals.qualityOfWork.count++;
      }

      // Adaptability
      const adaptabilityScores = [data.adaptabilityScore1, data.adaptabilityScore2, data.adaptabilityScore3]
        .filter(score => score && score !== '').map(score => parseFloat(score));
      if (adaptabilityScores.length > 0) {
        const avg = adaptabilityScores.reduce((sum, score) => sum + score, 0) / adaptabilityScores.length;
        if (!categoryTotals.adaptability) categoryTotals.adaptability = { total: 0, count: 0 };
        categoryTotals.adaptability.total += avg;
        categoryTotals.adaptability.count++;
      }

      // Teamwork
      const teamworkScores = [data.teamworkScore1, data.teamworkScore2, data.teamworkScore3]
        .filter(score => score && score !== '').map(score => parseFloat(score));
      if (teamworkScores.length > 0) {
        const avg = teamworkScores.reduce((sum, score) => sum + score, 0) / teamworkScores.length;
        if (!categoryTotals.teamwork) categoryTotals.teamwork = { total: 0, count: 0 };
        categoryTotals.teamwork.total += avg;
        categoryTotals.teamwork.count++;
      }

      // Reliability
      const reliabilityScores = [data.reliabilityScore1, data.reliabilityScore2, data.reliabilityScore3, data.reliabilityScore4]
        .filter(score => score && score !== '').map(score => parseFloat(score));
      if (reliabilityScores.length > 0) {
        const avg = reliabilityScores.reduce((sum, score) => sum + score, 0) / reliabilityScores.length;
        if (!categoryTotals.reliability) categoryTotals.reliability = { total: 0, count: 0 };
        categoryTotals.reliability.total += avg;
        categoryTotals.reliability.count++;
      }

      // Ethical
      const ethicalScores = [data.ethicalScore1, data.ethicalScore2, data.ethicalScore3, data.ethicalScore4]
        .filter(score => score && score !== '').map(score => parseFloat(score));
      if (ethicalScores.length > 0) {
        const avg = ethicalScores.reduce((sum, score) => sum + score, 0) / ethicalScores.length;
        if (!categoryTotals.ethical) categoryTotals.ethical = { total: 0, count: 0 };
        categoryTotals.ethical.total += avg;
        categoryTotals.ethical.count++;
      }

      // Customer Service
      const customerServiceScores = [data.customerServiceScore1, data.customerServiceScore2, data.customerServiceScore3, data.customerServiceScore4, data.customerServiceScore5]
        .filter(score => score && score !== '').map(score => parseFloat(score));
      if (customerServiceScores.length > 0) {
        const avg = customerServiceScores.reduce((sum, score) => sum + score, 0) / customerServiceScores.length;
        if (!categoryTotals.customerService) categoryTotals.customerService = { total: 0, count: 0 };
        categoryTotals.customerService.total += avg;
        categoryTotals.customerService.count++;
      }
    });

    const categories = [
      { name: 'Job Knowledge', score: categoryTotals.jobKnowledge ? categoryTotals.jobKnowledge.total / categoryTotals.jobKnowledge.count : 0, icon: <Target className="w-5 h-5" /> },
      { name: 'Quality of Work', score: categoryTotals.qualityOfWork ? categoryTotals.qualityOfWork.total / categoryTotals.qualityOfWork.count : 0, icon: <Award className="w-5 h-5" /> },
      { name: 'Customer Service', score: categoryTotals.customerService ? categoryTotals.customerService.total / categoryTotals.customerService.count : 0, icon: <Heart className="w-5 h-5" /> },
      { name: 'Adaptability', score: categoryTotals.adaptability ? categoryTotals.adaptability.total / categoryTotals.adaptability.count : 0, icon: <Zap className="w-5 h-5" /> },
      { name: 'Teamwork', score: categoryTotals.teamwork ? categoryTotals.teamwork.total / categoryTotals.teamwork.count : 0, icon: <Users className="w-5 h-5" /> },
      { name: 'Reliability', score: categoryTotals.reliability ? categoryTotals.reliability.total / categoryTotals.reliability.count : 0, icon: <Shield className="w-5 h-5" /> },
      { name: 'Ethical', score: categoryTotals.ethical ? categoryTotals.ethical.total / categoryTotals.ethical.count : 0, icon: <Shield className="w-5 h-5" /> }
    ];

    return categories.filter(cat => cat.score > 0);
  };

  const getScoreColor = (score: number) => {
    if (score >= 4.5) return 'bg-green-500';
    if (score >= 4.0) return 'bg-blue-500';
    if (score >= 3.5) return 'bg-yellow-500';
    if (score >= 3.0) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getScoreTextColor = (score: number) => {
    if (score >= 4.5) return 'text-green-700';
    if (score >= 4.0) return 'text-blue-700';
    if (score >= 3.5) return 'text-yellow-700';
    if (score >= 3.0) return 'text-orange-700';
    return 'text-red-700';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 4.5) return 'Excellent';
    if (score >= 4.0) return 'Good';
    if (score >= 3.5) return 'Satisfactory';
    if (score >= 3.0) return 'Needs Improvement';
    return 'Poor';
  };

  const categories = getCategoryScores();

  return (
    <Dialog open={isOpen} onOpenChangeAction={onCloseAction}>
      <DialogContent className="max-w-2xl w-[90vw] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            📊 Performance Trend Graph
          </DialogTitle>
          <DialogDescription>
            Visual breakdown of your performance across all categories
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {categories.map((category, index) => {
            const percentage = (category.score / 5) * 100;
            const isLow = category.score < 3.5;
            
            return (
              <Card key={index} className={`${isLow ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {category.icon}
                      <span className="font-semibold">{category.name}</span>
                      {isLow && (
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full font-medium">
                          LOW
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${getScoreTextColor(category.score)}`}>
                        {category.score.toFixed(1)}/5.0
                      </div>
                      <div className="text-xs text-gray-500">
                        {getScoreLabel(category.score)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Performance Level</span>
                      <span>{Math.round(percentage)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full transition-all duration-500 ${getScoreColor(category.score)} ${
                          isLow ? 'animate-pulse' : ''
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={onCloseAction} className="bg-blue-600 hover:bg-blue-700">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}