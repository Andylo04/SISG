
const API_URL = 'http://localhost:3000';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;

  return localStorage.getItem('access_token');
}

export async function apiFetch(
  endpoint: string,
  options: RequestInit = {},
) {
  const headers = new Headers(options.headers);
  const token = getToken();

  headers.set('Accept', 'application/json');

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Error ${response.status}: ${message}`);
  }

  if (response.status === 204) return null;

  return response.json();
}
