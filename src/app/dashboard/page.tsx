'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import PageTransition from '@/components/PageTransition';

// Import mock data
import mockData from '@/data/dashboard.json';

// TypeScript interfaces
interface Feedback {
  id: number;
  reviewer: string;
  role: string;
  rating: number;
  date: string;
  comment: string;
  category: string;
}

interface Goal {
  id: number;
  title: string;
  progress: number;
  status: string;
  dueDate: string;
  description: string;
}

interface PerformanceHistory {
  quarter: string;
  rating: number;
  trend: string;
  period: string;
}

interface PerformanceData {
  overallRating: number;
  totalReviews: number;
  goalsCompleted: number;
  totalGoals: number;
  performanceTrend: string;
  recentFeedback: Feedback[];
  goals: Goal[];
  metrics: Record<string, number>;
  performanceHistory: PerformanceHistory[];
}

export default function MainDashboard() {
  const [currentPeriod, setCurrentPeriod] = useState('');
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [isFeedbackDetailsOpen, setIsFeedbackDetailsOpen] = useState(false);

  useEffect(() => {
    // Simulate API call with mock data
    const loadDashboardData = async () => {
      try {
        // In a real app, this would be an API call
        // const response = await fetch('/api/dashboard');
        // const data = await response.json();

        // Using mock data for now
        setCurrentPeriod(mockData.dashboard.currentPeriod);
        setPerformanceData(mockData.dashboard.performanceData);
        setLoading(false);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return "text-green-600 bg-green-100";
    if (rating >= 4.0) return "text-blue-600 bg-blue-100";
    if (rating >= 3.5) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'not-started': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'feedback', label: 'Feedback', icon: '💬' },
    { id: 'goals', label: 'Goals', icon: '🎯' },
    { id: 'metrics', label: 'Metrics', icon: '📈' },
  ];

  const currentUser = (mockData as { employees?: Array<{ name: string; position: string; email?: string }> }).employees?.[0];

  if (loading) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (!performanceData) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600">Failed to load dashboard data</p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Retry
            </Button>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="h-screen overflow-hidden flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="flex justify-between items-center px-6 py-4">
            <div className="flex items-center space-x-3">
              <img src="/smct.png" alt="SMCT Group of Companies" className="h-8 w-auto" />
              <div className="flex flex-col">
                <h1 className="text-xl font-bold text-gray-900">Performance Dashboard</h1>
                <p className="text-sm text-gray-600">Performance & Ratings Overview</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="text-sm">
                {currentPeriod}
              </Badge>
              <Button variant="outline" size="sm" onClick={() => window.location.href = '/hr-dashboard'}>
                HR Dashboard
              </Button>
              <Button variant="outline" size="sm">
                Export Report
              </Button>
            </div>
          </div>
        </header>

        {/* Main Layout with Sidebar */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className={`relative overflow-hidden transition-all duration-400 ${isSidebarOpen ? 'w-64' : 'w-0'}`}>
            <aside className="bg-blue-600 text-blue-50  min-h-screen w-64">
              <div className={`p-6 transition-opacity duration-400 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
              <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSidebarOpen(false)}
                  className="w-full mb-4 bg-white/10 text-white hover:bg-white/20 border-white/30"
                >
                  ⬅️ Hide Menu
                </Button>
                {currentUser && (
                  <div className="mb-6 p-4 rounded-lg bg-white/10 border border-white/20">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold mr-3">
                        {(() => {
                          try {
                            const initials = (currentUser.name || '')
                              .split(' ')
                              .filter(Boolean)
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join('') || 'U';
                            return initials.toUpperCase();
                          } catch {
                            return 'U';
                          }
                        })()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-semibold truncate">{currentUser.name}</p>
                        <p className="text-blue-100 text-xs truncate">{currentUser.position}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                <h2 className="text-lg font-semibold text-white mb-6">Navigation</h2>
                <nav className="space-y-2">
                  {sidebarItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors focus:outline-none focus:ring-2 focus:ring-white/40 ${activeTab === item.id
                          ? 'bg-white/20 text-white border border-white/30'
                          : 'text-blue-100 hover:bg-white/10'
                        }`}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span className="font-medium">{item.label}</span>
                    </button>
                  ))}
                </nav>
              </div>
            </aside>
          </div>

          {!isSidebarOpen && (
            <div className="p-4">
              <Button variant="outline" size="sm" onClick={() => setIsSidebarOpen(true)}>
                Show Menu
              </Button>
            </div>
          )}

          {/* Main Content */}
          <main className="flex-1 p-8 flex flex-col overflow-hidden">
            {/* Performance Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 flex-none">
              <Card className="flex-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Overall Rating</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <span className="text-3xl font-bold text-gray-900">{performanceData.overallRating}</span>
                    <span className="text-sm text-gray-500">/ 5.0</span>
                  </div>
                  <Badge className={`mt-2 ${getRatingColor(performanceData.overallRating)}`}>
                    {performanceData.overallRating >= 4.5 ? 'Excellent' :
                      performanceData.overallRating >= 4.0 ? 'Good' :
                        performanceData.overallRating >= 3.5 ? 'Average' : 'Needs Improvement'}
                  </Badge>
                </CardContent>
              </Card>

              <Card className="flex-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Reviews Received</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">{performanceData.totalReviews}</div>
                  <p className="text-sm text-gray-500 mt-1">This quarter</p>
                </CardContent>
              </Card>

              <Card className="flex-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Goals Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">{performanceData.goalsCompleted}/{performanceData.totalGoals}</div>
                  <p className="text-sm text-gray-500 mt-1">Completed</p>
                  <Progress value={(performanceData.goalsCompleted / performanceData.totalGoals) * 100} className="mt-2" />
                </CardContent>
              </Card>

              <Card className="flex-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Performance Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">{performanceData?.performanceTrend || '+0%'}</div>
                  <p className="text-sm text-gray-500 mt-1">vs last quarter</p>
                </CardContent>
              </Card>
            </div>

            {/* Tab Content */}
            <div className="space-y-6 flex-1 overflow-hidden">
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Recent Feedback */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Feedback</CardTitle>
                      <CardDescription>Latest performance reviews and comments</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {performanceData.recentFeedback.slice(0, 2).map((feedback: Feedback) => (
                        <div key={feedback.id} className="border-l-4 border-blue-500 pl-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-medium text-gray-900">{feedback.reviewer}</p>
                              <p className="text-sm text-gray-600">{feedback.role}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium">{feedback.rating}/5</span>
                              <Badge variant="outline" className="text-xs">{feedback.category}</Badge>
                            </div>
                          </div>
                          <p className="text-sm text-gray-700 mb-2">{feedback.comment}</p>
                          <p className="text-xs text-gray-500">
                            {(() => {
                              try {
                                const date = new Date(feedback.date);
                                return isNaN(date.getTime()) ? 'Invalid date' : date.toLocaleDateString();
                              } catch (error) {
                                return 'Invalid date';
                              }
                            })()}
                          </p>
                        </div>
                      ))}
                      <Button variant="outline" className="w-full" onClick={() => setIsFeedbackModalOpen(true)}>
                        View All Feedback
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Performance Metrics */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Performance Metrics</CardTitle>
                      <CardDescription>Key performance indicators</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="max-h-[60vh] overflow-y-auto">
                        <Table className="min-w-full">
                          <TableHeader className="sticky top-0 bg-white">
                            <TableRow>
                              <TableHead className="px-6 py-3">Metric</TableHead>
                              <TableHead className="px-6 py-3 text-right">Value</TableHead>
                              <TableHead className="px-6 py-3">Progress</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {Object.entries(performanceData.metrics).map(([key, value]: [string, number]) => (
                              <TableRow key={key}>
                                <TableCell className="px-6 py-3 capitalize text-gray-700">{key}</TableCell>
                                <TableCell className="px-6 py-3 text-right font-medium">{value}%</TableCell>
                                <TableCell className="px-6 py-3">
                                  <Progress value={value} className="h-2" />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === 'feedback' && (
                <Card>
                  <CardHeader>
                    <CardTitle>All Feedback</CardTitle>
                    <CardDescription>Complete feedback history and ratings</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="max-h-[60vh] overflow-y-auto">
                      <Table className="min-w-full">
                        <TableHeader className="sticky top-0 bg-white">
                          <TableRow>
                            <TableHead className="px-6 py-3">Reviewer</TableHead>
                            <TableHead className="px-6 py-3">Role</TableHead>
                            <TableHead className="px-6 py-3">Category</TableHead>
                            <TableHead className="px-6 py-3 text-right">Rating</TableHead>
                            <TableHead className="px-6 py-3">Date</TableHead>
                            <TableHead className="px-6 py-3">Comment</TableHead>
                            <TableHead className="px-6 py-3 text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {performanceData.recentFeedback.map((feedback: Feedback) => (
                            <TableRow key={feedback.id}>
                              <TableCell className="px-6 py-3 font-medium text-gray-900">{feedback.reviewer}</TableCell>
                              <TableCell className="px-6 py-3 text-gray-600">{feedback.role}</TableCell>
                              <TableCell className="px-6 py-3">
                                <Badge className={getRatingColor(feedback.rating)}>{feedback.category}</Badge>
                              </TableCell>
                              <TableCell className="px-6 py-3 text-right font-semibold">{feedback.rating}/5</TableCell>
                              <TableCell className="px-6 py-3 text-gray-600">
                                {(() => {
                                  try {
                                    const date = new Date(feedback.date)
                                    return isNaN(date.getTime()) ? 'Invalid date' : date.toLocaleDateString()
                                  } catch (error) {
                                    return 'Invalid date'
                                  }
                                })()}
                              </TableCell>
                              <TableCell className="px-6 py-3 text-gray-700 max-w-[320px] truncate">{feedback.comment}</TableCell>
                              <TableCell className="px-6 py-3 text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedFeedback(feedback)
                                    setIsFeedbackDetailsOpen(true)
                                  }}
                                >
                                  View Details
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeTab === 'goals' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Goals & Objectives</CardTitle>
                    <CardDescription>Track your progress on assigned goals</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto px-6 py-4 pr-4">
                      {performanceData.goals.map((goal: Goal) => (
                        <div key={goal.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">{goal.title}</h4>
                              <div className="flex items-center space-x-4 mt-2">
                                <Badge className={getStatusColor(goal.status)}>
                                  {goal.status.replace('-', ' ')}
                                </Badge>
                                <span className="text-sm text-gray-500">
                                  Due: {(() => {
                                    try {
                                      const date = new Date(goal.dueDate);
                                      return isNaN(date.getTime()) ? 'Invalid date' : date.toLocaleDateString();
                                    } catch (error) {
                                      return 'Invalid date';
                                    }
                                  })()}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-gray-900">{goal.progress}%</div>
                              <div className="text-xs text-gray-500">Complete</div>
                            </div>
                          </div>
                          <Progress value={goal.progress} className="h-2" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeTab === 'metrics' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Detailed Metrics */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Performance Breakdown</CardTitle>
                      <CardDescription>Detailed view of all performance metrics</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="max-h-[60vh] overflow-y-auto">
                        <Table className="min-w-full">
                          <TableHeader className="sticky top-0 bg-white">
                            <TableRow>
                              <TableHead className="px-6 py-3">Metric</TableHead>
                              <TableHead className="px-6 py-3 text-right">Value</TableHead>
                              <TableHead className="px-6 py-3">Progress</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {Object.entries(performanceData.metrics).map(([key, value]: [string, number]) => (
                              <TableRow key={key}>
                                <TableCell className="px-6 py-3 capitalize text-gray-700">{key}</TableCell>
                                <TableCell className="px-6 py-3 text-right font-medium">{value}%</TableCell>
                                <TableCell className="px-6 py-3">
                                  <Progress value={value} className="h-2" />
                                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                                    <span>Poor</span>
                                    <span>Average</span>
                                    <span>Excellent</span>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Performance History */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Performance History</CardTitle>
                      <CardDescription>Quarterly performance trends</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="max-h-[60vh] overflow-y-auto">
                        <Table className="min-w-full">
                          <TableHeader className="sticky top-0 bg-white">
                            <TableRow>
                              <TableHead className="px-6 py-3">Quarter</TableHead>
                              <TableHead className="px-6 py-3">Period</TableHead>
                              <TableHead className="px-6 py-3 text-right">Rating</TableHead>
                              <TableHead className="px-6 py-3 text-right">Trend</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {performanceData.performanceHistory.map((item: PerformanceHistory, index: number) => (
                              <TableRow key={index}>
                                <TableCell className="px-6 py-3 font-medium text-gray-900">{item.quarter}</TableCell>
                                <TableCell className="px-6 py-3 text-gray-600">{item.period}</TableCell>
                                <TableCell className="px-6 py-3 text-right font-semibold">{item.rating}</TableCell>
                                <TableCell className="px-6 py-3 text-right text-green-600">{item.trend}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </main>
        </div>
        {/* Feedback Modal */}
        <Dialog open={isFeedbackModalOpen} onOpenChangeAction={setIsFeedbackModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>All Feedback</DialogTitle>
              <DialogDescription>Complete feedback history and ratings</DialogDescription>
            </DialogHeader>
            <div className="max-h-[70vh] overflow-y-auto px-6 py-4">
              <div className="space-y-4">
                {performanceData.recentFeedback.map((feedback: Feedback) => (
                  <div key={feedback.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900">{feedback.reviewer}</h4>
                        <p className="text-sm text-gray-600">{feedback.role}</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900">{feedback.rating}/5</div>
                          <div className="text-xs text-gray-500">Rating</div>
                        </div>
                        <Badge className={getRatingColor(feedback.rating)}>
                          {feedback.category}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-gray-700 mb-3">{feedback.comment}</p>
                    <div className="flex justify-between items-center text-sm text-gray-500">
                      <span>
                        {(() => {
                          try {
                            const date = new Date(feedback.date);
                            return isNaN(date.getTime()) ? 'Invalid date' : date.toLocaleDateString();
                          } catch (error) {
                            return 'Invalid date';
                          }
                        })()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsFeedbackModalOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Feedback Details Modal */}
        <Dialog open={isFeedbackDetailsOpen} onOpenChangeAction={setIsFeedbackDetailsOpen}>
          <DialogContent>
            {selectedFeedback && (
              <>
                <DialogHeader>
                  <DialogTitle>Feedback Details</DialogTitle>
                  <DialogDescription>Reviewer and feedback information</DialogDescription>
                </DialogHeader>
                <div className="px-6 py-4 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-base font-semibold text-gray-900">{selectedFeedback.reviewer}</p>
                      <p className="text-sm text-gray-600">{selectedFeedback.role}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">{selectedFeedback.rating}/5</div>
                        <div className="text-xs text-gray-500">Rating</div>
                      </div>
                      <Badge className={getRatingColor(selectedFeedback.rating)}>
                        {selectedFeedback.category}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {(() => {
                      try {
                        const date = new Date(selectedFeedback.date)
                        return isNaN(date.getTime()) ? 'Invalid date' : date.toLocaleDateString()
                      } catch (error) {
                        return 'Invalid date'
                      }
                    })()}
                  </div>
                  <div className="text-gray-800">{selectedFeedback.comment}</div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsFeedbackDetailsOpen(false)}>Close</Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
}
