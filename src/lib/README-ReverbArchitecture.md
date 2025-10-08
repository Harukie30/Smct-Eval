# Reverb-Style Architecture Implementation

This document explains the Reverb-style architecture implementation for the SMCT Evaluation System, featuring automatic revalidation, optimistic updates, and real-time capabilities.

## 🚀 What is Reverb-Style Architecture?

Reverb-style architecture combines:
- **Automatic revalidation** with SWR
- **Optimistic updates** for instant UI feedback
- **Real-time updates** via WebSockets
- **Background synchronization** with conflict resolution
- **Offline resilience** with retry mechanisms

## 📁 File Structure

```
src/
├── hooks/
│   ├── useEvaluationRecordsSWR.ts     # SWR-based hooks with revalidation
│   └── useRealtimeUpdates.ts          # WebSocket real-time updates
├── components/
│   └── (Example components removed)
└── lib/
    └── README-ReverbArchitecture.md   # This documentation
```

## 🔧 Key Features

### 1. Automatic Revalidation
```typescript
const swrConfig: SWRConfiguration = {
  refreshInterval: 30000,        // Auto-refresh every 30 seconds
  revalidateOnFocus: true,       // Refresh when user focuses tab
  revalidateOnReconnect: true,   // Refresh when connection restored
  dedupingInterval: 10000,       // Dedupe requests within 10 seconds
  errorRetryCount: 3,            // Retry failed requests 3 times
  errorRetryInterval: 5000,      // Wait 5 seconds between retries
};
```

### 2. Optimistic Updates
```typescript
// Instant UI updates before server response
const { approveWithSignatureOptimistic } = useOptimisticEmployeeApproval();

await approveWithSignatureOptimistic(recordId, approvalData);
// UI updates immediately, server syncs in background
```

### 3. Real-time Updates
```typescript
// WebSocket connection for live updates
const { isConnected } = useRealtimeEvaluationUpdates(true);

// Automatic cache updates on real-time events
// - evaluation_created
// - evaluation_updated  
// - evaluation_deleted
// - approval_added
```

## 🎯 Usage Examples

### Basic SWR Hook
```typescript
import { useEvaluationRecordsSWR } from '@/hooks/useEvaluationRecordsSWR';

function MyComponent() {
  const { records, loading, error, refetch } = useEvaluationRecordsSWR();
  
  // Automatic revalidation every 30 seconds
  // Revalidation on focus/reconnect
  // Error retry with exponential backoff
}
```

### Optimistic Updates
```typescript
import { useOptimisticEmployeeApproval } from '@/hooks/useEvaluationRecordsSWR';

function ApprovalComponent() {
  const { approveWithSignatureOptimistic } = useOptimisticEmployeeApproval();
  
  const handleApprove = async (recordId, data) => {
    // UI updates immediately
    await approveWithSignatureOptimistic(recordId, data);
    // Server syncs in background
  };
}
```

### Real-time Updates
```typescript
import { useRealtimeEvaluationUpdates } from '@/hooks/useRealtimeUpdates';

function RealtimeComponent() {
  const { isConnected } = useRealtimeEvaluationUpdates(true);
  
  // Automatically receives updates via WebSocket
  // Cache updates happen automatically
}
```

## 🔄 Migration from Old Hooks

### Before (Manual Refetch)
```typescript
const { records, loading, error, refetch } = useEvaluationRecords();

// Manual refetch after mutations
const handleApproval = async () => {
  await approveRecord();
  refetch(); // Manual refresh
};
```

### After (Reverb-Style)
```typescript
const { records, loading, error, refetch } = useEvaluationRecordsSWR();

// Automatic revalidation + optimistic updates
const { approveWithSignatureOptimistic } = useOptimisticEmployeeApproval();

const handleApproval = async () => {
  // Instant UI update + automatic background sync
  await approveWithSignatureOptimistic(recordId, data);
};
```

## 🌐 WebSocket Integration

### Server Requirements
Your backend should support WebSocket connections at:
```
ws://localhost:3001/evaluations
```

### Message Format
```typescript
interface RealtimeUpdate {
  type: 'evaluation_created' | 'evaluation_updated' | 'evaluation_deleted' | 'approval_added';
  record: EvaluationRecord;
  timestamp: string;
  userId?: string;
}
```

### Example Server Message
```json
{
  "type": "evaluation_updated",
  "record": {
    "id": 123,
    "status": "completed",
    "lastModified": "2024-01-15T10:30:00Z"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## 🎨 Component Integration

### Example Components Removed
```typescript
// Example components have been removed to keep the codebase clean
// Use the main components directly:
const { records, loading, error, refetch } = useEvaluationRecordsSWR();
const { stats } = useEvaluationRecordsStatsSWR();
const { isConnected } = useRealtimeEvaluationUpdates(true);

// Real-time status indicator
<div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
```

## 🔧 Configuration Options

### SWR Configuration
```typescript
const swrConfig: SWRConfiguration = {
  refreshInterval: 30000,        // Auto-refresh interval
  revalidateOnFocus: true,       // Refresh on window focus
  revalidateOnReconnect: true,   // Refresh on network reconnect
  dedupingInterval: 10000,       // Request deduplication
  errorRetryCount: 3,            // Retry attempts
  errorRetryInterval: 5000,     // Retry delay
};
```

### WebSocket Configuration
```typescript
const wsConfig = {
  url: 'ws://localhost:3001/evaluations',
  maxReconnectAttempts: 5,
  reconnectDelay: 3000,
  autoConnect: true
};
```

## 🚀 Benefits

### For Users
- **Instant feedback** with optimistic updates
- **Always fresh data** with automatic revalidation
- **Real-time collaboration** with WebSocket updates
- **Offline resilience** with retry mechanisms

### For Developers
- **Reduced boilerplate** with SWR hooks
- **Automatic cache management** 
- **Built-in error handling**
- **Easy testing** with manual triggers

### For Backend
- **Reduced server load** with smart caching
- **Better scalability** with WebSocket connections
- **Conflict resolution** for concurrent edits
- **Real-time notifications** for stakeholders

## 🧪 Testing

### Manual Testing
```typescript
// Test optimistic updates
const { triggerUpdate } = useManualRealtimeUpdate();
triggerUpdate({
  type: 'evaluation_updated',
  record: updatedRecord,
  timestamp: new Date().toISOString()
});
```

### Connection Testing
```typescript
// Test WebSocket connection
const { isConnected, reconnectAttempts } = useRealtimeConnectionStatus();
console.log('Connected:', isConnected, 'Attempts:', reconnectAttempts);
```

## 🔮 Future Enhancements

1. **Conflict Resolution** - Handle concurrent edits
2. **Offline Support** - Queue updates when offline
3. **Push Notifications** - Browser notifications for updates
4. **Analytics** - Track revalidation patterns
5. **Performance Monitoring** - SWR metrics and insights

## 📚 Resources

- [SWR Documentation](https://swr.vercel.app/)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [React Query vs SWR](https://swr.vercel.app/docs/comparison)
- [Optimistic Updates Pattern](https://swr.vercel.app/docs/mutation#optimistic-updates)

---

This Reverb-style architecture provides a modern, efficient, and user-friendly approach to data management in your evaluation system. The combination of automatic revalidation, optimistic updates, and real-time capabilities creates a seamless user experience while reducing server load and improving performance.
