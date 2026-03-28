import { useAuthStore } from './store/useAuthStore';

const API_BASE = '/api';

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = useAuthStore.getState().token;
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      useAuthStore.getState().logout();
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || response.statusText || 'API Error');
  }

  // Handle empty responses
  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export const api = {
  get: (url: string) => fetchWithAuth(url),
  post: (url: string, body?: any) => fetchWithAuth(url, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  }),
  patch: (url: string, body: any) => fetchWithAuth(url, {
    method: 'PATCH',
    body: JSON.stringify(body),
  }),
  delete: (url: string) => fetchWithAuth(url, {
    method: 'DELETE',
  }),
};
