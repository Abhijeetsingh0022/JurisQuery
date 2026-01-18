'use client';

import { motion } from 'framer-motion';
import { FileText, Trash2, MessageSquare, Clock, FileCheck, AlertCircle } from 'lucide-react';
import type { Document, DocumentStatus } from '@/types/documents.types';

interface DocumentCardProps {
    document: Document;
    onSelect?: (document: Document) => void;
    onDelete?: (document: Document) => void;
}

const statusConfig: Record<DocumentStatus, { label: string; color: string; icon: React.ReactNode }> = {
    pending: { label: 'Pending', color: 'text-gray-500 bg-gray-100', icon: <Clock className="h-3 w-3" /> },
    uploading: { label: 'Uploading', color: 'text-blue-600 bg-blue-100', icon: <Clock className="h-3 w-3 animate-pulse" /> },
    processing: { label: 'Processing', color: 'text-amber-600 bg-amber-100', icon: <Clock className="h-3 w-3 animate-spin" /> },
    vectorizing: { label: 'Vectorizing', color: 'text-purple-600 bg-purple-100', icon: <Clock className="h-3 w-3 animate-spin" /> },
    ready: { label: 'Ready', color: 'text-green-600 bg-green-100', icon: <FileCheck className="h-3 w-3" /> },
    failed: { label: 'Failed', color: 'text-red-600 bg-red-100', icon: <AlertCircle className="h-3 w-3" /> },
};

const fileTypeIcons: Record<string, string> = {
    pdf: '📄',
    docx: '📝',
    txt: '📃',
};

export default function DocumentCard({ document, onSelect, onDelete }: DocumentCardProps) {
    const status = statusConfig[document.status];
    const fileIcon = fileTypeIcons[document.file_type] || '📄';
    const isReady = document.status === 'ready';

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`
        group relative rounded-xl border bg-white dark:bg-gray-900 p-4
        transition-all duration-200 overflow-hidden
        ${isReady ? 'border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-lg hover:border-blue-300' : 'border-gray-200 dark:border-gray-700'}
      `}
            onClick={() => isReady && onSelect?.(document)}
        >
            {/* Gradient overlay on hover */}
            {isReady && (
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}

            <div className="relative flex items-start gap-3">
                {/* File icon */}
                <div className="flex-shrink-0 text-3xl">{fileIcon}</div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <h3 className="font-medium text-gray-900 dark:text-white truncate">
                                {document.original_filename}
                            </h3>
                            <p className="mt-0.5 text-xs text-gray-500">
                                {formatFileSize(document.file_size)} • {formatDate(document.created_at)}
                            </p>
                        </div>

                        {/* Status badge */}
                        <span className={`
              inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0
              ${status.color}
            `}>
                            {status.icon}
                            {status.label}
                        </span>
                    </div>

                    {/* Document stats */}
                    {isReady && (
                        <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                            {document.page_count && (
                                <span className="flex items-center gap-1">
                                    <FileText className="h-3 w-3" />
                                    {document.page_count} pages
                                </span>
                            )}
                            {document.chunk_count && (
                                <span className="flex items-center gap-1">
                                    <MessageSquare className="h-3 w-3" />
                                    {document.chunk_count} chunks
                                </span>
                            )}
                        </div>
                    )}

                    {/* Error message */}
                    {document.status === 'failed' && document.error_message && (
                        <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                            {document.error_message}
                        </p>
                    )}
                </div>

                {/* Delete button */}
                {onDelete && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(document);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-600 transition-all"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                )}
            </div>

            {/* Chat CTA for ready documents */}
            {isReady && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800"
                >
                    <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 font-medium">
                        <MessageSquare className="h-4 w-4" />
                        <span>Chat with this document</span>
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
}
