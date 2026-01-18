'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, AlertCircle, FileText, Download, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import ChatWindow from '@/features/chat/components/ChatWindow';
import { getDocument } from '@/services/ragService';
import type { Document } from '@/types/documents.types';
import type { Citation } from '@/types/api.types';

export default function DocumentAnalysisPage() {
    const params = useParams();
    const router = useRouter();
    const documentId = params.id as string;

    const [document, setDocument] = useState<Document | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
    const [activeTab, setActiveTab] = useState<'chat' | 'info'>('chat');

    const fetchDocument = useCallback(async () => {
        if (!documentId) return;

        setIsLoading(true);
        setError(null);
        try {
            const doc = await getDocument(documentId);
            setDocument(doc);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load document');
        } finally {
            setIsLoading(false);
        }
    }, [documentId]);

    useEffect(() => {
        fetchDocument();
    }, [fetchDocument]);

    const handleCitationClick = (citation: Citation) => {
        setActiveCitation(citation);
        // In a full implementation, this would scroll the PDF to the citation
        console.log('Navigate to citation:', citation);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-soft-cream flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-gray-600">Loading document...</p>
                </div>
            </div>
        );
    }

    if (error || !document) {
        return (
            <div className="min-h-screen bg-soft-cream flex items-center justify-center">
                <div className="text-center max-w-md">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h1 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Document</h1>
                    <p className="text-gray-600 mb-6">{error || 'Document not found'}</p>
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.back()}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        </button>
                        <div className="min-w-0">
                            <h1 className="font-semibold text-gray-900 dark:text-white truncate max-w-md">
                                {document.original_filename}
                            </h1>
                            <p className="text-xs text-gray-500">
                                {document.page_count ? `${document.page_count} pages` : ''} •
                                {document.chunk_count ? ` ${document.chunk_count} chunks` : ''} •
                                {document.status}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <a
                            href={document.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            title="Download original"
                        >
                            <Download className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        </a>
                    </div>
                </div>
            </header>

            {/* Main Content - Split View */}
            <div className="flex h-[calc(100vh-57px)]">
                {/* Left Panel - PDF Viewer Placeholder */}
                <div className="flex-1 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                    <div className="h-full flex flex-col items-center justify-center text-center p-8">
                        <div className="p-4 rounded-2xl bg-gray-100 dark:bg-gray-800 mb-6">
                            <FileText className="h-16 w-16 text-gray-400" />
                        </div>
                        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            PDF Viewer
                        </h2>
                        <p className="text-gray-500 max-w-md mb-4">
                            Document preview will be displayed here. Citations from the chat will highlight relevant sections.
                        </p>
                        <a
                            href={document.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
                        >
                            <Download className="h-4 w-4" />
                            Open Document
                        </a>

                        {/* Citation highlight preview */}
                        {activeCitation && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-8 p-4 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 max-w-lg text-left"
                            >
                                <p className="text-xs font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                                    Citation - Page {activeCitation.page_number}, Para {activeCitation.paragraph_number}
                                </p>
                                <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-4">
                                    {activeCitation.content}
                                </p>
                            </motion.div>
                        )}
                    </div>
                </div>

                {/* Right Panel - Chat */}
                <div className="w-[400px] lg:w-[480px] flex-shrink-0">
                    <ChatWindow
                        documentId={documentId}
                        onCitationClick={handleCitationClick}
                    />
                </div>
            </div>
        </div>
    );
}
