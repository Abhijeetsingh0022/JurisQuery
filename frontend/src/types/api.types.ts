/**
 * TypeScript types for JurisQuery API responses
 */

export interface Citation {
    chunk_id: string;
    content: string;
    page_number: number | null;
    paragraph_number: number | null;
    relevance_score: number;
}

export interface QueryResponse {
    answer: string;
    citations: Citation[];
    document_id: string;
    query: string;
    model: string;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    citations: Citation[] | null;
    created_at: string;
}

export interface ChatSession {
    id: string;
    document_id: string;
    title: string | null;
    created_at: string;
    updated_at: string;
    message_count: number;
}

export interface ChatSessionDetail extends ChatSession {
    messages: ChatMessage[];
}

export interface ChatSessionListResponse {
    sessions: ChatSession[];
    total: number;
}

export interface ApiHealthResponse {
    status: string;
    environment?: string;
    debug?: boolean;
}
