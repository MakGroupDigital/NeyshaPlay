// Cloudinary configuration and utilities

export const cloudinaryConfig = {
  cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'doe4jempg',
  apiKey: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY || '828292343673526',
  apiSecret: process.env.CLOUDINARY_API_SECRET,
  uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'neyshaplay_videos',
  url: process.env.CLOUDINARY_URL,
};

export interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  resource_type: string;
  format: string;
  width: number;
  height: number;
  duration?: number;
  thumbnail_url?: string;
}

/**
 * Upload video to Cloudinary with optimistic UI support
 */
export async function uploadVideoToCloudinary(
  file: Blob,
  onProgress?: (progress: number) => void
): Promise<CloudinaryUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', cloudinaryConfig.uploadPreset!);
  formData.append('resource_type', 'video');
  
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const progress = (e.loaded / e.total) * 100;
        onProgress(progress);
      }
    });
    
    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText);
        resolve(response);
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });
    
    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed'));
    });
    
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/upload`);
    xhr.send(formData);
  });
}

/**
 * Generate thumbnail URL from Cloudinary video
 */
export function getVideoThumbnail(publicId: string): string {
  return `https://res.cloudinary.com/${cloudinaryConfig.cloudName}/video/upload/so_0,w_400,h_600,c_fill/${publicId}.jpg`;
}
