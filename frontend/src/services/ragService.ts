/**
 * RAG Service - API methods for document and chat operations
 */

import { api } from './api/client';
import type { Document, DocumentListResponse, DocumentStatusResponse, DocumentChunkListResponse } from '@/types/documents.types';
import type {
    QueryResponse,
    ChatSession,
    ChatSessionDetail,
    ChatSessionListResponse,
    ChatMessage
} from '@/types/api.types';

// ============ Documents ============

export async function uploadDocument(
    file: File,
    onProgress?: (progress: number) => void
): Promise<Document> {
    return api.upload<Document>('/api/documents/upload', file, onProgress);
}

export async function getDocuments(
    skip = 0,
    limit = 20
): Promise<DocumentListResponse> {
    return api.get<DocumentListResponse>(`/api/documents?skip=${skip}&limit=${limit}`);
}

export async function getDocument(documentId: string): Promise<Document> {
    return api.get<Document>(`/api/documents/${documentId}`);
}

export async function getDocumentStatus(documentId: string): Promise<DocumentStatusResponse> {
    return api.get<DocumentStatusResponse>(`/api/documents/${documentId}/status`);
}

export async function deleteDocument(documentId: string): Promise<void> {
    return api.delete(`/api/documents/${documentId}`);
}

export async function getDocumentChunks(
    documentId: string,
    skip = 0,
    limit = 100
): Promise<DocumentChunkListResponse> {
    return api.get<DocumentChunkListResponse>(`/api/documents/${documentId}/chunks?skip=${skip}&limit=${limit}`);
}

// ============ RAG Query ============

export async function queryDocument(
    documentId: string,
    query: string,
    topK = 5
): Promise<QueryResponse> {
    return api.post<QueryResponse>('/api/rag/query', {
        document_id: documentId,
        query,
        top_k: topK,
    });
}

// ============ Chat Sessions ============

export async function createChatSession(
    documentId: string,
    title?: string
): Promise<ChatSession> {
    return api.post<ChatSession>('/api/chat/sessions', {
        document_id: documentId,
        title,
    });
}

export async function getChatSessions(
    documentId?: string,
    skip = 0,
    limit = 20
): Promise<ChatSessionListResponse> {
    let url = `/api/chat/sessions?skip=${skip}&limit=${limit}`;
    if (documentId) {
        url += `&document_id=${documentId}`;
    }
    return api.get<ChatSessionListResponse>(url);
}

export async function getChatSession(sessionId: string): Promise<ChatSessionDetail> {
    return api.get<ChatSessionDetail>(`/api/chat/sessions/${sessionId}`);
}

export async function sendMessage(
    sessionId: string,
    content: string
): Promise<ChatMessage> {
    return api.post<ChatMessage>(`/api/chat/sessions/${sessionId}/messages`, {
        content,
    });
}

/**
 * Stream a message response via Server-Sent Events.
 * Calls `onToken` for each text chunk and `onDone` when the stream ends.
 * Returns an AbortController so the caller can cancel the stream.
 */
export function streamMessage(
    sessionId: string,
    content: string,
    searchMode: 'document' | 'web' | 'auto' | undefined,
    onToken: (token: string) => void,
    onDone: () => void,
    onError?: (err: string) => void,
    onStatus?: (status: string) => void,
): AbortController {
    const controller = new AbortController();

    (async () => {
        // Get auth token the same way the rest of the app does
        let token: string | null = null;
        try {
            const clerk = (window as any).Clerk;
            if (clerk?.session) token = await clerk.session.getToken();
        } catch { /* unauthenticated */ }

        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        try {
            const response = await fetch(`/api/chat/sessions/${sessionId}/stream`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ content, search_mode: searchMode }),
                signal: controller.signal,
            });

            if (!response.ok || !response.body) {
                onError?.(`Stream error: ${response.status}`);
                onDone();
                return;
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n\n');
                buffer = lines.pop() ?? '';

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    const payload = line.slice(6); // strip "data: "
                    if (payload === '[DONE]') { onDone(); return; }
                    if (payload.startsWith('[ERROR]')) { onError?.(payload.slice(8)); onDone(); return; }
                    if (payload.startsWith('[STATUS]')) { onStatus?.(payload.slice(9)); continue; }
                    // Un-escape newlines we escaped on the server
                    onToken(payload.replace(/\\n/g, '\n'));
                }
            }
            onDone();
        } catch (err: any) {
            if (err?.name !== 'AbortError') onError?.(err?.message ?? 'Stream failed');
            onDone();
        }
    })();

    return controller;
}

export async function createFolderChatSession(
    folderId: string,
    title?: string,
): Promise<ChatSession> {
    return api.post<ChatSession>('/api/chat/sessions', {
        folder_id: folderId,
        title,
    });
}

export async function deleteChatSession(sessionId: string): Promise<void> {
    return api.delete(`/api/chat/sessions/${sessionId}`);
}

// ============ Health Check ============

export async function checkHealth(): Promise<{ status: string }> {
    return api.get<{ status: string }>('/');
}

// Export all as default object for convenience
const ragService = {
    // Documents
    uploadDocument,
    getDocuments,
    getDocument,
    getDocumentStatus,
    deleteDocument,
    getDocumentChunks,
    // RAG
    queryDocument,
    // Chat
    createChatSession,
    getChatSessions,
    getChatSession,
    sendMessage,
    deleteChatSession,
    // Health
    checkHealth,
};

export default ragService;
