'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Plus, RefreshCw, AlertCircle } from 'lucide-react';
import DocumentCard from '@/features/documents/components/DocumentCard';
import type { Document } from '@/types/documents.types';

interface DocumentsListProps {
    documents: Document[];
    isLoading: boolean;
    error: string | null;
    onRefresh: () => void;
    onSelect: (document: Document) => void;
    onDelete: (document: Document) => void;
    onUploadClick: () => void;
}

export default function DocumentsList({
    documents,
    isLoading,
    error,
    onRefresh,
    onSelect,
    onDelete,
    onUploadClick,
}: DocumentsListProps) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Your Documents</h3>
                <button
                    onClick={onRefresh}
                    disabled={isLoading}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={`h-5 w-5 text-gray-500 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="p-6">
                {error && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3 text-red-600"
                    >
                        <AlertCircle className="h-5 w-5 flex-shrink-0" />
                        <p>{error}</p>
                    </motion.div>
                )}

                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="h-32 rounded-xl bg-gray-100 animate-pulse" />
                        ))}
                    </div>
                ) : documents.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                            <FileText className="h-8 w-8 text-gray-400" />
                        </div>
                        <h4 className="text-lg font-medium text-gray-900 mb-2">No documents yet</h4>
                        <p className="text-gray-500 mb-6">Upload your first legal document to get started</p>
                        <button
                            onClick={onUploadClick}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
                        >
                            <Plus className="h-4 w-4" />
                            Upload Document
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <AnimatePresence>
                            {documents.map((doc) => (
                                <DocumentCard
                                    key={doc.id}
                                    document={doc}
                                    onSelect={onSelect}
                                    onDelete={onDelete}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
}
