# Backend Architecture Documentation

## ✅ Current Setup (Updated)

Your application now uses a **hybrid backend architecture**:

### 🌐 External Backend (Laravel/PHP - `CONFIG.API_URL`)
Handles these endpoints:
- ✅ `POST ${CONFIG.API_URL}/register` - User registration
- ✅ `GET ${CONFIG.API_URL}/departments` - Get departments list
- ✅ `GET ${CONFIG.API_URL}/positions` - Get positions list  
- ✅ `GET ${CONFIG.API_URL}/branches` - Get branches list

### 🔷 Next.js API Routes (`/api/...`)
Handles these endpoints:
- ✅ `POST /api/auth/login` - User authentication
- ✅ `POST /api/auth/logout` - User logout
- ✅ `GET /api/auth/me` - Get current user
- ✅ `POST /api/auth/forgot-password` - Password reset
- ✅ `GET /api/registrations` - Get pending registrations
- ✅ `GET /api/registrations/check-duplicates` - Check email/username duplicates
- ✅ `GET /api/accounts` - Get all accounts

---

## 📁 File Structure

```
src/
├── lib/
│   ├── clientDataService.ts          # OLD: localStorage version (NOT USED)
│   ├── clientDataService.api.ts      # ✅ ACTIVE: API version
│   └── apiService.ts                 # API service layer
├── app/api/                          # Next.js API routes
│   ├── auth/
│   │   ├── login/route.ts
│   │   ├── logout/route.ts
│   │   ├── me/route.ts
│   │   └── forgot-password/route.ts
│   ├── accounts/route.ts
│   └── registrations/
│       ├── route.ts
│       └── check-duplicates/route.ts
└── config/
    └── config.ts                     # API URL configuration
```

---

## 🔄 Service Layer Architecture

### **clientDataService.api.ts**
This is your **main service layer** that all components import:

```typescript
import clientDataService from '@/lib/clientDataService.api';
```

It routes requests to the appropriate backend:

**External Backend:**
- `getDepartments()` → `${CONFIG.API_URL}/departments`
- `getPositions()` → `${CONFIG.API_URL}/positions`
- `getBranches()` → `${CONFIG.API_URL}/branches`
- `registerUser(formData)` → `${CONFIG.API_URL}/register`

**Next.js Backend:**
- `login()` → `/api/auth/login`
- `logout()` → `/api/auth/logout`
- `getCurrentUser()` → `/api/auth/me`
- `getPendingRegistrations()` → `/api/registrations`
- `getAccounts()` → `/api/accounts`

**Not Yet Implemented (returns warnings):**
- `getEmployees()` - TODO
- `getSubmissions()` - TODO
- `createSubmission()` - TODO
- `updateProfile()` - TODO
- `getNotifications()` - TODO

---

## ⚙️ Configuration

### Environment Variables
Set in `.env.local`:

```env
NEXT_PUBLIC_API_URL=https://your-external-backend.com/api
JWT_SECRET=your-secret-key-here
```

### Config File
`config/config.ts`:
```typescript
export const CONFIG = {
    API_URL: process.env.NEXT_PUBLIC_API_URL
}
```

---

## 🎯 Migration Status

### ✅ Completed
- [x] Switch all components to use `clientDataService.api.ts`
- [x] Remove duplicate Next.js data routes (departments, positions, branches)
- [x] Authentication working with Next.js API
- [x] Registration working with external backend
- [x] Data fetching from external backend

### ⏳ Still Using Mock Data (localStorage)
These functions in `clientDataService.api.ts` return empty arrays/throw errors:
- `getEmployees()` 
- `getEmployee(id)`
- `updateEmployee(id, updates)`
- `getSubmissions()`
- `createSubmission(submission)`
- `updateSubmission(id, updates)`
- `getNotifications(userRole)`
- `createNotification(notification)`
- `markNotificationAsRead(id)`
- `deleteNotification(id)`
- `getDashboardData()`
- `getEmployeeMetrics()`
- `getEmployeeResults()`
- `uploadImage(file)`

### 📋 Next Steps
To fully migrate to backend APIs, you need to implement these endpoints:

**High Priority:**
1. Employee Management APIs
   - `GET /api/employees`
   - `GET /api/employees/:id`
   - `PUT /api/employees/:id`
   
2. Evaluation Submissions APIs
   - `GET /api/submissions`
   - `POST /api/submissions`
   - `PUT /api/submissions/:id`

3. Profile APIs
   - `GET /api/profiles/:id`
   - `PUT /api/profiles/:id`

**Medium Priority:**
4. Notifications APIs
   - `GET /api/notifications?role=:role`
   - `POST /api/notifications`
   - `PUT /api/notifications/:id/read`
   - `DELETE /api/notifications/:id`

**Low Priority:**
5. Dashboard & File Upload
   - `GET /api/dashboard`
   - `POST /api/upload/image`

---

## 🔒 Authentication Flow

1. User enters credentials on login page
2. `clientDataService.login()` calls `/api/auth/login`
3. Next.js API validates against mock data (or your database)
4. Returns JWT token + user data
5. Token stored in localStorage as `authToken`
6. All subsequent API requests include `Authorization: Bearer <token>` header

---

## 🚀 Testing Your APIs

### Test External Backend
```bash
# Departments
curl http://your-backend.com/api/departments

# Positions
curl http://your-backend.com/api/positions

# Branches
curl http://your-backend.com/api/branches
```

### Test Next.js APIs
```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@smct.com","password":"password"}'

# Get Accounts
curl http://localhost:3000/api/accounts
```

---

## 📝 Notes

- The old `clientDataService.ts` is still in the codebase but **NOT USED** by any components
- All components now import from `clientDataService.api.ts`
- Some features still need API implementation (marked with TODO)
- JWT secret should be changed in production
- External backend URL must be configured in `.env.local`

---

Last Updated: October 23, 2025

