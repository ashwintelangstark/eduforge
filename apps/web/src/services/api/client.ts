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

async function executeFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const user = getUserProfile();
  const authHeaders: Record<string, string> = {};
  if (user && user.assigned_subject) {
    authHeaders['x-user-subject'] = user.assigned_subject;
  }
  if (user && user.role) {
    authHeaders['x-user-role'] = user.role;
  }

  // 25-second timeout to allow cPanel Phusion Passenger cold starts and DB connection initialization
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);

  try {
    const res = await fetch(url, {
      ...options,
      signal: options?.signal || controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...(options?.headers || {})
      }
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({ error: { message: res.statusText } }));
      const message = errData.error?.message || errData.error || `HTTP ${res.status}: ${res.statusText}`;
      throw new Error(message);
    }

    const json = await res.json();
    return json.data !== undefined ? json.data : json;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  let cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  let base = API_BASE_URL.replace(/\/+$/, '');

  // Prevent duplicate /api/api if both base and endpoint contain /api
  if (base.endsWith('/api') && cleanEndpoint.startsWith('/api/')) {
    cleanEndpoint = cleanEndpoint.replace(/^\/api/, '');
  }

  const url = endpoint.startsWith('http') ? endpoint : `${base}${cleanEndpoint}`;

  try {
    return await executeFetch<T>(url, options);
  } catch (err: any) {
    // If cold start / network glitch caused fetch to fail, retry once after 1.5s
    const isNetworkErr = err?.name === 'TypeError' || err?.name === 'AbortError' || err?.message?.includes('fetch');
    if (isNetworkErr) {
      await new Promise(r => setTimeout(r, 1500));
      return await executeFetch<T>(url, options);
    }
    throw err;
  }
}
