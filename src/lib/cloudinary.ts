// Cloudinary configuration and utilities

export const cloudinaryConfig = {
  cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'doe4jempg',
  apiKey: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY || '828292343673526',
  apiSecret: process.env.CLOUDINARY_API_SECRET,
  uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'neyshaplay_videos',
  imageUploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_IMAGE_UPLOAD_PRESET,
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
  onProgress?: (progress: number) => void,
  folder = 'videos'
): Promise<CloudinaryUploadResponse> {
  if (!cloudinaryConfig.cloudName) {
    throw new Error('Configuration Cloudinary video incomplete');
  }

  const formData = new FormData();
  formData.append('file', file, 'kyc-selfie.webm');
  let uploadCloudName = cloudinaryConfig.cloudName;
  let uploadEndpoint = `https://api.cloudinary.com/v1_1/${uploadCloudName}/video/upload`;

  try {
    const signatureResponse = await fetch('/api/cloudinary/sign-video-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder }),
    });

    if (signatureResponse.ok) {
      const signedUpload = await signatureResponse.json();
      uploadCloudName = signedUpload.cloudName || uploadCloudName;
      formData.append('api_key', signedUpload.apiKey);
      formData.append('timestamp', String(signedUpload.timestamp));
      formData.append('signature', signedUpload.signature);
      formData.append('folder', signedUpload.folder);
      uploadEndpoint = `https://api.cloudinary.com/v1_1/${uploadCloudName}/video/upload`;
    } else if (cloudinaryConfig.uploadPreset) {
      formData.append('upload_preset', cloudinaryConfig.uploadPreset);
      uploadEndpoint = `https://api.cloudinary.com/v1_1/${uploadCloudName}/upload`;
    } else {
      const response = await signatureResponse.json().catch(() => null);
      throw new Error(response?.error || 'Configuration Cloudinary video incomplete');
    }
  } catch (error) {
    if (cloudinaryConfig.uploadPreset && !formData.get('upload_preset')) {
      formData.append('upload_preset', cloudinaryConfig.uploadPreset);
      uploadEndpoint = `https://api.cloudinary.com/v1_1/${uploadCloudName}/upload`;
    } else {
      throw error;
    }
  }
  
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
        let message = `Upload failed with status ${xhr.status}`;
        try {
          const response = JSON.parse(xhr.responseText);
          message = response?.error?.message || message;
        } catch {
          // ignore
        }
        reject(new Error(message));
      }
    });
    
    xhr.addEventListener('error', () => {
      reject(new Error('Upload Cloudinary impossible. Vérifiez la connexion ou la configuration Cloudinary.'));
    });
    
    xhr.open('POST', uploadEndpoint);
    xhr.send(formData);
  });
}

/**
 * Upload image to Cloudinary.
 */
export async function uploadImageToCloudinary(
  file: Blob,
  onProgress?: (progress: number) => void
): Promise<CloudinaryUploadResponse> {
  if (!cloudinaryConfig.cloudName) {
    throw new Error('Configuration Cloudinary image incomplete');
  }

  const formData = new FormData();
  formData.append('file', file, 'profile-avatar.png');

  let uploadCloudName = cloudinaryConfig.cloudName;
  try {
    const signatureResponse = await fetch('/api/cloudinary/sign-image-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (signatureResponse.ok) {
      const signedUpload = await signatureResponse.json();
      uploadCloudName = signedUpload.cloudName || uploadCloudName;
      formData.append('api_key', signedUpload.apiKey);
      formData.append('timestamp', String(signedUpload.timestamp));
      formData.append('signature', signedUpload.signature);
      formData.append('folder', signedUpload.folder);
    } else if (cloudinaryConfig.imageUploadPreset) {
      formData.append('upload_preset', cloudinaryConfig.imageUploadPreset);
    } else {
      const response = await signatureResponse.json().catch(() => null);
      throw new Error(
        response?.error ||
          'Configurez CLOUDINARY_API_SECRET ou NEXT_PUBLIC_CLOUDINARY_IMAGE_UPLOAD_PRESET pour les photos.'
      );
    }
  } catch (error: any) {
    if (cloudinaryConfig.imageUploadPreset && formData.get('upload_preset') !== cloudinaryConfig.imageUploadPreset) {
      formData.append('upload_preset', cloudinaryConfig.imageUploadPreset);
    } else {
      throw error;
    }
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress((e.loaded / e.total) * 100);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        let message = `Upload failed with status ${xhr.status}`;
        try {
          const response = JSON.parse(xhr.responseText);
          message = response?.error?.message || message;
        } catch {
          // ignore
        }
        reject(new Error(message));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed'));
    });

    xhr.open('POST', `https://api.cloudinary.com/v1_1/${uploadCloudName}/image/upload`);
    xhr.send(formData);
  });
}

/**
 * Generate thumbnail URL from Cloudinary video
 */
export function getVideoThumbnail(publicId: string): string {
  return `https://res.cloudinary.com/${cloudinaryConfig.cloudName}/video/upload/so_0,w_400,h_600,c_fill/${publicId}.jpg`;
}
