import { fetchApi } from './client.js';
import { getUserProfile } from '../../utils/userProfile.js';

const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return `${window.location.origin}/api`;
    }
  }
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && envUrl.trim() && !envUrl.includes('localhost')) {
    return envUrl.trim();
  }
  return 'http://localhost:4000';
};

const API_BASE_URL = getApiBaseUrl();

export const assetsApi = {
  async getMedia(subject?: string): Promise<any[]> {
    try {
      const queryParam = subject && subject !== 'All' ? `?subject=${encodeURIComponent(subject)}` : '';
      
      const rawList = await fetchApi<any[]>(`/api/assets${queryParam}`);
      if (!Array.isArray(rawList)) return [];
      return rawList.map(a => ({
        id: a.id,
        name: a.name || a.filename || 'Untitled Asset',
        label: a.label || (a.mimeType ? a.mimeType.split('/')[1]?.toUpperCase() : 'FIGURE') || 'FIGURE',
        url: a.url || a.public_url || a.publicUrl || '',
        storagePath: a.storagePath || a.storage_path,
        usesCount: a.usesCount || a.uses_count || 0
      }));
    } catch {
      return [];
    }
  },

  async uploadAsset(file: File, subject?: string): Promise<{ id: string; url: string; originalName: string }> {
    try {
      const user = getUserProfile();
      const effectiveSubject = subject || (user.role === 'faculty' ? user.assigned_subject : 'General');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('subject', effectiveSubject);

      const endpoint = API_BASE_URL.endsWith('/api') ? `${API_BASE_URL}/assets` : `${API_BASE_URL}/api/assets`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'x-user-subject': effectiveSubject
        },
        body: formData
      });

      if (!res.ok) {
        throw new Error('Upload failed');
      }

      const json = await res.json();
      const result = json.data || json;
      return {
        id: String(result.id || Date.now()),
        url: result.url || result.public_url || '',
        originalName: file.name
      };
    } catch {
      // Data URL fallback for local offline resilience
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve({
            id: `asset-${Date.now()}`,
            url: reader.result as string,
            originalName: file.name
          });
        };
        reader.readAsDataURL(file);
      });
    }
  },

  async uploadImage(file: File, subject?: string): Promise<{ id: string; url: string; originalName: string }> {
    return this.uploadAsset(file, subject);
  },

  async uploadBase64Image(base64Str: string, subject?: string, name?: string): Promise<{ id: string; url: string; public_url: string }> {
    try {
      if (!base64Str || !base64Str.startsWith('data:image/')) {
        return { id: `asset-${Date.now()}`, url: base64Str, public_url: base64Str };
      }
      const endpoint = API_BASE_URL.endsWith('/api') ? `${API_BASE_URL}/assets/base64` : `${API_BASE_URL}/api/assets/base64`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ base64: base64Str, subject, name })
      });

      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        return {
          id: String(data.id || Date.now()),
          url: data.url || data.public_url || base64Str,
          public_url: data.public_url || data.url || base64Str
        };
      }
    } catch (e) {
      console.warn('Base64 image upload failed, fallback to data URL:', e);
    }
    return { id: `asset-${Date.now()}`, url: base64Str, public_url: base64Str };
  },

  async deleteMedia(id: string): Promise<void> {
    return fetchApi<void>(`/api/assets/${id}`, { method: 'DELETE' });
  }
};
