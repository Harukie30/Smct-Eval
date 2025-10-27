# HOC Usage Guide

This guide shows how to use the Higher-Order Components (HOCs) to wrap your pages.

## 📚 Available HOCs

### 1. `withAuth` - Simple Authentication
For pages that just need auth check (backend handles roles).

### 2. `withDashboard` - Dashboard with Auth
For dashboard pages that need authentication AND the dashboard shell.

### 3. `withPage` - Universal Page Wrapper
Flexible HOC that can handle auth, dashboard, transitions, etc.

### 4. Preset HOCs
- `withDashboardPage` - Quick dashboard setup
- `withAuthPage` - Quick auth setup
- `withPublicPage` - Public page with transitions

---

## 🎯 Usage Examples

### Example 1: Simple Authenticated Page

```typescript
// src/app/profile/page.tsx
'use client';

import { withAuthPage } from '@/hoc';

function ProfilePage() {
  return (
    <div>
      <h1>User Profile</h1>
      {/* Your content */}
    </div>
  );
}

export default withAuthPage(ProfilePage);
```

---

### Example 2: Admin Dashboard (Full Featured)

```typescript
// src/app/admin/page.tsx
'use client';

import { withDashboardPage } from '@/hoc';
import { SidebarItem } from '@/components/DashboardShell';

function AdminDashboard() {
  return (
    <div>
      <h1>Welcome Admin</h1>
      {/* Your dashboard content */}
    </div>
  );
}

const sidebarItems: SidebarItem[] = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'users', label: 'Users', icon: '👥' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

export default withDashboardPage(AdminDashboard, {
  requiredRole: 'admin',
  title: 'Admin Dashboard',
  sidebarItems
});
```

---

### Example 3: Employee Dashboard

```typescript
// src/app/employee-dashboard/page.tsx
'use client';

import { withDashboardPage } from '@/hoc';

function EmployeeDashboard() {
  // Your existing component code
  return <div>Employee Dashboard Content</div>;
}

export default withDashboardPage(EmployeeDashboard, {
  requiredRole: 'employee',
  title: 'Employee Dashboard',
  sidebarItems: [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'reviews', label: 'Reviews', icon: '📝' },
    { id: 'goals', label: 'Goals', icon: '🎯' },
  ]
});
```

---

### Example 4: Evaluator Dashboard (Multiple Roles)

```typescript
// src/app/evaluator/page.tsx
'use client';

import { withDashboardPage } from '@/hoc';

function EvaluatorDashboard() {
  return <div>Evaluator Content</div>;
}

export default withDashboardPage(EvaluatorDashboard, {
  requiredRole: ['evaluator', 'manager'], // Multiple roles allowed
  title: 'Evaluator Dashboard',
  sidebarItems: [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'employees', label: 'Employees', icon: '👥' },
    { id: 'feedback', label: 'Evaluation Records', icon: '🗂️' },
  ]
});
```

---

### Example 5: Backend Handles Roles (Simple Auth)

```typescript
// src/app/dashboard/page.tsx
'use client';

import { withSimpleAuth } from '@/hoc';

function Dashboard() {
  // Backend will handle role checks via API
  return <div>Dashboard</div>;
}

// Just checks if user is logged in
export default withSimpleAuth(Dashboard);
```

---

### Example 6: Custom Configuration (Advanced)

```typescript
// src/app/reports/page.tsx
'use client';

import { withPage } from '@/hoc';

function ReportsPage() {
  return <div>Reports</div>;
}

export default withPage(ReportsPage, {
  requireAuth: true,
  requiredRole: ['admin', 'hr'],
  useDashboardShell: true,
  dashboardTitle: 'Reports Center',
  usePageTransition: true,
  sidebarItems: [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'analytics', label: 'Analytics', icon: '📈' },
  ]
});
```

---

### Example 7: Public Page (No Auth)

```typescript
// src/app/about/page.tsx
'use client';

import { withPublicPage } from '@/hoc';

function AboutPage() {
  return (
    <div>
      <h1>About Us</h1>
      <p>Company information...</p>
    </div>
  );
}

export default withPublicPage(AboutPage);
```

---

### Example 8: Page Without Dashboard Shell (Auth Only)

```typescript
// src/app/settings/page.tsx
'use client';

import { withDashboard } from '@/hoc';

function SettingsPage() {
  return <div>Settings Page with custom layout</div>;
}

export default withDashboard(SettingsPage, {
  requiredRole: 'employee',
  showShell: false // Disable dashboard shell
});
```

---

## 🔄 Migration from ProtectedRoute

### Before (Component Wrapper):
```typescript
import ProtectedRoute from '@/components/ProtectedRoute';

export default function AdminPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <div>Admin Content</div>
    </ProtectedRoute>
  );
}
```

### After (HOC):
```typescript
import { withAuthPage } from '@/hoc';

function AdminPage() {
  return <div>Admin Content</div>;
}

export default withAuthPage(AdminPage, 'admin');
```

---

## 🎨 Best Practices

### ✅ DO:
- Use `withDashboardPage` for dashboard pages
- Use `withAuthPage` for simple authenticated pages
- Use `withSimpleAuth` when backend handles roles
- Keep component logic separate from HOC wrapper

### ❌ DON'T:
- Mix multiple HOC patterns (choose one approach)
- Add business logic inside HOCs
- Nest HOCs unnecessarily

---

## 🔍 Quick Reference

| Use Case | HOC to Use | Example |
|----------|------------|---------|
| **Dashboard with auth** | `withDashboardPage` | Admin, Employee, Evaluator dashboards |
| **Simple auth page** | `withAuthPage` | Profile, Settings pages |
| **Backend handles roles** | `withSimpleAuth` | When API checks permissions |
| **Public page** | `withPublicPage` | Landing, About pages |
| **Custom setup** | `withPage` | Complex requirements |

---

## 📝 TypeScript Support

All HOCs preserve your component's prop types:

```typescript
interface MyPageProps {
  customProp: string;
}

function MyPage({ customProp }: MyPageProps) {
  return <div>{customProp}</div>;
}

// Props are preserved!
export default withAuthPage(MyPage);
```

---

## 🚀 Performance Tips

1. **Code splitting** - HOCs support dynamic imports
2. **Memoization** - Use `React.memo()` with your components
3. **Lazy loading** - Combine with `next/dynamic`

```typescript
import dynamic from 'next/dynamic';
import { withDashboardPage } from '@/hoc';

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <div>Loading...</div>
});

function Dashboard() {
  return <HeavyComponent />;
}

export default withDashboardPage(Dashboard, {
  requiredRole: 'admin'
});
```

