'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ChevronDownIcon, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { EvaluationData } from './types';
import { getQuarterlyReviewStatus, getCurrentYear } from '@/lib/quarterlyReviewUtils';

interface Step1Props {
  data: EvaluationData;
  updateDataAction: (updates: Partial<EvaluationData>) => void;
  employee?: {
    id: number;
    name: string;
    email: string;
    position: string;
    department: string;
    branch?: string;
    role: string;
    hireDate?: string; // Optional - can be input in evaluation form
  };
  currentUser?: {
    id: number;
    name: string;
    email: string;
    position: string;
    department: string;
    role: string;
  };
}

// Score Dropdown Component
function ScoreDropdown({
  value,
  onValueChange,
  placeholder = "Select Score"
}: {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}) {
  const getScoreColor = (score: string) => {
    switch (score) {
      case '5': return 'text-green-700 bg-green-100';
      case '4': return 'text-blue-700 bg-blue-100';
      case '3': return 'text-yellow-700 bg-yellow-100';
      case '2': return 'text-orange-700 bg-orange-100';
      case '1': return 'text-red-700 bg-red-100';
      default: return 'text-gray-500 bg-gray-100';
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger 
        className={`w-15 px-1 py-2 text-lg font-bold border-2 border-yellow-400 rounded-md bg-yellow-100 text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm min-h-[40px] justify-between inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground ${getScoreColor(value)}`}
      >
        {value || ''}
        <ChevronDownIcon className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-32 min-w-[128px] bg-white border-2 border-yellow-400">
        <DropdownMenuItem
          onClick={() => onValueChange('1')}
          className="text-lg font-bold text-red-700 hover:bg-red-50 py-2 text-center justify-center"
        >
          1
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onValueChange('2')}
          className="text-lg font-bold text-orange-700 hover:bg-orange-50 py-2 text-center justify-center"
        >
          2
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onValueChange('3')}
          className="text-lg font-bold text-yellow-700 hover:bg-yellow-50 py-2 text-center justify-center"
        >
          3
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onValueChange('4')}
          className="text-lg font-bold text-blue-700 hover:bg-blue-50 py-2 text-center justify-center"
        >
          4
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onValueChange('5')}
          className="text-lg font-bold text-green-700 hover:bg-green-50 py-2 text-center justify-center"
        >
          5
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function Step1({ data, updateDataAction, employee, currentUser }: Step1Props) {
  const [quarterlyStatus, setQuarterlyStatus] = useState({
    q1: false,
    q2: false,
    q3: false,
    q4: false
  });
  const [isLoadingQuarters, setIsLoadingQuarters] = useState(false);
  const [coverageError, setCoverageError] = useState('');

  // Check if all Job Knowledge scores are complete
  const isJobKnowledgeComplete = () => {
    return (
      data.jobKnowledgeScore1 && data.jobKnowledgeScore1 !== '' &&
      data.jobKnowledgeScore2 && data.jobKnowledgeScore2 !== '' &&
      data.jobKnowledgeScore3 && data.jobKnowledgeScore3 !== ''
    );
  };

  // Check if any probationary review is selected (only one can be selected)
  const isProbationarySelected = () => {
    return data.reviewTypeProbationary3 || data.reviewTypeProbationary5;
  };

  // Check if any regular review is selected
  const isRegularSelected = () => {
    return data.reviewTypeRegularQ1 || data.reviewTypeRegularQ2 || 
           data.reviewTypeRegularQ3 || data.reviewTypeRegularQ4;
  };

  // Check if any "others" review is selected
  const isOthersSelected = () => {
    return data.reviewTypeOthersImprovement || 
           (data.reviewTypeOthersCustom && data.reviewTypeOthersCustom.trim() !== '') || false;
  };

  // Auto-populate employee information when employee is selected
  useEffect(() => {
    if (employee) {
      console.log('Employee data received:', employee); // Debug log
      const employeeData = {
        employeeName: employee.name,
        employeeId: employee.id.toString(),
        position: employee.position || '',
        department: employee.department || '',
        branch: employee.branch || '',
        role: employee.role || '',
        hireDate: employee.hireDate || '',
      };
      console.log('Updating evaluation data with:', employeeData); // Debug log
      updateDataAction(employeeData);
    }
  }, [employee, updateDataAction]);

  // Check for existing quarterly reviews when employee changes
  useEffect(() => {
    const checkQuarterlyReviews = async () => {
      if (employee?.id) {
        setIsLoadingQuarters(true);
        try {
          const status = await getQuarterlyReviewStatus(employee.id, getCurrentYear());
          setQuarterlyStatus(status);
        } catch (error) {
          console.error('Error checking quarterly reviews:', error);
        } finally {
          setIsLoadingQuarters(false);
        }
      } else {
        // Reset status when no employee
        setQuarterlyStatus({
          q1: false,
          q2: false,
          q3: false,
          q4: false
        });
      }
    };

    checkQuarterlyReviews();
  }, [employee?.id, employee?.name]);

  // Auto-populate supervisor information with current user
  useEffect(() => {
    if (currentUser && !data.supervisor) {
      console.log('Auto-populating supervisor with current user:', currentUser); // Debug log
      updateDataAction({ supervisor: currentUser.name });
    }
  }, [currentUser, data.supervisor, updateDataAction]);

  // Debug log to see current data state
  useEffect(() => {
    console.log('Current evaluation data in Step1:', {
      employeeName: data.employeeName,
      employeeId: data.employeeId,
      position: data.position,
      department: data.department,
      branch: data.branch,
      hireDate: data.hireDate,
    });
  }, [data.employeeName, data.employeeId, data.position, data.department, data.branch, data.hireDate]);

  // Validate coverage dates whenever they change
  useEffect(() => {
    if (data.coverageFrom && data.coverageTo) {
      const fromDate = new Date(data.coverageFrom);
      const toDate = new Date(data.coverageTo);
      
      if (fromDate >= toDate) {
        setCoverageError('Start date must be earlier than end date');
      } else {
        setCoverageError('');
      }
    } else {
      setCoverageError('');
    }
  }, [data.coverageFrom, data.coverageTo]);

  // Calculate average score for Job Knowledge
  const calculateAverageScore = () => {
    const scores = [
      data.jobKnowledgeScore1,
      data.jobKnowledgeScore2,
      data.jobKnowledgeScore3
    ].filter(score => score && score !== '').map(score => parseInt(score));

    if (scores.length === 0) return '0.00';
    return (scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(2);
  };

  const averageScore = calculateAverageScore();
  const averageScoreNumber = parseFloat(averageScore);

  const getAverageScoreColor = (score: number) => {
    if (score >= 4.5) return 'bg-green-100 text-green-800 border-green-300';
    if (score >= 3.5) return 'bg-blue-100 text-blue-800 border-blue-300';
    if (score >= 2.5) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (score >= 1.5) return 'bg-orange-100 text-orange-800 border-orange-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  const getAverageScoreLabel = (score: number) => {
    if (score >= 4.5) return 'Outstanding';
    if (score >= 3.5) return 'Exceeds Expectation';
    if (score >= 2.5) return 'Meets Expectations';
    if (score >= 1.5) return 'Needs Improvement';
    return 'Unsatisfactory';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Performance Review Form</h2>
        <h3 className="text-lg font-semibold text-gray-700 mb-6">Rank and File I & II</h3>
      </div>

      {/* Review Type Section */}
      <Card className="bg-gray-50 border-gray-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900">Review Type</h4>
            <div className="flex items-center gap-3">
              <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                ℹ️ Only one option per category can be selected
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  updateDataAction({
                    reviewTypeProbationary3: false,
                    reviewTypeProbationary5: false,
                    reviewTypeRegularQ1: false,
                    reviewTypeRegularQ2: false,
                    reviewTypeRegularQ3: false,
                    reviewTypeRegularQ4: false,
                    reviewTypeOthersImprovement: false,
                    reviewTypeOthersCustom: undefined
                  });
                }}
                className="text-xs px-3 py-1 h-7 bg-blue-500 text-white border-gray-300 hover:text-white hover:bg-red-400"
              >
                Clear All
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* For Probationary */}
            <div className="space-y-3">
              <h5 className="font-medium text-gray-800">For Probationary</h5>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input 
                    type="radio" 
                    id="prob3" 
                    name="probationaryReview"
                    className="rounded"
                    checked={data.reviewTypeProbationary3}
                    disabled={isRegularSelected() || isOthersSelected()}
                    onChange={(e) => {
                      if (e.target.checked) {
                        // Clear regular and others when selecting probationary
                        updateDataAction({
                          reviewTypeProbationary3: true,
                          reviewTypeProbationary5: false, // Clear other probationary option
                          reviewTypeRegularQ1: false,
                          reviewTypeRegularQ2: false,
                          reviewTypeRegularQ3: false,
                          reviewTypeRegularQ4: false,
                          reviewTypeOthersImprovement: false,
                          reviewTypeOthersCustom: undefined
                        });
                      }
                    }}
                  />
                  <label 
                    htmlFor="prob3" 
                    className={`text-sm ${(isRegularSelected() || isOthersSelected()) ? 'text-gray-400' : 'text-gray-700'}`}
                  >
                    3 months
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="radio" 
                    id="prob5" 
                    name="probationaryReview"
                    className="rounded"
                    checked={data.reviewTypeProbationary5}
                    disabled={isRegularSelected() || isOthersSelected()}
                    onChange={(e) => {
                      if (e.target.checked) {
                        // Clear regular and others when selecting probationary
                        updateDataAction({
                          reviewTypeProbationary3: false, // Clear other probationary option
                          reviewTypeProbationary5: true,
                          reviewTypeRegularQ1: false,
                          reviewTypeRegularQ2: false,
                          reviewTypeRegularQ3: false,
                          reviewTypeRegularQ4: false,
                          reviewTypeOthersImprovement: false,
                          reviewTypeOthersCustom: undefined
                        });
                      }
                    }}
                  />
                  <label 
                    htmlFor="prob5" 
                    className={`text-sm ${(isRegularSelected() || isOthersSelected()) ? 'text-gray-400' : 'text-gray-700'}`}
                  >
                    5 months
                  </label>
                </div>
              </div>
            </div>

            {/* For Regular */}
            <div className="space-y-3">
              <h5 className="font-medium text-gray-800">For Regular</h5>
              {isLoadingQuarters && (
                <div className="text-sm text-gray-500 italic">Checking existing reviews...</div>
              )}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input 
                    type="radio" 
                    id="q1" 
                    name="regularReview"
                    className="rounded"
                    checked={data.reviewTypeRegularQ1}
                    disabled={quarterlyStatus.q1 || isProbationarySelected() || isOthersSelected()}
                    onChange={(e) => {
                      if (e.target.checked) {
                        // Clear probationary and others when selecting regular
                        updateDataAction({
                          reviewTypeRegularQ1: true,
                          reviewTypeRegularQ2: false,
                          reviewTypeRegularQ3: false,
                          reviewTypeRegularQ4: false,
                          reviewTypeProbationary3: false,
                          reviewTypeProbationary5: false,
                          reviewTypeOthersImprovement: false,
                          reviewTypeOthersCustom: undefined
                        });
                      }
                    }}
                  />
                  <label 
                    htmlFor="q1" 
                    className={`text-sm ${quarterlyStatus.q1 ? 'text-gray-400 line-through' : 'text-gray-700'}`}
                  >
                    Q1 review
                    {quarterlyStatus.q1 && (
                      <span className="ml-2 text-xs text-red-500 font-medium">
                        (Already exists for {getCurrentYear()})
                      </span>
                    )}
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="radio" 
                    id="q2" 
                    name="regularReview"
                    className="rounded"
                    checked={data.reviewTypeRegularQ2}
                    disabled={quarterlyStatus.q2 || isProbationarySelected() || isOthersSelected()}
                    onChange={(e) => {
                      if (e.target.checked) {
                        // Clear probationary and others when selecting regular
                        updateDataAction({
                          reviewTypeRegularQ1: false,
                          reviewTypeRegularQ2: true,
                          reviewTypeRegularQ3: false,
                          reviewTypeRegularQ4: false,
                          reviewTypeProbationary3: false,
                          reviewTypeProbationary5: false,
                          reviewTypeOthersImprovement: false,
                          reviewTypeOthersCustom: undefined
                        });
                      }
                    }}
                  />
                  <label 
                    htmlFor="q2" 
                    className={`text-sm ${quarterlyStatus.q2 ? 'text-gray-400 line-through' : 'text-gray-700'}`}
                  >
                    Q2 review
                    {quarterlyStatus.q2 && (
                      <span className="ml-2 text-xs text-red-500 font-medium">
                        (Already exists for {getCurrentYear()})
                      </span>
                    )}
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="radio" 
                    id="q3" 
                    name="regularReview"
                    className="rounded"
                    checked={data.reviewTypeRegularQ3}
                    disabled={quarterlyStatus.q3 || isProbationarySelected() || isOthersSelected()}
                    onChange={(e) => {
                      if (e.target.checked) {
                        // Clear probationary and others when selecting regular
                        updateDataAction({
                          reviewTypeRegularQ1: false,
                          reviewTypeRegularQ2: false,
                          reviewTypeRegularQ3: true,
                          reviewTypeRegularQ4: false,
                          reviewTypeProbationary3: false,
                          reviewTypeProbationary5: false,
                          reviewTypeOthersImprovement: false,
                          reviewTypeOthersCustom: undefined
                        });
                      }
                    }}
                  />
                  <label 
                    htmlFor="q3" 
                    className={`text-sm ${quarterlyStatus.q3 ? 'text-gray-400 line-through' : 'text-gray-700'}`}
                  >
                    Q3 review
                    {quarterlyStatus.q3 && (
                      <span className="ml-2 text-xs text-red-500 font-medium">
                        (Already exists for {getCurrentYear()})
                      </span>
                    )}
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="radio" 
                    id="q4" 
                    name="regularReview"
                    className="rounded"
                    checked={data.reviewTypeRegularQ4}
                    disabled={quarterlyStatus.q4 || isProbationarySelected() || isOthersSelected()}
                    onChange={(e) => {
                      if (e.target.checked) {
                        // Clear probationary and others when selecting regular
                        updateDataAction({
                          reviewTypeRegularQ1: false,
                          reviewTypeRegularQ2: false,
                          reviewTypeRegularQ3: false,
                          reviewTypeRegularQ4: true,
                          reviewTypeProbationary3: false,
                          reviewTypeProbationary5: false,
                          reviewTypeOthersImprovement: false,
                          reviewTypeOthersCustom: undefined
                        });
                      }
                    }}
                  />
                  <label 
                    htmlFor="q4" 
                    className={`text-sm ${quarterlyStatus.q4 ? 'text-gray-400 line-through' : 'text-gray-700'}`}
                  >
                    Q4 review
                    {quarterlyStatus.q4 && (
                      <span className="ml-2 text-xs text-red-500 font-medium">
                        (Already exists for {getCurrentYear()})
                      </span>
                    )}
                  </label>
                </div>
              </div>
            </div>

            {/* Others */}
            <div className="space-y-3">
              <h5 className="font-medium text-gray-800">Others</h5>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="improvement" 
                    className="rounded"
                    checked={data.reviewTypeOthersImprovement}
                    disabled={isProbationarySelected() || isRegularSelected()}
                    onChange={(e) => {
                      if (e.target.checked) {
                        // Clear probationary and regular when selecting others
                        updateDataAction({
                          reviewTypeOthersImprovement: true,
                          reviewTypeProbationary3: false,
                          reviewTypeProbationary5: false,
                          reviewTypeRegularQ1: false,
                          reviewTypeRegularQ2: false,
                          reviewTypeRegularQ3: false,
                          reviewTypeRegularQ4: false,
                          reviewTypeOthersCustom: undefined
                        });
                      } else {
                        updateDataAction({ reviewTypeOthersImprovement: false });
                      }
                    }}
                  />
                  <label 
                    htmlFor="improvement" 
                    className={`text-sm ${(isProbationarySelected() || isRegularSelected()) ? 'text-gray-400' : 'text-gray-700'}`}
                  >
                    Performance Improvement
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <label 
                    className={`text-sm ${(isProbationarySelected() || isRegularSelected()) ? 'text-gray-400' : 'text-gray-700'}`}
                  >
                    Others:
                  </label>
                  <input
                    type="text"
                    value={data.reviewTypeOthersCustom || ''}
                    disabled={isProbationarySelected() || isRegularSelected()}
                    onChange={(e) => {
                      if (e.target.value.trim() !== '') {
                        // Clear probationary and regular when entering custom others
                        updateDataAction({
                          reviewTypeOthersCustom: e.target.value,
                          reviewTypeProbationary3: false,
                          reviewTypeProbationary5: false,
                          reviewTypeRegularQ1: false,
                          reviewTypeRegularQ2: false,
                          reviewTypeRegularQ3: false,
                          reviewTypeRegularQ4: false,
                          reviewTypeOthersImprovement: false
                        });
                      } else {
                        updateDataAction({ reviewTypeOthersCustom: e.target.value });
                      }
                    }}
                    className={`flex-1 px-2 py-1 text-sm border border-gray-300 rounded ${(isProbationarySelected() || isRegularSelected()) ? 'bg-gray-100 text-gray-400' : ''}`}
                    placeholder={(isProbationarySelected() || isRegularSelected()) ? 'Disabled - other review type selected' : 'Enter custom review type'}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employee Information Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="employeeName" className="text-base font-medium text-gray-900">
              Employee Name:
            </Label>
            <Input
              id="employeeName"
              value={data.employeeName || ''}
              readOnly
              className="bg-gray-100 border-gray-300 cursor-not-allowed"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="employeeId" className="text-base font-medium text-gray-900">
              Employee Number:
            </Label>
            <Input
              id="employeeId"
              value={data.employeeId || ''}
              readOnly
              className="bg-gray-100 border-gray-300 cursor-not-allowed"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="position" className="text-base font-medium text-gray-900">
              Position:
            </Label>
            <Input
              id="position"
              value={data.position || ''}
              readOnly
              className="bg-gray-100 border-gray-300 cursor-not-allowed"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="department" className="text-base font-medium text-gray-900">
              Department:
            </Label>
            <Input
              id="department"
              value={data.department || ''}
              readOnly
              className="bg-gray-100 border-gray-300 cursor-not-allowed"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="branch" className="text-base font-medium text-gray-900">
              Branch:
            </Label>
            <Input
              id="branch"
              value={data.branch || ''}
              readOnly
              className="bg-gray-100 border-gray-300 cursor-not-allowed"
            />
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hireDate" className="text-base font-medium text-gray-900">
              Date Hired:
            </Label>
            <Input
              id="hireDate"
              type="date"
              value={data.hireDate || ''}
              onChange={(e) => updateDataAction({ hireDate: e.target.value })}
              className="bg-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="supervisor" className="text-base font-medium text-gray-900">
              Immediate Supervisor:
            </Label>
            <Input
              id="supervisor"
              value={data.supervisor || ''}
              readOnly
              className="bg-gray-100 border-gray-300 cursor-not-allowed"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="coverage" className="text-base font-medium text-gray-900">
              Performance Coverage:
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {/* From Date */}
              <div className="space-y-1">
                <Label className="text-sm text-gray-600">From:</Label>
                <Popover>
                  <PopoverTrigger 
                    className={`w-full justify-start text-left font-normal bg-yellow-100 border-yellow-300 hover:bg-yellow-200 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground ${
                      data.coverageFrom ? 'text-gray-900' : 'text-muted-foreground'
                    } ${coverageError && !data.coverageFrom ? 'border-red-500' : ''}`}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {data.coverageFrom ? (
                      format(new Date(data.coverageFrom), 'MMM dd, yyyy')
                    ) : (
                      <span>Start date</span>
                    )}
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={data.coverageFrom ? new Date(data.coverageFrom) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          const fromDate = date;
                          const toDate = data.coverageTo ? new Date(data.coverageTo) : null;
                          
                          // Validate: From date should be earlier than To date
                          if (toDate && fromDate >= toDate) {
                            setCoverageError('Start date must be earlier than end date');
                            return;
                          }
                          
                          setCoverageError('');
                          updateDataAction({ coverageFrom: date.toISOString() });
                        }
                      }}
                      disabled={(date) => {
                        // Disable dates that are after the "To" date (if selected)
                        if (data.coverageTo) {
                          return date >= new Date(data.coverageTo);
                        }
                        return false;
                      }}
                      initialFocus
                      className="bg-white"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* To Date */}
              <div className="space-y-1">
                <Label className="text-sm text-gray-600">To:</Label>
                <Popover>
                  <PopoverTrigger 
                    className={`w-full justify-start text-left font-normal bg-yellow-100 border-yellow-300 hover:bg-yellow-200 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground ${
                      data.coverageTo ? 'text-gray-900' : 'text-muted-foreground'
                    } ${coverageError && !data.coverageTo ? 'border-red-500' : ''}`}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {data.coverageTo ? (
                      format(new Date(data.coverageTo), 'MMM dd, yyyy')
                    ) : (
                      <span>End date</span>
                    )}
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={data.coverageTo ? new Date(data.coverageTo) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          const toDate = date;
                          const fromDate = data.coverageFrom ? new Date(data.coverageFrom) : null;
                          
                          // Validate: To date should be later than From date
                          if (fromDate && toDate <= fromDate) {
                            setCoverageError('End date must be later than start date');
                            return;
                          }
                          
                          setCoverageError('');
                          updateDataAction({ coverageTo: date.toISOString() });
                        }
                      }}
                      disabled={(date) => {
                        // Disable dates that are before or equal to the "From" date (if selected)
                        if (data.coverageFrom) {
                          return date <= new Date(data.coverageFrom);
                        }
                        return false;
                      }}
                      initialFocus
                      className="bg-white"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            {/* Error Message */}
            {coverageError && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                <span className="text-sm text-red-800 font-medium">
                  {coverageError}
                </span>
              </div>
            )}
            
            {/* Display the selected range */}
            {data.coverageFrom && data.coverageTo && !coverageError && (
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                <span className="text-sm text-blue-800 font-medium">
                  Performance Period: {format(new Date(data.coverageFrom), 'MMM dd, yyyy')} - {format(new Date(data.coverageTo), 'MMM dd, yyyy')}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Purpose Section */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="font-bold text-gray-900 min-w-[80px]">PURPOSE</div>
            <div className="text-sm text-gray-700">
              Each employee is subject to a performance review based on actual responsibilities and behaviors exhibited.
              These are essential in the achievement of goals and for alignment with company values and policies.
              The results of this review will be the basis for changes in employment status, promotions, salary adjustments,
              and/or computations of yearly bonus (among other rewards).
              <strong>NOTE: For probationary employees, a minimum score of 55% is required for regularization.</strong>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instructions Section */}
      <Card className="bg-yellow-50 border-yellow-200">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="font-bold text-gray-900 min-w-[80px]">INSTRUCTIONS</div>
            <div className="text-sm text-gray-700">
              Only put answers in the <span className="bg-yellow-200 px-1 rounded">YELLOW HIGHLIGHTED CELLS</span>.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rating Scale Section */}
      <Card className="bg-gray-50 border-gray-200">
        <CardContent className="pt-6">
          <div className="flex gap-4 mb-4">
            <div className="font-bold text-gray-900 min-w-[80px]">RATING SCALE</div>
            <div className="text-sm text-gray-700">
              Ratings will be made on a scale of 1-5. Choose your rating from the drop down option.
              Make use of the guide below when rating each employee.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4">
            {/* Rating 1 */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <h5 className="font-bold text-red-800 text-center mb-2">1 Unsatisfactory</h5>
              <ul className="text-xs text-red-700 space-y-1">
                <li>• Performance falls below expectations: Fails to meet the minimum standards</li>
                <li>• Immediate improvement needed, Requires urgent attention</li>
                <li>• Basic aspects of the role are not met</li>
              </ul>
            </div>

            {/* Rating 2 */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <h5 className="font-bold text-orange-800 text-center mb-2">2 Needs Improvement</h5>
              <ul className="text-xs text-orange-700 space-y-1">
                <li>• Basic competence present: Meets some expectations but fails in many areas</li>
                <li>• Performance is below the desired level in certain aspects</li>
                <li>• Does not yet consistently meet performance standards</li>
              </ul>
            </div>

            {/* Rating 3 */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <h5 className="font-bold text-yellow-800 text-center mb-2">3 Meets Expectations</h5>
              <ul className="text-xs text-yellow-700 space-y-1">
                <li>• Basic competence achieved: Performance meets the expectations for the role</li>
                <li>• Adequate: Achieves the required standards and competencies</li>
                <li>• Consistently performs at an acceptable level</li>
              </ul>
            </div>

            {/* Rating 4 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h5 className="font-bold text-blue-800 text-center mb-2">4 Exceeds Expectation</h5>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• Consistently strong performance: Goes beyond the standard expectations</li>
                <li>• Highly competent: Demonstrates proficiency in role requirements</li>
                <li>• Makes positive contributions that exceed typical expectations</li>
              </ul>
            </div>

            {/* Rating 5 */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <h5 className="font-bold text-green-800 text-center mb-2">5 Outstanding</h5>
              <ul className="text-xs text-green-700 space-y-1">
                <li>• Exceptional performance: Consistently exceeds expectations</li>
                <li>• Excellent: Demonstrates outstanding skills and leadership</li>
                <li>• Significant positive impact and a positive influence on the organization</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* I. JOB KNOWLEDGE Section */}
      <Card className="bg-white border-gray-200">
        <CardContent className="pt-6">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">I. JOB KNOWLEDGE</h3>
            <p className="text-sm text-gray-600">
              Demonstrates understanding of job responsibilities. Applies knowledge to tasks and projects. Stays updated in relevant areas.
            </p>
          </div>

          {/* Job Knowledge Reset Button */}
          <div className="flex justify-end mb-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                updateDataAction({
                  jobKnowledgeScore1: '',
                  jobKnowledgeScore2: '',
                  jobKnowledgeScore3: '',
                  jobKnowledgeComments1: '',
                  jobKnowledgeComments2: '',
                  jobKnowledgeComments3: ''
                });
              }}
              className="text-xs px-3 py-1 h-7 text-gray-600 border-gray-300 hover:bg-gray-50"
            >
              Clear Job Knowledge Scores
            </Button>
          </div>

          {/* Evaluation Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-900 w-16">

                  </th>
                  <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900 w-1/4">
                    Behavioral Indicators
                  </th>
                  <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900 w-1/5">
                    Example
                  </th>
                  <th className="border border-gray-300 px-4 py-3 text-center font-bold text-gray-900 w-32 bg-yellow-200">
                    SCORE
                  </th>
                  <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-900 w-32">
                    Rating
                  </th>
                  <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900 w-1/4">
                    Comments
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Row 1: Mastery in Core Competencies */}
                <tr>
                  <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">
                    "Mastery in Core Competencies and Job Understanding
                    (L.E.A.D.E.R.)"

                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">
                    Exhibits mastery in essential skills and competencies required for the role. Displays a deep understanding of job responsibilities and requirements
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">
                    Consistently performs tasks accurately and with precision, showing a deep understanding of core job functions.
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-center">
                    <ScoreDropdown
                      value={data.jobKnowledgeScore1 || ''}
                      onValueChange={(value) => updateDataAction({ jobKnowledgeScore1: value })}
                      placeholder="-- Select --"
                    />
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-center">
                    <div className={`px-2 py-1 rounded-md text-sm font-bold ${data.jobKnowledgeScore1 === '5' ? 'bg-green-100 text-green-800' :
                      data.jobKnowledgeScore1 === '4' ? 'bg-blue-100 text-blue-800' :
                        data.jobKnowledgeScore1 === '3' ? 'bg-yellow-100 text-yellow-800' :
                          data.jobKnowledgeScore1 === '2' ? 'bg-orange-100 text-orange-800' :
                            data.jobKnowledgeScore1 === '1' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-500'
                      }`}>
                      {data.jobKnowledgeScore1 === '5' ? 'Outstanding' :
                        data.jobKnowledgeScore1 === '4' ? 'Exceeds Expectation' :
                          data.jobKnowledgeScore1 === '3' ? 'Meets Expectations' :
                            data.jobKnowledgeScore1 === '2' ? 'Needs Improvement' :
                              data.jobKnowledgeScore1 === '1' ? 'Unsatisfactory' : 'Not Rated'}
                    </div>
                  </td>
                  <td className="border border-gray-300 px-4 py-3">
                    <textarea
                      value={data.jobKnowledgeComments1 || ''}
                      onChange={(e) => updateDataAction({ jobKnowledgeComments1: e.target.value })}
                      placeholder="Enter comments about this competency..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      rows={3}
                    />
                  </td>
                </tr>

                {/* Row 2: Keeps Documentation Updated */}
                <tr>
                  <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">
                    Keeps Documentation Updated
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">
                    Maintains accurate and up-to-date documentation related to job functions
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">
                    Ensures that procedures, guidelines, and documentation are current; contributing to organizational efficiency.
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-center">
                    <ScoreDropdown
                      value={data.jobKnowledgeScore2 || ''}
                      onValueChange={(value) => updateDataAction({ jobKnowledgeScore2: value })}
                      placeholder="-- Select --"
                    />
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-center">
                    <div className={`px-2 py-1 rounded-md text-sm font-bold ${data.jobKnowledgeScore2 === '5' ? 'bg-green-100 text-green-800' :
                      data.jobKnowledgeScore2 === '4' ? 'bg-blue-100 text-blue-800' :
                        data.jobKnowledgeScore2 === '3' ? 'bg-yellow-100 text-yellow-800' :
                          data.jobKnowledgeScore2 === '2' ? 'bg-orange-100 text-orange-800' :
                            data.jobKnowledgeScore2 === '1' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-500'
                      }`}>
                      {data.jobKnowledgeScore2 === '5' ? 'Outstanding' :
                        data.jobKnowledgeScore2 === '4' ? 'Exceeds Expectation' :
                          data.jobKnowledgeScore2 === '3' ? 'Meets Expectations' :
                            data.jobKnowledgeScore2 === '2' ? 'Needs Improvement' :
                              data.jobKnowledgeScore2 === '1' ? 'Unsatisfactory' : 'Not Rated'}
                    </div>
                  </td>
                  <td className="border border-gray-300 px-4 py-3">
                    <textarea
                      value={data.jobKnowledgeComments2 || ''}
                      onChange={(e) => updateDataAction({ jobKnowledgeComments2: e.target.value })}
                      placeholder="Enter comments about this competency..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      rows={3}
                    />
                  </td>
                </tr>



                {/* Row 3: Problem Solving */}
                <tr>
                  <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">
                    Problem Solving

                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">
                    Applies critical thinking skills to solve problems efficiently
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">
                    Identifies and resolves issues in advance, effectively preventing potential disruptions.
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-center">
                    <ScoreDropdown
                      value={data.jobKnowledgeScore3 || ''}
                      onValueChange={(value) => updateDataAction({ jobKnowledgeScore3: value })}
                      placeholder="-- Select --"
                    />
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-center">
                    <div className={`px-2 py-1 rounded-md text-sm font-bold ${data.jobKnowledgeScore3 === '5' ? 'bg-green-100 text-green-800' :
                      data.jobKnowledgeScore3 === '4' ? 'bg-blue-100 text-blue-800' :
                        data.jobKnowledgeScore3 === '3' ? 'bg-yellow-100 text-yellow-800' :
                          data.jobKnowledgeScore3 === '2' ? 'bg-orange-100 text-orange-800' :
                            data.jobKnowledgeScore3 === '1' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-500'
                      }`}>
                      {data.jobKnowledgeScore3 === '5' ? 'Outstanding' :
                        data.jobKnowledgeScore3 === '4' ? 'Exceeds Expectation' :
                          data.jobKnowledgeScore3 === '3' ? 'Meets Expectations' :
                            data.jobKnowledgeScore3 === '2' ? 'Needs Improvement' :
                              data.jobKnowledgeScore3 === '1' ? 'Unsatisfactory' : 'Not Rated'}
                    </div>
                  </td>
                  <td className="border border-gray-300 px-4 py-3">
                    <textarea
                      value={data.jobKnowledgeComments3 || ''}
                      onChange={(e) => updateDataAction({ jobKnowledgeComments3: e.target.value })}
                      placeholder="Enter comments about this competency..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      rows={3}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>


      {/* Average Score Section */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="text-center">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Job Knowledge - Average Score</h3>
            <div className="flex justify-center items-center gap-6">
              <div className={`px-6 py-4 rounded-lg border-2 ${getAverageScoreColor(averageScoreNumber)}`}>
                <div className="text-3xl font-bold">{averageScore}</div>
                <div className="text-sm font-medium mt-1">{getAverageScoreLabel(averageScoreNumber)}</div>
              </div>
              <div className="text-left">
                <div className="text-sm text-gray-600 mb-2">
                  <strong>Score Breakdown:</strong>
                </div>
                <div className="space-y-1 text-sm">
                  <div>Mastery in Core Competencies: <span className="font-semibold">{data.jobKnowledgeScore1 || 'Not rated'}</span></div>
                  <div>Documentation Management: <span className="font-semibold">{data.jobKnowledgeScore2 || 'Not rated'}</span></div>
                  <div>Problem Solving Skills: <span className="font-semibold">{data.jobKnowledgeScore3 || 'Not rated'}</span></div>
                </div>
              </div>
            </div>
            <div className="mt-4 text-xs text-gray-500">
              Average calculated from {[data.jobKnowledgeScore1, data.jobKnowledgeScore2, data.jobKnowledgeScore3].filter(score => score && score !== '').length} of 3 criteria
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
