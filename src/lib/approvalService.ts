// Mock approval service for frontend development
// This simulates API calls until the backend is ready

interface ApprovalData {
  id: string;
  submissionId: number;
  employeeId: number;
  approvedAt: string;
  employeeName: string;
  employeeSignature?: string;
}

// Mock storage for approvals (in real app, this would be in database)
let mockApprovals: ApprovalData[] = [];

// Mock API call to approve evaluation
export const approveEvaluation = async (data: {
  submissionId: number;
  employeeId: number;
  approvedAt: string;
  employeeName: string;
}): Promise<ApprovalData> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Create approval record
  const approval: ApprovalData = {
    id: `approval_${Date.now()}`,
    submissionId: data.submissionId,
    employeeId: data.employeeId,
    approvedAt: data.approvedAt,
    employeeName: data.employeeName,
  };

  // Store in mock data
  mockApprovals.push(approval);

  // Also store in localStorage for persistence across page reloads
  if (typeof window !== 'undefined') {
    localStorage.setItem('mockApprovals', JSON.stringify(mockApprovals));
  }

  console.log('✅ Mock approval created:', approval);
  return approval;
};

// Get approval status for a submission
export const getApprovalStatus = (submissionId: number): ApprovalData | null => {
  // Load from localStorage if available
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('mockApprovals');
    if (stored) {
      mockApprovals = JSON.parse(stored);
    }
  }

  return mockApprovals.find(approval => approval.submissionId === submissionId) || null;
};

// Get all approvals (for testing)
export const getAllApprovals = (): ApprovalData[] => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('mockApprovals');
    if (stored) {
      mockApprovals = JSON.parse(stored);
    }
  }
  return mockApprovals;
};

// Clear all approvals (for testing)
export const clearAllApprovals = (): void => {
  mockApprovals = [];
  if (typeof window !== 'undefined') {
    localStorage.removeItem('mockApprovals');
  }
};
