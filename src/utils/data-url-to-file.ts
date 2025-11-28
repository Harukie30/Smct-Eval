export function dataURLtoFile(dataURL: any, filename: string) {
  if (!dataURL) {
    throw new Error("Data URL is required");
  }

  const arr = dataURL.split(",");
  if (!arr || arr.length < 2) {
    throw new Error("Invalid data URL format");
  }

  const mimeMatch = arr[0]?.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "image/png"; // Default to PNG if mime type not found
  
  if (!arr[1]) {
    throw new Error("Invalid data URL: missing base64 data");
  }

  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  return new File([u8arr], filename, { type: mime });
}