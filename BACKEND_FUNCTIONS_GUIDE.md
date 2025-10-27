# 🚀 Backend Functions Guide - Option A

## ✅ **What Was Added to `clientDataService.ts`**

All new functions are located at **lines 829-1173** in `src/lib/clientDataService.ts`

---

## 📋 **New Functions Available**

### 1️⃣ **Get Submission by ID**
```typescript
getSubmissionById(id: number): Promise<Submission | null>
```
**Usage:**
```typescript
const submission = await clientDataService.getSubmissionById(123);
```
**Backend Endpoint:** `GET ${CONFIG.API_URL}/submissions/:id`

---

### 2️⃣ **Employee Approval**
```typescript
updateSubmissionWithEmployeeSignature(
  submissionId: number, 
  employeeSignature: string
): Promise<Submission | null>
```
**Usage:**
```typescript
const updated = await clientDataService.updateSubmissionWithEmployeeSignature(
  123, 
  'data:image/png;base64,iVBORw0KG...'
);
```
**Backend Endpoint:** `PATCH ${CONFIG.API_URL}/submissions/:id/employee-approve`
**Payload:**
```json
{
  "employeeSignature": "base64_signature",
  "employeeApprovedAt": "2025-10-23T12:00:00Z",
  "approvalStatus": "employee_approved"
}
```

---

### 3️⃣ **Evaluator Approval**
```typescript
updateSubmissionWithEvaluatorSignature(
  submissionId: number, 
  evaluatorSignature: string
): Promise<Submission | null>
```
**Usage:**
```typescript
const updated = await clientDataService.updateSubmissionWithEvaluatorSignature(
  123, 
  'data:image/png;base64,iVBORw0KG...'
);
```
**Backend Endpoint:** `PATCH ${CONFIG.API_URL}/submissions/:id/evaluator-approve`
**Payload:**
```json
{
  "evaluatorSignature": "base64_signature",
  "evaluatorApprovedAt": "2025-10-23T12:00:00Z",
  "approvalStatus": "fully_approved"
}
```

---

### 4️⃣ **Delete Submission**
```typescript
deleteSubmission(id: number): Promise<{ success: boolean; message: string }>
```
**Usage:**
```typescript
const result = await clientDataService.deleteSubmission(123);
// { success: true, message: 'Submission deleted successfully' }
```
**Backend Endpoint:** `DELETE ${CONFIG.API_URL}/submissions/:id`

---

### 5️⃣ **Get Suspended Employees**
```typescript
getSuspendedEmployees(): Promise<any[]>
```
**Usage:**
```typescript
const suspended = await clientDataService.getSuspendedEmployees();
```
**Backend Endpoint:** `GET ${CONFIG.API_URL}/employees/suspended`

---

### 6️⃣ **Get Employee Violations**
```typescript
getEmployeeViolations(email: string): Promise<any[]>
```
**Usage:**
```typescript
const violations = await clientDataService.getEmployeeViolations('john@example.com');
```
**Backend Endpoint:** `GET ${CONFIG.API_URL}/employees/:email/violations`

---

### 7️⃣ **Get Account History**
```typescript
getAccountHistory(email: string): Promise<any[]>
```
**Usage:**
```typescript
const history = await clientDataService.getAccountHistory('john@example.com');
```
**Backend Endpoint:** `GET ${CONFIG.API_URL}/employees/:email/history`

---

### 8️⃣ **Bulk Approve Submissions**
```typescript
bulkApproveSubmissions(submissionIds: number[]): Promise<{ success: boolean; message: string }>
```
**Usage:**
```typescript
const result = await clientDataService.bulkApproveSubmissions([123, 456, 789]);
```
**Backend Endpoint:** `PATCH ${CONFIG.API_URL}/submissions/bulk-approve`
**Payload:**
```json
{
  "submissionIds": [123, 456, 789]
}
```

---

