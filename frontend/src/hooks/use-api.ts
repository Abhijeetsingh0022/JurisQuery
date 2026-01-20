import { useAuth } from "@clerk/nextjs";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function useApi() {
    const { getToken } = useAuth();

    const fetcher = async (url: string, options: RequestInit = {}) => {
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
            throw new Error(errorData.detail || `API Error: ${res.statusText}`);
        }

        // Some endpoints returning 204 No Content might not have JSON
        if (res.status === 204) return null;

        return res.json();
    };

    return { fetcher };
}
