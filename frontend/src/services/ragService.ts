/**
 * RAG Service - API methods for document and chat operations
 */

import { api } from './api/client';
import type { Document, DocumentListResponse, DocumentStatusResponse } from '@/types/documents.types';
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
