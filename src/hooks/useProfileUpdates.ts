import { useEffect, useState, useCallback } from 'react';
import { profileUpdateManager, ProfileUpdateEvent } from '@/lib/profileService';

export interface ProfileUpdateData {
  profileId: number;
  updatedData: Partial<any>;
  timestamp: number;
}

export function useProfileUpdates() {
  const [profileUpdates, setProfileUpdates] = useState<ProfileUpdateData[]>([]);
  const [lastUpdate, setLastUpdate] = useState<number>(0);

  useEffect(() => {
    const unsubscribe = profileUpdateManager.subscribe((event: ProfileUpdateEvent) => {
      console.log('🔄 Profile update received:', event);
      
      setProfileUpdates(prev => [
        ...prev.filter(update => update.profileId !== event.profileId), // Remove old updates for this profile
        {
          profileId: event.profileId,
          updatedData: event.updatedData,
          timestamp: event.timestamp
        }
      ]);
      
      setLastUpdate(event.timestamp);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const getProfileUpdate = useCallback((profileId: number) => {
    return profileUpdates.find(update => update.profileId === profileId);
  }, [profileUpdates]);

  const clearProfileUpdate = useCallback((profileId: number) => {
    setProfileUpdates(prev => prev.filter(update => update.profileId !== profileId));
  }, []);

  const clearAllUpdates = useCallback(() => {
    setProfileUpdates([]);
  }, []);

  return {
    profileUpdates,
    lastUpdate,
    getProfileUpdate,
    clearProfileUpdate,
    clearAllUpdates
  };
}

// Hook specifically for profile picture updates
export function useProfilePictureUpdates() {
  const { profileUpdates, getProfileUpdate } = useProfileUpdates();
  const [updatedAvatars, setUpdatedAvatars] = useState<Map<number, string>>(new Map());

  useEffect(() => {
    profileUpdates.forEach(update => {
      if (update.updatedData.avatar) {
        setUpdatedAvatars(prev => new Map(prev.set(update.profileId, update.updatedData.avatar!)));
        console.log('🖼️ Avatar updated for profile:', update.profileId, update.updatedData.avatar);
      }
    });
  }, [profileUpdates]);

  const getUpdatedAvatar = useCallback((profileId: number, fallbackAvatar?: string) => {
    return updatedAvatars.get(profileId) || fallbackAvatar;
  }, [updatedAvatars]);

  const hasAvatarUpdate = useCallback((profileId: number) => {
    return updatedAvatars.has(profileId);
  }, [updatedAvatars]);

  return {
    getUpdatedAvatar,
    hasAvatarUpdate,
    updatedAvatars
  };
}