### 9️⃣ **Update Approval Status (Generic)**
```typescript
updateApprovalStatus(
  submissionId: number, 
  approvalStatus: string,
  additionalData?: Partial<Submission>
): Promise<Submission | null>
```
**Usage:**
```typescript
const updated = await clientDataService.updateApprovalStatus(
  123, 
  'pending_review',
  { notes: 'Requires additional information' }
);
```
**Backend Endpoint:** `PATCH ${CONFIG.API_URL}/submissions/:id/approval-status`

---

## 🔄 **How Each Function Works**

### **Pattern: Backend First → Cache Fallback**

```typescript
1. Try Backend API (PRIMARY)
   ↓ Success? → Cache in localStorage → Return data
   ↓ Failed?
   
2. Fallback to localStorage Cache
   ↓ Has cache? → Return cached data
   ↓ No cache?
   
3. Return empty/default value
```

### **Example:**
```typescript
getSuspendedEmployees: async () => {
  try {
    // 1. Try Backend
    const res = await fetch(`${CONFIG.API_URL}/employees/suspended`);
    if (res.ok) {
      const data = await res.json();
      // Cache it
      localStorage.setItem('suspendedEmployees', JSON.stringify(data));
      return data;
    }
    // 2. Fallback to cache
    return JSON.parse(localStorage.getItem('suspendedEmployees') || '[]');
  } catch (error) {
    // 3. Error? Use cache
    return JSON.parse(localStorage.getItem('suspendedEmployees') || '[]');
  }
}
```

---

## 📡 **Required Backend Endpoints**

Your backend needs these endpoints:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/submissions/:id` | Get single submission |
| `PATCH` | `/submissions/:id/employee-approve` | Employee approval |
| `PATCH` | `/submissions/:id/evaluator-approve` | Evaluator approval |
| `DELETE` | `/submissions/:id` | Delete submission |
| `GET` | `/employees/suspended` | Get suspended employees |
| `GET` | `/employees/:email/violations` | Get violations for employee |
| `GET` | `/employees/:email/history` | Get account history |
| `PATCH` | `/submissions/bulk-approve` | Bulk approve submissions |
| `PATCH` | `/submissions/:id/approval-status` | Update approval status |

---

## 🎯 **Using in Your Dashboards**

### **Employee Dashboard Example:**
```typescript
// OLD (Direct localStorage):
const currentSubmissions = JSON.parse(localStorage.getItem('submissions') || '[]');
localStorage.setItem('submissions', JSON.stringify(updatedSubmissions));

// NEW (Using clientDataService):
const currentSubmissions = await clientDataService.getSubmissions();
await clientDataService.updateSubmissionWithEmployeeSignature(
  submissionId, 
  signature
);
```

### **Evaluator Dashboard Example:**
```typescript
// Get submission details
const submission = await clientDataService.getSubmissionById(123);

// Approve as evaluator
await clientDataService.updateSubmissionWithEvaluatorSignature(
  123, 
  evaluatorSignature
);

// Delete a submission
const result = await clientDataService.deleteSubmission(123);
```

---

## ✅ **Benefits**

✅ **Backend-First:** Always tries to use your backend API  
✅ **Offline Support:** Falls back to localStorage cache if backend fails  
✅ **No Breaking Changes:** Your existing code still works  
✅ **Ready to Use:** You can start using these in evaluator dashboard NOW  
✅ **Easy Migration:** Employee dashboard can migrate when you're ready  

---

## 🚀 **Next Steps**

1. **Test in Evaluator Dashboard** - Use the new functions
2. **Verify Backend Endpoints** - Make sure they match the expected format
3. **Migrate Employee Dashboard** - When you're ready (no rush!)

---

## 📝 **Notes**

- All functions have **automatic caching** for offline support
- All functions have **error handling** with fallbacks
- All functions log errors to console for debugging
- localStorage is used as **cache only**, not source of truth
- Backend is the **primary source** of data

---

**Created:** October 23, 2025  
**Status:** ✅ Ready to Use

