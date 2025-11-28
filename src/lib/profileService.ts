import { UserProfile } from '@/components/ProfileCard';
import { apiService } from './apiService';
import { Profile } from './types';

// Event system for profile updates
export type ProfileUpdateEvent = {
  type: 'PROFILE_UPDATED';
  profileId: number;
  updatedData: Partial<UserProfile>;
  timestamp: number;
};

class ProfileUpdateManager {
  private listeners: Set<(event: ProfileUpdateEvent) => void> = new Set();

  subscribe(listener: (event: ProfileUpdateEvent) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(event: ProfileUpdateEvent) {
    this.listeners.forEach(listener => listener(event));
  }
}

export const profileUpdateManager = new ProfileUpdateManager();

export async function updateProfile(profileId: string, profileData: Partial<UserProfile>): Promise<UserProfile> {
  try {
    console.log('Updating profile with ID:', profileId);
    console.log('Profile data to update:', profileData);
    
    // Convert UserProfile data to Profile format for clientDataService
    const profileUpdates: Partial<Profile> = {
      ...profileData,
      id: parseInt(profileId)
    };
    
    const updatedProfile = await apiService.updateProfile(parseInt(profileId), profileUpdates);
    console.log('Profile updated successfully:', updatedProfile);
    
    // Notify all listeners about the profile update
    profileUpdateManager.notify({
      type: 'PROFILE_UPDATED',
      profileId: parseInt(profileId),
      updatedData: profileData,
      timestamp: Date.now()
    });
    
    return updatedProfile as UserProfile;
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
}

export async function getProfile(profileId: string): Promise<UserProfile | null> {
  try {
    console.log('Fetching profile with ID:', profileId);
    const profile = await apiService.getProfile(parseInt(profileId));
    
    console.log('Profile data received:', profile);
    return profile as UserProfile | null;
  } catch (error) {
    console.error('Error fetching profile:', error);
    throw error;
  }
}
