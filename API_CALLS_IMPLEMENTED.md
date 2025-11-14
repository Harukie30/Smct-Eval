# API Calls Implementation Status

## ✅ **IMPLEMENTED WITH AXIOS** (Using `axiosInstance`)

### 📁 **Organizational Data**
1. **`getDepartments()`** - Line 237
   - Endpoint: `GET /departments`
   - Status: ✅ Implemented
   - Merges API data with localStorage

2. **`getPositions()`** - Line 287
   - Endpoint: `GET /positions`
   - Status: ✅ Implemented
   - Falls back to local data

3. **`getBranches()`** - Line 309
   - Endpoint: `GET /branches`
   - Status: ✅ Implemented
   - Merges API data with localStorage

---

### 📝 **Submissions (Evaluation Records)**
4. **`getSubmissionById(id)`** - Line 1135
   - Endpoint: `GET /submissions/${id}`
   - Status: ✅ Implemented
   - Falls back to localStorage

5. **`updateSubmissionWithEmployeeSignature(submissionId, employeeSignature)`** - Line 1149
   - Endpoint: `PATCH /submissions/${submissionId}/employee-approve`
   - Status: ✅ Implemented
   - Updates localStorage cache after API call

6. **`updateSubmissionWithEvaluatorSignature(submissionId, evaluatorSignature)`** - Line 1193
   - Endpoint: `PATCH /submissions/${submissionId}/evaluator-approve`
   - Status: ✅ Implemented
   - Updates localStorage cache after API call

7. **`deleteSubmission(id)`** - Line 1237
   - Endpoint: `DELETE /submissions/${id}`
   - Status: ✅ Implemented
   - Updates localStorage cache after API call

8. **`bulkApproveSubmissions(submissionIds)`** - Line 1258
   - Endpoint: `PATCH /submissions/bulk-approve`
   - Status: ✅ Implemented
   - Body: `{ submissionIds: number[] }`

9. **`updateApprovalStatus(submissionId, approvalStatus, additionalData?)`** - Line 1270
   - Endpoint: `PATCH /submissions/${submissionId}/approval-status`
   - Status: ✅ Implemented
   - Generic approval status update

10. **`getPendingRegistrations()`** - Line 446
    - Endpoint: `GET /api/register`
    - Status: ✅ Implemented
    - Falls back to localStorage

11. **`createPendingRegistration(registration)`** - Line 469
    - Endpoint: `POST /api/register`
    - Status: ✅ Implemented
    - Falls back to localStorage

12. **`approveRegistration(id)`** - Line 516
    - Endpoint: `POST /api/registrations/${id}/approve`
    - Status: ✅ Implemented
    - Falls back to localStorage

13. **`rejectRegistration(id)`** - Line 658
    - Endpoint: `DELETE /api/registrations/${id}/reject`
    - Status: ✅ Implemented
    - Falls back to localStorage

---

## ✅ **ALL API CALLS CONVERTED TO AXIOS!**

No more `fetch()` calls remaining in `clientDataService.ts`!

---

## 📦 **LOCALSTORAGE ONLY (No API Calls)**

### 👥 **Employees**
- `getEmployees()` - Line 366
- `getEmployee(id)` - Line 370
- `updateEmployee(id, updates)` - Line 388
- **Status**: ❌ No API calls - localStorage only
- **TODO**: Add API calls if backend has employee endpoints

### 📄 **Submissions (Basic CRUD)**
- `getSubmissions()` - Line 413
- `createSubmission(submission)` - Line 417
- `updateSubmission(id, updates)` - Line 431
- **Status**: ❌ No API calls - localStorage only
- **Note**: Advanced submission functions (lines 1134+) use API

### 👤 **Profiles**
- `getProfiles()` - Line 714
- `getProfile(id)` - Line 718
- `updateProfile(id, updates)` - Line 723
- **Status**: ❌ No API calls - localStorage only
- **TODO**: Add API calls if backend has profile endpoints

### 🔐 **Authentication**
- `login(email, password)` - Line 791
- `getUserById(userId)` - Line 852
- **Status**: ❌ No API calls - localStorage only
- **Note**: Authentication uses `apiService.ts` (fetch-based)

### 🔔 **Notifications**
- `getNotifications(userRole)` - Line 976
- `createNotification(notification)` - Line 984
- `markNotificationAsRead(notificationId)` - Line 1021
- `markAllNotificationsAsRead(userRole)` - Line 1039
- `getUnreadNotificationCount(userRole)` - Line 1061
- `deleteNotification(notificationId)` - Line 1066
- **Status**: ❌ No API calls - localStorage only
- **TODO**: Add API calls if backend has notification endpoints

### 📊 **Dashboard & Metrics**
- `getDashboardData()` - Line 922
- `getEmployeeMetrics()` - Line 936
- `getEmployeeResults()` - Line 949
- **Status**: ❌ No API calls - localStorage only

### 🏢 **Branch Codes**
- `getBranchCodes()` - Line 358
- **Status**: ❌ No API calls - local data only

### 👥 **Accounts**
- `getAccounts()` - Line 1126
- **Status**: ❌ No API calls - localStorage only

---

## 📊 **Summary**

### ✅ **Completed (13 API calls with axios)**
- Departments: 1
- Positions: 1
- Branches: 1
- Submissions: 6
- Pending Registrations: 4

### ✅ **All fetch() calls converted!**
- No remaining fetch calls in `clientDataService.ts`

### ❌ **No API Calls Yet (localStorage only)**
- Employees: 3 functions
- Submissions (basic): 3 functions
- Profiles: 3 functions
- Authentication: 2 functions
- Notifications: 6 functions
- Dashboard/Metrics: 3 functions
- Accounts: 1 function
- Branch Codes: 1 function

---

## 🎯 **Quick Reference**

### When adding new API calls:
1. Use `axiosInstance` (not `fetch`)
2. Add to `clientDataService.ts`
3. Follow the pattern:
   ```typescript
   newFunction: async (): Promise<ReturnType> => {
     try {
       const response = await axiosInstance.get('/endpoint');
       // Update cache if needed
       saveToStorage(STORAGE_KEYS.KEY, response.data);
       return response.data;
     } catch (error) {
       // Fallback to localStorage
       return getFromStorage(STORAGE_KEYS.KEY, []);
     }
   }
   ```

### ✅ **Migration Complete!**
All functions in `clientDataService.ts` that needed API calls have been converted from `fetch()` to `axiosInstance`.

---

**Last Updated**: After converting `rejectRegistration()` to axios
**Total API Calls with Axios**: 13
**Total Functions Using Fetch**: 0 ✅
**Total Functions (localStorage only)**: ~22

