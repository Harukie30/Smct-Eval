# 🎯 Role Selection Modal - Implementation Guide

## ✅ What Was Created

### **1. Components Created:**
- ✅ `src/components/RoleSelectionModal.tsx` - Beautiful modal for role selection
- ✅ `src/components/ContactDevsModal.tsx` - New modal for contacting development team
- ✅ CSS animations added to `src/app/globals.css`

### **2. UserContext Updated:**
- ✅ Added `availableRoles` and `activeRole` to `AuthenticatedUser` interface
- ✅ Added `switchRole()` function - Switch roles without re-login
- ✅ Added `setUserRole()` function - Set role after selection
- ✅ Updated `login()` to detect multiple roles

### **3. Landing Page Updated:**
- ✅ Integrated `ContactDevsModal` on `src/app/page.tsx`

---

## 🚀 How to Use in Login Page

### **Step 1: Import the Modal**

```typescript
// In your login page (e.g., src/app/login/page.tsx or wherever you have login)
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/UserContext';
import RoleSelectionModal from '@/components/RoleSelectionModal';
import ContactDevsModal from '@/components/ContactDevsModal'; // Import new modal
```

### **Step 2: Add State for Modal**

```typescript
export default function LoginPage() {
  const { login, setUserRole, user } = useAuth();
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [showContactDevsModal, setShowContactDevsModal] = useState(false); // New state for ContactDevsModal
  
  // ... rest of your existing code
}
```

### **Step 3: Update Login Handler**

```typescript
const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  
  const result = await login(email, password);
  
  // Check if result is an object (could be suspended or requires role selection)
  if (typeof result === 'object') {
    if (result.suspended) {
      // Handle suspension (you probably already have this)
      // showSuspensionModal(result.data);
    } else if (result.requiresRoleSelection) {
      // User has multiple roles - show role selection modal
      setShowRoleSelection(true);
      return; // Don't redirect yet
    }
  } else if (result === true) {
    // Single role login - redirect directly
    redirectToDashboard(user?.role);
  } else {
    // Login failed
    // showErrorMessage();
  }
};
```

### **Step 4: Handle Role Selection**

```typescript
const handleRoleSelected = (selectedRole: string) => {
  // Update user's active role
  setUserRole(selectedRole);
  setShowRoleSelection(false);
  // Router.push is handled inside the modal component
};

const redirectToDashboard = (role?: string) => {
  if (role === 'hr' || role === 'hr-manager') {
    router.push('/hr-dashboard');
  } else if (role === 'employee') {
    router.push('/employee-dashboard');
  } else if (role === 'evaluator' || role === 'manager') {
    router.push('/evaluator');
  } else if (role === 'admin') {
    router.push('/admin');
  } else {
    router.push('/dashboard'); // Default or fallback dashboard
  }
};
```

### **Step 5: Add Modals to JSX**

```typescript
return (
  <div>
    {/* Your existing login form and other components */}
    <form onSubmit={handleLogin}>
      {/* ... inputs and buttons ... */}
    </form>
    
    {/* Role Selection Modal */}
    <RoleSelectionModal
      isOpen={showRoleSelection}
      userName={user?.name || 'User'}
      availableRoles={user?.availableRoles || []}
      onRoleSelectedAction={handleRoleSelected}
    />

    {/* Contact Devs Modal */}
    <ContactDevsModal
      isOpen={showContactDevsModal}
      onCloseAction={() => setShowContactDevsModal(false)}
    />
  </div>
);
```

---

## 📧 **Contact Devs Modal**

### **Purpose:**
Provides a direct way for users to send feedback, report bugs, or make suggestions to the development team from the landing page.

### **Location:**
- **Component:** `src/components/ContactDevsModal.tsx`
- **Integration:** `src/app/page.tsx` (Help Center link in footer)

### **Features:**
- **Form Fields:** User Email, Subject, Message
- **Validation:** All fields required
- **Loading State:** "Sending..." button text during submission
- **Success/Error Toasts:** Feedback messages upon submission
- **Simulated Backend:** Currently uses a `setTimeout` to simulate API call (integrate with your actual backend endpoint)
- **Pop-up Animation:** Uses the `animate-popup` class for a smooth appearance.

### **Integration Steps:**

1.  **Import `ContactDevsModal`** into `src/app/page.tsx`.
2.  **Add `showContactDevsModal` state** to `src/app/page.tsx`:
    ```typescript
    const [showContactDevsModal, setShowContactDevsModal] = useState(false);
    ```
3.  **Update the "Help Center" link** (Line 434 in `src/app/page.tsx`) to open the modal:
    ```typescript
    <li><a href="#" onClick={() => setShowContactDevsModal(true)} className="text-white hover:text-yellow-300">Help Center</a></li>
    ```
