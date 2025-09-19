# Evaluation Records API Integration

This document explains how to use the Evaluation Records API system to store, view, and manage employee signature approvals for evaluation records.

## 📁 Files Created

1. **`src/lib/evaluationRecordsService.ts`** - Core API service for evaluation records
2. **`src/hooks/useEvaluationRecords.ts`** - React hooks for easy integration
3. **`src/components/EvaluationRecordsTable.tsx`** - Comprehensive records table component
4. **`src/components/EmployeeSignatureApproval.tsx`** - Employee signature approval dialog
5. **`src/components/EvaluationRecordsExample.tsx`** - Complete example implementation

## 🚀 Quick Start

### 1. Using the Evaluation Records Hook

```tsx
import { useEvaluationRecords } from '@/hooks/useEvaluationRecords';

function MyComponent() {
  const { records, loading, error, refetch } = useEvaluationRecords();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {records.map(record => (
        <div key={record.id}>
          {record.employeeName} - {record.rating}/5
        </div>
      ))}
    </div>
  );
}
```

### 2. Employee Signature Approval

```tsx
import { useEmployeeSignatureApproval } from '@/hooks/useEvaluationRecords';

function ApprovalComponent() {
  const { approveWithSignature, loading, error } = useEmployeeSignatureApproval();

  const handleApprove = async (recordId: number) => {
    try {
      await approveWithSignature(recordId, {
        employeeSignature: 'data:image/png;base64,...',
        employeeName: 'John Doe',
        employeeEmail: 'john@company.com',
        comments: 'Approved with signature'
      });
      console.log('Approval successful!');
    } catch (err) {
      console.error('Approval failed:', err);
    }
  };

  return (
    <button onClick={() => handleApprove(123)} disabled={loading}>
      {loading ? 'Approving...' : 'Approve with Signature'}
    </button>
  );
}
```

### 3. Complete Records Table

```tsx
import EvaluationRecordsTable from '@/components/EvaluationRecordsTable';

function MyDashboard() {
  return (
    <EvaluationRecordsTable
      showSearch={true}
      showStats={true}
      showFilters={true}
      maxRows={20}
      onRecordSelect={(record) => console.log('Selected:', record)}
      onApproveRecord={(record) => console.log('Approve:', record)}
    />
  );
}
```

## 🔧 Available Hooks

### `useEvaluationRecords()`
- **Purpose**: Get all evaluation records
- **Returns**: `{ records, loading, error, refetch }`

### `useEvaluationRecord(id)`
- **Purpose**: Get single evaluation record by ID
- **Returns**: `{ record, loading, error, refetch }`

### `useEvaluationRecordsSearch()`
- **Purpose**: Search evaluation records with filters
- **Returns**: `{ results, loading, error, search, clearResults }`

### `useEmployeeSignatureApproval()`
- **Purpose**: Add employee signature approval
- **Returns**: `{ approveWithSignature, loading, error }`

### `useEvaluatorSignatureApproval()`
- **Purpose**: Add evaluator signature approval
- **Returns**: `{ approveWithSignature, loading, error }`

### `useEvaluationRecordsStats()`
- **Purpose**: Get evaluation records statistics
- **Returns**: `{ stats, loading, error, refetch }`

### `useApprovalHistory(recordId)`
- **Purpose**: Get approval history for a record
- **Returns**: `{ history, loading, error, refetch }`

## 📊 Evaluation Record Data Structure

```typescript
interface EvaluationRecord {
  id: number;
  employeeId: number;
  employeeName: string;
  employeeEmail?: string;
  category: string;
  rating: number;
  submittedAt: string;
  status: 'pending' | 'completed' | 'approved' | 'rejected';
  evaluator: string;
  evaluatorId?: string;
  evaluationData: EvaluationData;
  
  // Approval and Signature Data
  employeeSignature?: string;
  employeeSignatureDate?: string;
  employeeApprovedAt?: string;
  employeeApprovedBy?: string;
  
  evaluatorSignature?: string;
  evaluatorSignatureDate?: string;
  evaluatorApprovedAt?: string;
  evaluatorApprovedBy?: string;
  
  // Additional metadata
  quarter?: string;
  year?: number;
  department?: string;
  position?: string;
  branch?: string;
  
  // Approval workflow
  approvalStatus: 'pending' | 'employee_approved' | 'evaluator_approved' | 'fully_approved' | 'rejected';
  approvalHistory?: ApprovalHistoryEntry[];
  
  // Comments and notes
  approvalComments?: string;
  rejectionReason?: string;
  lastModified?: string;
  createdBy?: string;
}
```

## 🎨 Component Features

### EvaluationRecordsTable
- ✅ **Search functionality** - Search by employee, evaluator, category, department
- ✅ **Advanced filters** - Filter by status, approval status, department, quarter
- ✅ **Statistics display** - Show totals, pending, approved, rejected counts
- ✅ **Row limits** - Control number of displayed records
- ✅ **Record selection** - Click to select records
- ✅ **Approval actions** - Approve records with signature
- ✅ **Responsive design** - Works on all screen sizes
- ✅ **Loading states** - Proper loading and error handling

### EmployeeSignatureApproval
- ✅ **Signature validation** - Check if user has signature
- ✅ **Approval workflow** - Complete approval process
- ✅ **Comments support** - Add approval comments
- ✅ **Error handling** - Display errors and validation messages
- ✅ **Loading states** - Show approval progress

