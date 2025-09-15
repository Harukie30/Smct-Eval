import { UserProfile } from '@/components/ProfileCard';
import clientDataService from './clientDataService';

export async function updateProfile(profileId: string, profileData: Partial<UserProfile>): Promise<UserProfile> {
  try {
    console.log('Updating profile with ID:', profileId);
    console.log('Profile data to update:', profileData);
    
    const updatedProfile = await clientDataService.updateProfile(parseInt(profileId), profileData);
    console.log('Profile updated successfully:', updatedProfile);
    
    return updatedProfile as UserProfile;
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
}

export async function getProfile(profileId: string): Promise<UserProfile | null> {
  try {
    console.log('Fetching profile with ID:', profileId);
    const profile = await clientDataService.getProfile(parseInt(profileId));
    
    console.log('Profile data received:', profile);
    return profile as UserProfile | null;
  } catch (error) {
    console.error('Error fetching profile:', error);
    throw error;
  }
}
