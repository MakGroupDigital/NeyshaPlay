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

const LARGE_VIDEO_THRESHOLD_BYTES = 95 * 1024 * 1024;
const LARGE_VIDEO_CHUNK_BYTES = 18 * 1024 * 1024;

type UploadAuth = {
  cloudName: string;
  uploadEndpoint: string;
  fields: Record<string, string>;
};

async function getVideoUploadAuth(folder: string): Promise<UploadAuth> {
  let uploadCloudName = cloudinaryConfig.cloudName;
  let uploadEndpoint = `https://api.cloudinary.com/v1_1/${uploadCloudName}/video/upload`;
  const fields: Record<string, string> = {};

  try {
    const signatureResponse = await fetch('/api/cloudinary/sign-video-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder }),
    });

    if (signatureResponse.ok) {
      const signedUpload = await signatureResponse.json();
      uploadCloudName = signedUpload.cloudName || uploadCloudName;
      fields.api_key = signedUpload.apiKey;
      fields.timestamp = String(signedUpload.timestamp);
      fields.signature = signedUpload.signature;
      fields.folder = signedUpload.folder;
      uploadEndpoint = `https://api.cloudinary.com/v1_1/${uploadCloudName}/video/upload`;
    } else if (cloudinaryConfig.uploadPreset) {
      fields.upload_preset = cloudinaryConfig.uploadPreset;
      uploadEndpoint = `https://api.cloudinary.com/v1_1/${uploadCloudName}/upload`;
    } else {
      const response = await signatureResponse.json().catch(() => null);
      throw new Error(response?.error || 'Configuration Cloudinary video incomplete');
    }
  } catch (error) {
    if (cloudinaryConfig.uploadPreset && !fields.upload_preset) {
      fields.upload_preset = cloudinaryConfig.uploadPreset;
      uploadEndpoint = `https://api.cloudinary.com/v1_1/${uploadCloudName}/upload`;
    } else {
      throw error;
    }
  }

  return { cloudName: uploadCloudName, uploadEndpoint, fields };
}

function appendUploadFields(formData: FormData, fields: Record<string, string>) {
  Object.entries(fields).forEach(([key, value]) => formData.append(key, value));
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

  if (file.size > LARGE_VIDEO_THRESHOLD_BYTES) {
    return uploadLargeVideoToCloudinary(file, onProgress, folder);
  }

  const { uploadEndpoint, fields } = await getVideoUploadAuth(folder);
  const formData = new FormData();
  formData.append('file', file, file instanceof File ? file.name : 'neysha-video.webm');
  appendUploadFields(formData, fields);
  
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

async function uploadLargeVideoToCloudinary(
  file: Blob,
  onProgress?: (progress: number) => void,
  folder = 'videos'
): Promise<CloudinaryUploadResponse> {
  const { uploadEndpoint, fields } = await getVideoUploadAuth(folder);
  const uploadId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const total = file.size;
  let start = 0;
  let lastResponse: CloudinaryUploadResponse | null = null;

  while (start < total) {
    const end = Math.min(start + LARGE_VIDEO_CHUNK_BYTES, total) - 1;
    const chunk = file.slice(start, end + 1);
    const formData = new FormData();
    formData.append('file', chunk, file instanceof File ? file.name : 'neysha-video-large.mp4');
    appendUploadFields(formData, fields);

    lastResponse = await new Promise<CloudinaryUploadResponse>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const uploadedBeforeChunk = start;
          onProgress(((uploadedBeforeChunk + e.loaded) / total) * 100);
        }
      });
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
          return;
        }
        let message = `Upload failed with status ${xhr.status}`;
        try {
          const response = JSON.parse(xhr.responseText);
          message = response?.error?.message || message;
        } catch {
          // ignore
        }
        reject(new Error(message));
      });
      xhr.addEventListener('error', () => {
        reject(new Error('Upload Cloudinary impossible. Vérifiez la connexion ou réessayez avec une vidéo plus légère.'));
      });
      xhr.open('POST', uploadEndpoint);
      xhr.setRequestHeader('X-Unique-Upload-Id', uploadId);
      xhr.setRequestHeader('Content-Range', `bytes ${start}-${end}/${total}`);
      xhr.send(formData);
    });

    start = end + 1;
    onProgress?.((start / total) * 100);
  }

  if (!lastResponse?.secure_url) {
    throw new Error('Upload Cloudinary incomplet.');
  }

  return lastResponse;
}

/**
 * Upload image to Cloudinary.
 */
export async function uploadImageToCloudinary(
  file: Blob,
  onProgress?: (progress: number) => void,
  folder = 'profile-avatars'
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
      body: JSON.stringify({ folder }),
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