4.  **Render `ContactDevsModal`** in the JSX of `src/app/page.tsx`:
    ```typescript
    <ContactDevsModal
      isOpen={showContactDevsModal}
      onCloseAction={() => setShowContactDevsModal(false)}
    />
    ```

---

## 🔄 Adding Role Switching to Dashboard

### **In DashboardShell or Profile Menu:**

```typescript
import { useAuth } from '@/contexts/UserContext';
import { useRouter } from 'next/navigation';
import { DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';

export default function DashboardShell() {
  const { user, switchRole } = useAuth();
  const router = useRouter();
  
  const handleSwitchRole = (newRole: string) => {
    switchRole(newRole);
    
    // Redirect to appropriate dashboard based on the new role
    if (newRole === 'hr' || newRole === 'hr-manager') {
      router.push('/hr-dashboard');
    } else if (newRole === 'employee') {
      router.push('/employee-dashboard');
    } else if (newRole === 'evaluator' || newRole === 'manager') {
      router.push('/evaluator');
    } else if (newRole === 'admin') {
      router.push('/admin');
    } else {
      router.push('/dashboard'); // Default or fallback dashboard
    }
  };
  
  return (
    // In your profile dropdown menu:
    <>
      {/* Existing menu items */}
      
      {/* Show role switching if user has multiple roles */}
      {user?.availableRoles && user.availableRoles.length > 1 && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="px-2 py-1.5 text-xs font-semibold text-gray-500">
            Switch Role
          </DropdownMenuLabel>
          
          {user.availableRoles.includes('hr-manager') && user.activeRole !== 'hr-manager' && (
            <DropdownMenuItem onClick={() => handleSwitchRole('hr-manager')}>
              <span className="mr-2">👔</span>
              Switch to HR Manager
            </DropdownMenuItem>
          )}
          
          {user.availableRoles.includes('hr') && user.activeRole !== 'hr' && (
            <DropdownMenuItem onClick={() => handleSwitchRole('hr')}>
              <span className="mr-2">👔</span>
              Switch to HR
            </DropdownMenuItem>
          )}
          
          {user.availableRoles.includes('employee') && user.activeRole !== 'employee' && (
            <DropdownMenuItem onClick={() => handleSwitchRole('employee')}>
              <span className="mr-2">👤</span>
              Switch to My Profile
            </DropdownMenuItem>
          )}

          {user.availableRoles.includes('manager') && user.activeRole !== 'manager' && (
            <DropdownMenuItem onClick={() => handleSwitchRole('manager')}>
              <span className="mr-2">📊</span>
              Switch to Manager
            </DropdownMenuItem>
          )}

          {user.availableRoles.includes('evaluator') && user.activeRole !== 'evaluator' && (
            <DropdownMenuItem onClick={() => handleSwitchRole('evaluator')}>
              <span className="mr-2">📝</span>
              Switch to Evaluator
            </DropdownMenuItem>
          )}
          
          {user.availableRoles.includes('admin') && user.activeRole !== 'admin' && (
            <DropdownMenuItem onClick={() => handleSwitchRole('admin')}>
              <span className="mr-2">⚙️</span>
              Switch to Admin
            </DropdownMenuItem>
          )}
        </>
      )}
    </>
  );
}
```

---

## 📝 Update Account Data

### **In `src/data/accounts.json`:**

Add `availableRoles` to accounts that should have multiple roles:

```json
{
  "id": 5,
  "email": "sarah@company.com",
  "password": "password123",
  "name": "Sarah Johnson",
  "role": "hr",
  "availableRoles": ["hr", "employee"],
  "employeeId": 1005,
  "position": "HR Manager",
  "department": "Human Resources",
  "branch": "head-office"
}
```

**For single-role users (no modal needed):**
```json
{
  "id": 6,
  "email": "john@company.com",
  "password": "password123",
  "name": "John Doe",
  "role": "employee",
  "employeeId": 1006,
  "position": "Software Engineer",
  "department": "IT"
}
```

---

## 🎨 Modal Features

### **Visual Design:**
- ✨ **Side-by-side cards** - Clean, modern layout
- 🎭 **Animated icons** - Gentle bounce animation
- 🎨 **Hover effects** - Scale and color transitions
- 📱 **Responsive** - Works on mobile and desktop
- 💡 **Helpful tip** - Reminds users they can switch later

### **Behavior:**
- 🚫 **Cannot close** - No X button (must choose a role)
- ⚡ **Auto-redirect** - Navigates to dashboard after selection
- 🔔 **Toast notification** - Shows confirmation when switching roles

---

## 🎯 User Flow Example

