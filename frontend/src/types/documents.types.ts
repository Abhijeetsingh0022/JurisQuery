/**
 * TypeScript types for JurisQuery Documents API
 */

export type DocumentStatus =
    | 'pending'
    | 'uploading'
    | 'processing'
    | 'vectorizing'
    | 'ready'
    | 'failed';

export interface Document {
    id: string;
    filename: string;
    original_filename: string;
    file_url: string;
    file_type: string;
    file_size: number;
    status: DocumentStatus;
    error_message: string | null;
    page_count: number | null;
    chunk_count: number | null;
    doc_metadata: Record<string, unknown> | null;
    created_at: string;
    updated_at: string;
}

export interface DocumentListResponse {
    documents: Document[];
    total: number;
}

export interface DocumentStatusResponse {
    id: string;
    status: DocumentStatus;
    progress: number;
    error_message: string | null;
}
