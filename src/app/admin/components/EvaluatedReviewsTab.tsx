'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCcw } from "lucide-react";

interface Review {
  id: number;
  employeeName: string;
  evaluatorName: string;
  department: string;
  position: string;
  evaluationDate: string;
  overallScore: number;
  status: 'completed' | 'pending' | 'in_progress';
  lastUpdated: string;
  totalCriteria: number;
  completedCriteria: number;
}

interface EvaluatedReviewsTabProps {
  reviews: Review[];
  isRefreshing: boolean;
  onRefresh: () => void;
  onViewDetails?: (review: Review) => void;
}

export function EvaluatedReviewsTab({
  reviews,
  isRefreshing,
  onRefresh,
  onViewDetails
}: EvaluatedReviewsTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');

  // Filter reviews based on search and filters
  const filteredReviews = reviews.filter(review => {
    const matchesSearch = 
      review.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.evaluatorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.department.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRating = ratingFilter === 'all' || (
      (ratingFilter === 'excellent' && review.overallScore >= 90) ||
      (ratingFilter === 'good' && review.overallScore >= 80 && review.overallScore < 90) ||
      (ratingFilter === 'satisfactory' && review.overallScore >= 70 && review.overallScore < 80) ||
      (ratingFilter === 'needs-improvement' && review.overallScore < 70)
    );

    // Simplified period filter (you can enhance this)
    const matchesPeriod = periodFilter === 'all';

    return matchesSearch && matchesRating && matchesPeriod;
  });

  // Helper function to get rating badge
  const getRatingBadge = (score: number) => {
    if (score >= 90) {
      return <Badge className="bg-green-100 text-green-800">Excellent ({score})</Badge>;
    } else if (score >= 80) {
      return <Badge className="bg-blue-100 text-blue-800">Good ({score})</Badge>;
    } else if (score >= 70) {
      return <Badge className="bg-yellow-100 text-yellow-800">Satisfactory ({score})</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-800">Needs Improvement ({score})</Badge>;
    }
  };

  // Helper function to get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>;
      case 'pending':
        return <Badge className="bg-gray-100 text-gray-800">Pending</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Evaluated Reviews</CardTitle>
          <CardDescription>View and manage all completed performance evaluations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Filters and Search */}
            <div className="flex justify-between items-center">
              <div className="flex space-x-4">
                <Input
                  placeholder="Search evaluations..."
                  className="w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Select value={ratingFilter} onValueChange={setRatingFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by rating" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Ratings</SelectItem>
                    <SelectItem value="excellent">Excellent (90-100)</SelectItem>
                    <SelectItem value="good">Good (80-89)</SelectItem>
                    <SelectItem value="satisfactory">Satisfactory (70-79)</SelectItem>
                    <SelectItem value="needs-improvement">Needs Improvement (0-69)</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={periodFilter} onValueChange={setPeriodFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Periods</SelectItem>
                    <SelectItem value="2024-Q1">Q1 2024</SelectItem>
                    <SelectItem value="2024-Q2">Q2 2024</SelectItem>
                    <SelectItem value="2024-Q3">Q3 2024</SelectItem>
                    <SelectItem value="2024-Q4">Q4 2024</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  className="flex items-center bg-blue-500 text-white hover:bg-blue-700 hover:text-white gap-2"
                >
                  {isRefreshing ? (
                    <>
                      <RefreshCcw className="h-4 w-4 animate-spin" />
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <RefreshCcw className="h-4 w-4" />
                      Refresh
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Reviews Table */}
            <div className="bg-white rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Evaluator</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Evaluation Date</TableHead>
                    <TableHead>Overall Score</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReviews.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                        {searchTerm || ratingFilter !== 'all' || periodFilter !== 'all'
                          ? 'No evaluations match your filters'
                          : 'No evaluated reviews yet'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredReviews.map((review) => (
                      <TableRow key={review.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{review.employeeName}</TableCell>
                        <TableCell>{review.evaluatorName}</TableCell>
                        <TableCell>{review.department}</TableCell>
                        <TableCell>{review.position}</TableCell>
                        <TableCell>{new Date(review.evaluationDate).toLocaleDateString()}</TableCell>
                        <TableCell>{getRatingBadge(review.overallScore)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{
                                  width: `${(review.completedCriteria / review.totalCriteria) * 100}%`
                                }}
                              ></div>
                            </div>
                            <span className="text-xs text-gray-600">
                              {review.completedCriteria}/{review.totalCriteria}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(review.status)}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onViewDetails && onViewDetails(review)}
                          >
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-4 mt-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{reviews.length}</div>
                  <p className="text-sm text-gray-500">Total Reviews</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-green-600">
                    {reviews.filter(r => r.overallScore >= 90).length}
                  </div>
                  <p className="text-sm text-gray-500">Excellent</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-blue-600">
                    {reviews.filter(r => r.overallScore >= 80 && r.overallScore < 90).length}
                  </div>
                  <p className="text-sm text-gray-500">Good</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-gray-600">
                    {reviews.filter(r => r.status === 'completed').length}
                  </div>
                  <p className="text-sm text-gray-500">Completed</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

