export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers || {});
  
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  
  if (!headers.has('Cache-Control')) {
    headers.set('Cache-Control', 'no-cache');
  }

  try {
    const token = localStorage.getItem('learnloop_auth_token');
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  } catch {}

  const response = await fetch(endpoint, {
    ...options,
    headers,
    credentials: 'include', // Ensures HTTP-only cookies are included in requests
  });

  const contentType = response.headers.get('content-type');
  let data: any = null;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMessage = data && typeof data === 'object' && data.error
      ? data.error
      : `Request failed with status ${response.status}`;
    throw new ApiError(errorMessage, response.status);
  }

  return data as T;
}
