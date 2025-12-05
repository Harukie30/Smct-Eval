export function dataURLtoFile(dataURL: any, filename: string): File {
  // Validate input
  if (!dataURL || typeof dataURL !== 'string') {
    throw new Error('Invalid dataURL: must be a non-empty string');
  }

  if (!dataURL.startsWith('data:')) {
    throw new Error('Invalid dataURL: must start with "data:"');
  }

  // Split data URL into header and base64 data
  const arr = dataURL.split(",");
  
  if (arr.length < 2) {
    throw new Error('Invalid dataURL: missing base64 data');
  }

  // Extract MIME type from header (e.g., "data:image/png;base64")
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png'; // Default to PNG if not found
  
  // Decode base64 string to binary
  let bstr: string;
  try {
    bstr = atob(arr[1]);
  } catch (error) {
    throw new Error('Invalid base64 data in dataURL');
  }

  // Convert binary string to Uint8Array
  const n = bstr.length;
  const u8arr = new Uint8Array(n);

  for (let i = 0; i < n; i++) {
    u8arr[i] = bstr.charCodeAt(i);
  }

  // Create and return File object
  return new File([u8arr], filename, { type: mime });
}