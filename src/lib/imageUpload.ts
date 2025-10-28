import clientDataService from './clientDataService.api';

export async function uploadProfileImage(file: File): Promise<any | null> {
  try {
    // Use client-side image upload (converts to data URL)
    const imageUrl = await clientDataService.uploadAvatar(file);
    return imageUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
}

// export async function deleteProfileImage(imageUrl: string): Promise<void> {
//   try {
//     // In client-side mode, we don't need to delete from server
//     // The image is stored as data URL in localStorage
//     console.log('Image deletion not needed in client-side mode:', imageUrl);
//   } catch (error) {
//     console.error('Error deleting image:', error);
//     throw error;
//   }
// }
