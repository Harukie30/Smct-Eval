'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardShell, { SidebarItem } from '@/components/DashboardShell';
import { withAuth } from '@/hoc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import SearchableDropdown from "@/components/ui/searchable-dropdown";
import ViewResultsModal from '@/components/evaluation/ViewResultsModal';
import EvaluationForm from '@/components/evaluation';
import TabLoadingIndicator, { TableSkeletonLoader, PerformanceTableSkeleton } from '@/components/TabLoadingIndicator';
import { useTabLoading } from '@/hooks/useTabLoading';
import clientDataService from '@/lib/clientDataService';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { useUser } from '@/contexts/UserContext';

// Import data
import accountsData from '@/data/accounts.json';
import departmentsData from '@/data/departments.json';
// branchData now comes from clientDataService

// TypeScript interfaces
interface Employee {
  id: number;
  name: string;
  email: string;
  position: string;
  department: string;
  branch: string;
  hireDate: string;
  role: string;
}

interface Department {
  id: number;
  name: string;
  manager: string;
  employeeCount: number;
  performance: number;
}

interface Branch {
  id: number;
  name: string;
  location: string;
  manager: string;
  employeeCount: number;
  performance: number;
}

interface HRMetrics {
  totalEmployees: number;
  activeEmployees: number;
  newHires: number;
  turnoverRate: number;
  averageTenure: number;
  departmentsCount: number;
  branchesCount: number;
  genderDistribution: {
    male: number;
    female: number;
  };
  ageDistribution: {
    '18-25': number;
    '26-35': number;
    '36-45': number;
    '46+': number;
  };
  performanceDistribution: {
    excellent: number;
    good: number;
    average: number;
    needsImprovement: number;
  };
}

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

