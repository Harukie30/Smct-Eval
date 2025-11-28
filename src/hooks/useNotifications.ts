import { useState, useEffect, useCallback } from 'react';
import { apiService } from '@/lib/apiService';
import { useUser } from '@/contexts/UserContext';
import { Notification } from '@/lib/types';

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markAsRead: (notificationId: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

export const useNotifications = (userRole: string): UseNotificationsReturn => {
  const { user, refreshUser } = useUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get notifications from user profile (backend includes them)
      const notificationsData = (user as any)?.notifications || [];
      
      // Get unread count from backend
      const unreadCountData = await apiService.getUnreadNotificationCount(userRole);
      
      setNotifications(notificationsData);
      setUnreadCount(unreadCountData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications');
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [user, userRole]);

  const markAsRead = useCallback(async (notificationId: number) => {
    try {
      await apiService.markNotificationAsRead(notificationId);
      
      // Refresh user to get updated notifications
      await refreshUser();
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, isRead: true }
            : notification
        )
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }, [refreshUser]);

  const markAllAsRead = useCallback(async () => {
    try {
      await apiService.markAllNotificationsAsRead(userRole);
      
      // Refresh user to get updated notifications
      await refreshUser();
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, isRead: true }))
      );
      
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  }, [userRole, refreshUser]);

  const refreshNotifications = useCallback(async () => {
    await fetchNotifications();
  }, [fetchNotifications]);

  // Update notifications when user changes
  useEffect(() => {
    if (user) {
      const notificationsData = (user as any)?.notifications || [];
      setNotifications(notificationsData);
      
      // Calculate unread count from notifications
      const unread = notificationsData.filter((n: Notification) => !n.isRead).length;
      setUnreadCount(unread);
      setLoading(false);
    }
  }, [user]);

  // Initial load
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Listen for storage events (real-time updates across tabs)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'authUser' && e.newValue) {
        // Refresh user (which includes notifications) when authUser changes
        refreshUser();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [refreshUser]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    refreshNotifications
  };
};

export default useNotifications;
