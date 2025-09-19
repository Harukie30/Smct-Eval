# Employee Approval Flow for Evaluators

## Overview
This document explains how the employee approval flow works in the evaluation system, specifically how evaluators can see when employees have approved their evaluations.

## How It Works

### 1. Employee Approval Process
- Employee reviews their evaluation in the employee dashboard
- Employee signs and approves the evaluation
- Employee approval status is stored in the system
- Employee signature is captured and stored

### 2. Evaluator View Updates
When an evaluator opens the `ViewResultsModal` to view an evaluation:

#### New Features Added:
- **Employee Approval Status Section**: Shows the current approval status
- **Employee Signature Display**: Shows the employee's signature if available
- **Visual Indicators**: Color-coded badges and status messages
- **Call-to-Action**: Prominent notification when employee has approved

#### Approval Status Types:
- `pending` - Employee hasn't approved yet
- `employee_approved` - Employee has approved (ready for evaluator approval)
- `evaluator_approved` - Evaluator has approved
- `fully_approved` - Both employee and evaluator have approved
- `rejected` - Evaluation was rejected

### 3. Visual Indicators

#### Status Badges:
- 🎉 **Employee Has Approved!** - Green header when employee approved
- ✅ **Fully Approved** - Green header when fully approved
- ⏳ **Pending** - Gray badge when waiting for approval
- 👤 **Employee Approved** - Blue badge when employee approved
- 👨‍💼 **Evaluator Approved** - Purple badge when evaluator approved
- ❌ **Rejected** - Red badge when rejected

#### Signature Status:
- ✅ **Signed** - Green checkmark when signature is present
- ⏳ **Pending** - Gray indicator when signature is missing
- **Date Display** - Shows when employee approved

### 4. API Integration

#### Employee Signature Service:
- `useEmployeeSignatureByEvaluation()` - Fetches employee signature by evaluation ID
- Automatic loading states and error handling
- Fallback to existing approval data

#### Data Sources:
1. **Primary**: Employee signature API service
2. **Fallback**: Existing approval data from submission
3. **Local Storage**: Mock data for development

### 5. Usage in Evaluator Dashboard

```typescript
// In evaluator dashboard
<ViewResultsModal
  isOpen={isViewResultsModalOpen}
  onCloseAction={() => setIsViewResultsModalOpen(false)}
  submission={selectedEvaluationSubmission}
  isEvaluatorView={true} // This enables the employee approval status section
/>
```

### 6. Key Components

#### ViewResultsModal Updates:
- Added `isEvaluatorView` prop to control display
- New "Employee Approval Status" section
- Employee signature preview
- Call-to-action for final approval

#### Data Structure:
```typescript
type Submission = {
  // ... existing properties
  approvalStatus?: string;
  employeeSignature?: string | null;
  employeeApprovedAt?: string | null;
  evaluatorSignature?: string | null;
  evaluatorApprovedAt?: string | null;
};
```

### 7. Workflow Example

1. **Employee Reviews Evaluation**:
   - Employee opens evaluation in their dashboard
   - Employee reviews all sections
   - Employee signs and approves

2. **System Updates Status**:
   - `approvalStatus` changes to `employee_approved`
   - `employeeSignature` is stored
   - `employeeApprovedAt` timestamp is recorded

3. **Evaluator Sees Update**:
   - Evaluator opens evaluation in their dashboard
   - Green "🎉 Employee Has Approved!" header appears
   - Employee signature is displayed
   - Call-to-action button for final approval

4. **Evaluator Final Approval**:
   - Evaluator can provide final approval
   - Status changes to `fully_approved`
   - Process is complete

### 8. Benefits

- **Real-time Updates**: Evaluators immediately see when employees approve
- **Visual Clarity**: Clear status indicators and color coding
- **Signature Verification**: Can see actual employee signatures
- **Workflow Guidance**: Clear next steps for evaluators
- **Audit Trail**: Complete approval history with timestamps

### 9. Future Enhancements

- **Email Notifications**: Notify evaluators when employees approve
- **Dashboard Badges**: Show pending approvals in main dashboard
- **Approval History**: Detailed timeline of all approval steps
- **Bulk Actions**: Approve multiple evaluations at once
- **Mobile Optimization**: Better mobile experience for signatures

## Technical Implementation

### Files Modified:
- `src/components/evaluation/ViewResultsModal.tsx` - Main modal component
- `src/app/evaluator/page.tsx` - Evaluator dashboard integration
- `src/lib/employeeSignatureService.ts` - Employee signature API
- `src/hooks/useEmployeeSignature.ts` - React hooks for signature data

### Key Features:
- TypeScript type safety
- React hooks for data management
- Error handling and loading states
- Responsive design
- Accessibility support