## 🔄 Integration Examples

### Replace Static Evaluation Tables

**Before:**
```tsx
<Table>
  <TableBody>
    {evaluations.map(eval => (
      <TableRow key={eval.id}>
        <TableCell>{eval.employeeName}</TableCell>
        <TableCell>{eval.rating}</TableCell>
        <TableCell>{eval.status}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

**After:**
```tsx
<EvaluationRecordsTable
  showSearch={true}
  showFilters={true}
  onRecordSelect={(record) => setSelectedRecord(record)}
  onApproveRecord={(record) => handleApprove(record)}
/>
```

### Add Employee Approval to Existing Components

```tsx
import { useEmployeeSignatureApproval } from '@/hooks/useEvaluationRecords';

function ExistingEvaluationComponent({ evaluationId }) {
  const { approveWithSignature, loading } = useEmployeeSignatureApproval();
  
  const handleApprove = async () => {
    await approveWithSignature(evaluationId, {
      employeeSignature: user.signature,
      employeeName: user.name,
      employeeEmail: user.email
    });
  };

  return (
    <button onClick={handleApprove} disabled={loading}>
      {loading ? 'Approving...' : 'Approve with Signature'}
    </button>
  );
}
```

### Search and Filter Records

```tsx
import { useEvaluationRecordsSearch } from '@/hooks/useEvaluationRecords';

function SearchableRecords() {
  const { results, loading, search } = useEvaluationRecordsSearch();
  
  const handleSearch = (filters) => {
    search({
      employeeName: filters.name,
      department: filters.department,
      status: filters.status,
      approvalStatus: filters.approvalStatus
    });
  };

  return (
    <div>
      <SearchFilters onSearch={handleSearch} />
      {loading && <div>Searching...</div>}
      {results.map(record => (
        <div key={record.id}>{record.employeeName}</div>
      ))}
    </div>
  );
}
```

## 🛠️ API Service Functions

### Direct Service Usage

```tsx
import { 
  getAllEvaluationRecords, 
  addEmployeeSignatureApproval,
  searchEvaluationRecords 
} from '@/lib/evaluationRecordsService';

// Get all records
const records = await getAllEvaluationRecords();

// Add employee signature approval
const updatedRecord = await addEmployeeSignatureApproval(123, {
  employeeSignature: 'data:image/png;base64,...',
  employeeName: 'John Doe',
  employeeEmail: 'john@company.com',
  comments: 'Approved'
});

// Search records
const results = await searchEvaluationRecords({
  employeeId: 456,
  status: 'pending',
  department: 'Engineering'
});
```

## 📈 Statistics and Analytics

The system provides comprehensive statistics:

```typescript
interface EvaluationRecordStats {
  total: number;
  pending: number;
  completed: number;
  approved: number;
  rejected: number;
  byStatus: Record<string, number>;
  byDepartment: Record<string, number>;
  byQuarter: Record<string, number>;
  byApprovalStatus: Record<string, number>;
}
```

## 🔮 Future Backend Integration

When your backend is ready, simply replace the mock functions in `evaluationRecordsService.ts`:

```typescript
// Replace this:
export const getAllEvaluationRecords = async (): Promise<EvaluationRecord[]> => {
  // Mock implementation
};

// With this:
export const getAllEvaluationRecords = async (): Promise<EvaluationRecord[]> => {
  const response = await fetch('/api/evaluation-records');
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return await response.json();
};
```

## 📝 Key Features

### Employee Signature Approval Workflow
1. **Employee reviews evaluation** - Views their evaluation results
2. **Signature validation** - System checks if employee has signature
3. **Approval process** - Employee approves with signature
4. **Status update** - Record status changes to "employee_approved"
5. **History tracking** - Approval history is maintained
6. **Notifications** - HR/Admin can see approval status

### Approval Status Flow
```
pending → employee_approved → evaluator_approved → fully_approved
    ↓
  rejected
```

### Data Persistence
- All data stored in `localStorage` for development
- Approval history maintained separately
- Signature data stored as base64 strings
- Timestamps for all approval actions

## 🎯 Benefits

1. **Complete Workflow** - End-to-end evaluation approval process
2. **Signature Integration** - Employee signatures stored and displayed
3. **Audit Trail** - Complete approval history tracking
4. **Search & Filter** - Advanced filtering capabilities
5. **Statistics** - Comprehensive analytics and reporting
6. **Type Safety** - Full TypeScript support
7. **Responsive Design** - Works on all devices
8. **Future-proof** - Easy backend integration

## 🔧 Usage in Existing Dashboards

### Employee Dashboard
```tsx
// Show employee's own evaluation records
<EvaluationRecordsTable
  filterByEmployee={currentUser.id}
  showApprovalActions={true}
  onApproveRecord={handleEmployeeApproval}
/>
```

### HR Dashboard
```tsx
// Show all records with approval management
<EvaluationRecordsTable
  showStats={true}
  showFilters={true}
  onRecordSelect={handleRecordView}
  onApproveRecord={handleHRApproval}
/>
```

### Admin Dashboard
```tsx
// Show all records with full management
<EvaluationRecordsTable
  showStats={true}
  showFilters={true}
  showApprovalHistory={true}
  onRecordSelect={handleAdminView}
/>
```

This system provides a complete solution for managing evaluation records with employee signature approvals, making it easy to track the approval workflow and maintain audit trails.
