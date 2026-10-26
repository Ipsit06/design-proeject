import type { ApiErrorResponse } from '@signbridge/shared';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export class ApiError extends Error {
  code: string;
  statusCode: number;
  details?: unknown[];

  constructor(message: string, statusCode = 500, code = 'NETWORK_ERROR', details?: unknown[]) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

// Global listeners for backend connectivity status
type ConnectivityListener = (isOnline: boolean) => void;
const listeners = new Set<ConnectivityListener>();

let backendOnline = true;

export function isBackendOnline(): boolean {
  return backendOnline;
}

export function subscribeBackendStatus(listener: ConnectivityListener): () => void {
  listeners.add(listener);
  listener(backendOnline);
  return () => {
    listeners.delete(listener);
  };
}

function notifyBackendStatus(online: boolean) {
  if (backendOnline !== online) {
    backendOnline = online;
    listeners.forEach((l) => l(online));
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = new Headers(options.headers || {});
  
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    notifyBackendStatus(true);

    if (res.status === 204) {
      return {} as T;
    }

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const errorData = data as ApiErrorResponse | null;
      throw new ApiError(
        errorData?.error?.message || `HTTP ${res.status} error`,
        res.status,
        errorData?.error?.code || 'HTTP_ERROR',
        errorData?.error?.details
      );
    }

    return data as T;
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw err;
    }

    // Network level failure (backend offline or unreachable)
    notifyBackendStatus(false);
    throw new ApiError(
      'Backend is currently offline or unreachable. Actions will run in local offline mode.',
      0,
      'BACKEND_OFFLINE'
    );
  }
}
