// src/hooks/useTabLoading.ts
// Custom hook for managing tab loading states

import { useState, useCallback } from 'react';

interface TabLoadingState {
  [tabId: string]: boolean;
}

export const useTabLoading = () => {
  const [loadingStates, setLoadingStates] = useState<TabLoadingState>({});
  const [lastLoadedTab, setLastLoadedTab] = useState<string | null>(null);

  const setTabLoading = useCallback((tabId: string, isLoading: boolean) => {
    setLoadingStates(prev => ({
      ...prev,
      [tabId]: isLoading
    }));
  }, []);

  const isTabLoading = useCallback((tabId: string) => {
    return loadingStates[tabId] || false;
  }, [loadingStates]);

  const handleTabChange = useCallback(async (
    tabId: string,
    refreshFunction?: () => Promise<void> | void,
    options: {
      showLoading?: boolean;
      loadingDuration?: number;
      skipIfRecentlyLoaded?: boolean;
    } = {}
  ) => {
    const {
      showLoading = true,
      loadingDuration = 500,
      skipIfRecentlyLoaded = true
    } = options;

    // Skip loading if tab was recently loaded (within 5 seconds)
    if (skipIfRecentlyLoaded && lastLoadedTab === tabId) {
      const timeSinceLastLoad = Date.now() - (window as any).lastTabLoadTime?.[tabId] || 0;
      if (timeSinceLastLoad < 5000) {
        return;
      }
    }

    if (showLoading) {
      setTabLoading(tabId, true);
    }

    try {
      if (refreshFunction) {
        await refreshFunction();
      }

      // Track when tab was last loaded
      if (!(window as any).lastTabLoadTime) {
        (window as any).lastTabLoadTime = {};
      }
      (window as any).lastTabLoadTime[tabId] = Date.now();
      setLastLoadedTab(tabId);

    } catch (error) {
      console.error(`Error loading tab ${tabId}:`, error);
    } finally {
      if (showLoading) {
        // Ensure minimum loading time for better UX
        setTimeout(() => {
          setTabLoading(tabId, false);
        }, loadingDuration);
      }
    }
  }, [lastLoadedTab]);

  const clearLoadingState = useCallback((tabId: string) => {
    setTabLoading(tabId, false);
  }, []);

  const clearAllLoadingStates = useCallback(() => {
    setLoadingStates({});
  }, []);

  return {
    loadingStates,
    isTabLoading,
    setTabLoading,
    handleTabChange,
    clearLoadingState,
    clearAllLoadingStates
  };
};
