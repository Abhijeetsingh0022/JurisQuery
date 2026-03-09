import { useAuth } from "@clerk/nextjs";
import { useCallback } from "react";

// Use relative URLs so requests go through Next.js rewrites → backend proxy.
// This works on both localhost (/api/* → 127.0.0.1:8000) and production.
const BASE_URL = '';

export function useApi() {
    const { getToken } = useAuth();

    const fetcher = useCallback(async (url: string, options: RequestInit = {}) => {
        const token = await getToken();
        const isFormData = options.body instanceof FormData;

        const headers: HeadersInit = {
            ...(!isFormData && { "Content-Type": "application/json" }),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        };

        const res = await fetch(`${BASE_URL}${url}`, {
            ...options,
            headers,
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            const error = new Error(errorData.detail || `API Error: ${res.statusText}`) as Error & { status: number };
            error.status = res.status;
            throw error;
        }

        // Some endpoints returning 204 No Content might not have JSON
        if (res.status === 204) return null;

        return res.json();
    }, [getToken]);

    return { fetcher };
}