```
Sarah (HR Employee) logs in:

1. Enter: sarah@company.com / password123
2. Click "Login"
3. ✅ System detects: availableRoles: ["hr", "employee"]
4. 🎭 Modal appears:
   
   ┌──────────────────────────────────────┐
   │  Welcome back, Sarah! 👋             │
   │  How would you like to continue?     │
   ├──────────────────────────────────────┤
   │                                      │
   │  👔 HR Manager    👤 My Profile     │
   │  [Continue →]     [Continue →]      │
   │                                      │
   └──────────────────────────────────────┘

5. Sarah clicks "👔 HR Manager"
6. → Redirected to /hr-dashboard
7. ✅ Dashboard shows HR view

Later...
8. Sarah clicks profile menu → "Switch to My Profile"
9. 🔔 Toast: "Role Switched - You are now viewing as Employee"
10. → Redirected to /employee-dashboard
11. ✅ Now viewing personal evaluations
```

---

## 🔑 Key Functions Available

### **From UserContext:**

| Function | Purpose | Usage |
|----------|---------|-------|
| `login()` | Login user | Returns `{ requiresRoleSelection: true }` if multiple roles |
| `setUserRole(role)` | Set role after selection | Called from modal after user picks role |
| `switchRole(role)` | Switch active role | Switch without re-login, shows toast |
| `user.availableRoles` | Get available roles | Check if user has multiple roles |
| `user.activeRole` | Get current role | Know which role is active |

---

## ✅ Testing

### **Test Case 1: Single Role User**
```
Login as: john@company.com (only "employee" role)
Expected: Direct redirect to /employee-dashboard
Modal: Should NOT appear ✅
```

### **Test Case 2: Multi-Role User**
```
Login as: sarah@company.com (has ["hr", "employee"])
Expected: Role selection modal appears
Modal: Shows both role options ✅
```

### **Test Case 3: Role Switching**
```
1. Login as HR
2. Go to profile menu
3. Click "Switch to My Profile"
Expected: 
  - Toast notification appears ✅
  - Redirected to employee dashboard ✅
  - Can switch back to HR anytime ✅
```

---

## 🎨 Customization

### **Change Colors:**

```typescript
// In RoleSelectionModal.tsx

// HR Role - Currently blue
className="... hover:border-blue-500 hover:bg-blue-50 ..."

// Employee Role - Currently green
className="... hover:border-green-500 hover:bg-green-50 ..."
```

### **Change Animation Speed:**

```css
/* In src/app/globals.css */
.animate-bounce-slow {
  animation: bounceGentle 2s ease-in-out infinite; /* Change 2s to your preference */
}
```

### **Add More Roles:**

Just update the modal component to include additional role cards:

```typescript
{/* Evaluator Role */}
<button
  onClick={() => {
    onRoleSelected('evaluator');
    router.push('/evaluator');
  }}
  className="..."
>
  <div className="text-6xl mb-4">📊</div>
  <h3>Evaluator</h3>
  <p>Review and approve evaluations</p>
</button>
```

---

## 📋 Complete Example - Login Page

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/UserContext';
import RoleSelectionModal from '@/components/RoleSelectionModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ContactDevsModal from '@/components/ContactDevsModal';

export default function LoginPage() {
  const { login, setUserRole, user } = useAuth();
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [showContactDevsModal, setShowContactDevsModal] = useState(false);
  const [error, setError] = useState('');
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const result = await login(email, password);
    
    if (typeof result === 'object') {
      if (result.suspended) {
        setError('Account is suspended');
      } else if (result.requiresRoleSelection) {
        setShowRoleSelection(true);
      }
    } else if (result === true) {
      // Single role - redirect
      const role = user?.role;
      if (role === 'hr' || role === 'hr-manager') router.push('/hr-dashboard');
      else if (role === 'employee') router.push('/employee-dashboard');
      else if (role === 'evaluator' || role === 'manager') router.push('/evaluator');
      else if (role === 'admin') router.push('/admin');
    } else {
      setError('Invalid credentials');
    }
  };
  
  const handleRoleSelected = (role: string) => {
    setUserRole(role);
    setShowRoleSelection(false);
  };
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <form onSubmit={handleLogin} className="w-full max-w-md space-y-4">
        <h1 className="text-2xl font-bold">Login</h1>
        
        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        
        {error && <p className="text-red-500 text-sm">{error}</p>}
        
        <Button type="submit" className="w-full">
          Login
        </Button>
      </form>
      
      <RoleSelectionModal
        isOpen={showRoleSelection}
        userName={user?.name || 'User'}
        availableRoles={user?.availableRoles || []}
        onRoleSelectedAction={handleRoleSelected}
      />

      <ContactDevsModal
        isOpen={showContactDevsModal}
        onCloseAction={() => setShowContactDevsModal(false)}
      />
    </div>
  );
}
```

---

## 🎉 Done!

Your role selection modal is ready to use! Users with multiple roles will see a beautiful modal to choose their role, and they can switch roles anytime from the dashboard.

**Created:** October 23, 2025  
**Status:** ✅ Ready to Integrate

