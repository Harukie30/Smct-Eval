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
import ViewResultsModal from '@/components/evaluation/ViewResultsModal';
import TabLoadingIndicator, { TableSkeletonLoader, PerformanceTableSkeleton } from '@/components/TabLoadingIndicator';
import { useTabLoading } from '@/hooks/useTabLoading';
import clientDataService from '@/lib/clientDataService';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';

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

  // Tab loading hook
  const { isTabLoading, handleTabChange: handleTabChangeWithLoading } = useTabLoading();

  // Handle tab changes with loading
  const handleTabChange = async (tabId: string) => {
    setActive(tabId);
    
    // Use the new tab loading approach
    await handleTabChangeWithLoading(tabId, async () => {
      // Auto-refresh data when switching to specific tabs
      if (tabId === 'overview') {
        await fetchRecentSubmissions();
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

  const sidebarItems: SidebarItem[] = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'employees', label: 'Employees', icon: '👥' },
    { id: 'departments', label: 'Departments', icon: '🏢' },
    { id: 'branches', label: 'Branches', icon: '📍' },
    { id: 'analytics', label: 'Analytics', icon: '📈' },
  ];

  // Loading state is now handled in the main return statement

  const topSummary = (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Total Employees</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-gray-900">{hrMetrics?.totalEmployees || 0}</div>
          <p className="text-sm text-gray-500 mt-1">Active workforce</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">New Hires</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-600">{hrMetrics?.newHires || 0}</div>
          <p className="text-sm text-gray-500 mt-1">Last 6 months</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Recent Evaluations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-purple-600">{recentSubmissions.length}</div>
          <p className="text-sm text-gray-500 mt-1">Submitted this period</p>
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
        profile={{ name: 'HR Manager', roleOrPosition: 'Human Resources' }}
      >
             {active === 'overview' && (
         <div className="relative space-y-6 h-[calc(100vh-300px)] overflow-y-auto pr-2">
           <TabLoadingIndicator 
             isLoading={isTabLoading('overview')} 
             message="Loading overview data..." 
             position="top"
           />
           {/* Recent Activity Table */}
           <Card>
             <CardHeader>
               <CardTitle>Recent Activity</CardTitle>
               <CardDescription>Latest HR activities and updates</CardDescription>
             </CardHeader>
             <CardContent>
               <div className="max-h-[400px] overflow-y-auto">
                 <Table>
                   <TableHeader className="sticky top-0 bg-white">
                     <TableRow>
                       <TableHead>Activity</TableHead>
                       <TableHead>Employee</TableHead>
                       <TableHead>Department</TableHead>
                       <TableHead>Type</TableHead>
                       <TableHead>Date</TableHead>
                       <TableHead>Status</TableHead>
                       <TableHead>Actions</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {submissionsLoading ? (
                       <TableRow>
                         <TableCell colSpan={7} className="text-center py-8">
                           <div className="text-gray-500">
                             <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                             <p className="text-sm">Loading recent activities...</p>
                           </div>
                         </TableCell>
                       </TableRow>
                     ) : recentSubmissions.length === 0 ? (
                       <TableRow>
                         <TableCell colSpan={7} className="text-center py-8">
                           <div className="text-gray-500">
                             <p className="text-sm">No recent activities to display</p>
                             <p className="text-xs mt-1">Activity feed will appear here when data is available</p>
                           </div>
                         </TableCell>
                       </TableRow>
                     ) : (
                       recentSubmissions.slice(0, 10).map((submission) => (
                         <TableRow key={submission.id} className="hover:bg-gray-50">
                           <TableCell className="py-3">
                             <div className="flex items-center space-x-2">
                               <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                               <span className="text-sm font-medium">Performance Review Submitted</span>
                             </div>
                           </TableCell>
                           <TableCell className="py-3">
                             <div>
                               <div className="font-medium text-gray-900">{submission.employeeName}</div>
                               <div className="text-xs text-gray-500">{submission.evaluationData?.position || 'N/A'}</div>
                             </div>
                           </TableCell>
                           <TableCell className="py-3">
                             <Badge variant="outline" className="text-xs">
                               {submission.evaluationData?.department || 'N/A'}
                             </Badge>
                           </TableCell>
                           <TableCell className="py-3">
                             <Badge className={`text-xs ${
                               submission.category === 'Performance Review' ? 'bg-blue-100 text-blue-800' :
                               submission.category === 'Probationary Review' ? 'bg-yellow-100 text-yellow-800' :
                               'bg-gray-100 text-gray-800'
                             }`}>
                               {submission.category}
                             </Badge>
                           </TableCell>
                           <TableCell className="py-3 text-sm text-gray-600">
                             {new Date(submission.submittedAt).toLocaleDateString()}
                           </TableCell>
                           <TableCell className="py-3">
                             <Badge className="bg-green-100 text-green-800">
                               Completed
                             </Badge>
                           </TableCell>
                           <TableCell className="py-3">
                             <Button
                               variant="outline"
                               size="sm"
                               onClick={() => viewSubmissionDetails(submission)}
                               className="text-xs px-2 py-1"
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
             </CardContent>
           </Card>

           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             {/* Organization Structure */}
             <Card>
               <CardHeader>
                 <CardTitle>Organization Structure</CardTitle>
                 <CardDescription>Company overview and distribution</CardDescription>
               </CardHeader>
               <CardContent className="space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                   <div className="text-center p-4 bg-blue-50 rounded-lg">
                     <div className="text-2xl font-bold text-blue-600">{hrMetrics?.departmentsCount || 0}</div>
                     <div className="text-sm text-gray-600">Departments</div>
                   </div>
                   <div className="text-center p-4 bg-green-50 rounded-lg">
                     <div className="text-2xl font-bold text-green-600">{hrMetrics?.branchesCount || 0}</div>
                     <div className="text-sm text-gray-600">Branches</div>
                   </div>
                 </div>
                 <div className="space-y-3">
                   <div className="flex justify-between items-center">
                     <span className="text-sm text-gray-600">Gender Distribution</span>
                     <div className="flex space-x-2">
                       <Badge variant="outline">Male: {hrMetrics?.genderDistribution.male || 0}</Badge>
                       <Badge variant="outline">Female: {hrMetrics?.genderDistribution.female || 0}</Badge>
                     </div>
                   </div>
                   <div className="space-y-2">
                     <div className="flex justify-between text-sm">
                       <span>Male</span>
                       <span>{Math.round(((hrMetrics?.genderDistribution.male || 0) / (hrMetrics?.totalEmployees || 1)) * 100)}%</span>
                     </div>
                     <Progress value={((hrMetrics?.genderDistribution.male || 0) / (hrMetrics?.totalEmployees || 1)) * 100} className="h-2" />
                   </div>
                 </div>
               </CardContent>
             </Card>

                                          {/* Performance Distribution */}
               <Card>
                 <CardHeader>
                   <CardTitle>Performance Distribution</CardTitle>
                   <CardDescription>Employee performance overview - Click to view employees</CardDescription>
                 </CardHeader>
                 <CardContent>
                   <div className="max-h-[400px] overflow-y-auto space-y-4 pr-2">
                     {Object.entries(hrMetrics?.performanceDistribution || {}).map(([level, count]) => {
                       // Get employees for this performance level (mock data for now)
                       const performanceEmployees = employees.slice(0, Math.min(count, 3)); // Show first 3 employees as example
                       
                       return (
                         <div key={level} className="space-y-3 p-3 bg-gray-50 rounded-lg">
                           <div className="flex justify-between items-center">
                             <div className="flex items-center space-x-2">
                               <span className="capitalize font-medium">{level}</span>
                               <Badge variant="outline" className="text-xs">
                                 {count} employees
                               </Badge>
                             </div>
                             <Button 
                               variant="ghost" 
                               size="sm"
                               className="text-xs h-6 px-2"
                               onClick={() => handleViewPerformanceEmployees(level)}
                             >
                               View All
                             </Button>
                           </div>
                           <Progress 
                             value={(count / (hrMetrics?.totalEmployees || 1)) * 100} 
                             className="h-2"
                           />
                           {performanceEmployees.length > 0 && (
                             <div className="space-y-2">
                               <p className="text-xs text-gray-600 font-medium">Sample employees:</p>
                               <div className="space-y-1">
                                 {performanceEmployees.map((emp, index) => (
                                   <div key={emp.id} className="flex items-center justify-between text-xs bg-white p-2 rounded border">
                                     <div className="flex items-center space-x-2">
                                       <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                       <span className="font-medium">{emp.name}</span>
                                     </div>
                                     <span className="text-gray-500">{emp.department}</span>
                                   </div>
                                 ))}
                               </div>
                             </div>
                           )}
                         </div>
                       );
                     })}
                   </div>
                 </CardContent>
               </Card>
           </div>
         </div>
       )}

      {active === 'employees' && (
        <div className="relative">
          {isTabLoading('employees') ? (
            <TableSkeletonLoader rows={10} columns={6} />
          ) : (
          <Card>
          <CardHeader>
            <CardTitle>Employee Directory</CardTitle>
            <CardDescription>Search and manage employees</CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
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

      {active === 'analytics' && (
        <div className="relative">
          {isTabLoading('analytics') ? (
            <TableSkeletonLoader rows={8} columns={2} />
          ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Age Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Age Distribution</CardTitle>
              <CardDescription>Employee age demographics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(hrMetrics?.ageDistribution || {}).map(([range, count]) => (
                <div key={range} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{range} years</span>
                    <span>{count} employees</span>
                  </div>
                  <Progress 
                    value={(count / (hrMetrics?.totalEmployees || 1)) * 100} 
                    className="h-2"
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Hiring Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Hiring Trends</CardTitle>
              <CardDescription>Recent hiring activity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg">
                <div className="text-3xl font-bold text-blue-600">{hrMetrics?.newHires || 0}</div>
                <div className="text-sm text-gray-600">New hires in last 6 months</div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Turnover Rate</span>
                  <span>{hrMetrics?.turnoverRate || 0}%</span>
                </div>
                <Progress value={hrMetrics?.turnoverRate || 0} className="h-2" />
                <p className="text-xs text-gray-500">Industry average: 15%</p>
              </div>
            </CardContent>
          </Card>
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

      {/* Edit Employee Modal */}
      <Dialog open={isEditModalOpen} onOpenChangeAction={setIsEditModalOpen}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
          <DialogHeader className="pb-6">
            <DialogTitle className="text-2xl font-bold text-gray-900">Edit Employee</DialogTitle>
            <DialogDescription className="text-base text-gray-600 mt-2">
              Update employee information and details. All fields marked with * are required.
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
                Save Changes
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
      </DashboardShell>
    </>
  );
}

// Wrap with HOC for authentication
export default withAuth(HRDashboard, { requiredRole: 'hr' });
