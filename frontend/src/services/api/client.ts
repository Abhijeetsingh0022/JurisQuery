    /**
 * API Client for JurisQuery Backend
 * Centralized fetch wrapper with auth and error handling
 */

// Use relative URLs so requests go through Next.js rewrites → backend proxy.
const API_BASE_URL = '';

export interface ApiError {
    message: string;
    status: number;
    detail?: string;
}

export class ApiClientError extends Error {
    status: number;
    detail?: string;

    constructor(message: string, status: number, detail?: string) {
        super(message);
        this.status = status;
        this.detail = detail;
        this.name = 'ApiClientError';
    }
}

async function getAuthToken(): Promise<string | null> {
    try {
        // Clerk exposes getToken on the global window object in the browser
        const clerk = (window as any).Clerk;
        if (clerk?.session) {
            return await clerk.session.getToken();
        }
    } catch {
        // ignore — unauthenticated context
    }
    return null;
}

export async function apiClient<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    // Add auth token if available
    const token = await getAuthToken();
    if (token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
        ...options,
        headers,
    });

    if (!response.ok) {
        let errorDetail: string | undefined;
        try {
            const errorBody = await response.json();
            errorDetail = errorBody.detail || errorBody.message;
        } catch {
            errorDetail = response.statusText;
        }

        throw new ApiClientError(
            `API Error: ${response.status}`,
            response.status,
            errorDetail
        );
    }

    // Handle empty responses
    const contentLength = response.headers.get('content-length');
    if (contentLength === '0' || response.status === 204) {
        return {} as T;
    }

    return response.json();
}

// Convenience methods
export const api = {
    get: <T>(endpoint: string, options?: RequestInit) =>
        apiClient<T>(endpoint, { ...options, method: 'GET' }),

    post: <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
        apiClient<T>(endpoint, {
            ...options,
            method: 'POST',
            body: data ? JSON.stringify(data) : undefined,
        }),

    put: <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
        apiClient<T>(endpoint, {
            ...options,
            method: 'PUT',
            body: data ? JSON.stringify(data) : undefined,
        }),

    delete: <T>(endpoint: string, options?: RequestInit) =>
        apiClient<T>(endpoint, { ...options, method: 'DELETE' }),

    // Special method for file uploads
    upload: async <T>(endpoint: string, file: File, onProgress?: (progress: number) => void): Promise<T> => {
        const url = `${API_BASE_URL}${endpoint}`;
        const formData = new FormData();
        formData.append('file', file);
        const token = await getAuthToken();

        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable && onProgress) {
                    const progress = Math.round((e.loaded / e.total) * 100);
                    onProgress(progress);
                }
            });

            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(JSON.parse(xhr.responseText));
                } else {
                    reject(new ApiClientError('Upload failed', xhr.status, xhr.statusText));
                }
            });

            xhr.addEventListener('error', () => {
                reject(new ApiClientError('Upload failed', 0, 'Network error'));
            });

            xhr.open('POST', url);
            if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            xhr.send(formData);
        });
    },
};

export default api;