function HRDashboard() {
  const searchParams = useSearchParams();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [branches, setBranches] = useState<{id: string, name: string}[]>([]);
  const [hrMetrics, setHrMetrics] = useState<HRMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Initialize active tab from URL parameter or default to 'overview'
  const tabParam = searchParams.get('tab');
  const [active, setActive] = useState(tabParam || 'overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Employee>>({});
  const [isPerformanceModalOpen, setIsPerformanceModalOpen] = useState(false);
  const [selectedPerformanceLevel, setSelectedPerformanceLevel] = useState<string>('');
  const [recentSubmissions, setRecentSubmissions] = useState<any[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(true);
  const [isViewResultsModalOpen, setIsViewResultsModalOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [employeeViewMode, setEmployeeViewMode] = useState<'directory' | 'performance'>('directory');
  const [overviewSearchTerm, setOverviewSearchTerm] = useState('');
  const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false);
  const [employeeToEvaluate, setEmployeeToEvaluate] = useState<Employee | null>(null);

  // Evaluation Records tab filters
  const [recordsSearchTerm, setRecordsSearchTerm] = useState('');
  const [recordsDepartmentFilter, setRecordsDepartmentFilter] = useState('');
  const [recordsApprovalFilter, setRecordsApprovalFilter] = useState('');
  const [recordsQuarterFilter, setRecordsQuarterFilter] = useState('');
  const [recordsDateRange, setRecordsDateRange] = useState<{ from: string; to: string }>({ from: '', to: '' });
  const [recordsRefreshing, setRecordsRefreshing] = useState(false);
  const [recordsSort, setRecordsSort] = useState<{ field: string; direction: 'asc' | 'desc' }>({ field: 'date', direction: 'desc' });

  // Delete evaluation record modal state
  const [isDeleteRecordModalOpen, setIsDeleteRecordModalOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<any>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deletePasswordError, setDeletePasswordError] = useState('');

  // Get current user (HR)
  const { user: currentUser } = useUser();

  // Tab loading hook
  const { isTabLoading, handleTabChange: handleTabChangeWithLoading } = useTabLoading();

  // Handle tab changes with loading
  const handleTabChange = async (tabId: string) => {
    setActive(tabId);
    
    // Use the new tab loading approach
    await handleTabChangeWithLoading(tabId, async () => {
      // Auto-refresh data when switching to specific tabs
      if (tabId === 'overview') {
        setSubmissionsLoading(true);
        // Add a small delay to ensure spinner is visible
        await new Promise(resolve => setTimeout(resolve, 800));
        await fetchRecentSubmissions();
      } else if (tabId === 'evaluation-records') {
        setRecordsRefreshing(true);
        // Add a small delay to ensure spinner is visible
        await new Promise(resolve => setTimeout(resolve, 800));
        await fetchRecentSubmissions();
        setRecordsRefreshing(false);
      } else if (tabId === 'employees') {
        await refreshEmployeeData();
      }
    }, {
      showLoading: true,
      loadingDuration: 600,
      skipIfRecentlyLoaded: true
    });
  };

  // Function to refresh HR dashboard data (used by shared hook)
  const refreshHRData = async () => {
    try {
      setLoading(true);
      
      // Load data
      // Convert accounts data to employees format (filter out admin accounts)
      const employeeAccounts = (accountsData.accounts || []).filter((account: any) => account.role !== 'admin');
      const employeesList = employeeAccounts.map((account: any) => ({
        id: account.employeeId || account.id,
        name: account.name,
        email: account.email,
        position: account.position,
        department: account.department,
        branch: account.branch,
        hireDate: account.hireDate,
        role: account.role
      }));
      setEmployees(employeesList);
      setDepartments(departmentsData);
      
      // Load branches from API
      const branchesData = await clientDataService.getBranches();
      setBranches(branchesData);

      // Calculate HR metrics
      const employees = employeeAccounts;
      const metrics: HRMetrics = {
        totalEmployees: employees.length,
        activeEmployees: employees.length,
        newHires: employees.filter((emp: any) => {
          const hireDate = new Date(emp.hireDate);
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
          return hireDate > sixMonthsAgo;
        }).length,
        turnoverRate: 5.2, // Mock data
        averageTenure: 2.8, // Mock data
        departmentsCount: departmentsData.length,
        branchesCount: branches.length,
        genderDistribution: {
          male: Math.floor(employees.length * 0.55),
          female: Math.floor(employees.length * 0.45)
        },
        ageDistribution: {
          '18-25': Math.floor(employees.length * 0.15),
          '26-35': Math.floor(employees.length * 0.45),
          '36-45': Math.floor(employees.length * 0.30),
          '46+': Math.floor(employees.length * 0.10)
        },
        performanceDistribution: {
          excellent: Math.floor(employees.length * 0.25),
          good: Math.floor(employees.length * 0.40),
          average: Math.floor(employees.length * 0.25),
          needsImprovement: Math.floor(employees.length * 0.10)
        }
      };
      setHrMetrics(metrics);
      
      // Refresh recent submissions
      await fetchRecentSubmissions();
    } catch (error) {
      console.error('Error refreshing HR data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh functionality using shared hook
  const {
    showRefreshModal,
    refreshModalMessage,
    handleRefreshModalComplete,
    refreshDashboardData
  } = useAutoRefresh({
    refreshFunction: refreshHRData,
    dashboardName: 'HR Dashboard',
    customMessage: 'Welcome back! Refreshing your HR dashboard data...'
  });

  // Handle URL parameter changes for tab navigation
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && tab !== active) {
      setActive(tab);
    }
  }, [searchParams]);

  // Real-time data updates via localStorage events
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // Only refresh if the change is from another tab/window
      if (e.key === 'submissions' && e.newValue !== e.oldValue) {
        console.log('📊 Submissions data updated, refreshing HR dashboard...');
        fetchRecentSubmissions();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Fetch recent submissions from client data service
  const fetchRecentSubmissions = async () => {
    try {
      setSubmissionsLoading(true); // Set loading to true when starting fetch
      const submissions = await clientDataService.getSubmissions();
      setRecentSubmissions(submissions);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setSubmissionsLoading(false);
    }
  };


  useEffect(() => {
    const loadHRData = async () => {
      try {
        // Load data
        // Convert accounts data to employees format (filter out admin accounts)
        const employeeAccounts = (accountsData.accounts || []).filter((account: any) => account.role !== 'admin');
        const employeesList = employeeAccounts.map((account: any) => ({
          id: account.employeeId || account.id,
          name: account.name,
          email: account.email,
          position: account.position,
          department: account.department,
          branch: account.branch,
          hireDate: account.hireDate,
          role: account.role
        }));
        setEmployees(employeesList);
        setDepartments(departmentsData);
        
        // Load branches from API
        const branchesData = await clientDataService.getBranches();
        setBranches(branchesData);

        // Calculate HR metrics
        const employees = employeeAccounts;
        const metrics: HRMetrics = {
          totalEmployees: employees.length,
          activeEmployees: employees.length,
          newHires: employees.filter((emp: any) => {
            const hireDate = new Date(emp.hireDate);
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            return hireDate > sixMonthsAgo;
          }).length,
          turnoverRate: 5.2, // Mock data
          averageTenure: 2.8, // Mock data
          departmentsCount: departmentsData.length,
          branchesCount: branches.length,
          genderDistribution: {
            male: Math.floor(employees.length * 0.55),
            female: Math.floor(employees.length * 0.45)
          },
          ageDistribution: {
            '18-25': Math.floor(employees.length * 0.15),
            '26-35': Math.floor(employees.length * 0.45),
            '36-45': Math.floor(employees.length * 0.30),
            '46+': Math.floor(employees.length * 0.10)
          },
          performanceDistribution: {
            excellent: Math.floor(employees.length * 0.25),
            good: Math.floor(employees.length * 0.40),
            average: Math.floor(employees.length * 0.25),
            needsImprovement: Math.floor(employees.length * 0.10)
          }
        };

        setHrMetrics(metrics);
        setLoading(false);
      } catch (error) {
        console.error('Error loading HR data:', error);
        setLoading(false);
      }
    };

    loadHRData();
    fetchRecentSubmissions();
  }, []);


  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.position.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = selectedDepartment === 'all' || employee.department === selectedDepartment;
    const matchesBranch = selectedBranch === 'all' || employee.branch === selectedBranch;
    
    return matchesSearch && matchesDepartment && matchesBranch;
  });

  const getDepartmentStats = (deptName: string) => {
    const deptEmployees = employees.filter(emp => emp.department === deptName);
    return {
      count: deptEmployees.length,
      managers: deptEmployees.filter(emp => emp.role === 'Manager').length,
      averageTenure: 2.5 // Mock data
    };
  };

  const getBranchStats = (branchName: string) => {
    const branchEmployees = employees.filter(emp => emp.branch === branchName);
    return {
      count: branchEmployees.length,
      managers: branchEmployees.filter(emp => emp.role === 'Manager').length
    };
  };

  const handleEditEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setEditFormData({
      name: employee.name,
      email: employee.email,
      position: employee.position,
      department: employee.department,
      branch: employee.branch,
      hireDate: employee.hireDate,
      role: employee.role
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEmployee = () => {
    if (selectedEmployee && editFormData) {
      // Update the employee in the local state
      const updatedEmployees = employees.map(emp => 
        emp.id === selectedEmployee.id 
          ? { ...emp, ...editFormData }
          : emp
      );
      setEmployees(updatedEmployees);
      
      // Close modal and reset form
      setIsEditModalOpen(false);
      setEditFormData({});
      setSelectedEmployee(null);
      
      // In a real app, you would make an API call here
      console.log('Employee updated:', { id: selectedEmployee.id, ...editFormData });
    }
  };

  const handleViewPerformanceEmployees = (level: string) => {
    setSelectedPerformanceLevel(level);
    setIsPerformanceModalOpen(true);
  };

  const viewSubmissionDetails = (submission: any) => {
    setSelectedSubmission(submission);
    setIsViewResultsModalOpen(true);
  };

  const handleDeleteEmployee = (employee: Employee) => {
    setEmployeeToDelete(employee);
    setIsDeleteModalOpen(true);
  };

  const handleEvaluateEmployee = (employee: Employee) => {
    setEmployeeToEvaluate(employee);
    setIsEvaluationModalOpen(true);
  };

  const confirmDeleteEmployee = () => {
    if (employeeToDelete) {
      // Remove employee from local state
      const updatedEmployees = employees.filter(emp => emp.id !== employeeToDelete.id);
      setEmployees(updatedEmployees);
      
      // Close modal and reset state
      setIsDeleteModalOpen(false);
      setEmployeeToDelete(null);
      
      // In a real app, you would make an API call here to delete from the database
      console.log('Employee deleted:', employeeToDelete);
    }
  };

  // Helper functions for evaluation records
  const calculateScore = (scores: (string | number | undefined)[]): number => {
    const validScores = scores
      .filter((score): score is string | number => score !== undefined && score !== '')
      .map(score => typeof score === 'string' ? parseFloat(score) : score)
      .filter(score => !isNaN(score));
    
    if (validScores.length === 0) return 0;
    return validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
  };

  const getRatingLabel = (score: number): string => {
    if (score >= 4.5) return 'Outstanding';
    if (score >= 3.5) return 'Exceeds Expectations';
    if (score >= 2.5) return 'Meets Expectations';
    if (score >= 1.5) return 'Needs Improvement';
    return 'Unsatisfactory';
  };

  // Handle delete evaluation record click
  const handleDeleteRecordClick = (record: any) => {
    setRecordToDelete(record);
    setIsDeleteRecordModalOpen(true);
  };

  // Confirm delete evaluation record
  const handleConfirmDeleteRecord = async () => {
    if (!recordToDelete) return;

    // Validate password
    if (!deletePassword.trim()) {
      setDeletePasswordError('Password is required to delete records');
      return;
    }

    // Get current user data to verify password
    if (!currentUser) {
      setDeletePasswordError('User not found. Please refresh and try again.');
      return;
    }

    // Get the user's password from the accounts data
    const userAccount = (accountsData as any).accounts.find((account: any) =>
      account.email === currentUser.email || account.username === currentUser.email
    );

    if (!userAccount) {
      setDeletePasswordError('User account not found. Please refresh and try again.');
      return;
    }

    // Verify password
    if (deletePassword !== userAccount.password) {
      setDeletePasswordError('Incorrect password. Please try again.');
      return;
    }

    try {
      // Remove from localStorage
      const storedSubmissions = localStorage.getItem('submissions');
      if (storedSubmissions) {
        const submissions = JSON.parse(storedSubmissions);
        const updatedSubmissions = submissions.filter((sub: any) => sub.id !== recordToDelete.id);
        localStorage.setItem('submissions', JSON.stringify(updatedSubmissions));
      }

      // Update state
      setRecentSubmissions(prev => prev.filter(sub => sub.id !== recordToDelete.id));

      // Close modal and reset
      setIsDeleteRecordModalOpen(false);
      setRecordToDelete(null);
      setDeletePassword('');
      setDeletePasswordError('');
    } catch (error) {
      console.error('Error deleting evaluation record:', error);
      setDeletePasswordError('Failed to delete record. Please try again.');
    }
  };

  // Print evaluation record
  const printFeedback = (feedback: any) => {
    const originalSubmission = recentSubmissions.find(submission => submission.id === feedback.id);

    if (!originalSubmission || !originalSubmission.evaluationData) {
      alert('No evaluation data available for printing');
      return;
    }

    const data = originalSubmission.evaluationData;

    // Calculate scores
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

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print the evaluation');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Evaluation Report - ${data.employeeName}</title>
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
            .print-results { text-align: center; margin: 8px 0; }
            .print-percentage { font-size: 20px; font-weight: bold; }
            .print-status { display: inline-block; padding: 5px 10px; border-radius: 3px; color: white; font-weight: bold; font-size: 12px; }
            .print-status.pass { background-color: #16a34a; }
            .print-status.fail { background-color: #dc2626; }
          }
        </style>
      </head>
      <body>
        <div class="print-header">
          <div class="print-title">PERFORMANCE EVALUATION REPORT</div>
          <div class="print-subtitle">Employee Performance Evaluation</div>
        </div>

        <div class="print-section">
          <div class="print-section-title">EMPLOYEE INFORMATION</div>
          <div class="print-grid">
            <div class="print-field">
              <div class="print-label">Employee:</div>
              <div class="print-value">${data.employeeName || 'N/A'}</div>
            </div>
            <div class="print-field">
              <div class="print-label">Position:</div>
              <div class="print-value">${data.position || 'N/A'}</div>
            </div>
            <div class="print-field">
              <div class="print-label">Department:</div>
              <div class="print-value">${data.department || 'N/A'}</div>
            </div>
            <div class="print-field">
              <div class="print-label">Evaluator:</div>
              <div class="print-value">${data.supervisor || feedback.evaluator || 'N/A'}</div>
            </div>
          </div>
        </div>

        <div class="print-section">
          <div class="print-section-title">PERFORMANCE SCORES</div>
          <div class="print-grid">
            <div class="print-field">
              <div class="print-label">Job Knowledge:</div>
              <div class="print-value">${jobKnowledgeScore.toFixed(2)} (Weighted: ${jobKnowledgeWeighted})</div>
            </div>
            <div class="print-field">
              <div class="print-label">Quality of Work:</div>
              <div class="print-value">${qualityOfWorkScore.toFixed(2)} (Weighted: ${qualityOfWorkWeighted})</div>
            </div>
            <div class="print-field">
              <div class="print-label">Adaptability:</div>
              <div class="print-value">${adaptabilityScore.toFixed(2)} (Weighted: ${adaptabilityWeighted})</div>
            </div>
            <div class="print-field">
              <div class="print-label">Teamwork:</div>
              <div class="print-value">${teamworkScore.toFixed(2)} (Weighted: ${teamworkWeighted})</div>
            </div>
            <div class="print-field">
              <div class="print-label">Reliability:</div>
              <div class="print-value">${reliabilityScore.toFixed(2)} (Weighted: ${reliabilityWeighted})</div>
            </div>
            <div class="print-field">
              <div class="print-label">Ethical Conduct:</div>
              <div class="print-value">${ethicalScore.toFixed(2)} (Weighted: ${ethicalWeighted})</div>
            </div>
            <div class="print-field">
              <div class="print-label">Customer Service:</div>
              <div class="print-value">${customerServiceScore.toFixed(2)} (Weighted: ${customerServiceWeighted})</div>
            </div>
          </div>
        </div>

        <div class="print-results">
          <div class="print-percentage">${overallPercentage}%</div>
          <div class="print-status ${isPass ? 'pass' : 'fail'}">
            ${isPass ? 'PASS' : 'FAIL'}
          </div>
          <div style="margin-top: 10px;">
            <strong>Overall Score: ${overallWeightedScore} / 5.00</strong>
          </div>
          <div style="margin-top: 5px; font-size: 11px;">
            ${getRatingLabel(parseFloat(overallWeightedScore))}
          </div>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const refreshEmployeeData = async () => {
    try {
      setLoading(true);
      // Reload data from accounts.json
      const employeeAccounts = (accountsData.accounts || []).filter((account: any) => account.role !== 'admin');
      const employeesList = employeeAccounts.map((account: any) => ({
        id: account.employeeId || account.id,
        name: account.name,
        email: account.email,
        position: account.position,
        department: account.department,
        branch: account.branch,
        hireDate: account.hireDate,
        role: account.role
      }));
      setEmployees(employeesList);
      
      // Recalculate HR metrics
      const metrics: HRMetrics = {
        totalEmployees: employeesList.length,
        activeEmployees: employeesList.length,
        newHires: employeesList.filter((emp: any) => {
          const hireDate = new Date(emp.hireDate);
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
          return hireDate > sixMonthsAgo;
        }).length,
        turnoverRate: 5.2, // Mock data
        averageTenure: 2.8, // Mock data
        departmentsCount: departmentsData.length,
        branchesCount: branches.length,
        genderDistribution: {
          male: Math.floor(employeesList.length * 0.55),
          female: Math.floor(employeesList.length * 0.45)
        },
        ageDistribution: {
          '18-25': Math.floor(employeesList.length * 0.15),
          '26-35': Math.floor(employeesList.length * 0.45),
          '36-45': Math.floor(employeesList.length * 0.30),
          '46+': Math.floor(employeesList.length * 0.10)
        },
        performanceDistribution: {
          excellent: Math.floor(employeesList.length * 0.25),
          good: Math.floor(employeesList.length * 0.40),
          average: Math.floor(employeesList.length * 0.25),
          needsImprovement: Math.floor(employeesList.length * 0.10)
        }
      };
      setHrMetrics(metrics);
    } catch (error) {
      console.error('Error refreshing employee data:', error);
    } finally {
      setLoading(false);
    }
  };


  const getPerformanceEmployees = (level: string) => {
    // In a real app, you would filter employees by actual performance data
    // For now, we'll simulate by taking a subset of employees
    const count = hrMetrics?.performanceDistribution[level as keyof typeof hrMetrics.performanceDistribution] || 0;
    return employees.slice(0, Math.min(count, employees.length));
  };

  // Evaluation Records: Sort handler
  const sortRecords = (field: string) => {
    setRecordsSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Evaluation Records: Get sort icon
  const getSortIcon = (field: string) => {
    if (recordsSort.field !== field) return ' ↕️';
    return recordsSort.direction === 'asc' ? ' ↑' : ' ↓';
  };

  // Evaluation Records: Refresh handler
  const handleRecordsRefresh = async () => {
    setRecordsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    await fetchRecentSubmissions();
    setRecordsRefreshing(false);
  };

  const sidebarItems: SidebarItem[] = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'evaluation-records', label: 'Evaluation Records', icon: '🗂️' },
    { id: 'employees', label: 'Employees', icon: '👥' },
    { id: 'departments', label: 'Departments', icon: '🏢' },
    { id: 'branches', label: 'Branches', icon: '📍' },
  ];

  // Loading state is now handled in the main return statement

  // Filter and sort recent submissions - newest first
  const filteredSubmissions = recentSubmissions
    .filter((submission) => {
      if (!overviewSearchTerm) return true;
      
      const searchLower = overviewSearchTerm.toLowerCase();
      const employeeName = submission.employeeName?.toLowerCase() || '';
      const department = submission.evaluationData?.department?.toLowerCase() || '';
      const position = submission.evaluationData?.position?.toLowerCase() || '';
      const evaluator = (submission.evaluationData?.supervisor || submission.evaluator || '').toLowerCase();
      const quarter = getQuarterFromDate(submission.submittedAt).toLowerCase();
      const date = new Date(submission.submittedAt).toLocaleDateString().toLowerCase();
      const approvalStatus = submission.approvalStatus || (
        submission.employeeSignature && (submission.evaluatorSignature || submission.evaluationData?.evaluatorSignature)
          ? 'fully approved' 
          : 'pending'
      );
      const statusText = (
        approvalStatus === 'fully_approved' ? 'fully approved' :
        approvalStatus === 'rejected' ? 'rejected' :
        'pending'
      ).toLowerCase();
      
      return (
        employeeName.includes(searchLower) ||
        department.includes(searchLower) ||
        position.includes(searchLower) ||
        evaluator.includes(searchLower) ||
        quarter.includes(searchLower) ||
        date.includes(searchLower) ||
        statusText.includes(searchLower)
      );
    })
    .sort((a, b) => {
      // Sort by date descending (newest first)
      const dateA = new Date(a.submittedAt).getTime();
      const dateB = new Date(b.submittedAt).getTime();
      return dateB - dateA;
    });

  const topSummary = (
    <>
      {/* New Submissions (Last 24 hours) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">🆕 New Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-yellow-600">
            {(() => {
              const now = new Date();
              return recentSubmissions.filter(sub => {
                const hoursDiff = (now.getTime() - new Date(sub.submittedAt).getTime()) / (1000 * 60 * 60);
                return hoursDiff <= 24;
              }).length;
            })()}
          </div>
          <p className="text-sm text-gray-500 mt-1">Last 24 hours</p>
        </CardContent>
      </Card>

      {/* Pending Approvals */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">⏳ Pending Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-orange-600">
            {recentSubmissions.filter(sub => {
              const approvalStatus = sub.approvalStatus || (sub.employeeSignature && (sub.evaluatorSignature || sub.evaluationData?.evaluatorSignature) ? 'fully_approved' : 'pending');
              return approvalStatus === 'pending';
            }).length}
          </div>
          <p className="text-sm text-gray-500 mt-1">Needs review</p>
        </CardContent>
      </Card>

      {/* Approved Evaluations */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">✅ Approved</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-600">
            {recentSubmissions.filter(sub => {
              const approvalStatus = sub.approvalStatus || (sub.employeeSignature && (sub.evaluatorSignature || sub.evaluationData?.evaluatorSignature) ? 'fully_approved' : 'pending');
              return approvalStatus === 'fully_approved';
            }).length}
          </div>
          <p className="text-sm text-gray-500 mt-1">Completed reviews</p>
        </CardContent>
      </Card>
    </>
  );

  return (
    <>
      {/* Loading Screen - Shows during initial load */}
      {(loading || !hrMetrics) && (
        <div className="fixed inset-0 bg-white/90 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-lg font-medium text-gray-800">Loading HR Dashboard...</p>
          </div>
        </div>
      )}

      
      <DashboardShell
        title="HR Dashboard"
        currentPeriod={new Date().toLocaleDateString()}
        sidebarItems={sidebarItems}
        activeItemId={active}
        onChangeActive={handleTabChange}
        topSummary={topSummary}
        // profile={{ name: 'HR Manager', roleOrPosition: 'Human Resources' }}
      >
             {active === 'overview' && (
         <div className="relative space-y-6 h-[calc(100vh-300px)] overflow-y-auto pr-2">
           
           {/* Recent Activity - Evaluation Records Table */}
           <Card>
             <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Recent Evaluation Records
                {(() => {
                  const now = new Date();
                  const newCount = filteredSubmissions.filter(sub => {
                    const hoursDiff = (now.getTime() - new Date(sub.submittedAt).getTime()) / (1000 * 60 * 60);
                    return hoursDiff <= 24;
                  }).length;
                  return newCount > 0 ? (
                    <Badge className="bg-yellow-500 text-white animate-pulse">
                      {newCount} NEW
                    </Badge>
                  ) : null;
                })()}
                <Badge variant="outline" className="text-xs font-normal">
                  📅 Sorted: Newest First
                </Badge>
              </CardTitle>
             <CardDescription>Latest performance evaluations and reviews (most recent at the top)</CardDescription>
              {/* Search Bar and Refresh Button */}
              <div className="mt-4 flex items-center gap-3">
                <div className="relative flex-1 max-w-md">
                  <Input
                    placeholder="Search by employee, department, position, evaluator, or status..."
                    value={overviewSearchTerm}
                    onChange={(e) => setOverviewSearchTerm(e.target.value)}
                    className="pr-10"
                  />
                  {overviewSearchTerm && (
                    <button
                      onClick={() => setOverviewSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-600 transition-colors"
                      aria-label="Clear search"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  )}
                </div>
                {/* Refresh Button */}
                <Button
                  onClick={async () => {
                    setSubmissionsLoading(true);
                    // Add a small delay to ensure spinner is visible
                    await new Promise(resolve => setTimeout(resolve, 800));
                    await fetchRecentSubmissions();
                  }}
                  disabled={submissionsLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white"
                  title="Refresh evaluation records"
                >
                  {submissionsLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Refreshing...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span>🔄</span>
                      <span>Refresh</span>
                    </div>
                  )}
                </Button>
              </div>
              {/* Indicator Legend */}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex flex-wrap gap-4 text-xs">
                  <span className="text-sm font-medium text-gray-700 mr-2">Indicators:</span>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-yellow-100 border-l-2 border-l-yellow-500 rounded"></div>
                    <Badge className="bg-yellow-200 text-yellow-800 text-xs">New</Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-blue-50 border-l-2 border-l-blue-500 rounded"></div>
                    <Badge className="bg-blue-300 text-blue-800 text-xs">Recent</Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-50 border-l-2 border-l-green-500 rounded"></div>
                    <Badge className="bg-green-500 text-white text-xs">Approved</Badge>
                  </div>
                </div>
              </div>
             </CardHeader>
             <CardContent className="p-0">
               <div className="relative max-h-[500px] overflow-y-auto overflow-x-auto">
                 {submissionsLoading && (
                   <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                     <div className="flex flex-col items-center gap-3 bg-white/95 px-8 py-6 rounded-lg shadow-lg">
                       <div className="relative">
                         <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
                         <div className="absolute inset-0 flex items-center justify-center">
                           <img src="/smct.png" alt="SMCT Logo" className="h-10 w-10 object-contain" />
                         </div>
                       </div>
                       <p className="text-sm text-gray-600 font-medium">Loading evaluation records...</p>
                     </div>
                   </div>
                 )}
                 
                 <Table className="min-w-full">
                   <TableHeader className="sticky top-0 bg-white z-10 border-b border-gray-200">
                     <TableRow>
                       <TableHead className="px-6 py-3">Employee Name</TableHead>
                       <TableHead className="px-6 py-3">Department</TableHead>
                       <TableHead className="px-6 py-3">Position</TableHead>
                       <TableHead className="px-6 py-3">HR</TableHead>
                       <TableHead className="px-6 py-3">Quarter</TableHead>
                       <TableHead className="px-6 py-3">Date</TableHead>
                       <TableHead className="px-6 py-3">Approval Status</TableHead>
                       <TableHead className="px-6 py-3">Actions</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody className="divide-y divide-gray-200">
                     {submissionsLoading ? (
                       Array.from({ length: 8 }).map((_, index) => (
                         <TableRow key={`skeleton-${index}`}>
                           <TableCell className="px-6 py-3">
                             <div className="space-y-1">
                               <div className="h-3 w-20 bg-gray-200 rounded animate-pulse"></div>
                               <div className="h-2.5 w-24 bg-gray-200 rounded animate-pulse"></div>
                             </div>
                           </TableCell>
                           <TableCell className="px-6 py-3">
                             <div className="h-5 w-12 bg-gray-200 rounded-full animate-pulse"></div>
                           </TableCell>
                           <TableCell className="px-6 py-3">
                             <div className="h-3 w-16 bg-gray-200 rounded animate-pulse"></div>
                           </TableCell>
                           <TableCell className="px-6 py-3">
                             <div className="space-y-1">
                               <div className="h-3 w-16 bg-gray-200 rounded animate-pulse"></div>
                             </div>
                           </TableCell>
                           <TableCell className="px-6 py-3">
                             <div className="h-5 w-12 bg-gray-200 rounded-full animate-pulse"></div>
                           </TableCell>
                           <TableCell className="px-6 py-3">
                             <div className="h-3 w-16 bg-gray-200 rounded animate-pulse"></div>
                           </TableCell>
                           <TableCell className="px-6 py-3">
                             <div className="h-5 w-20 bg-gray-200 rounded-full animate-pulse"></div>
                           </TableCell>
                           <TableCell className="px-6 py-3">
                             <div className="h-6 w-16 bg-gray-200 rounded animate-pulse"></div>
                           </TableCell>
                         </TableRow>
                       ))
                    ) : filteredSubmissions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12">
                          <div className="text-gray-500">
                            {overviewSearchTerm ? (
                              <>
                                <p className="text-sm font-medium">No results found for "{overviewSearchTerm}"</p>
                                <p className="text-xs mt-1">Try adjusting your search term</p>
                              
                              </>
                            ) : (
                              <>
                                <p className="text-sm">No evaluation records to display</p>
                                <p className="text-xs mt-1">Records will appear here when evaluations are submitted</p>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSubmissions.slice(0, 10).map((submission) => {
                         const quarter = getQuarterFromDate(submission.submittedAt);
                         
                         // Check if both parties have signed (handle empty strings too)
                         const hasEmployeeSignature = !!(submission.employeeSignature && submission.employeeSignature.trim());
                         const hasEvaluatorSignature = !!((submission.evaluatorSignature && submission.evaluatorSignature.trim()) || 
                           (submission.evaluationData?.evaluatorSignature && submission.evaluationData?.evaluatorSignature.trim()));
                         
                         // Determine approval status - SIGNATURES HAVE PRIORITY over stored status
                         let approvalStatus = 'pending';
                         if (hasEmployeeSignature && hasEvaluatorSignature) {
                           approvalStatus = 'fully_approved';
                         } else if (hasEmployeeSignature) {
                           approvalStatus = 'employee_approved';
                         } else if (submission.approvalStatus && submission.approvalStatus !== 'pending') {
                           approvalStatus = submission.approvalStatus;
                         }
                         
                         // Calculate time difference for indicators
                         const submittedDate = new Date(submission.submittedAt);
                         const now = new Date();
                         const hoursDiff = (now.getTime() - submittedDate.getTime()) / (1000 * 60 * 60);
                         const isNew = hoursDiff <= 24;
                         const isRecent = hoursDiff > 24 && hoursDiff <= 168; // 7 days
                         const isApproved = approvalStatus === 'fully_approved';
                         
                         // Determine row background color - APPROVAL STATUS HAS PRIORITY
                         let rowClassName = "hover:bg-gray-100 transition-colors";
                         if (isApproved) {
                           // Approved is always green (highest priority)
                           rowClassName = "bg-green-50 hover:bg-green-100 border-l-4 border-l-green-500 transition-colors";
                         } else if (isNew) {
                           rowClassName = "bg-yellow-50 hover:bg-yellow-100 border-l-4 border-l-yellow-500 transition-colors";
                         } else if (isRecent) {
                           rowClassName = "bg-blue-50 hover:bg-blue-100 border-l-4 border-l-blue-500 transition-colors";
                         }
                         
                         return (
                           <TableRow key={submission.id} className={rowClassName}>
                             <TableCell className="px-6 py-3">
                               <div>
                                 <div className="flex items-center gap-2 mb-1">
                                   <span className="font-medium text-gray-900">{submission.employeeName}</span>
                                   {isNew && (
                                     <Badge className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 font-semibold">
                                       ⚡ NEW
                                     </Badge>
                                   )}
                                   {!isNew && isRecent && (
                                     <Badge className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 font-semibold">
                                       🕐 RECENT
                                     </Badge>
                                   )}
                                   {isApproved && (
                                     <Badge className="bg-green-100 text-green-800 text-xs px-2 py-0.5 font-semibold">
                                       ✓ APPROVED
                                     </Badge>
                                   )}
                                 </div>
                                 <div className="text-sm text-gray-500">{submission.evaluationData?.email || ''}</div>
                               </div>
                             </TableCell>
                             <TableCell className="px-6 py-3">
                               <Badge variant="outline" className="text-xs">
                                 {submission.evaluationData?.department || 'N/A'}
                               </Badge>
                             </TableCell>
                             <TableCell className="px-6 py-3 text-sm text-gray-600">
                               {submission.evaluationData?.position || 'N/A'}
                             </TableCell>
                             <TableCell className="px-6 py-3">
                               <div className="font-medium text-gray-900">
                                 {submission.evaluationData?.supervisor || submission.evaluator || 'N/A'}
                               </div>
                             </TableCell>
                             <TableCell className="px-6 py-3">
                               <Badge className={getQuarterColor(quarter)}>
                                 {quarter}
                               </Badge>
                             </TableCell>
                             <TableCell className="px-6 py-3 text-sm text-gray-600">
                               {new Date(submission.submittedAt).toLocaleDateString()}
                             </TableCell>
                             <TableCell className="px-6 py-3">
                               <Badge className={
                                 approvalStatus === 'fully_approved' ? 'bg-green-100 text-green-800' :
                                 approvalStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                                 'bg-gray-100 text-gray-800'
                               }>
                                 {approvalStatus === 'fully_approved' ? '✓ Fully Approved' :
                                  approvalStatus === 'rejected' ? '❌ Rejected' :
                                  '⏳ Pending'}
                               </Badge>
                             </TableCell>
                             <TableCell className="px-6 py-3">
                               <Button
                                 variant="outline"
                                 size="sm"
                                 onClick={() => viewSubmissionDetails(submission)}
                                 className="text-xs px-2 py-1 bg-green-600 hover:bg-green-300 text-white"
                               >
                                 ☰ View
                               </Button>
                             </TableCell>
                           </TableRow>
                         );
                       })
                     )}
                   </TableBody>
                 </Table>
               </div>
             </CardContent>
          </Card>
         </div>
       )}

      {active === 'evaluation-records' && (
        <div className="space-y-6">
          {/* Search and Filter Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                All Evaluation Records
                {(() => {
                  const now = new Date();
                  const newCount = recentSubmissions.filter(sub => {
                    const hoursDiff = (now.getTime() - new Date(sub.submittedAt).getTime()) / (1000 * 60 * 60);
                    return hoursDiff <= 24;
                  }).length;
                  return newCount > 0 ? (
                    <Badge className="bg-yellow-500 text-white animate-pulse">
                      {newCount} NEW
                    </Badge>
                  ) : null;
                })()}
                <Badge variant="outline" className="text-xs font-normal">
                  {recentSubmissions.length} Total Records
                </Badge>
              </CardTitle>
              <CardDescription>Complete evaluation history with advanced filtering</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                {/* Search */}
                <div className="flex-1">
                  <Label htmlFor="records-search" className="text-sm font-medium">Search</Label>
                  <div className="mt-1 relative">
                    <div className="relative w-full">
                      <Input
                        id="records-search"
                        placeholder="Search by employee name, evaluator, department, position..."
                        className="pr-10"
                        value={recordsSearchTerm}
                        onChange={(e) => setRecordsSearchTerm(e.target.value)}
                      />
                      {(recordsSearchTerm || recordsDepartmentFilter || recordsApprovalFilter || recordsQuarterFilter || recordsDateRange.from || recordsDateRange.to) && (
                        <button
                          onClick={() => {
                            setRecordsSearchTerm('');
                            setRecordsDepartmentFilter('');
                            setRecordsApprovalFilter('');
                            setRecordsQuarterFilter('');
                            setRecordsDateRange({ from: '', to: '' });
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-red-600 hover:text-red-700"
                          title="Clear all filters"
                        >
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Department Filter */}
                <div className="w-full md:w-48">
                  <Label htmlFor="records-department" className="text-sm font-medium">Department</Label>
                  <SearchableDropdown
                    options={['All Departments', ...departments.map((dept) => dept.name)]}
                    value={recordsDepartmentFilter || 'All Departments'}
                    onValueChangeAction={(value: string) => {
                      setRecordsDepartmentFilter(value === 'All Departments' ? '' : value);
                    }}
                    placeholder="All Departments"
                    className="mt-1"
                  />
                </div>

                {/* Approval Status Filter */}
                <div className="w-full md:w-48">
                  <Label htmlFor="records-approval-status" className="text-sm font-medium">Approval Status</Label>
                  <SearchableDropdown
                    options={['All Statuses', '⏳ Pending', '✓ Fully Approved']}
                    value={recordsApprovalFilter === '' ? 'All Statuses' : recordsApprovalFilter === 'pending' ? '⏳ Pending' : '✓ Fully Approved'}
                    onValueChangeAction={(value: string) => {
                      if (value === 'All Statuses') {
                        setRecordsApprovalFilter('');
                      } else if (value === '⏳ Pending') {
                        setRecordsApprovalFilter('pending');
                      } else {
                        setRecordsApprovalFilter('fully_approved');
                      }
                    }}
                    placeholder="All Statuses"
                    className="mt-1"
                  />
                </div>

                {/* Quarter Filter */}
                <div className="w-full md:w-48">
                  <Label htmlFor="records-quarter" className="text-sm font-medium">Quarter</Label>
                  <SearchableDropdown
                    options={['All Quarters', 'Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024', 'Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025']}
                    value={recordsQuarterFilter || 'All Quarters'}
                    onValueChangeAction={(value: string) => {
                      const quarter = value === 'All Quarters' ? '' : value;
                      setRecordsQuarterFilter(quarter);
                      if (quarter) {
                        setRecordsDateRange({ from: '', to: '' });
                      }
                    }}
                    placeholder="All Quarters"
                    className="mt-1"
                  />
                </div>

                {/* Custom Date Range */}
                <div className="w-full md:w-64">
                  <Label className="text-sm font-medium">Custom Date Range</Label>
                  <div className="mt-1 flex gap-2">
                    <Input
                      type="date"
                      placeholder="From"
                      value={recordsDateRange.from}
                      onChange={(e) => {
                        setRecordsDateRange(prev => ({ ...prev, from: e.target.value }));
                        if (e.target.value) setRecordsQuarterFilter('');
                      }}
                      className="text-sm"
                    />
                    <Input
                      type="date"
                      placeholder="To"
                      value={recordsDateRange.to}
                      onChange={(e) => {
                        setRecordsDateRange(prev => ({ ...prev, to: e.target.value }));
                        if (e.target.value) setRecordsQuarterFilter('');
                      }}
                      className="text-sm"
                    />
                  </div>
                </div>

                {/* Refresh Button */}
                <div className="w-full md:w-32">
                  <Label className="text-sm font-medium opacity-0">Refresh</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRecordsRefresh}
                    disabled={recordsRefreshing}
                    className="mt-1 w-full text-xs bg-blue-500 hover:bg-green-600 text-white hover:text-white disabled:cursor-not-allowed"
                    title="Refresh evaluation records data"
                  >
                    {recordsRefreshing ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                        Refreshing...
                      </>
                    ) : (
                      <>
                        Refresh
                        <svg className="h-3 w-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Evaluation Records Table */}
          <Card>
            <CardContent className="p-0">
              {/* Color Legend */}
              <div className="m-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex flex-wrap gap-4 text-xs">
                  <span className="font-medium text-gray-700">Status Indicators:</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-yellow-100 border-l-2 border-l-yellow-500 rounded"></div>
                    <Badge className="bg-yellow-500 text-white text-xs px-2 py-0.5">NEW</Badge>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-blue-50 border-l-2 border-l-blue-500 rounded"></div>
                    <Badge className="bg-blue-500 text-white text-xs px-2 py-0.5">Recent</Badge>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-green-50 border-l-2 border-l-green-500 rounded"></div>
                    <Badge className="bg-green-500 text-white text-xs px-2 py-0.5">Fully Approved</Badge>
                  </div>
                </div>
              </div>

              {recordsRefreshing ? (
                <div className="relative max-h-[500px] overflow-y-auto overflow-x-auto scrollable-table">
                  {/* Centered Loading Spinner with Logo */}
                  <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                    <div className="flex flex-col items-center gap-3 bg-white/95 px-8 py-6 rounded-lg shadow-lg">
                      <div className="relative">
                        {/* Spinning ring */}
                        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
                        {/* Logo in center */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <img src="/smct.png" alt="SMCT Logo" className="h-10 w-10 object-contain" />
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 font-medium">Refreshing evaluation records...</p>
                    </div>
                  </div>
                  
                  {/* Table structure visible in background */}
                <Table>
                  <TableHeader className="sticky top-0 bg-white z-10">
                    <TableRow>
                      <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => sortRecords('employeeName')}>
                        Employee{getSortIcon('employeeName')}
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => sortRecords('department')}>
                        Department{getSortIcon('department')}
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => sortRecords('evaluator')}>
                        Evaluator/HR{getSortIcon('evaluator')}
                      </TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => sortRecords('quarter')}>
                        Quarter{getSortIcon('quarter')}
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => sortRecords('date')}>
                        Date{getSortIcon('date')}
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => sortRecords('status')}>
                        Status{getSortIcon('status')}
                      </TableHead>
                      <TableHead>Employee Sign</TableHead>
                      <TableHead>Evaluator Sign</TableHead>
                      <TableHead>HR Sign</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Skeleton loading rows */}
                    {Array.from({ length: 8 }).map((_, index) => (
                      <TableRow key={`skeleton-${index}`}>
                        <TableCell className="px-6 py-3">
                          <div className="space-y-1">
                            <div className="h-3 w-24 bg-gray-200 rounded animate-pulse"></div>
                            <div className="h-2.5 w-20 bg-gray-200 rounded animate-pulse"></div>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-3">
                          <div className="h-5 w-16 bg-gray-200 rounded-full animate-pulse"></div>
                        </TableCell>
                        <TableCell className="px-6 py-3">
                          <div className="h-3 w-20 bg-gray-200 rounded animate-pulse"></div>
                        </TableCell>
                        <TableCell className="px-6 py-3">
                          <div className="h-5 w-16 bg-gray-200 rounded-full animate-pulse"></div>
                        </TableCell>
                        <TableCell className="px-6 py-3">
                          <div className="h-5 w-12 bg-gray-200 rounded-full animate-pulse"></div>
                        </TableCell>
                        <TableCell className="px-6 py-3">
                          <div className="h-3 w-16 bg-gray-200 rounded animate-pulse"></div>
                        </TableCell>
                        <TableCell className="px-6 py-3">
                          <div className="h-5 w-20 bg-gray-200 rounded-full animate-pulse"></div>
                        </TableCell>
                        <TableCell className="px-6 py-3">
                          <div className="h-5 w-16 bg-gray-200 rounded-full animate-pulse"></div>
                        </TableCell>
                        <TableCell className="px-6 py-3">
                          <div className="h-5 w-16 bg-gray-200 rounded-full animate-pulse"></div>
                        </TableCell>
                        <TableCell className="px-6 py-3">
                          <div className="h-5 w-16 bg-gray-200 rounded-full animate-pulse"></div>
                        </TableCell>
                        <TableCell className="px-6 py-3">
                          <div className="flex gap-2">
                            <div className="h-6 w-12 bg-gray-200 rounded animate-pulse"></div>
                            <div className="h-6 w-12 bg-gray-200 rounded animate-pulse"></div>
                            <div className="h-6 w-14 bg-gray-200 rounded animate-pulse"></div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              ) : (
                <div className="relative max-h-[500px] overflow-y-auto overflow-x-auto scrollable-table">
                <Table className="min-w-full">
                  <TableHeader className="sticky top-0 bg-white z-10 border-b border-gray-200">
                    <TableRow>
                      <TableHead className="px-6 py-3 cursor-pointer hover:bg-gray-50" onClick={() => sortRecords('employeeName')}>
                        Employee{getSortIcon('employeeName')}
                      </TableHead>
                      <TableHead className="px-6 py-3">Department</TableHead>
                      <TableHead className="px-6 py-3">Evaluator/HR</TableHead>
                      <TableHead className="px-6 py-3">Type</TableHead>
                      <TableHead className="px-6 py-3">Quarter</TableHead>
                      <TableHead className="px-6 py-3 cursor-pointer hover:bg-gray-50" onClick={() => sortRecords('date')}>
                        Date{getSortIcon('date')}
                      </TableHead>
                      <TableHead className="px-6 py-3">Status</TableHead>
                      <TableHead className="px-6 py-3">Employee Sign</TableHead>
                      <TableHead className="px-6 py-3">Evaluator Sign</TableHead>
                      <TableHead className="px-6 py-3">HR Sign</TableHead>
                      <TableHead className="px-6 py-3">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-gray-200">
                    {(() => {
                      // Apply all filters
                      const filtered = recentSubmissions.filter((sub) => {
                        if (recordsSearchTerm) {
                          const searchLower = recordsSearchTerm.toLowerCase();
                          const matches = 
                            sub.employeeName?.toLowerCase().includes(searchLower) ||
                            sub.evaluationData?.department?.toLowerCase().includes(searchLower) ||
                            sub.evaluationData?.position?.toLowerCase().includes(searchLower) ||
                            (sub.evaluationData?.supervisor || sub.evaluator || '').toLowerCase().includes(searchLower);
                          if (!matches) return false;
                        }
                        if (recordsDepartmentFilter && sub.evaluationData?.department !== recordsDepartmentFilter) return false;
                        if (recordsApprovalFilter) {
                          const hasEmpSig = !!(sub.employeeSignature && sub.employeeSignature.trim());
                          const hasEvalSig = !!((sub.evaluatorSignature && sub.evaluatorSignature.trim()) || 
                            (sub.evaluationData?.evaluatorSignature && sub.evaluationData?.evaluatorSignature.trim()));
                          let status = 'pending';
                          if (hasEmpSig && hasEvalSig) {
                            status = 'fully_approved';
                          } else if (hasEmpSig) {
                            status = 'employee_approved';
                          } else if (sub.approvalStatus && sub.approvalStatus !== 'pending') {
                            status = sub.approvalStatus;
                          }
                          if (status !== recordsApprovalFilter) return false;
                        }
                        if (recordsQuarterFilter && getQuarterFromDate(sub.submittedAt) !== recordsQuarterFilter) return false;
                        if (recordsDateRange.from && new Date(sub.submittedAt) < new Date(recordsDateRange.from)) return false;
                        if (recordsDateRange.to && new Date(sub.submittedAt) > new Date(recordsDateRange.to)) return false;
                        return true;
                      });

                      // Sort filtered results
                      const sorted = [...filtered].sort((a, b) => {
                        const { field, direction } = recordsSort;
                        let aVal, bVal;

                        switch (field) {
                          case 'employeeName':
                            aVal = a.employeeName?.toLowerCase() || '';
                            bVal = b.employeeName?.toLowerCase() || '';
                            break;
                          case 'date':
                            aVal = new Date(a.submittedAt).getTime();
                            bVal = new Date(b.submittedAt).getTime();
                            break;
                          default:
                            return 0;
                        }

                        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
                        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
                        return 0;
                      });

                      if (sorted.length === 0) {
                        return (
                          <TableRow>
                            <TableCell colSpan={11} className="text-center py-12 text-gray-500">
                              No evaluation records found
                            </TableCell>
                          </TableRow>
                        );
                      }

                      return sorted.map((submission) => {
                        const quarter = getQuarterFromDate(submission.submittedAt);
                        
                        // Check if both parties have signed (handle empty strings too)
                        const hasEmployeeSignature = !!(submission.employeeSignature && submission.employeeSignature.trim());
                        const hasEvaluatorSignature = !!((submission.evaluatorSignature && submission.evaluatorSignature.trim()) || 
                          (submission.evaluationData?.evaluatorSignature && submission.evaluationData?.evaluatorSignature.trim()));
                        
                        // Determine approval status - SIGNATURES HAVE PRIORITY over stored status
                        let approvalStatus = 'pending';
                        if (hasEmployeeSignature && hasEvaluatorSignature) {
                          // Both signed = fully approved (regardless of stored status)
                          approvalStatus = 'fully_approved';
                        } else if (hasEmployeeSignature) {
                          // Only employee signed
                          approvalStatus = 'employee_approved';
                        } else if (submission.approvalStatus && submission.approvalStatus !== 'pending') {
                          // No signatures detected, use stored status
                          approvalStatus = submission.approvalStatus;
                        }
                        
                        // Row highlighting logic - Approval status takes priority
                        const hoursDiff = (new Date().getTime() - new Date(submission.submittedAt).getTime()) / (1000 * 60 * 60);
                        let rowClassName = 'hover:bg-gray-50';
                        
                        // Priority 1: Fully approved evaluations are always green
                        if (approvalStatus === 'fully_approved') {
                          rowClassName = 'bg-green-50 border-l-4 border-l-green-500 hover:bg-green-100';
                        }
                        // Priority 2: New evaluations (less than 24 hours, not yet approved)
                        else if (hoursDiff <= 24) {
                          rowClassName = 'bg-yellow-100 border-l-4 border-l-yellow-500 hover:bg-yellow-200';
                        }
                        // Priority 3: Recent evaluations (24-48 hours, not yet approved)
                        else if (hoursDiff <= 48) {
                          rowClassName = 'bg-blue-50 border-l-4 border-l-blue-500 hover:bg-blue-100';
                        }

                        return (
                          <TableRow key={submission.id} className={rowClassName}>
                            <TableCell className="px-6 py-3">
                              <div>
                                <div className="font-medium text-gray-900">{submission.employeeName}</div>
                                <div className="text-sm text-gray-500">{submission.evaluationData?.position || 'N/A'}</div>
                              </div>
                            </TableCell>
                            <TableCell className="px-6 py-3">
                              <Badge variant="outline" className="text-xs">
                                {submission.evaluationData?.department || 'N/A'}
                              </Badge>
                            </TableCell>
                            <TableCell className="px-6 py-3 text-sm">
                              {submission.evaluationData?.supervisor || submission.evaluator || 'N/A'}
                            </TableCell>
                            <TableCell className="px-6 py-3">
                              {(() => {
                                // Determine if it's from Evaluator or HR by checking the evaluator's role
                                const evaluatorAccount = (accountsData as any).accounts.find((acc: any) => 
                                  acc.id === submission.evaluatorId || acc.employeeId === submission.evaluatorId
                                );
                                const isHR = evaluatorAccount?.role === 'hr';
                                return (
                                  <Badge className={isHR ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}>
                                    {isHR ? '👔 HR' : '📋 Evaluator'}
                                  </Badge>
                                );
                              })()}
                            </TableCell>
                            <TableCell className="px-6 py-3">
                              <Badge className={getQuarterColor(quarter)}>
                                {quarter}
                              </Badge>
                            </TableCell>
                            <TableCell className="px-6 py-3 text-sm text-gray-600">
                              {new Date(submission.submittedAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="px-6 py-3">
                              <Badge className={
                                approvalStatus === 'fully_approved' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'
                              }>
                                {approvalStatus === 'fully_approved' ? '✓ Approved' : '⏳ Pending'}
                              </Badge>
                            </TableCell>
                            <TableCell className="px-6 py-3">
                              {submission.employeeSignature ? (
                                <Badge className="bg-green-100 text-green-800 text-xs">✓ Signed</Badge>
                              ) : (
                                <Badge className="bg-gray-100 text-gray-600 text-xs">⏳ Pending</Badge>
                              )}
                            </TableCell>
                            <TableCell className="px-6 py-3">
                              {(() => {
                                // Check if evaluator is HR or Evaluator
                                const evaluatorAccount = (accountsData as any).accounts.find((acc: any) => 
                                  acc.id === submission.evaluatorId || acc.employeeId === submission.evaluatorId
                                );
                                const isHR = evaluatorAccount?.role === 'hr';
                                const hasSigned = submission.evaluatorSignature || submission.evaluationData?.evaluatorSignature;
                                
                                // Show signed status only if it's from an Evaluator
                                if (!isHR && hasSigned) {
                                  return <Badge className="bg-green-100 text-green-800 text-xs">✓ Signed</Badge>;
                                } else if (!isHR && !hasSigned) {
                                  return <Badge className="bg-gray-100 text-gray-600 text-xs">⏳ Pending</Badge>;
                                } else {
                                  return <span className="text-xs text-gray-400">—</span>;
                                }
                              })()}
                            </TableCell>
                            <TableCell className="px-6 py-3">
                              {(() => {
                                // Check if evaluator is HR or Evaluator
                                const evaluatorAccount = (accountsData as any).accounts.find((acc: any) => 
                                  acc.id === submission.evaluatorId || acc.employeeId === submission.evaluatorId
                                );
                                const isHR = evaluatorAccount?.role === 'hr';
                                const hasSigned = submission.evaluatorSignature || submission.evaluationData?.evaluatorSignature;
                                
                                // Show signed status only if it's from HR
                                if (isHR && hasSigned) {
                                  return <Badge className="bg-green-100 text-green-800 text-xs">✓ Signed</Badge>;
                                } else if (isHR && !hasSigned) {
                                  return <Badge className="bg-gray-100 text-gray-600 text-xs">⏳ Pending</Badge>;
                                } else {
                                  return <span className="text-xs text-gray-400">—</span>;
                                }
                              })()}
                            </TableCell>
                            <TableCell className="px-6 py-3">
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => viewSubmissionDetails(submission)}
                                  className="text-xs px-2 py-1 bg-green-600 hover:bg-green-700 text-white"
                                >
                                  ☰ View
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => printFeedback(submission)}
                                  className="text-xs px-2 py-1 bg-gray-500 hover:bg-gray-600 text-white"
                                >
                                  ⎙ Print
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteRecordClick(submission)}
                                  className="text-xs px-2 py-1 bg-red-300 hover:bg-red-500 text-gray-700 hover:text-white border-red-200"
                                  title="Delete this evaluation record"
                                >
                                  ❌ Delete
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      });
                    })()}
                  </TableBody>
                </Table>
              </div>
              )}

              {/* Results Counter */}
              {!recordsRefreshing && (
              <div className="m-4 text-center text-sm text-gray-600">
                Showing {(() => {
                  const filtered = recentSubmissions.filter((sub) => {
                    if (recordsSearchTerm) {
                      const searchLower = recordsSearchTerm.toLowerCase();
                      const matches = 
                        sub.employeeName?.toLowerCase().includes(searchLower) ||
                        sub.evaluationData?.department?.toLowerCase().includes(searchLower) ||
                        sub.evaluationData?.position?.toLowerCase().includes(searchLower) ||
                        (sub.evaluationData?.supervisor || sub.evaluator || '').toLowerCase().includes(searchLower);
                      if (!matches) return false;
                    }
                    if (recordsDepartmentFilter && sub.evaluationData?.department !== recordsDepartmentFilter) return false;
                    if (recordsApprovalFilter) {
                      const hasEmpSig = !!(sub.employeeSignature && sub.employeeSignature.trim());
                      const hasEvalSig = !!((sub.evaluatorSignature && sub.evaluatorSignature.trim()) || 
                        (sub.evaluationData?.evaluatorSignature && sub.evaluationData?.evaluatorSignature.trim()));
                      let status = 'pending';
                      if (hasEmpSig && hasEvalSig) {
                        status = 'fully_approved';
                      } else if (hasEmpSig) {
                        status = 'employee_approved';
                      } else if (sub.approvalStatus && sub.approvalStatus !== 'pending') {
                        status = sub.approvalStatus;
                      }
                      if (status !== recordsApprovalFilter) return false;
                    }
                    if (recordsQuarterFilter && getQuarterFromDate(sub.submittedAt) !== recordsQuarterFilter) return false;
                    if (recordsDateRange.from && new Date(sub.submittedAt) < new Date(recordsDateRange.from)) return false;
                    if (recordsDateRange.to && new Date(sub.submittedAt) > new Date(recordsDateRange.to)) return false;
                    return true;
                  });
                  return filtered.length;
                })()} of {recentSubmissions.length} evaluation records
              </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {active === 'employees' && (
        <div className="relative space-y-4">
          {isTabLoading('employees') ? (
            <TableSkeletonLoader rows={10} columns={6} />
          ) : (
          <>
            {/* Employee Status Cards - Separate from table */}
            {employeeViewMode === 'directory' && (
              <div className="grid grid-cols-2 gap-4">
                {/* Total Employees */}
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600">Total Employees</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{employees.length}</p>
                  </CardContent>
                </Card>

                {/* New Hires This Month */}
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600">New Hires This Month</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {(() => {
                        const now = new Date();
                        const currentMonth = now.getMonth();
                        const currentYear = now.getFullYear();
                        return employees.filter(emp => {
                          const hireDate = new Date(emp.hireDate);
                          return hireDate.getMonth() === currentMonth && hireDate.getFullYear() === currentYear;
                        }).length;
                      })()}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Main Employee Directory Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{employeeViewMode === 'directory' ? 'Employee Directory' : 'Performance Distribution'}</CardTitle>
                    <CardDescription>
                      {employeeViewMode === 'directory' ? 'Search and manage employees' : 'Employee performance overview'}
                    </CardDescription>
                  </div>
                  {/* Toggle Switch */}
                  <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                    <Button
                      variant={employeeViewMode === 'directory' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setEmployeeViewMode('directory')}
                      className={employeeViewMode === 'directory' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'hover:bg-gray-200'}
                    >
                      👥 Directory
                    </Button>
                    <Button
                      variant={employeeViewMode === 'performance' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setEmployeeViewMode('performance')}
                      className={employeeViewMode === 'performance' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'hover:bg-gray-200'}
                    >
                      📊 Performance
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Employee Directory View */}
                {employeeViewMode === 'directory' && (
                  <>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <Input
                    placeholder="Search employees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1"
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-[180px] justify-between">
                        {selectedDepartment === 'all' ? 'All Departments' : selectedDepartment || 'Department'}
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[180px]">
                      <DropdownMenuItem 
                        onClick={() => setSelectedDepartment('all')}
                        className={selectedDepartment === 'all' ? "bg-accent" : ""}
                      >
                        All Departments
                      </DropdownMenuItem>
                      {departments.map(dept => (
                        <DropdownMenuItem 
                          key={dept.id} 
                          onClick={() => setSelectedDepartment(dept.name)}
                          className={selectedDepartment === dept.name ? "bg-accent" : ""}
                        >
                          {dept.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-[180px] justify-between">
                        {selectedBranch === 'all' ? 'All Branches' : selectedBranch || 'Branch'}
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[180px]">
                      <DropdownMenuItem 
                        onClick={() => setSelectedBranch('all')}
                        className={selectedBranch === 'all' ? "bg-accent" : ""}
                      >
                        All Branches
                      </DropdownMenuItem>
                      {branches.map(branch => (
                        <DropdownMenuItem 
                          key={branch.id} 
                          onClick={() => setSelectedBranch(branch.name)}
                          className={selectedBranch === branch.name ? "bg-accent" : ""}
                        >
                          {branch.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    onClick={() => refreshDashboardData(true, false)}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white"
                    title="Refresh HR dashboard data"
                  >
                    {loading ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Refreshing...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span>🔄</span>
                        <span>Refresh</span>
                      </div>
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedEmployee(null);
                      setEditFormData({});
                      setIsEditModalOpen(true);
                    }}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white"
                    title="Add new employee"
                  >
                    <div className="flex items-center space-x-2">
                      <span>➕</span>
                      <span>Add Employee</span>
                    </div>
                  </Button>
                </div>

                {/* Employee Table */}
                <div className="max-h-[70vh] overflow-y-auto">
                  <Table className="w-full">
                    <TableHeader className="sticky top-0 bg-white">
                      <TableRow>
                        <TableHead className="w-auto">Name</TableHead>
                        <TableHead className="w-auto">Email</TableHead>
                        <TableHead className="w-auto">Position</TableHead>
                        <TableHead className="w-auto">Department</TableHead>
                        <TableHead className="w-auto">Branch</TableHead>
                        <TableHead className="w-auto">Hire Date</TableHead>
                        <TableHead className="w-auto text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEmployees.map((employee) => (
                        <TableRow key={employee.id}>
                          <TableCell className="font-medium">{employee.name}</TableCell>
                          <TableCell className="text-sm text-gray-600">{employee.email}</TableCell>
                          <TableCell>{employee.position}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{employee.department}</Badge>
                          </TableCell>
                          <TableCell>{employee.branch}</TableCell>
                          <TableCell>
                            {new Date(employee.hireDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="ghost"
                                className="text-white bg-green-600 hover:bg-green-700 hover:text-white hover:bg-green-500"
                                size="sm"
                                onClick={() => {
                                  setSelectedEmployee(employee);
                                  setIsEmployeeModalOpen(true);
                                }}
                              >
                                View
                              </Button>
                              <Button
                                variant="outline"
                                className="text-white bg-purple-600 hover:bg-purple-700 hover:text-white"
                                size="sm"
                                onClick={() => handleEvaluateEmployee(employee)}
                                title="Evaluate employee performance"
                              >
                                Evaluate
                              </Button>
                              <Button
                                variant="outline"
                                className="text-white bg-blue-600 hover:bg-blue-700 hover:text-white hover:bg-blue-400"
                                size="sm"
                                onClick={() => handleEditEmployee(employee)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                className="text-white bg-red-600 hover:bg-red-700 hover:text-white"
                                size="sm"
                                onClick={() => handleDeleteEmployee(employee)}
                              >
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}

            {/* Performance Distribution View */}
            {employeeViewMode === 'performance' && (
              <div className="max-h-[70vh] overflow-y-auto space-y-4 pr-2">
                {Object.entries(hrMetrics?.performanceDistribution || {}).map(([level, count]) => {
                  // Get employees for this performance level (mock data for now)
                  const performanceEmployees = employees.slice(0, Math.min(count, 3)); // Show first 3 employees as example
                  
                  return (
                    <div key={level} className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <span className="capitalize font-semibold text-lg">{level}</span>
                          <Badge variant="outline" className="text-xs">
                            {count} employees
                          </Badge>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-xs h-7 px-3 hover:bg-blue-100"
                          onClick={() => handleViewPerformanceEmployees(level)}
                        >
                          View All →
                        </Button>
                      </div>
                      <Progress 
                        value={(count / (hrMetrics?.totalEmployees || 1)) * 100} 
                        className="h-3"
                      />
                      {performanceEmployees.length > 0 && (
                        <div className="space-y-2 mt-3">
                          <p className="text-xs text-gray-600 font-medium">Sample employees:</p>
                          <div className="space-y-2">
                            {performanceEmployees.map((emp) => (
                              <div key={emp.id} className="flex items-center justify-between text-sm bg-white p-3 rounded border border-gray-200 hover:border-blue-300 transition-colors">
                                <div className="flex items-center space-x-3">
                                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                  <span className="font-medium">{emp.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">{emp.department}</Badge>
                                  <span className="text-gray-500 text-xs">{emp.position}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
              </CardContent>
            </Card>
          </>
          )}
        </div>
      )}

      {active === 'departments' && (
        <div className="relative h-[calc(100vh-200px)] overflow-y-auto pr-2">
          {isTabLoading('departments') ? (
            <TableSkeletonLoader rows={6} columns={4} />
          ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {departments.map((dept) => {
              const stats = getDepartmentStats(dept.name);
              return (
                <Card key={dept.id}>
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      {dept.name}
                      <Badge variant="outline">{stats.count} employees</Badge>
                    </CardTitle>
                    <CardDescription>Department Manager</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-lg font-bold text-blue-600">{stats.count}</div>
                        <div className="text-xs text-gray-600">Employees</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-lg font-bold text-green-600">{stats.managers}</div>
                        <div className="text-xs text-gray-600">Managers</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          )}
        </div>
      )}

      {active === 'branches' && (
        <div className="relative h-[calc(100vh-200px)] overflow-y-auto pr-2">
          {isTabLoading('branches') ? (
            <TableSkeletonLoader rows={4} columns={3} />
          ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {branches.map((branch) => {
            const stats = getBranchStats(branch.name);
            return (
              <Card key={branch.id}>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    {branch.name}
                    <Badge variant="outline">{stats.count} employees</Badge>
                  </CardTitle>
                  <CardDescription>Branch Location</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{stats.count}</div>
                      <div className="text-sm text-gray-600">Total Employees</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{stats.managers}</div>
                      <div className="text-sm text-gray-600">Manager</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          </div>
          )}
        </div>
      )}


      {/* Employee Details Modal */}
      <Dialog open={isEmployeeModalOpen} onOpenChangeAction={setIsEmployeeModalOpen}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
          {selectedEmployee && (
            <>
              <DialogHeader className="pb-6">
                <DialogTitle className="text-2xl font-bold text-gray-900">Employee Details</DialogTitle>
                <DialogDescription className="text-base text-gray-600 mt-2">
                  Complete employee information and profile
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Personal Information */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-blue-600 text-sm font-bold">👤</span>
                    </span>
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-gray-700">Full Name</Label>
                      <p className="text-lg text-gray-900 font-medium">{selectedEmployee.name}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-gray-700">Email Address</Label>
                      <p className="text-lg text-gray-900 font-medium">{selectedEmployee.email}</p>
                    </div>
                  </div>
                </div>

                {/* Job Information */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-green-600 text-sm font-bold">💼</span>
                    </span>
                    Job Information
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-gray-700">Position</Label>
                      <p className="text-lg text-gray-900 font-medium">{selectedEmployee.position}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-gray-700">Role</Label>
                      <Badge variant="secondary" className="text-base px-3 py-1">
                        {selectedEmployee.role}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Organization Information */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-purple-600 text-sm font-bold">🏢</span>
                    </span>
                    Organization
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-gray-700">Department</Label>
                      <Badge variant="outline" className="text-base px-3 py-1">
                        {selectedEmployee.department}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-gray-700">Branch</Label>
                      <p className="text-lg text-gray-900 font-medium">{selectedEmployee.branch}</p>
                    </div>
                  </div>
                </div>

                {/* Employment Details */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-orange-600 text-sm font-bold">📅</span>
                    </span>
                    Employment Details
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-gray-700">Hire Date</Label>
                      <p className="text-lg text-gray-900 font-medium">
                        {new Date(selectedEmployee.hireDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-gray-700">Employee ID</Label>
                      <p className="text-lg text-gray-900 font-medium">#{selectedEmployee.id}</p>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-4 border-t border-gray-200 mt-4">
                <div className="flex justify-end space-x-4 w-full">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsEmployeeModalOpen(false)}
                    className="px-8 py-3 text-white font-medium bg-blue-600 hover:bg-blue-700 hover:text-black hover:bg-yellow-500"
                  >
                    Close
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Employee Modal */}
      <Dialog open={isEditModalOpen} onOpenChangeAction={setIsEditModalOpen}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
          <DialogHeader className="pb-6">
            <DialogTitle className="text-2xl font-bold text-gray-900">
              {selectedEmployee ? 'Edit Employee' : 'Add New Employee'}
            </DialogTitle>
            <DialogDescription className="text-base text-gray-600 mt-2">
              {selectedEmployee 
                ? 'Update employee information and details. All fields marked with * are required.'
                : 'Enter new employee information and details. All fields marked with * are required.'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-8">
            {/* Personal Information */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <span className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-blue-600 text-sm font-bold">1</span>
                </span>
                Personal Information
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="name" className="text-sm font-semibold text-gray-700 flex items-center">
                    Full Name <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={editFormData.name || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    placeholder="Enter employee's full name"
                    className="w-full h-11 text-base"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="email" className="text-sm font-semibold text-gray-700 flex items-center">
                    Email Address <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={editFormData.email || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    placeholder="Enter email address"
                    className="w-full h-11 text-base"
                  />
                </div>
              </div>
            </div>

            {/* Job Information */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <span className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-green-600 text-sm font-bold">2</span>
                </span>
                Job Information
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="position" className="text-sm font-semibold text-gray-700 flex items-center">
                    Position <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    id="position"
                    value={editFormData.position || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, position: e.target.value })}
                    placeholder="Enter job position"
                    className="w-full h-11 text-base"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="role" className="text-sm font-semibold text-gray-700 flex items-center">
                    Role <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Select 
                    value={editFormData.role || ''} 
                    onValueChange={(value) => setEditFormData({ ...editFormData, role: value })}
                  >
                    <SelectTrigger className="w-full h-11 text-base">
                      <SelectValue placeholder="Select employee role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Manager">Manager</SelectItem>
                      <SelectItem value="Software Developer">Software Developer</SelectItem>
                      <SelectItem value="Product Manager">Product Manager</SelectItem>
                      <SelectItem value="UX Designer">UX Designer</SelectItem>
                      <SelectItem value="Sales Representative">Sales Representative</SelectItem>
                      <SelectItem value="Customer Support">Customer Support</SelectItem>
                      <SelectItem value="HR Specialist">HR Specialist</SelectItem>
                      <SelectItem value="Finance Analyst">Finance Analyst</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Organization Information */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <span className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-purple-600 text-sm font-bold">3</span>
                </span>
                Organization
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="department" className="text-sm font-semibold text-gray-700 flex items-center">
                    Department <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Select 
                    value={editFormData.department || ''} 
                    onValueChange={(value) => setEditFormData({ ...editFormData, department: value })}
                  >
                    <SelectTrigger className="w-full h-11 text-base">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map(dept => (
                        <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label htmlFor="branch" className="text-sm font-semibold text-gray-700 flex items-center">
                    Branch <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Select 
                    value={editFormData.branch || ''} 
                    onValueChange={(value) => setEditFormData({ ...editFormData, branch: value })}
                  >
                    <SelectTrigger className="w-full h-11 text-base">
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map(branch => (
                        <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Employment Details */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <span className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-orange-600 text-sm font-bold">4</span>
                </span>
                Employment Details
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="hireDate" className="text-sm font-semibold text-gray-700 flex items-center">
                    Hire Date <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    id="hireDate"
                    type="date"
                    value={editFormData.hireDate || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, hireDate: e.target.value })}
                    className="w-full h-11 text-base"
                  />
                </div>
                {selectedEmployee && (
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-gray-500">
                      Employee ID
                    </Label>
                    <Input
                      value={selectedEmployee?.id || ''}
                      disabled
                      className="w-full h-11 text-base bg-gray-100 border-gray-200"
                      placeholder="Auto-generated"
                    />
                    <p className="text-xs text-gray-500 mt-1">This field cannot be modified</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-gray-200 mt-4">
            <div className="flex justify-end space-x-4 w-full">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditFormData({});
                  setSelectedEmployee(null);
                }}
                className="px-8 py-3 text-base font-medium"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveEmployee}
                className="px-8 py-3 text-base font-medium bg-blue-600 hover:bg-blue-700"
              >
                {selectedEmployee ? 'Save Changes' : 'Add Employee'}
              </Button>
            </div>
                     </DialogFooter>
         </DialogContent>
       </Dialog>

       {/* Performance Employees Modal */}
       <Dialog open={isPerformanceModalOpen} onOpenChangeAction={setIsPerformanceModalOpen}>
         <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
           <DialogHeader className="pb-6">
             <DialogTitle className="text-2xl font-bold text-gray-900">
               {selectedPerformanceLevel.charAt(0).toUpperCase() + selectedPerformanceLevel.slice(1)} Performers
             </DialogTitle>
             <DialogDescription className="text-base text-gray-600 mt-2">
               Employees with {selectedPerformanceLevel} performance rating
             </DialogDescription>
           </DialogHeader>
           
           <div className="space-y-4">
             {getPerformanceEmployees(selectedPerformanceLevel).map((employee) => (
               <div key={employee.id} className="bg-gray-50 rounded-lg p-4">
                 <div className="flex items-center justify-between">
                   <div className="flex items-center space-x-4">
                     <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                       <span className="text-blue-600 font-semibold text-sm">
                         {employee.name.split(' ').map(n => n[0]).join('')}
                       </span>
                     </div>
                     <div>
                       <h4 className="font-semibold text-gray-900">{employee.name}</h4>
                       <p className="text-sm text-gray-600">{employee.position}</p>
                     </div>
                   </div>
                   <div className="text-right">
                     <Badge variant="outline" className="mb-1">{employee.department}</Badge>
                     <p className="text-xs text-gray-500">{employee.branch}</p>
                   </div>
                 </div>
                 <div className="mt-3 flex items-center justify-between text-sm">
                   <span className="text-gray-600">Employee ID: #{employee.id}</span>
                   <span className="text-gray-600">
                     Hired: {new Date(employee.hireDate).toLocaleDateString()}
                   </span>
                 </div>
               </div>
             ))}
           </div>

           <DialogFooter className="pt-3 border-t border-gray-200 mt-3">
             <div className="flex justify-end space-x-4 w-full">
               <Button 
                 variant="outline" 
                 onClick={() => setIsPerformanceModalOpen(false)}
                 className="px-6 py-2"
               >
                 Close
               </Button>
             </div>
           </DialogFooter>
         </DialogContent>
               </Dialog>

        {/* View Results Modal */}
        <ViewResultsModal
          isOpen={isViewResultsModalOpen}
          onCloseAction={() => setIsViewResultsModalOpen(false)}
          submission={selectedSubmission}
        />

        {/* Delete Employee Confirmation Modal */}
        <AlertDialog
          open={isDeleteModalOpen}
          onOpenChangeAction={setIsDeleteModalOpen}
          title="Delete Employee"
          description={
            employeeToDelete 
              ? `Are you sure you want to delete ${employeeToDelete.name} (${employeeToDelete.position})? This action cannot be undone.`
              : "Are you sure you want to delete this employee? This action cannot be undone."
          }
          type="error"
          confirmText="Delete Employee"
          cancelText="Cancel "
          showCancel={true}
          onConfirm={confirmDeleteEmployee}
          onCancel={() => {
            setEmployeeToDelete(null);
          }}
        />

        {/* Employee Evaluation Modal */}
        {isEvaluationModalOpen && employeeToEvaluate && currentUser && (
          <Dialog open={isEvaluationModalOpen} onOpenChangeAction={setIsEvaluationModalOpen}>
            <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden p-0">
              <EvaluationForm
                employee={{
                  id: employeeToEvaluate.id,
                  name: employeeToEvaluate.name,
                  email: employeeToEvaluate.email,
                  position: employeeToEvaluate.position,
                  department: employeeToEvaluate.department,
                  branch: employeeToEvaluate.branch,
                  role: employeeToEvaluate.role,
                  hireDate: employeeToEvaluate.hireDate,
                }}
                currentUser={{
                  id: currentUser.id,
                  name: currentUser.name,
                  email: currentUser.email,
                  position: currentUser.position || 'HR Manager',
                  department: currentUser.department || 'Human Resources',
                  role: currentUser.role,
                  signature: currentUser.signature,
                }}
                onCloseAction={async () => {
                  setIsEvaluationModalOpen(false);
                  setEmployeeToEvaluate(null);
                  // Small delay to ensure data is saved before refreshing
                  await new Promise(resolve => setTimeout(resolve, 500));
                  // Refresh submissions to show new evaluation
                  await fetchRecentSubmissions();
                }}
                onCancelAction={() => {
                  setIsEvaluationModalOpen(false);
                  setEmployeeToEvaluate(null);
                }}
              />
            </DialogContent>
          </Dialog>
        )}

        {/* Delete Evaluation Record Confirmation Modal */}
        <Dialog open={isDeleteRecordModalOpen} onOpenChangeAction={setIsDeleteRecordModalOpen}>
          <DialogContent className="sm:max-w-md">
            <div className="space-y-6 p-2">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4 animate-pulse">
                  <svg className="h-6 w-6 text-red-600 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900">Delete Evaluation Record</h3>
                <p className="text-sm text-gray-500 mt-2">
                  Are you sure you want to delete the evaluation record for <strong>{recordToDelete?.employeeName}</strong>?
                  This action cannot be undone and all data will be permanently removed.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="delete-password" className="text-sm font-medium text-gray-700">
                    Enter your account password to confirm deletion:
                  </Label>
                  <Input
                    id="delete-password"
                    type="password"
                    value={deletePassword}
                    onChange={(e) => {
                      setDeletePassword(e.target.value);
                      setDeletePasswordError('');
                    }}
                    placeholder="Enter your account password"
                    className={`mt-2 ${deletePasswordError ? 'border-red-500 bg-gray-50 focus:border-red-500 focus:ring-red-500' : 'bg-white'}`}
                  />
                  {deletePasswordError && (
                    <p className="text-sm text-red-600 mt-2">{deletePasswordError}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDeleteRecordModalOpen(false);
                    setRecordToDelete(null);
                    setDeletePassword('');
                    setDeletePasswordError('');
                  }}
                  className="px-4 py-2"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmDeleteRecord}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white"
                >
                  Delete Record
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DashboardShell>
    </>
  );
}

// Wrap with HOC for authentication
export default withAuth(HRDashboard, { requiredRole: 'hr' });
