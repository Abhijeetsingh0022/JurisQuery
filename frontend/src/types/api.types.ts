/**
 * TypeScript types for JurisQuery API responses
 */

export interface Citation {
    source_id?: number;
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

// ---------------------------------------------------------------------------
// IPC Section types
// ---------------------------------------------------------------------------

export interface IPCSectionBrief {
    section_number: string;
    offense: string | null;
    punishment: string | null;
    cognizable: boolean | null;
    bailable: boolean | null;
    court: string | null;
}

// ---------------------------------------------------------------------------
// BNS Section & Statute Bridge types
// ---------------------------------------------------------------------------

export interface BNSSectionBrief {
    section_number: string;
    section_name: string;
    chapter_name: string;
    chapter_subtype: string | null;
    description: string;
}

export interface BridgeResult {
    ipc_section: IPCSectionBrief | null;
    bns_section: BNSSectionBrief | null;
    /** 'equivalent' | 'modified' | 'split' | 'merged' | 'abolished' | 'new_in_bns' | 'unknown' */
    change_type: string;
    change_summary: string;
    is_verified: boolean;
}
