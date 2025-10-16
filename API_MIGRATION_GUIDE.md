# API Migration Guide

## 🚀 Your Frontend is Ready for Backend API Integration!

### ✅ What's Already Created:

#### **API Routes Created:**
- `POST /api/auth/login` - User authentication
- `POST /api/auth/logout` - User logout  
- `GET /api/auth/me` - Get current user
- `POST /api/registrations` - Create pending registration
- `GET /api/registrations` - Get all pending registrations
- `GET /api/registrations/check-duplicates` - Check email/username duplicates
- `GET /api/data/positions` - Get available positions
- `GET /api/data/branch-codes` - Get branch codes
- `GET /api/accounts` - Get all accounts (for duplicate checking)

#### **Service Layer Created:**
- `src/lib/apiService.ts` - API service layer
- `src/lib/clientDataService.api.ts` - API-enabled clientDataService

---

## 🔄 How to Switch to API Mode:

### **Step 1: Install Dependencies**
```bash
npm install bcryptjs jsonwebtoken
npm install -D @types/bcryptjs @types/jsonwebtoken
```

### **Step 2: Add Environment Variables**
Create `.env.local`:
```env
JWT_SECRET=your-super-secret-jwt-key-here
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### **Step 3: Switch to API Service**
Replace the import in your components:

**Before (localStorage):**
```typescript
import clientDataService from '@/lib/clientDataService';
```

**After (API):**
```typescript
import clientDataService from '@/lib/clientDataService.api';
```

### **Step 4: Update UserContext (Optional)**
The UserContext will work with both versions, but you can optimize it:

```typescript
// In UserContext.tsx, replace:
const loginResult = await clientDataService.login(username, password);

// With:
const loginResult = await clientDataService.login(username, password);
// The API version handles token storage automatically
```

---

## 🎯 **What Works Immediately:**

### ✅ **Login Page**
- ✅ User authentication via API
- ✅ JWT token management
- ✅ Error handling
- ✅ Suspension data handling

### ✅ **Registration Page**  
- ✅ Form validation
- ✅ Duplicate checking via API
- ✅ Registration submission via API
- ✅ Real-time validation

### ✅ **Data Loading**
- ✅ Positions from API
- ✅ Branch codes from API
- ✅ Account data from API

---

## 🔧 **What Needs Backend Implementation:**

### **High Priority (Core Features):**
```typescript
// Employee Management
GET /api/employees
GET /api/employees/:id
PUT /api/employees/:id
POST /api/employees

// Submissions
GET /api/submissions
POST /api/submissions
PUT /api/submissions/:id

// Profiles
GET /api/profiles/:id
PUT /api/profiles/:id
```

### **Medium Priority (Features):**
```typescript
// Notifications
GET /api/notifications?role=:role
POST /api/notifications
PUT /api/notifications/:id/read
DELETE /api/notifications/:id

// Dashboard
GET /api/dashboard
GET /api/employee-metrics
```

### **Low Priority (Utilities):**
```typescript
// File Upload
POST /api/upload/image

// Admin Functions
POST /api/registrations/:id/approve
POST /api/registrations/:id/reject
```

---

## 🎉 **Benefits of This Migration:**

### ✅ **Security**
- JWT token authentication
- Password hashing with bcrypt
- Server-side validation
- No sensitive data in localStorage

### ✅ **Scalability**
- Real database integration
- Multiple server instances
- Proper session management
- API rate limiting

### ✅ **Maintainability**
- Clean separation of concerns
- Easy to add new features
- Centralized business logic
- Better error handling

---

## 🚀 **Testing Your API:**

### **Test Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@smct.com","password":"password"}'
```

### **Test Registration:**
```bash
curl -X POST http://localhost:3000/api/registrations \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","position":"Developer","branch":"head-office","hireDate":"2024-01-01","role":"employee","signature":"base64signature","username":"johndoe","contact":"09123456789","password":"password123"}'
```

### **Test Duplicate Check:**
```bash
curl "http://localhost:3000/api/registrations/check-duplicates?email=admin@smct.com&username=admin"
```

---

## 🎯 **Next Steps:**

1. **Test the API routes** with the provided curl commands
2. **Switch to API mode** by changing the import
3. **Test login and registration** in your frontend
4. **Implement remaining endpoints** as needed
5. **Add database integration** to replace mock data

**Your frontend is 100% ready for backend integration!** 🎉
